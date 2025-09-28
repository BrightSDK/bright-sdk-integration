# BrightSDK Integration Code Generator

## Overview

Welcome to the BrightSDK Integration Code Generator! This Node.js package is designed to assist in integrating BrightSDK into various platforms.

## Features

- Download and extract the BrightSDK for different platforms.
- Modify package information in the SDK.
- Copy necessary files to your application directory.
- Generate a configuration file for future use.

## Prerequisites

- NodeJS (tested on v14.19.0)
- NPM (tested on v6.14.18)
- Git (tested on 2.39.3 (Apple Git-145))

## Supported Platforms (Work in Progress)

- [x] WebOS
- [x] Tizen
- [ ] Android
- [ ] iOS
- [ ] Windows
- [ ] macOS

## Installation

Recommended: install globally from the official tarball and then execute with npx. This installs a known release and lets you run it via npx:

```bash
# install globally from the release tarball
npm install -g https://brightsdk.github.io/packages/bright-sdk-integration/latest.tgz

# run with npx after install
npx bright-sdk-integration
```

## Use as command line tool

Follow the next steps to use the generator as command line tool to integrate the new application or manually update the Bright SDK distribution in existing app.

You can run the script via the globally installed package (recommended) using npx, or with node from a local checkout. The following options are supported:

#### Interactive mode

Execute the script without command line arguments to make the tool ask you for the configuration values.

After global install, run with npx:

```bash
npx bright-sdk-integration
```

Or, from a local checkout:

```bash
node index.js
```

The script will prompt you for the necessary information interactively, allowing you to provide the path to the configuration file, the path to the application directory, or configure all parameters interactively.

```bash
Welcome to BrightSDK Integration Code Generator for WebOS!
Press CTRL+C at any time to break execution.
NOTE: remember to save your uncommited changes first.

Path to application directory: /path/to/my/app
/path/to/my/app

SDK Version (1.438.821):
1.438.821

Application JS directory (js):
/js

index.html Location (index.html):
/index.html

SDK Service dir (/path/to/my/app/service):
/service

SDK URL mask (https://path/to/sdk_SDK_VER.zip):
https://path/to/sdk_SDK_VER.zip

```

The interactive prompts include:

| Configuration            | Example                             |
|--------------------------|-------------------------------------|
| Path to the app directory | `/path/to/your/app`                 |
| Path to config file       | `/path/to/your/config.json` (optional)|
| SDK Version               | `1.438.821`                         |
| Application JS directory  | `js`              |
| index.html Location       | `index.html`                        |
| SDK Service directory     | `service`         |
| SDK URL mask              | `https://example.com/sdk_SDK_VER.zip` |

Note that file paths are provided relative to your app folder.

Follow the prompts to provide the required information, and the script will proceed with the integration based on your inputs. 

**NOTE:** The tool will try to guess the parameter values based on your previous integration and your application structure.

Feel free to customize the prompts and parameters based on your project's specific requirements.

#### Config file mode

Execute the script, adding path to the JSON configuration file as the command line argument.

After global install, run with npx:

```bash
npx bright-sdk-integration /path/to/your/app/brd_sdk.config.json
```

Or, from a local checkout:

```bash
node index.js /path/to/your/app/brd_sdk.config.json
```
Once the file is readed successfully, the program will provide the respected output:

```bash
Reading configuration file /path/to/your/app/brd_sdk.config.json...
```

##### JSON configuration file definition and example:

```json
{
  "appdir": "/path/to/your/app",
  "config_fname": "/path/to/your/config.json",
  "sdk_ver": "1.438.821",
  "js_dir": "js",
  "index": "index.html",
  "sdk_service_dir": "service",
  "sdk_url": "https://example.com/sdk_SDK_VER.zip"
}
```

The script will use the provided values from JSON configuration file. If some values are missing, the tool will prompt the user for the missing information interactively.

#### App path mode

Alternatively, you can pass your application path as the command line argument. In this mode the tool will try to locate `brd_sdk.config.json` in the specified folder, and use it as the JSON configuration file, described in the previous step.

