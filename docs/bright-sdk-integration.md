# bright-sdk-integration

**GitHub**: https://github.com/BrightSDK/bright-sdk-integration
**npm package name**: `bright-sdk-integration`
**Version**: 1.5.3
**Author**: vladislavs@brightdata.com

## What it is

`bright-sdk-integration` is a Node.js CLI tool and library that automates the process of integrating or updating BrightSDK inside a Smart TV application project. It handles:

- Downloading the correct SDK version for a given platform.
- Extracting and copying the SDK files into the right directories in your app.
- Updating `index.html` to reference the new SDK API file.
- Updating the SDK service directory (`service/`).
- Optionally injecting the BrightSDK helper file (`brd_api.helper.min.js`).
- Saving and reusing a `brd_sdk.config.json` configuration file for future runs.

**Supported platforms**: WebOS, Tizen. Android, iOS, Windows, macOS are planned but not yet implemented.

---

## Installation

Install globally from the official tarball (recommended):

```bash
npm install -g https://brightsdk.github.io/packages/bright-sdk-integration/latest.tgz
```

Then run anywhere with:

```bash
npx bright-sdk-integration
```

---

## CLI Usage

### Interactive mode (default)

Run without arguments. The tool prompts for all configuration values interactively, guessing defaults from your project structure.

```bash
npx bright-sdk-integration
# or from local checkout:
node index.js
```

Prompts:
| Prompt | Description | Example |
|---|---|---|
| Path to application directory | Root of the app being integrated | `/path/to/my/app` |
| SDK Version | Version string or `latest` | `1.438.821` |
| Application JS directory | Where `brd_api.js` lives relative to app | `js` |
| index.html location | Path to the main HTML entry point | `index.html` |
| SDK Service directory | Where to place the SDK background service | `service` |
| SDK URL mask | Download URL template (use `SDK_VER` as placeholder) | `https://cdn.bright-sdk.com/static/brd_sdk_webos-SDK_VER.zip` |

### Config file mode

Pass a path to `brd_sdk.config.json`:

```bash
npx bright-sdk-integration /path/to/your/app/brd_sdk.config.json
# or:
node index.js /path/to/your/app/brd_sdk.config.json
```

### App directory mode

Pass a path to the app directory. The tool will automatically look for `brd_sdk.config.json` inside it:

```bash
npx bright-sdk-integration /path/to/your/app
node index.js /path/to/your/app
```

### Platform selection

Use `--platform` / `-p` to specify the target platform (default: `webos`):

```bash
npx bright-sdk-integration --platform tizen /path/to/app/brd_sdk.config.json
npx bright-sdk-integration -p webos
```

Supported values: `webos`, `tizen`.

---

## brd_sdk.config.json

This is the per-project configuration file. It is read on startup and written back with resolved values after each run to speed up future updates.

### WebOS example

```json
{
  "workdir": ".",
  "app_dir": "app",
  "js_dir": "app",
  "index": "app/index.html",
  "sdk_service_dir": "service",
  "sdk_ver": "latest",
  "use_helper": true,
  "sdk_url": "https://cdn.bright-sdk.com/static/brd_sdk_webos-SDK_VER.zip"
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
  "use_helper": true,
  "sdk_url": "https://cdn.bright-sdk.com/static/brd_sdk_tizen-SDK_VER.zip"
}
```

### All config keys

| Key | Type | Description |
|---|---|---|
| `workdir` | string | Absolute or relative working directory |
| `app_dir` | string | App folder path relative to `workdir` |
| `js_dir` | string | Directory containing `brd_api.js` |
| `index` | string | Path to `index.html` relative to `workdir` |
| `sdk_service_dir` | string | Directory for the SDK background service |
| `sdk_ver` | string | SDK version string, or `"latest"` |
| `sdk_url` | string | Full SDK download URL (replaces `SDK_VER` with the version) |
| `sdk_url_mask` | string | URL template using `SDK_VER` placeholder |
| `use_helper` | boolean | Whether to include `brd_api.helper.min.js` |
| `config_fname` | string | Path to the config file itself |

