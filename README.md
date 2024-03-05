# BrightSDK Integration Code Generator

## Overview

Welcome to the BrightSDK Integration Code Generator! This Node.js package is designed to assist in integrating BrightSDK into various platforms.

## Features

- Download and extract the BrightSDK SDK for different platforms.
- Modify package information in the SDK.
- Copy necessary files to your application directory.
- Generate a configuration file for future use.

## Prerequisites

- NodeJS (tested on v14.19.0)
- NPM (tested on v6.14.18)
- Git (tested on 2.39.3 (Apple Git-145))

## Supported Platforms (Work in Progress)

- [x] WebOS
- [ ] Android
- [ ] iOS
- [ ] Windows
- [ ] macOS

## Installation

1. Install the package directly from git:

    ```bash
    git clone https://github.com/vladislavs-luminati/bright-sdk-integration.git

    ```

1. Navigate to the installation directory

    ```bash
    cd bright-sdk-integration
    ```
1. Install project dependencies using `npm`
    
    ```bash
    npm install
    
    ```

## Use as command line tool

Follow the next steps to use the generator as command line tool to integrate the new application or manually update the Bright SDK distribution in existing app.

Script is executed from it's directory using `node` command with or without arguments. The following options are supported:

#### Interactive mode

Execute script without command line arguments to make the tool ask you for the configuration values. 

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

Application JS directory (/path/to/my/app/js): 
/path/to/my/app/js

SDK Service dir (/path/to/my/app/service): 
/path/to/my/app/service

SDK URL mask (https://path/to/sdk_SDK_VER.zip): 
https://path/to/sdk_SDK_VER.zip

```

The interactive prompts include:

| Configuration            | Example                             |
|--------------------------|-------------------------------------|
| Path to the app directory | `/path/to/your/app`                 |
| Path to config file       | `/path/to/your/config.json` (optional)|
| SDK Version               | `1.438.821`                         |
| Application JS directory  | `/path/to/your/app/js`              |
| SDK Service directory     | `/path/to/your/app/service`         |
| SDK URL mask              | `https://example.com/sdk_SDK_VER.zip` |


Follow the prompts to provide the required information, and the script will proceed with the integration based on your inputs. 

**NOTE:** The tool will try to guess the parameter values based on your previous integration and your application structure.

Feel free to customize the prompts and parameters based on your project's specific requirements.

#### Config file mode

Execute script, adding path to the JSON configuration file as the command line argument. 

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
  "js_dir": "/path/to/your/app/js",
  "sdk_service_dir": "/path/to/your/app/service",
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
    const brd_sdk_gen = require('/path/to/local/installation');
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
