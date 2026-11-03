#!/usr/bin/env python3
"""Download and install the latest Redirect Inspector release on Linux."""

import argparse
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import tempfile
import urllib.request
import zipfile


REPOSITORY = "Nulifyer/redirect-path-chrome-extension"
NAME = "Redirect Inspector"
MAX_DOWNLOAD = 32 * 1024 * 1024


def default_directory():
    existing = Path.home() / ".local/chrome-extensions/nulifyer-redirect-inspector"
    if existing.exists() or existing.is_symlink():
        return existing
    data = Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local/share")
    return data / "chrome-extensions/nulifyer-redirect-inspector"


def download(url):
    request = urllib.request.Request(url, headers={
        "User-Agent": "nulifyer-redirect-inspector-updater",
        "Accept": "application/vnd.github+json" if url.startswith("https://api.github.com/") else "application/octet-stream",
    })
    with urllib.request.urlopen(request, timeout=60) as response:
        data = response.read(MAX_DOWNLOAD + 1)
    if len(data) > MAX_DOWNLOAD:
        raise ValueError("Download exceeds the expected release size.")
    return data


def validate_existing(directory):
    if directory.is_symlink():
        raise ValueError(f"Refusing to replace a symbolic link: {directory}")
    if not directory.exists():
        return
    if not directory.is_dir():
        raise ValueError(f"Installation path is not a directory: {directory}")
    if not any(directory.iterdir()):
        return
    manifest = directory / "manifest.json"
    metadata = directory / "release.json"
    if (directory / ".git").exists() or not manifest.is_file() or not metadata.is_file():
        raise ValueError(f"Directory is not a packaged Redirect Inspector installation: {directory}")
    if json.loads(manifest.read_text())["name"] != NAME or json.loads(metadata.read_text())["name"] != NAME:
        raise ValueError(f"Directory belongs to another application: {directory}")


def unpack(archive, checksum, version, directory):
    filename = f"redirect-inspector-{version}-chromium.zip"
    expected = [line.split()[0] for line in checksum.decode().splitlines()
                if len(line.split()) == 2 and line.split()[1].lstrip("*") == filename]
    if len(expected) != 1 or hashlib.sha256(archive).hexdigest() != expected[0]:
        raise ValueError("ZIP checksum verification failed. Installed files were not changed.")
    with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
        paths = set()
        total = 0
        for item in bundle.infolist():
            path = PurePosixPath(item.filename)
            total += item.file_size
            if (path.is_absolute() or ".." in path.parts or "\\" in item.filename
                    or str(path) != item.filename.rstrip('/')
                    or not path.parts or path.parts[0].endswith(":")
                    or stat.S_ISLNK(item.external_attr >> 16)
                    or item.filename in paths or total > MAX_DOWNLOAD * 4):
                raise ValueError("Release ZIP contains an invalid path or unexpected contents.")
            paths.add(item.filename)
        bundle.extractall(directory)
    manifest = json.loads((directory / "manifest.json").read_text())
    metadata = json.loads((directory / "release.json").read_text())
    if (manifest.get("name") != NAME or manifest.get("manifest_version") != 3
            or manifest.get("version") != version or metadata.get("version") != version
            or metadata.get("tag") != f"v{version}" or metadata.get("dirty") is not False
            or metadata.get("name") != NAME or metadata.get("distribution") != "unpacked-zip"):
        raise ValueError("Release metadata does not match the requested extension version.")
    for filename in ["background.js", "popup.html", "popup.js", "popup.css", "content.js", "LICENSE"]:
        if not (directory / filename).is_file():
            raise ValueError(f"Release is incomplete: missing {filename}")


def latest_release():
    release = json.loads(download(f"https://api.github.com/repos/{REPOSITORY}/releases/latest"))
    tag = release.get("tag_name", "")
    if release.get("draft") or release.get("prerelease") or not re.fullmatch(r"v\d+\.\d+\.\d+", tag):
        raise ValueError("GitHub's latest release is not a stable extension release.")
    version = tag.removeprefix("v")
    if any(int(part) > 65535 for part in version.split('.')):
        raise ValueError("Release version is invalid for Chrome.")
    filename = f"redirect-inspector-{version}-chromium.zip"
    assets = {asset["name"]: asset["browser_download_url"] for asset in release["assets"]}
    prefix = f"https://github.com/{REPOSITORY}/releases/download/{tag}/"
    for name in [filename, "SHA256SUMS"]:
        if assets.get(name) != prefix + name:
            raise ValueError(f"Missing or unexpected release asset: {name}")
    return version, filename, assets


def update(directory, check=False):
    directory = Path(os.path.abspath(directory.expanduser()))
    validate_existing(directory)
    if check:
        version, _, _ = latest_release()
        manifest = directory / "manifest.json"
        installed = json.loads(manifest.read_text()).get("version", "unknown") if manifest.is_file() else "not installed"
        print(f"Latest: {version}. Installed: {installed}. Installation: {directory}")
        return version
    directory.parent.mkdir(parents=True, exist_ok=True)
    lock_path = directory.parent / f".{directory.name}.update.lock"
    with lock_path.open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError("Another updater is already running for this directory.") from None
        # Recheck after taking the lock, before downloading or replacing anything.
        validate_existing(directory)
        version, filename, assets = latest_release()
        manifest = directory / "manifest.json"
        if manifest.is_file():
            installed = json.loads(manifest.read_text()).get("version", "0.0.0")
            if tuple(map(int, installed.split('.'))) > tuple(map(int, version.split('.'))):
                raise ValueError("Refusing to downgrade the installed extension.")
        print(f"Downloading Redirect Inspector {version}...", flush=True)
        archive = download(assets[filename])
        checksum = download(assets["SHA256SUMS"])
        backup = directory.parent / f".{directory.name}.previous"
        if backup.exists() or backup.is_symlink():
            raise ValueError(f"A previous recovery copy exists; inspect it before updating: {backup}")
        with tempfile.TemporaryDirectory(prefix=f".{directory.name}-", dir=directory.parent) as temporary:
            candidate = Path(temporary) / "extension"
            candidate.mkdir()
            unpack(archive, checksum, version, candidate)
            try:
                if directory.exists():
                    directory.rename(backup)
                candidate.rename(directory)
            except BaseException:
                if backup.exists() and not directory.exists():
                    backup.rename(directory)
                raise
        if backup.exists():
            shutil.rmtree(backup)
    print(f"Installed {version} at {directory}")
    print("In chrome://extensions or brave://extensions, click Reload, then refresh open websites.")
    print(f"For a first installation, enable Developer mode and Load unpacked: {directory}")
    return version


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check the latest release without downloading or replacing installation files.")
    parser.add_argument("--directory", type=Path, default=default_directory(),
                        help="Installation root containing manifest.json. Defaults to your existing installation, or XDG_DATA_HOME/chrome-extensions/nulifyer-redirect-inspector.")
    args = parser.parse_args()
    try:
        update(args.directory, check=args.check)
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        parser.exit(1, f"Update failed: {error}\n")


if __name__ == "__main__":
    main()
