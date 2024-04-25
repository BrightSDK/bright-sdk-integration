// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');

const {
    lbr,
    print: print_base, process_init, prompt, process_close,
    read_json, write_json, search_filename,
    download_from_url, unzip, set_json_props, replace_file,
} = lib;

const js_ext = '.js';
const brd_api_base = 'brd_api';
const brd_api_name = `${brd_api_base}${js_ext}`;

const get_config_fname = appdir=>path.join(appdir, 'brd_sdk.config.json');

const process_webos = async(opt={})=>{

const print = (...args)=>{
    if (opt.interactive || opt.verbose)
        print_base(...args);
};

const read_env = ()=>({
    js_dir: process.env.JS_DIR,
    app_dir: process.env.APP_DIR,
    index: process.env.INDEX,
});

const read_config = (config, fname)=>{
    print(`Reading configuration file ${fname}...`);
    const overrides = read_json(fname);
    Object.assign(config, overrides);
};

const get_value = async(question, def_answer, config_value)=>{
    if (!opt.interactive || config_value)
    {
        print(`${question}: ${config_value}`);
        return config_value;
    }
    return await prompt(question, def_answer);
};

const get_js_dir = async (workdir, appdir)=>{
    let def_value;
    const existing = await search_filename(workdir, brd_api_name);
    if (existing)
        def_value = path.dirname(existing);
    else
    {
        for (const name of ['src', 'source', 'js', '/'])
        {
            const dir = path.join(appdir, name);
            if (fs.existsSync(dir))
            {
                def_value = dir;
                break;
            }
        }
    }
    def_value = def_value || path.join(workdir);
    return def_value;
};

const get_service_dir = async (workdir, appdir)=>{
    let def_value;
    const existing = await search_filename(workdir, 'services.json');
    if (existing)
        def_value = path.dirname(existing);
    else
    {
        for (const name of ['service', 'bright_sdk_service'])
        {
            const dir = path.join(workdir, name);
            if (fs.existsSync(dir))
            {
                def_value = dir;
                break;
            }
        }
    }
    def_value = def_value || path.join(appdir, 'service');
    return def_value;
};

const update_index_ref = (fname, ref)=>{
    if (!fs.existsSync(fname))
        throw new Error(`index.html not found at ${fname}`);
    let data = fs.readFileSync(fname).toString();
    const regex = new RegExp(`${brd_api_base}.*${js_ext}`);
    const [prev] = data.match(regex)||[];
    if (!prev) // @TODO: initial sdk injection
        throw new Error('BrightSDK not found, configuration unsupported.');
    data = data.replace(prev, ref);
    fs.writeFileSync(fname, data);
    return prev;
};

const config = {};
const env = read_env();
let prev_config_fname;
if (opt.interactive)
    process_init();
const config_fnames = opt.config_fnames
    || opt.config_fname && [opt.config_fname];
let workdir, appdir;
if (config_fnames?.length)
{
    for (let i=0; i<opt.config_fnames.length; i++)
    {
        const config_fname = opt.config_fnames[i];
        if (fs.existsSync(config_fname))
            read_config(config, config_fname);
        if (!i)
        {
            for (const name in env)
            {
                if (env[name])
                    config[name] = env[name];
            }
            prev_config_fname = config_fname;
        }
    }
    workdir = config.workdir
        || path.dirname(config_fnames[config_fnames.length-1]);
    appdir = path.join(workdir, config.app_dir || '');
}
else if (opt.workdir)
    workdir = opt.workdir;
else
    workdir = process.cwd();

const greeting = `Welcome to BrightSDK Integration Code Generator for WebOS!`;

const instructions = `Press CTRL+C at any time to break execution.
NOTE: remember to save your uncommited changes first.
`;

print(greeting+lbr+instructions);
appdir = appdir || await get_value('Path to application directory', '',
    config.app_dir);

if (!prev_config_fname)
{
    const fname = get_config_fname(appdir);
    if (fs.existsSync(fname))
        read_config(config, prev_config_fname = fname);
}

const sdk_ver = await get_value('SDK Version', '1.438.821', config.sdk_ver);

const build_dir_root = path.join(path.dirname(__dirname), '.build');
if (!fs.existsSync(build_dir_root))
    fs.mkdirSync(build_dir_root);
const build_dir = path.join(build_dir_root,
    `${path.basename(appdir)}_${sdk_ver}`);

const js_dir = await get_value('Application JS directory',
    await get_js_dir(workdir, appdir), path.join(workdir, config.js_dir||''));
const js_name = js_dir == appdir ? '' : path.basename(js_dir);
const sdk_service_dir_def = await get_service_dir(workdir, appdir);
const sdk_service_dir = await get_value('SDK Service dir', sdk_service_dir_def,
    config.sdk_service_dir && path.join(workdir, config.sdk_service_dir));

const sdk_url_mask = await get_value('SDK URL mask',
    'https://path/to/sdk_SDK_VER.zip', config.sdk_url);
const sdk_url = sdk_url_mask.replace(/SDK_VER/, sdk_ver);
const sdk_zip = path.basename(sdk_url);
const sdk_zip_ext = path.extname(sdk_zip);
const sdk_zip_fname = path.join(build_dir, sdk_zip);
const sdk_dir = path.join(build_dir, path.basename(sdk_zip, sdk_zip_ext));
const appinfo = read_json(path.join(appdir, 'appinfo.json'));
const {id: appid} = appinfo;
const is_web_hosted = !js_dir.startsWith(appdir);
const index_def = path.join(is_web_hosted ? path.dirname(js_dir) : appdir,
    path.join(workdir, 'index.html'));
const index_fname = await get_value('index.html location', index_def,
    config.index && path.join(config.app_dir, config.index));

print('Starting...');
if (!fs.existsSync(build_dir))
    fs.mkdirSync(build_dir);

await download_from_url(sdk_url, sdk_zip_fname);
print(`✔ Downloaded ${sdk_zip}`);

await unzip(sdk_zip_fname, sdk_dir);
print(`✔ SDK extracted into ${sdk_dir}`);

const sdk_service_fname = path.join(sdk_dir, 'sdk', 'service');
const brd_api_fname = path.join(sdk_dir, 'sdk', 'consent', brd_api_name);
const brd_api_dst_name = brd_api_name.replace(js_ext,
    `_v${sdk_ver}${js_ext}`);
const brd_api_dst_fname = path.join(js_dir, brd_api_dst_name);

if (await replace_file(sdk_service_fname, sdk_service_dir))
    print(`✔ Removed ${sdk_service_dir}`);
print(`✔ Copied ${sdk_service_fname} to ${sdk_service_dir}`);

if (await replace_file(brd_api_fname, brd_api_dst_fname))
    print(`✔ Removed ${brd_api_dst_fname}`);
print(`✔ Copied ${brd_api_fname} to ${brd_api_dst_fname}`);

const sdk_package_fname = path.join(sdk_service_dir, 'package.json');
const sdk_services_fname = path.join(sdk_service_dir, 'services.json');

const sdk_package = read_json(sdk_package_fname);
const sdk_service_id = sdk_package.name
    .replace(/.+(\.brd_sdk)$/, appid+'$1');

set_json_props(sdk_package_fname, ['name'], sdk_service_id);
print(`✔ Processed ${sdk_package_fname}`);

set_json_props(sdk_services_fname, ['id', 'services.0.id', 'services.0.name'],
    sdk_service_id);
print(`✔ Processed ${sdk_services_fname}`);

const brd_api_name_prev = update_index_ref(index_fname, brd_api_dst_name);
let brd_api_fname_prev = 'none';
if (brd_api_name_prev)
{
    brd_api_fname_prev = path.join(js_dir, brd_api_name_prev);
    if (!is_web_hosted)
    {
        if (fs.existsSync(brd_api_fname_prev))
            fs.unlinkSync(brd_api_fname_prev);
    }
}
print(`✔ Processed ${brd_api_fname_prev} -> ${brd_api_dst_fname}`);

if (!opt.interactive)
    return;

if (!prev_config_fname)
{
    const next_config = {appdir, sdk_ver, sdk_url: sdk_url_mask};
    for (const [prop, val] of [
        ['js_dir', js_dir],
        ['sdk_service_dir', sdk_service_dir],
        ['index', index_fname],
    ])
    {
        const value = val.replace(workdir, '').slice(1)||'';
        if (value)
            next_config[prop] = value;
    }
    print(`Generated config:
${JSON.stringify(next_config, null, 2)}
    `);
    const next_config_fname = get_config_fname(appdir);
    write_json(next_config_fname, next_config);
    print(`✔ Saved config into ${next_config_fname}`);
}

print(`
Thank you for using our products!
To commit your changes, run:

cd ${appdir} && \\
git add ${path.basename(sdk_service_dir)} && \\
git add ${path.join(js_name, brd_api_name)} && \\
git commit -m 'update brd_sdk to v${sdk_ver}'

To start over, run

cd ${appdir} && git checkout . && cd -

`);

if (opt.interactive)
    process_close();

};

module.exports = {get_config_fname, process_webos};
