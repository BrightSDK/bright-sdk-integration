// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const path = require('path');
const utils = require('./src/processors.js');

const {get_config_fname, process_webos} = utils;

module.exports = {process_webos};

if (require.main == module)
{
    (async function(){
        const opt = {interactive: true, config_fnames: []};
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
        await process_webos(opt);
    })();
}