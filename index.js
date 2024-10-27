// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const path = require('path');
const yargs = require('yargs');
const {get_config_fname, process_web} = require('./src/platforms.js');

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
        for (let i=2; i<process.argv.length; i++)
        {
            const arg = process.argv[i];
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
        default:
            throw new Error(`Unsupported platform: ${opt.platform}`);
        }
    })();
}