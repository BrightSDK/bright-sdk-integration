// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const path = require('path');
const utils = require('./src/processors.js');

const {get_config_fname, process_webos} = utils;

module.exports = {process_webos};

if (require.main == module)
{
    (async function(){
        const opt = {interactive: true};
        const arg = process.argv[2];
        if (arg)
        {
            if (arg == get_config_fname(path.dirname(arg)))
                opt.config_fname = arg;
            else
                opt.appdir = arg;
        }
        await process_webos(opt);
    })();
}