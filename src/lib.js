// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { download_from_url, resolve_sdk, fetch_sdk, list_platforms } = require('./downloader.js');
const { unzip } = require('./unzip.js');

const lbr = os.EOL;

const print = (s, opt = {}) => {
    let output = s + lbr;
    if (opt.bold) {
        output = `\x1b[1m${output}\x1b[0m`;
    }
    process.stdout.write(output);
    return output;
};
const exit = (s, code = 1) => {
    print(s);
    process.exit(code);
};

const process_init = () => {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', () => {});
    }
    process.on('SIGINT', () => {
        exit('\nUser aborted. Exiting...', 0);
    });
    process.on('exit', code => {
        print(`Exiting with code ${code}`);
    });
};

const process_close = () => {
    exit('Goodbye.', 0);
};

const read_text = fname => fs.readFileSync(fname)?.toString();
const read_json = fname => JSON.parse(read_text(fname));
const write_text = (fname, data) => fs.writeFileSync(fname, data, { encoding: 'utf-8' });
const write_json = (fname, data) => write_text(fname, JSON.stringify(data, null, 2));

const search_directory = async (dir, pattern, opt) => {
    const files = await fs.promises.readdir(dir);
    for (const f of files) {
        const filename = path.join(dir, f);
        if (opt?.exclude.includes(filename)) {
            continue;
        }
        const stats = await fs.promises.stat(filename);
        if (stats.isDirectory()) {
            const result = await search_directory(filename, pattern, opt);
            if (result) {
                return result;
            }
        } else if (pattern.test(f)) {
            return filename;
        }
    }
};

const set_prop = (obj, path, value) => {
    const keys = path.split('.');
    let dst = obj;
    let key;
    for (let i = 0; i < keys.length; i++) {
        key = keys[i];
        if (keys[i + 1]) {
            dst = dst[key];
        }
    }
    Object.assign(dst, { [key]: value });
    return obj;
};

const set_json_props = (fname, props, value) => {
    const json = read_json(fname);
    for (const prop of props) {
        set_prop(json, prop, value);
    }
    write_json(fname, json);
};

const replace_file = async (src, dst) => {
    let replaced;
    if (fs.existsSync(dst)) {
        await fs.remove(dst);
        replaced = true;
    }
    await fs.copy(src, dst);
    return replaced;
};

module.exports = {
    lbr,
    print,
    process_init,
    process_close,
    read_json,
    write_json,
    search_directory,
    download_from_url,
    resolve_sdk,
    fetch_sdk,
    list_platforms,
    set_json_props,
    replace_file,
    exit,
    unzip,
};
