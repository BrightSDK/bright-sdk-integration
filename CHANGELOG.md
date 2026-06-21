# Changelog

All notable changes to this project will be documented in this file.

## [1.7.5] — 2026-06-21

### Added

- `cert` parameter to `resolve_sdk()` and `fetch_sdk()` in `downloader.js` — passes `--cert` flag to `bright-sdk-downloader` when enabled
- `BrightSdkUpdateBase` now reads `releases_data.resolved.certified` and passes it to `fetch_sdk()` for certified Windows SDK downloads

### Fixed

- Clarified interactive prompt for HTML entry file: `index.html location` → `Path to app's main HTML entry file (e.g. app/index.html)` to make it explicit that the full path including filename is required.
- Updated README and docs config field description for `index` to show a realistic example (`app/index.html`) and clarify it must point to the file, not a directory.

## [1.7.4] — 2026-06-17

### Fixed

- Fixed `TypeError: yargs.option is not a function` on Node.js v22+ caused by the yargs v18 export change (v18 exports the constructor instead of a pre-built instance). Fixed by calling `yargs(process.argv.slice(2))` to obtain an instance before chaining options.
- Fixed `TypeError: process.stdin.setRawMode is not a function` on Windows when stdin is not a TTY (e.g. via `npx`). Now guards with `process.stdin.isTTY` check.

## [1.7.3] — 2026-06-11

### Fixed

- Release badge switched from shields.io to badgen.net (shields.io token pool exhaustion).
- Windows platform icon replaced with inline SVG (Simple Icons removed the Windows slug).

### Added

- Documentation URL prominently displayed at top of README.

### Dependencies

- `follow-redirects` 1.15.9 → 1.16.0
- `yargs` 17.7.2 → 18.0.0
- `jest` 29.7.0 → 30.4.2
- `jest-environment-node` 29.7.0 → 30.4.1
- `lint-staged` 15.5.2 → 17.0.7
- `actions/checkout` 4 → 6
- `actions/setup-node` 4 → 6
- `softprops/action-gh-release` 2 → 3
- Migrated to ESLint v10 flat config

## [1.7.2] — 2026-06-11

### Fixed

- Auto-download `bright-sdk-downloader` binary when not found in PATH (fixes ENOENT on first run).
- Resolve relative paths against workdir in WebOS `sdk_package`/`services` updates.

### Added

- GitHub Pages docs badge in README.
- Hosted API key guide (removed local copy, links to deployed page).

### Changed

- Bypass husky pre-commit hooks on consumer projects.

## [1.7.1] — 2026-05-30

### Changed

- **Switched download backend from `bright-sdk-download` (Node.js) to `bright-sdk-downloader-rs` (Rust).**
  The binary is resolved automatically — no manual setup required.

- Removed `pkg` packaging support — the tool is now distributed as an npm package only.

### Added

- `src/downloader.js` — subprocess wrapper that delegates resolve/fetch/platforms
  calls to the Rust binary via JSON stdout contract.
- `update:local` and `update:local:interactive` npm scripts in WebOS and Tizen examples
  for quick local development iteration.

### Removed

- `bright-sdk-download` npm dependency (previously linked via `file:../bright-sdk-download`).
- `pkg` config and `build` npm script.
- Internal `fetch_releases()` and `resolve_url_tpl()` functions — replaced by
  `resolve_sdk()`, `fetch_sdk()`, `list_platforms()` delegating to Rust binary.

### Changed

- `download_sdk()` in `BrightSdkUpdateBase` now calls the Rust binary's `fetch` command
  which handles download, SHA-256 verification, and extraction in a single step.
- `assign_sdk_url()` and `assign_sdk_ver()` use `resolve_sdk()` subprocess call
  instead of manually fetching and parsing the releases config.
- `bin/bright-sdk.js` CLI wrapper now requires `../src/downloader.js` instead of
  the external `bright-sdk-download` package.
- Progress bar is rendered by the Rust binary (stderr inherited by the subprocess).

### Security

- SDK downloads are now verified with SHA-256 checksums (handled by the Rust binary).
- Zip Slip path traversal protection (handled by the Rust binary's extractor).

---

## [1.7.0] — 2026-04-15

### Breaking Changes

- `SDK_API_KEY` environment variable is now required for all operations.

### Added

- Authenticated releases API support.
- Windows (.csproj) platform integration.
- Apple (iOS/tvOS/macOS) Xcode project patching.
