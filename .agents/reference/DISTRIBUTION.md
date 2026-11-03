# GitHub releases and updates

Releases contain installation-ready unpacked Chromium ZIPs, checksums, provenance, instructions, and a Linux download helper.
The browser extension does not contact GitHub. The helper contacts GitHub when invoked explicitly.

## Version and package

`package.json` and `extension/manifest.json` must have the same version.
Use three numeric components, each at most 65535, and an existing tag named `vVERSION`.
The manifest includes a stable public key for unpacked extension identity. No signing private key is retained or shipped.
The public key is an identity input, not a publisher signature or an automatic-update mechanism.

```sh
bun run package
bun run package --check --tag=v0.1.1
bun run package --tag=v0.1.1
```

The first command permits local preview builds. Tagged commands require clean committed source and a tag pointing at HEAD.
Packaging never commits, pushes, or publishes.

Output under `dist/release/`:

- `redirect-inspector-VERSION-chromium.zip`, with `manifest.json` at its root.
- `SHA256SUMS` for the ZIP.
- `release.json`, including version, source commit, tag, and dirty-source state.
- `INSTALL.md`, also included in the package.
- `update-redirect-inspector.py`, the standalone Linux helper.
- `extension/`, the exact unpacked package.

The package includes the original-source MIT license, third-party dependency licenses, and privacy documentation.
ZIP entries have fixed timestamps and sorted names for reproducibility from the same source and lockfile.
Only the extension build, metadata, instructions, and licenses enter the ZIP. Audit downloads are excluded.

## Hosted checks

`.github/workflows/checks.yml` runs on main pushes and pull requests.
It runs type checks, unit tests, updater tests, packaging, prototype UI checks, and real extension browser tests.
The browser tests install the built release directory in a disposable profile.

## Draft-release workflow

`.github/workflows/release.yml` is manually dispatched with an existing tag.
It validates clean source and version identity, runs all checks, builds and browser-tests the tagged package, then creates a draft GitHub release.
The workflow's build job has read-only repository permissions. Only the draft job has release write access.
It does not overwrite an existing release.

After source review:

1. Update the version in both owners and run the project checks.
2. Commit, push, and create an annotated matching tag at that exact source commit.
3. Dispatch Prepare GitHub release with that tag.
4. Review the draft's downloaded ZIP, checksum, and provenance.
5. Publish the GitHub draft when ready.

## Helper behavior

`--check` reads the latest stable release metadata without downloading the ZIP or creating an installation.
The update command validates a stable release tag, exact asset URLs, checksum, archive paths, manifest, and metadata.
It refuses unrelated directories, symbolic-link destinations, downgrades, and existing recovery backups.
A lock prevents concurrent replacements. Validation failure leaves the installation unchanged.
The directory swap restores the previous installation on replacement failure.

The user reloads the same installed extension entry after updating. The helper does not modify the browser profile.
Checksum verification detects corruption. It does not independently authenticate a compromised publisher.

Web Store credentials, listing assets, OAuth, and release-triggered submission remain deferred for the separate requested discussion.

## Published version

The first public package is [v0.1.1](https://github.com/Nulifyer/redirect-path-chrome-extension/releases/tag/v0.1.1).
Its hosted release workflow passed, and the downloaded package and helper were verified against the tagged local build.
An actual public-helper installation, replacement, and browser Reload preserved identity and settings.
Exact evidence is in [verification](VERIFICATION.md).
