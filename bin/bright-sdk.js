#!/usr/bin/env node
// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const { resolve_sdk, fetch_sdk, list_platforms } = require('../src/downloader.js');

const parse_args = args => {
    const result = { platform: null, version: 'latest', output: '.' };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if ((arg === '--platform' || arg === '-p') && args[i + 1]) {
            result.platform = args[++i];
        } else if ((arg === '--version' || arg === '-v') && args[i + 1]) {
            result.version = args[++i];
        } else if ((arg === '--output' || arg === '-o') && args[i + 1]) {
            result.output = args[++i];
        } else if (!arg.startsWith('-') && !result.platform) {
            result.platform = arg;
        }
    }
    return result;
};

const run = async () => {
    const args = process.argv.slice(2);
    const cmd = args[0];
    switch (cmd) {
        case 'resolve': {
            const argv = parse_args(args.slice(1));
            if (!argv.platform) {
                process.stderr.write(
                    'Usage: bright-sdk resolve ' + '--platform <key> [--version latest]\n',
                );
                process.exit(1);
            }
            const result = resolve_sdk(argv.platform, argv.version);
            process.stdout.write(JSON.stringify(result) + '\n');
            break;
        }
        case 'fetch': {
            const argv = parse_args(args.slice(1));
            if (!argv.platform) {
                process.stderr.write(
                    'Usage: bright-sdk fetch ' +
                        '--platform <key> [--version latest] [--output <dir>]\n',
                );
                process.exit(1);
            }
            process.stderr.write(`Fetching ${argv.platform}@${argv.version}...\n`);
            const result = fetch_sdk(argv.platform, argv.version, argv.output);
            process.stderr.write(`Done → ${result.output}\n`);
            process.stdout.write(JSON.stringify(result) + '\n');
            break;
        }
        case 'platforms': {
            const platforms = list_platforms();
            process.stdout.write(JSON.stringify(platforms) + '\n');
            break;
        }
        default:
            process.stderr.write(
                'bright-sdk — BrightSDK integration CLI\n\n' +
                    'Commands:\n' +
                    '  resolve    Resolve version and download URL (JSON output)\n' +
                    '  fetch      Download and extract SDK archive\n' +
                    '  platforms  List available platform keys\n\n' +
                    'Options:\n' +
                    '  --platform, -p   Platform key (e.g. android, ios, tizen)\n' +
                    '  --version, -v    SDK version or "latest" (default: latest)\n' +
                    '  --output, -o     Output directory (fetch only, default: .)\n\n' +
                    'Environment:\n' +
                    '  SDK_API_KEY      Required. BrightSDK API key.\n\n' +
                    'Examples:\n' +
                    '  bright-sdk resolve --platform android\n' +
                    '  bright-sdk fetch -p ios -o ./libs\n' +
                    '  bright-sdk platforms\n',
            );
            process.exit(cmd ? 1 : 0);
    }
};

run().catch(err => {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
});
