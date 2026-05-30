# Changelog

All notable changes to this project will be documented in this file.

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
