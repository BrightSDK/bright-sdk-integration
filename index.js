#!/usr/bin/env node
// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const path = require('path');
const yargs = require('yargs');
const {get_config_fname, process_web, process_apple} = require('./src/platforms.js');

if (require.main == module)
{
    (async function(){
        const argv = yargs
            .option('platform', {
                alias: 'p',
                type: 'string',
                default: 'webos',
                describe: 'Specify the platform'
            })
            .argv;

        const opt = {interactive: true, config_fnames: [], platform: argv.platform};
        for (const arg of argv._)
        {
            if (arg == get_config_fname(path.dirname(arg)))
                opt.config_fnames.push(arg);
            else
            {
                opt.appdir = arg;
                break;
            }
        }
        switch (opt.platform)
        {
        case 'tizen':
        case 'webos':
            await process_web(opt);
            break;
        case 'ios':
        case 'tvos':
        case 'macos':
            await process_apple(opt);
            break;
        default:
            throw new Error(`Unsupported platform: ${opt.platform}`);
        }
    })();
}

module.exports = {
    process_web,
    process_webos: opt=>process_web({...opt, platform: 'webos'}),
    process_tizen: opt=>process_web({...opt, platform: 'tizen'}),
    process_apple,
    process_ios: opt=>process_apple({...opt, platform: 'ios'}),
    process_tvos: opt=>process_apple({...opt, platform: 'tvos'}),
    process_macos: opt=>process_apple({...opt, platform: 'macos'}),
};