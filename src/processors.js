// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');
const navigation = require('./navigation.js');

const {
    lbr,
    print: print_base, process_init, process_close,
    read_json, write_json, search_directory,
    download_from_url, unzip, set_json_props, replace_file,
} = lib;

const {clear_screen, prompt} = navigation;

const js_ext = '.js';
const brd_api_base = 'brd_api';
const brd_api_name = `${brd_api_base}${js_ext}`;

const get_config_fname = workdir=>path.join(workdir, 'brd_sdk.config.json');

const process_webos = async(opt={})=>{

let buffer = '';
const print = (s, _opt)=>{
    if (!opt.interactive && !opt.verbose)
        return;
    const printed = print_base(s, _opt);
    buffer += printed;
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

const get_value = async(question, def_answer, config_value, _opt={})=>{
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
    clear_screen();
    print_base(buffer);
    print(`${question}: ${value}`);
    return value;
};

const get_js_dir = async (workdir, appdir, _opt)=>{
    let def_value;
    const existing = await search_workdir(
        `^${brd_api_base}(_.+)?\.${js_ext}$`);
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
    return path.relative(workdir, def_value);
};

const get_service_dir = async (workdir, appdir)=>{
    let def_value;
    const existing = await search_workdir('^services.json$');
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
    return path.relative(workdir, def_value);
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
if (opt.config)
{
    Object.assign(config, opt.config);
    workdir = config.workdir;
    appdir = path.join(workdir, config.app_dir);
}
else
{
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
    config.workdir = workdir;
}

const greeting = `Welcome to BrightSDK Integration Code Generator for WebOS!`;

const instructions = `Press CTRL+C at any time to break execution.
NOTE: remember to save your uncommited changes first.
`;

clear_screen();
print(greeting+lbr+instructions);
if (!appdir)
{
    appdir = await get_value('Path to application directory', '',
        config.app_dir, {selectable: true, dir: workdir});
    if (!fs.existsSync(path.join(workdir, appdir)))
        workdir = path.dirname(appdir);
}

if (!opt.config && !prev_config_fname)
{
    const fname = get_config_fname(workdir);
    if (fs.existsSync(fname))
    {
        read_config(config, prev_config_fname = fname);
        print(`Loaded configuration: ${fname}`);
    }
}

const root_dir = path.dirname(__dirname);
const sdk_dir_root = path.join(root_dir, '.sdk');

const get_sdk_ver = async()=>{
    let ver = await get_value('SDK Version', 'latest', config.sdk_ver, {
        selectable: fs.existsSync(sdk_dir_root),
        lock_dir: true,
        dir: sdk_dir_root,
        strip: sdk_dir_root,
    });
    if (ver == 'latest')
    {
        const latest_fname = path.join(sdk_dir_root, 'latest.json');
        try {
            await download_from_url('https://bright-sdk.com/sdk_api/sdk/versions', latest_fname);
        } catch(e){
            print('Failed to download latest version info');
            if (fs.existsSync(latest_fname))
                print('Falling back to cached version info');
            else
            {
                throw new Error('Please check your internet connection and'
                    +' try again or provide cached sdk version name');
            }
        }
        const latest = read_json(latest_fname).webos;
        if (latest)
            ver = latest;
    }
    return ver;
};

if (!fs.existsSync(sdk_dir_root))
    fs.mkdirSync(sdk_dir_root);
const sdk_ver = await get_sdk_ver();
if (config.sdk_ver_prev)
{
    print('SDK is already of the latest version.');
    const force = opt.interactive && await get_value('Force update? (y/n)', 'n');
    if (force != 'y')
        return;
}

const search_workdir = async name=>{
    return await search_directory(workdir, new RegExp(name), {exclude: [
        '.git',
        '.sdk',
        '.vscode',
        '.idea',
        'node_modules',
    ].map(p=>path.join(workdir, p))});
};

const js_dir_def = await get_js_dir(workdir, appdir);
const js_dir = await get_value('Application JS directory', js_dir_def,
    config.js_dir && path.join(workdir, config.js_dir||''),
    {selectable: true, dir: js_dir_def ? path.dirname(js_dir_def) : workdir}
);
const js_name = js_dir == appdir ? '' : path.basename(js_dir);
const sdk_service_dir_def = await get_service_dir(workdir, appdir);
const sdk_service_dir = await get_value('SDK Service dir', sdk_service_dir_def,
    config.sdk_service_dir && path.join(workdir, config.sdk_service_dir), {
        selectable: true,
        dir: sdk_service_dir_def
            ? path.dirname(sdk_service_dir_def)
            : workdir,
    });

const sdk_url_mask = await get_value('SDK URL mask',
    'https://path/to/sdk_SDK_VER.zip', config.sdk_url);
const sdk_url = sdk_url_mask.replace(/SDK_VER/g, sdk_ver);
const sdk_zip = path.basename(sdk_url);
const sdk_zip_fname = path.join(sdk_dir_root, sdk_zip);
const sdk_dir = path.join(sdk_dir_root, sdk_ver);
const appinfo = read_json(path.join(appdir, 'appinfo.json'));
const {id: appid} = appinfo;
const is_web_hosted = !js_dir.startsWith(appdir);
const index_def = path.relative(workdir, path.join(
    is_web_hosted ? path.dirname(js_dir) : appdir, 'index.html'));
const index_fname_def = config.index && path.join(workdir, config.index);
const index_fname = await get_value('index.html location', index_def,
    index_fname_def, {
        selectable: true,
        dir: index_fname_def ? path.dirname(index_fname_def) : appdir,
    }
);

print('Starting...');
if (!fs.existsSync(sdk_dir))
    fs.mkdirSync(sdk_dir);

const sdk_versions_fname = path.join(sdk_dir_root, 'versions.json');
const sdk_versions = fs.existsSync(sdk_versions_fname)
    ? read_json(sdk_versions_fname) : {};
if (fs.existsSync(sdk_dir) && sdk_versions[sdk_ver])
{
    print(`✔ Using cached SDK version ${
        sdk_ver} downloaded on ${sdk_versions[sdk_ver].date}`);
}
else
{
    await download_from_url(sdk_url, sdk_zip_fname);
    print(`✔ Downloaded ${sdk_zip}`);
    sdk_versions[sdk_ver] = {
        url: sdk_url,
        date: new Date().toISOString(),
    };
    write_json(sdk_versions_fname, sdk_versions);
    await unzip(sdk_zip_fname, sdk_dir);
    print(`✔ SDK extracted into ${sdk_dir}`);
}

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
    if (!is_web_hosted && brd_api_fname_prev != brd_api_dst_fname)
    {
        if (fs.existsSync(brd_api_fname_prev))
            fs.unlinkSync(brd_api_fname_prev);
    }
}
print(`✔ Processed ${brd_api_fname_prev} -> ${brd_api_dst_fname}`);

if (!opt.config)
{
    const simplify = s=>s.replace(workdir, '') || '.';
    const next_config = {
        workdir: simplify(workdir),
        app_dir: simplify(appdir),
        js_dir: simplify(js_dir),
        index: index_fname,
        sdk_service_dir: simplify(sdk_service_dir),
        sdk_ver: config?.sdk_ver || sdk_ver,
        sdk_ver_prev: sdk_ver,
        sdk_url: sdk_url_mask,
    };
    print(`Generated config:
    ${JSON.stringify(next_config, null, 2)}
    `);
    const next_config_fname = get_config_fname(workdir);
    write_json(next_config_fname, next_config);
    print(`✔ Saved config into ${next_config_fname}`);
    const sdk_ver_from = config.sdk_ver_prev && config.sdk_ver_prev != sdk_ver
        ? `from v${config.sdk_ver_prev} ` : '';
    const commands = [];
    if (path.resolve(appdir) != process.cwd())
        commands.push(`cd ${appdir}`);
    commands.push(...[
        `git add ${path.join(js_name, brd_api_dst_name)}`,
        `git add ${sdk_service_dir}`,
        `git add ${next_config_fname}`,
        `git commit -m 'update brd_sdk ${sdk_ver_from}to v${sdk_ver}'`,
    ]);

    print(`
    Thank you for using our products!
    To commit your changes, run:

    ${commands.join(' && \\ \n')}

    To start over, run

    cd ${appdir} && git checkout . && cd -

    `);
}

if (opt.interactive)
    process_close();

};

module.exports = {get_config_fname, process_webos};
