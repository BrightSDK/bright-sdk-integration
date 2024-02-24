// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const readline = require('readline');
const os = require('os');
const https = require('follow-redirects').https;
const path = require('path');
const unzipper = require('unzipper');
const fs = require('fs-extra');

const lbr = os.EOL;

const print = s=>process.stdout.write(s+lbr);
const exit = (s, code=1)=>{
    print(s);
    process.exit(code);
};

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

const prompt = async(question, def_answer)=>{
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const full_question = def_answer
        ? `${question} (${def_answer}): `
        : `${question}: `;
    return new Promise(resolve=>{
        rl.question(full_question, answer=>{
            rl.close();
            const res = answer||def_answer;
            if (!res)
                exit('Value required!');
            print(res);
            resolve(res);
        });
    });
};

const read_text= fname=>fs.readFileSync(fname)?.toString();
const read_json = fname=>JSON.parse(read_text(fname));
const write_text = (fname, data)=>fs.writeFileSync(fname, data, {encoding: 'utf-8'});
const write_json = (fname, data)=>write_text(fname, JSON.stringify(data, null, 2));

const search_filename = async (dir, name)=>{
    const fnames = await fs.promises.readdir(dir);
    for (const file of fnames) {
        const filePath = path.join(dir, file);
        const stats = await fs.promises.stat(filePath);
        if (stats.isDirectory()) {
            const result = await search_filename(filePath, name);
            if (result) {
                return result;
            }
        } else if (file === name) {
            return filePath;
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
    print, process_init, prompt, process_close,
    read_json, write_json, search_filename,
    download_from_url, unzip, set_json_props, replace_file,
};