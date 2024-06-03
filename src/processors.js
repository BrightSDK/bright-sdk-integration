// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');
const navigation = require('./navigation.js');

/**
Defines base functions for the processors:
- print
- printS
- read_env
- read_config_and_merge
- get_value
- search_workdir
*/
const config_filename = 'brd_sdk.config.json';

const {
    lbr,
    print: print_base, process_init, process_close,
    read_json, write_json, search_directory,
    download_from_url, unzip, set_json_props, replace_file,
} = lib;

const {clear_screen, prompt} = navigation;

const js_ext = '.js'; // dodo remove
const brd_api_base = 'BrightData';

// function that creates path to configuration file
const get_config_fname = appdir=>path.join(appdir, config_filename);

let buffer = '';
// Adds strings into the buffer for later output
const print = (opt, s, _opt)=>{
    if (!opt.interactive && !opt.verbose)
        return;
    const printed = print_base(s, _opt);
    buffer += printed;
};
const CS = `\u001b[1;91m`;
const CE = `\u001b[0m`;
const printS = (opt, string)=>{
    print(opt, `${CS}${string}${CE}`)
}

// Defines the env variables
const read_env = ()=>({
    js_dir: process.env.JS_DIR,
    components_dir: process.env.COMPONENTS_DIR,
    app_dir: process.env.APP_DIR,
    index: process.env.INDEX,
});

// Reads file and merges with `config`
const read_config_and_merge = (opt, config, fname)=>{
    print(opt, `Reading configuration file ${fname}...`);
    const overrides = read_json(fname);
    Object.assign(config, overrides);
};

// Obtains value from the `config_value` or asks user
const get_value = async(opt, question, def_answer, config_value, _opt={})=>{
    let value;
    if (!opt.interactive || config_value)
        value = config_value;
    else
    {
        _opt.buffer = buffer;
        value = await prompt(question, def_answer, _opt);
        for (const parent of [workdir, _opt.strip])
        {
            if (parent && value.startsWith(parent))
                value = path.relative(parent, value);
        }
    }
    if (opt.interactive)
        clear_screen();
    print_base(buffer);
    print(opt, `${question}: ${value}`);
    return value;
};

// Searches for given filename
// diff
const search_workdir = async (dir, name)=>{
    return await search_directory(dir, new RegExp(name), {exclude: [
        '.git',
        '.sdk',
        '.vscode',
        '.idea',
        'node_modules',
    ].map(p=>path.join(dir, p))});
};

module.exports = {get_config_fname, print, printS, read_env,
   read_config_and_merge, get_value, search_workdir};