---

## Library API

The package can also be required as a Node.js module:

```js
const brd_sdk_gen = require('bright-sdk-integration');
```

### `process_web(opt)` → Promise

General entry point for any supported web-based platform.

```js
await brd_sdk_gen.process_web({
  platform: 'webos',        // 'webos' | 'tizen'
  appdir: '/path/to/app',   // or use config_fname
  config_fname: '/path/to/brd_sdk.config.json',
  verbose: false,           // print progress to stdout
});
```

### `process_webos(opt)` → Promise

Shortcut for WebOS. Calls `process_web` with `platform: 'webos'`.

```js
await brd_sdk_gen.process_webos({
  appdir: '/path/to/app',
  verbose: true,
});
```

### `process_tizen(opt)` → Promise

Shortcut for Tizen. Calls `process_web` with `platform: 'tizen'`.

```js
await brd_sdk_gen.process_tizen({
  config_fname: '/path/to/app/brd_sdk.config.json',
  verbose: false,
});
```

#### `opt` object fields

| Field | Type | Description |
|---|---|---|
| `platform` | string | `'webos'` or `'tizen'` |
| `appdir` | string | Path to the app directory (required if no `config_fname`) |
| `config_fname` | string | Path to `brd_sdk.config.json` (required if no `appdir`) |
| `config_fnames` | string[] | Array of config file paths to merge |
| `config` | object | Inline config object (overrides file-based config) |
| `workdir` | string | Working directory |
| `verbose` | boolean | Enable output when not in interactive mode |
| `interactive` | boolean | Enable interactive prompts (default: true when run as CLI) |

---

## How it works (step by step)

1. **Load config**: Reads `brd_sdk.config.json` if found in the app directory or passed as argument.
2. **Resolve app directory**: From config or interactive prompt.
3. **Resolve SDK version**: Reads `sdk_ver` from config or prompts. If `"latest"`, fetches current version from `https://bright-sdk.com/sdk_api/sdk/versions`.
4. **Download SDK zip**: Downloads from URL (e.g., `https://cdn.bright-sdk.com/static/brd_sdk_webos-1.533.23.zip`) into a local `.sdk/{platform}/{version}/` cache.
5. **Extract SDK**: Unzips the downloaded archive into the versioned cache directory.
6. **Copy API file**: Copies `brd_api.js` (versioned) into the app's JS directory.
7. **Copy helper**: If `use_helper` is true, downloads the latest `brd_api.helper.min.js` from `https://raw.githubusercontent.com/BrightSDK/bright-sdk-integration-helper/refs/heads/main/releases/latest/brd_api.helper.min.js` and copies it alongside the API file.
8. **Update index.html**: Rewrites the `<script src="...brd_api....js">` reference in `index.html` to point to the new versioned filename.
9. **Copy service directory**: Copies the SDK service files into `sdk_service_dir`.
10. **Save config**: Writes resolved values back to `brd_sdk.config.json` for future reuse.

---

## Internal source files

| File | Purpose |
|---|---|
| `index.js` | CLI entry point, yargs argument parsing, module exports |
| `src/platforms.js` | `BrightSdkUpdateWeb` class — orchestrates the full update flow for WebOS/Tizen |
| `src/lib.js` | Low-level utilities: file I/O, download, unzip, JSON manipulation |
| `src/navigation.js` | Terminal UI helpers: `prompt()`, `clear_screen()` for interactive mode |
| `config.json` | Tool-level config: SDK CDN URLs, file naming conventions |

---

## Dependencies

| Package | Purpose |
|---|---|
| `follow-redirects` | HTTP/HTTPS download with redirect support |
| `fs-extra` | Extended filesystem operations |
| `readline` | Terminal input for interactive prompts |
| `unzipper` | Zip file extraction |
| `yargs` | CLI argument parsing |

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
