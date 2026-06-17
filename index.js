#!/usr/bin/env node
// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const path = require('path');
const yargs = require('yargs');
const {
    get_config_fname,
    process_web,
    process_apple,
    process_windows,
} = require('./src/platforms/index.js');

const banner = `
\x1b[36m
    ██████╗ ██████╗ ██╗ ██████╗ ██╗  ██╗████████╗\x1b[33m███████╗██████╗ ██╗  ██╗
    \x1b[36m██╔══██╗██╔══██╗██║██╔════╝ ██║  ██║╚══██╔══╝\x1b[33m██╔════╝██╔══██╗██║ ██╔╝
    \x1b[36m██████╔╝██████╔╝██║██║  ███╗███████║   ██║   \x1b[33m███████╗██║  ██║█████╔╝
    \x1b[36m██╔══██╗██╔══██╗██║██║   ██║██╔══██║   ██║   \x1b[33m╚════██║██║  ██║██╔═██╗
    \x1b[36m██████╔╝██║  ██║██║╚██████╔╝██║  ██║   ██║   \x1b[33m███████║██████╔╝██║  ██╗
    \x1b[36m╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   \x1b[33m╚══════╝╚═════╝ ╚═╝  ╚═╝
\x1b[0m
    \x1b[1mBrightSDK Integration Code Generator\x1b[0m

`;

const usage = `\x1b[1mUSAGE:\x1b[0m
    bright-sdk-integration --platform <platform> [config.json | app_path]

\x1b[1mPLATFORMS:\x1b[0m
    webos       LG WebOS TV app
    tizen       Samsung Tizen TV app
    ios         iOS app (Xcode)
    tvos        tvOS app (Xcode)
    macos       macOS app (Xcode)
    windows     Windows app (.NET / WPF)

\x1b[1mEXAMPLES:\x1b[0m
    bright-sdk-integration --platform webos
    bright-sdk-integration --platform ios brd_sdk.config.json
    bright-sdk-integration --platform windows ./my-app

\x1b[1mOPTIONS:\x1b[0m
    -p, --platform    Target platform (required)
    -h, --help        Show this help

\x1b[2mRun without config file for interactive mode.\x1b[0m
`;

if (require.main === module) {
    (async function () {
        const argv = yargs(process.argv.slice(2))
            .option('platform', {
                alias: 'p',
                type: 'string',
                describe: 'Specify the platform',
            })
            .help(false).argv;

        if (!argv.platform && argv._.length === 0) {
            process.stdout.write(banner);
            process.stdout.write(usage);
            process.exit(0);
        }

        if (!argv.platform) {
            process.stderr.write('Error: --platform is required\n\n');
            process.stdout.write(usage);
            process.exit(1);
        }

        const opt = { interactive: true, config_fnames: [], platform: argv.platform };
        for (const arg of argv._) {
            if (arg === get_config_fname(path.dirname(arg))) {
                opt.config_fnames.push(arg);
            } else {
                opt.appdir = arg;
                break;
            }
        }
        switch (opt.platform) {
            case 'tizen':
            case 'webos':
                await process_web(opt);
                break;
            case 'ios':
            case 'tvos':
            case 'macos':
                await process_apple(opt);
                break;
            case 'windows':
                await process_windows(opt);
                break;
            default:
                throw new Error(`Unsupported platform: ${opt.platform}`);
        }
    })();
}

module.exports = {
    process_web,
    process_webos: opt => process_web({ ...opt, platform: 'webos' }),
    process_tizen: opt => process_web({ ...opt, platform: 'tizen' }),
    process_apple,
    process_ios: opt => process_apple({ ...opt, platform: 'ios' }),
    process_tvos: opt => process_apple({ ...opt, platform: 'tvos' }),
    process_macos: opt => process_apple({ ...opt, platform: 'macos' }),
    process_windows,
};