## Use as the library

Follow the next steps to use the generator from your NodeJS script upon application update process.

1. Require the library from the local directory:

    ```js
    const brd_sdk_gen = require('bright-sdk-integration');
    ```
1. Invoke `process_webos` method to update the Bright SDK distribution in the existing app.
    
    ```js
    await brd_sdk_gen.process_webos(opt);
    ```

##### opt definition and example:

```js
{
  appdir: '/path/to/your/app',
  config_fname": '/path/to/your/config.json',
  verbose: false, // disable program output
}
```

**NOTE:** Either `appdir` or `config_fname` is required in order for the method to work.



## The Flow:

1. **Initialization:**
When the tool is executed, it initializes and displays a welcome message along with important instructions, such as using CTRL+C to break execution and a reminder to save uncommitted changes.

2. **Interactive Configuration:**
The tool prompts the user for configuration parameters interactively. These parameters include the path to the application directory, the SDK version, paths to relevant directories, and a URL mask for SDK download.

3. **Configuration File Check:**
The tool checks for the presence of a configuration file. If a file is found, it reads the values from the file and uses them for configuration. This step allows users to reuse or predefine configurations.

4. **Guessing Parameters:**
The tool attempts to guess certain parameter values based on the user's previous integrations and the structure of the application. This helps streamline the process for users who have a consistent project structure.

5. **Downloading SDK:**
Using the specified SDK version and URL mask, the tool downloads the SDK package from the provided URL. The package is typically a compressed file containing necessary resources.

6. **SDK Extraction:**
The downloaded SDK package is then extracted into a designated directory within the project, creating the necessary directory structure for integration.

7. **Configuration Update:**
The tool may dynamically update the configuration file with guessed values for future reference, providing users with a preconfigured file for subsequent integrations.

8. **File Copy and Modification:**
Relevant files, such as SDK service files and application-specific files, are copied and modified based on the provided configuration. This step ensures that the BrightSDK integration is appropriately set up within the project.

9. **Completion Message:**
Upon successful completion of the integration process, the tool displays a completion message, providing users with information on the next steps and actions they can take.

10. **Optional Commit Steps:**
The tool may suggest optional steps for users to commit their changes to version control systems, making it easier to track and manage BrightSDK integrations.

11. **Closing Interaction:**
The tool may prompt the user to acknowledge the completion and, if running interactively, closes the interaction.

### Notes:
- The tool aims to streamline the integration process by providing an interactive and automated way to set up BrightSDK within a project, taking into account user input and project structure.

- Users can customize the integration based on their specific project requirements, and the tool provides flexibility in both interactive and automated modes.

## Development mode

Follow these steps when you're developing changes to this tool.

1. Clone the repo (if you don't already have it) and create a feature branch:

```bash
git clone https://github.com/BrightSDK/bright-sdk-integration.git
cd bright-sdk-integration
git checkout -b feat/describe-change
```

2. Install dependencies and run locally (fast iterative loop):

```bash
npm install
# run in interactive mode
node index.js
# or run against a config file
node index.js /path/to/your/app/brd_sdk.config.json
```

If you want to test the global install workflow locally (what users will do), install from the checkout and run via npx:

```bash
npm install -g .
npx bright-sdk-integration
```

3. Make small commits with clear messages:

```bash
git add -A
git commit -m "feat: short description of change"
```

4. Push your branch and open a pull request:

```bash
git push -u origin HEAD
# Using GitHub CLI (recommended):
gh pr create --title "feat: short description" --body "Describe the change and rationale." --base main

# Or open a PR in the browser (replace USER and BRANCH):
# https://github.com/BrightSDK/bright-sdk-integration/compare/main...USER:BRANCH?expand=1
```

5. After CI review and approvals, merge and, if needed, publish a release (maintainers only).

Notes:

- Keep changes small and focused. Include example input (config.json) when relevant so reviewers can reproduce.
- If you change public behavior, update the README and bump the package version in `package.json`.
- Use `npm uninstall -g bright-sdk-integration` to remove a local global install.
