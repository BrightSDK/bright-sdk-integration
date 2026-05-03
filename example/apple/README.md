# Apple Platform Examples

This folder contains example configurations and scripts for integrating BrightSDK into iOS, tvOS and macOS Xcode projects.

## Structure

```
apple/
├── ios/
│   ├── brd_sdk.config.json    # Pre-configured for iOS
│   ├── auto-update.sh         # Run non-interactively using config file
│   ├── interactive-update.sh  # Run interactively (prompts for missing values)
│   └── reset.sh               # Remove SDK files and restore clean state
├── tvos/
│   └── ...                    # Same structure, configured for tvOS
└── macos/
    └── ...                    # Same structure, configured for macOS
```

## Prerequisites

- Node.js ≥ 18
- An existing Xcode project in or below the working directory

## Usage

Copy the relevant platform folder next to your `.xcodeproj`, then run:

```sh
# First time or interactive update:
sh interactive-update.sh

# Automated update (CI / scripted):
sh auto-update.sh
```

The tool will:
1. Download the latest BrightSDK zip from the CDN
2. Extract the framework into `BrightSDK/`
3. Patch `project.pbxproj` — add the framework with Embed & Sign, set build settings
4. Save `brd_sdk.config.json` for future runs

For macOS, additional build phases are added: a **Copy Files** phase placing `net_updater.app` under `Contents/Library/LoginItems`, and a **Resign** run-script phase (when `resign_net_updater.sh` ships in the SDK zip).

## Reset

```sh
sh reset.sh
```

Removes the downloaded `BrightSDK/` directory and restores the git-tracked files.
