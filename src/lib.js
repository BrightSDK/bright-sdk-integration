// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const os = require('os');
const https = require('follow-redirects').https;
const path = require('path');
const unzipper = require('unzipper');
const fs = require('fs-extra');

const lbr = os.EOL;

const print = (s, opt={})=>{
    let output = s+lbr;
    if (opt.bold)
        output = `\x1b[1m${output}\x1b[0m`;
    if (opt.colored)
        output = `\x1b[1;91m${output}\x1b[0m`;
    process.stdout.write(output);
    return output;
};
const exit = (s, code=1)=>{
    print(s);
    process.exit(code);
};

// Prepares interactive reading from STDIN
const process_init = ()=>{
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', ()=>{});
    process.on('SIGINT', ()=>{
        exit('\nUser aborted. Exiting...', 0);
    });
    process.on('exit', code=>{
        print(`Exiting with code ${code}`);
    });
};

const process_close = ()=>{
    exit('Goodbye.', 0);
};

const read_text= fname=>fs.readFileSync(fname)?.toString();
const read_json = (fpath)=>{
    return fs.existsSync(fpath)
    ? JSON.parse(read_text(fpath)) : {};
}
const write_text = (fname, data)=>fs.writeFileSync(fname, data, {encoding: 'utf-8'});
const write_json = (fname, data)=>write_text(fname, JSON.stringify(data, null, 2));

// Searches file by the pattern in the given dir
const search_directory = async(dir, pattern, opt)=>{
    const files = await fs.promises.readdir(dir);
    for (const f of files) {
        const filename = path.join(dir, f);
        if (opt?.exclude.includes(filename))
            continue;
        const stats = await fs.promises.stat(filename);
        if (pattern.test(f))
            return filename;
        else if (stats.isDirectory())
        {
            const result = await search_directory(filename, pattern, opt);
            if (result)
                return result;
        }
    }
};

const download_from_url = (url, fname)=>new Promise((resolve, reject)=>{
    const request = https.get(url, response=>{
        const fileStream = fs.createWriteStream(fname);
        response.pipe(fileStream);
        response.on('end', resolve);
    });
    request.on('error', reject);
});

const unzip = (fname, dst)=>new Promise((resolve, reject)=>{
    const rs = fs.createReadStream(fname);
    rs.pipe(unzipper.Extract({path: dst}))
    .on('error', reject)
    .on('finish', resolve);
});


const set_prop = (obj, path, value)=>{
    const keys = path.split('.');
    let dst = obj;
    let key;
    for (let i=0; i<keys.length; i++)
    {
        key = keys[i];
        if (keys[i+1])
            dst = dst[key];
    }
    Object.assign(dst, {[key]: value});
    return obj;
};

const set_json_props = (fname, props, value)=>{
    const json = read_json(fname);
    for (const prop of props)
        set_prop(json, prop, value);
    write_json(fname, json);
};

const replace_file = async(src, dst)=>{
    let replaced;
    if (fs.existsSync(dst))
    {
        await fs.remove(dst);
        replaced = true;
    }
    await fs.copy(src, dst);
    return replaced;
};

module.exports = {
    lbr,
    print, process_init, process_close,
    read_json, write_json, search_directory,
    download_from_url, unzip, set_json_props, replace_file, exit,
};
