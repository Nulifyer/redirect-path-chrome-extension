import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest import mock
import zipfile


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("updater", ROOT / "scripts/update-redirect-inspector.py")
updater = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(updater)


class UpdaterTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.directory = self.root / "extension with spaces"
        self.version = "1.2.3"
        self.filename = f"redirect-inspector-{self.version}-chromium.zip"

    def archive(self, extra=None, version=None):
        version = version or self.version
        files = {
            "manifest.json": json.dumps({"name": updater.NAME, "version": version, "manifest_version": 3}),
            "release.json": json.dumps({"name": updater.NAME, "version": version, "tag": f"v{version}", "dirty": False, "distribution": "unpacked-zip"}),
            "background.js": "// current worker",
            "popup.html": "<!doctype html>",
            "popup.js": "// popup",
            "popup.css": "/* styles */",
            "content.js": "// hints",
            "LICENSE": "MIT License",
        }
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w") as bundle:
            for filename, contents in files.items():
                bundle.writestr(filename, contents)
            if extra:
                bundle.writestr(*extra)
        return output.getvalue()

    def existing(self):
        self.directory.mkdir()
        (self.directory / "manifest.json").write_text(json.dumps({"name": updater.NAME}))
        (self.directory / "release.json").write_text(json.dumps({"name": updater.NAME}))
        (self.directory / "stale.txt").write_text("old installation")

    def run_update(self, archive=None, bad_checksum=False, check=False):
        archive = archive or self.archive()
        prefix = f"https://github.com/{updater.REPOSITORY}/releases/download/v{self.version}/"
        release = {"tag_name": f"v{self.version}", "draft": False, "prerelease": False,
                   "assets": [{"name": name, "browser_download_url": prefix + name} for name in [self.filename, "SHA256SUMS"]]}
        checksum = "0" * 64 if bad_checksum else hashlib.sha256(archive).hexdigest()
        downloads = {f"https://api.github.com/repos/{updater.REPOSITORY}/releases/latest": json.dumps(release).encode(),
                     prefix + self.filename: archive, prefix + "SHA256SUMS": f"{checksum}  {self.filename}\n".encode()}
        with mock.patch.object(updater, "download", side_effect=downloads.__getitem__), contextlib.redirect_stdout(io.StringIO()):
            return updater.update(self.directory, check=check)

    def test_check_does_not_create_an_installation(self):
        self.assertEqual(self.run_update(check=True), self.version)
        self.assertFalse(self.directory.exists())

    def test_check_does_not_replace_existing_files(self):
        self.existing()
        self.run_update(check=True)
        self.assertEqual((self.directory / 'stale.txt').read_text(), 'old installation')

    def test_downgrade_does_not_replace_existing_files(self):
        self.existing()
        (self.directory / 'manifest.json').write_text(json.dumps({'name': updater.NAME, 'version': '9.0.0'}))
        with self.assertRaisesRegex(ValueError, 'downgrade'):
            self.run_update()
        self.assertTrue((self.directory / 'stale.txt').exists())

    def test_noncanonical_zip_path_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'invalid path'):
            self.run_update(self.archive(extra=('directory//file', 'bad path')))

    def test_first_install_and_repeat_update(self):
        self.assertEqual(self.run_update(), self.version)
        self.assertEqual(self.run_update(), self.version)
        self.assertTrue((self.directory / "background.js").is_file())
        self.assertEqual(json.loads((self.directory / "manifest.json").read_text())["version"], self.version)

    def test_replacement_removes_stale_files_and_preserves_neighboring_profile(self):
        self.existing()
        settings = self.root / "browser-profile.json"
        settings.write_text("saved browser settings")
        self.run_update()
        self.assertFalse((self.directory / "stale.txt").exists())
        self.assertEqual(settings.read_text(), "saved browser settings")

    def test_bad_checksum_keeps_installed_files(self):
        self.existing()
        with self.assertRaisesRegex(ValueError, "checksum"):
            self.run_update(bad_checksum=True)
        self.assertEqual((self.directory / "stale.txt").read_text(), "old installation")

    def test_wrong_version_keeps_installed_files(self):
        self.existing()
        with self.assertRaisesRegex(ValueError, "metadata"):
            self.run_update(self.archive(version="9.9.9"))
        self.assertTrue((self.directory / "stale.txt").exists())

    def test_traversal_and_symlink_archives_are_rejected(self):
        self.existing()
        link = zipfile.ZipInfo("link")
        link.create_system = 3
        link.external_attr = (stat.S_IFLNK | 0o777) << 16
        for extra in [("../escaped", "unexpected"), (link, "../escaped")]:
            with self.subTest(extra=extra), self.assertRaisesRegex(ValueError, "invalid path"):
                self.run_update(self.archive(extra=extra))
            self.assertFalse((self.root / "escaped").exists())
            self.assertTrue((self.directory / "stale.txt").exists())

    def test_failed_swap_restores_previous_directory(self):
        self.existing()
        rename = Path.rename

        def fail_candidate(path, target):
            if path.name == "extension":
                raise OSError("simulated swap failure")
            return rename(path, target)

        with mock.patch.object(Path, "rename", fail_candidate), self.assertRaisesRegex(OSError, "swap failure"):
            self.run_update()
        self.assertEqual((self.directory / "stale.txt").read_text(), "old installation")
        self.assertFalse((self.root / f".{self.directory.name}.previous").exists())

    def test_unrelated_directory_is_not_changed(self):
        self.directory.mkdir()
        document = self.directory / "keep.txt"
        document.write_text("user file")
        with self.assertRaisesRegex(ValueError, "not a packaged"):
            self.run_update()
        self.assertEqual(document.read_text(), "user file")

    def test_symbolic_link_destination_is_not_changed(self):
        other = self.root / "other"
        other.mkdir()
        self.directory.symlink_to(other, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "symbolic link"):
            self.run_update()
        self.assertTrue(self.directory.is_symlink())

    def test_recovery_copy_is_not_overwritten(self):
        self.existing()
        backup = self.root / f".{self.directory.name}.previous"
        backup.mkdir()
        with self.assertRaisesRegex(ValueError, "recovery copy"):
            self.run_update()
        self.assertTrue(backup.is_dir())
        self.assertTrue((self.directory / "stale.txt").is_file())

    def test_default_reuses_existing_location(self):
        with mock.patch.dict(os.environ, {"HOME": str(self.root), "XDG_DATA_HOME": str(self.root / "xdg")}):
            self.assertEqual(updater.default_directory(), self.root / "xdg/chrome-extensions/nulifyer-redirect-inspector")
            legacy = self.root / ".local/chrome-extensions/nulifyer-redirect-inspector"
            legacy.mkdir(parents=True)
            self.assertEqual(updater.default_directory(), legacy)


if __name__ == "__main__":
    unittest.main()
