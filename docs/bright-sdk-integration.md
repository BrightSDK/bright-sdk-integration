# bright-sdk-integration

**GitHub**: https://github.com/BrightSDK/bright-sdk-integration
**npm package name**: `bright-sdk-integration`
**Version**: 1.7.0
**Author**: vladislavs@brightdata.com

## What it is

`bright-sdk-integration` is a Node.js CLI tool and library that automates the process of integrating or updating BrightSDK inside a Smart TV and mobile application project. It handles:

- Resolving the correct SDK download URL from the BrightSDK integration config API.
- Downloading the correct SDK version for a given platform.
- Extracting and copying the SDK files into the right directories in your app.
- Updating `index.html` to reference the new SDK API file (WebOS/Tizen).
- Updating the SDK service directory (`service/`).
- Optionally injecting the BrightSDK helper file (`brd_api.helper.min.js`).
- Saving and reusing a `brd_sdk.config.json` configuration file for future runs.

**Supported platforms**: WebOS, Tizen, iOS, tvOS, macOS, Windows.

---

## Requirements

- Node.js 18+
- A BrightSDK API key set as `SDK_API_KEY` environment variable — see [How to obtain an API key](https://github.com/BrightSDK/bright-sdk-integration/blob/main/docs/obtain-api-key.md)

```bash
export SDK_API_KEY=<your-api-key>
```

> **Breaking change in v1.7.0**: `SDK_API_KEY` is now required. The tool fetches the SDK download URL from the authenticated integration config API (`https://bright-sdk.com/sdk_api/sdk/integration/config`). Older versions that used hardcoded CDN URLs will stop working once the unauthenticated endpoint is retired.

---

## Installation

### One-off run (no install required)

```bash
npx github:BrightSDK/bright-sdk-integration --platform <platform>
```

### Global install (recommended for repeated use)

```bash
npm install -g github:BrightSDK/bright-sdk-integration
bright-sdk-integration --platform webos
```

---

## CLI Usage

`--platform` is required in all cases.

```bash
bright-sdk-integration --platform <platform> [config.json | app_path]
```

Supported platform values:

| Value     | Description              |
| --------- | ------------------------ |
| `webos`   | LG WebOS TV app          |
| `tizen`   | Samsung Tizen TV app     |
| `ios`     | iOS app (Xcode)          |
| `tvos`    | tvOS app (Xcode)         |
| `macos`   | macOS app (Xcode)        |
| `windows` | Windows app (.NET / WPF) |

### Examples

```bash
bright-sdk-integration --platform webos
bright-sdk-integration --platform tizen /path/to/app/brd_sdk.config.json
bright-sdk-integration --platform ios /path/to/app
bright-sdk-integration --platform windows ./my-app
```

### Config file mode

Pass a path to `brd_sdk.config.json`:

```bash
bright-sdk-integration --platform webos /path/to/your/app/brd_sdk.config.json
```

### App directory mode

Pass a path to the app directory. The tool will automatically look for `brd_sdk.config.json` inside it:

```bash
bright-sdk-integration --platform tizen /path/to/your/app
```

---

## brd_sdk.config.json

This is the per-project configuration file. It is read on startup and written back with resolved values after each run to speed up future updates.

The SDK download URL is resolved automatically from the integration config API using `SDK_API_KEY`. Manual `sdk_url` / `sdk_url_mask` entries in the config are only used as a fallback if the API is unreachable.

### WebOS example

```json
{
    "workdir": ".",
    "app_dir": "app",
    "js_dir": "app",
    "index": "app/index.html",
    "sdk_service_dir": "service",
    "sdk_ver": "latest",
    "use_helper": true
}
```

### Tizen example

```json
{
    "workdir": ".",
    "app_dir": "app",
    "js_dir": "app/js",
    "index": "app/index.html",
    "sdk_service_dir": "app/service",
    "sdk_ver": "latest",
    "use_helper": true
}
```

### All config keys

| Key               | Type    | Description                                |
| ----------------- | ------- | ------------------------------------------ |
| `workdir`         | string  | Absolute or relative working directory     |
| `app_dir`         | string  | App folder path relative to `workdir`      |
| `js_dir`          | string  | Directory containing `brd_api.js`          |
| `index`           | string  | Path to `index.html` relative to `workdir` |
| `sdk_service_dir` | string  | Directory for the SDK background service   |
| `sdk_ver`         | string  | SDK version string, or `"latest"`          |
| `use_helper`      | boolean | Whether to include `brd_api.helper.min.js` |
| `config_fname`    | string  | Path to the config file itself             |

---

## Library API

The package can also be required as a Node.js module:

```js
const brd_sdk_gen = require('bright-sdk-integration');
```

`SDK_API_KEY` must be set in `process.env` before calling any of these functions.

### `process_web(opt)` → Promise

Entry point for WebOS and Tizen.

```js
await brd_sdk_gen.process_web({
    platform: 'webos', // 'webos' | 'tizen'
    appdir: '/path/to/app', // or use config_fname
    config_fname: '/path/to/brd_sdk.config.json',
    verbose: false,
});
```

### `process_webos(opt)` / `process_tizen(opt)` → Promise

Shortcuts that call `process_web` with the platform preset.

```js
await brd_sdk_gen.process_webos({ appdir: '/path/to/app', verbose: true });
await brd_sdk_gen.process_tizen({ config_fname: '/path/to/app/brd_sdk.config.json' });
```

### `process_apple(opt)` → Promise

Entry point for iOS, tvOS, and macOS.

```js
await brd_sdk_gen.process_apple({
    platform: 'ios', // 'ios' | 'tvos' | 'macos'
    appdir: '/path/to/app',
    verbose: false,
});
```

### `process_ios(opt)` / `process_tvos(opt)` / `process_macos(opt)` → Promise

Shortcuts that call `process_apple` with the platform preset.

```js
await brd_sdk_gen.process_ios({ appdir: '/path/to/app' });
await brd_sdk_gen.process_macos({ config_fname: '/path/to/app/brd_sdk.config.json' });
```

### `process_windows(opt)` → Promise

Entry point for Windows (.NET / WPF).

```js
await brd_sdk_gen.process_windows({
    appdir: '/path/to/app',
    verbose: true,
});
```

#### `opt` object fields

| Field           | Type     | Description                                                |
| --------------- | -------- | ---------------------------------------------------------- |
| `platform`      | string   | Target platform (see supported values above)               |
| `appdir`        | string   | Path to the app directory (required if no `config_fname`)  |
| `config_fname`  | string   | Path to `brd_sdk.config.json` (required if no `appdir`)    |
| `config_fnames` | string[] | Array of config file paths to merge                        |
| `config`        | object   | Inline config object (overrides file-based config)         |
| `workdir`       | string   | Working directory                                          |
| `verbose`       | boolean  | Enable output when not in interactive mode                 |
| `interactive`   | boolean  | Enable interactive prompts (default: true when run as CLI) |

---

## How it works (step by step)

1. **Load config**: Reads `brd_sdk.config.json` if found in the app directory or passed as argument.
2. **Resolve app directory**: From config or interactive prompt.
3. **Resolve SDK version**: Reads `sdk_ver` from config or prompts. If `"latest"`, fetches the current version from the releases API (`urls.sdk_releases` in `config.json`, defaults to `https://bright-sdk.com/sdk_api/sdk/integration/config`). Throws if no version is returned for the platform.
4. **Download SDK zip**: Downloads from URL (e.g., `https://cdn.bright-sdk.com/static/brd_sdk_webos-1.533.23.zip`) into a local `.sdk/{platform}/{version}/` cache.
5. **Extract SDK**: Unzips the downloaded archive into the versioned cache directory.
6. **Copy API file**: Copies `brd_api.js` (versioned) into the app's JS directory.
7. **Copy helper**: If `use_helper` is true, downloads the latest `brd_api.helper.min.js` from `https://raw.githubusercontent.com/BrightSDK/bright-sdk-integration-helper/refs/heads/main/releases/latest/brd_api.helper.min.js` and copies it alongside the API file.
8. **Update index.html**: Rewrites the `<script src="...brd_api....js">` reference in `index.html` to point to the new versioned filename.
9. **Copy service directory**: Copies the SDK service files into `sdk_service_dir`.
10. **Save config**: Writes resolved values back to `brd_sdk.config.json` for future reuse.

---

## Internal source files

| File                | Purpose                                                                        |
| ------------------- | ------------------------------------------------------------------------------ |
| `index.js`          | CLI entry point, yargs argument parsing, module exports                        |
| `src/platforms.js`  | `BrightSdkUpdateWeb` class — orchestrates the full update flow for WebOS/Tizen |
| `src/lib.js`        | Low-level utilities: file I/O, download, unzip, JSON manipulation              |
| `src/navigation.js` | Terminal UI helpers: `prompt()`, `clear_screen()` for interactive mode         |
| `config.json`       | Tool-level config: SDK CDN URLs, file naming conventions                       |

---

## Dependencies

| Package            | Purpose                                   |
| ------------------ | ----------------------------------------- |
| `follow-redirects` | HTTP/HTTPS download with redirect support |
| `fs-extra`         | Extended filesystem operations            |
| `readline`         | Terminal input for interactive prompts    |
| `unzipper`         | Zip file extraction                       |
| `yargs`            | CLI argument parsing                      |

---

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Tests are in `test/` and use Jest. Coverage reports are in `coverage/`.

---

## Notes

- The tool stores downloaded SDK archives locally in `.sdk/{platform}/{version}/` to avoid re-downloading on subsequent runs.
- `brd_sdk.config.json` is updated after each run with the resolved configuration, including the SDK version used — the next run can detect whether an update is needed.
- The helper file (`brd_api.helper.min.js`) is always fetched fresh from the GitHub releases endpoint unless `use_helper` is false.
- When used as a library (non-interactive), pass `verbose: true` to see progress output; otherwise all output is suppressed.
- The `update_index_ref` method requires that `index.html` already contains a `<script>` referencing a file matching `brd_api*.js`. Initial SDK injection (first-time setup with no existing reference) is not yet supported.
