# BrightSDK — Windows Integration Example

This folder demonstrates how to integrate BrightSDK into a Windows WPF (.NET Framework 4.8) project
using the **bright-sdk-integration** CLI tool.

## Folder structure

```
windows/
├── app/                        ← example WPF project
│   ├── example.csproj          ← .NET Framework 4.8 WPF project file
│   └── App.xaml.cs             ← minimal app with BrightSDK init
├── BrightSDK/                  ← created at runtime (gitignored) — SDK DLL lives here
├── brd_sdk.config.json         ← SDK config (workdir points to windows/)
├── auto-update.ps1             ← non-interactive update
├── interactive-update.ps1      ← interactive update (prompts for missing values)
├── reset.ps1                   ← remove downloaded SDK, restore clean state
└── README.md                   ← this file
```

## Prerequisites

- **Node.js ≥ 18** — to run the integration tool
- **Visual Studio 2022** (or 2019) — to open and build the WPF project
- **.NET Framework 4.8 targeting pack** — included with Visual Studio by default
- An internet connection — the SDK zip is downloaded from the CDN on first run

## Quick start — example app

### 1. Install SDK and patch the project

Run the auto-update script from this folder:

```powershell
.\auto-update.ps1
```

The tool will:

1. Download the latest BrightSDK zip from `cdn.bright-sdk.com/static/`
2. Extract `lum_sdk.dll` and `net_updater64.exe` into `windows/BrightSDK/`
3. Copy `brd_config.json` from the SDK into `app/` (next to the `.csproj`)
4. Open `app/example.csproj` and inject a `<Reference>` to `lum_sdk.dll` and a `<None>` entry for `brd_config.json`
5. Save `brd_sdk.config.json` for future runs

### 2. Open the project in Visual Studio

```sh
start app/example.csproj
```

Or double-click `app/example.csproj` in Explorer.

### 3. Build and run

Select a target platform (x64 recommended) and press **F5**.

### Reset to clean state

```powershell
.\reset.ps1
```

This removes `BrightSDK/` and reverts `app/example.csproj` to its original state.

## Using the tool with your own project

Copy `brd_sdk.config.json` next to your own `.csproj`, then edit it:

```json
{
  "workdir": ".",
  "libs_dir": "BrightSDK",
  "sdk_ver": "latest",
  "sdk_url": "https://cdn.bright-sdk.com/static/bright_sdk_win-SDK_VER.zip"
}
```

Then run:

```sh
node /path/to/bright-sdk-integration/index.js --platform windows brd_sdk.config.json
```

Or install globally and use npx:

```sh
npm install -g https://brightsdk.github.io/packages/bright-sdk-integration/latest.tgz
npx bright-sdk-integration --platform windows
```

## What gets patched in your .csproj

The tool injects two item groups into your `.csproj`:

```xml
<!-- lum_sdk -->
<ItemGroup>
  <Reference Include="lum_sdk">
    <HintPath>BrightSDK\lum_sdk.dll</HintPath>
  </Reference>
</ItemGroup>
<ItemGroup>
  <None Include="brd_config.json">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </None>
</ItemGroup>
```

The marker comment (`<!-- lum_sdk -->`) prevents duplicate patching on subsequent runs.
