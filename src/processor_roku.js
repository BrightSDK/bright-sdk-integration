// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const fs = require('fs');
const path = require('path');
const lib = require('./lib.js');
const navigation = require('./navigation.js');
const base_processor = require('./processors.js');

const {
    process_init, process_close, read_json, write_json, download_from_url,
    unzip, set_json_props, replace_file,
} = lib;

const {
    get_config_fname, print: print_base, print_colored: print_colored_base, read_env,
    read_config_and_merge: read_config_and_merge_base,
    get_value: get_value_base, search_workdir
} = base_processor;

const {clear_screen, prompt} = navigation;

/**
opt.interactive - interactive mode
opt.verbose - produces more output
opt.config_fnames - configuration filenames
`appinfo.json` in the `appdir`

config {
  "workdir" - the root directory where configuration and application is placed
  "app_dir" - the name of the application directory in workdir
  "sdk_ver" - version
  "components_dir" - the components directory
  "sdk_url" - SDK URL
}
*/
const process_roku = async(opt={})=>{

const js_ext = '.js'; // TODO remove because where is no js code in Roku
const brd_api_base = 'BrightData';

const print_opt = (s, _opt)=>{ print_base(opt, s, _opt); };
const print_colored = string=>print_colored_base(opt, string);
const read_config_and_merge = (config, fname)=>{
    read_config_and_merge_base(opt, config, fname);
};
const get_value = async(question, def_answer, config_value, _opt={})=>{
    return get_value_base(opt, question, def_answer, config_value, _opt);
};

const get_components_dir = async(workdir, appdir, _opt)=>{
    let def_value;
    const existing = await search_workdir(appdir,
        `^(_.+)?${brd_api_base}$`);
    print_colored(`\t${brd_api_base} -> ${existing}`);
    if (existing)
        def_value = path.dirname(existing);
    else
    {
        for (const name of ['src', 'source'])
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

// Updates some file
const update_index_ref = (fname, ref)=>{
// check file
    if (!fs.existsSync(fname))
        throw new Error(`index.html not found at ${fname}`);
// read data
    let data = fs.readFileSync(fname).toString();
// replace string with ref
    const regex = new RegExp(`${brd_api_base}.*${js_ext}`);
    const [prev] = data.match(regex)||[];
    if (!prev) // @TODO: initial sdk injection
        throw new Error('BrightSDK not found, configuration unsupported.');
    data = data.replace(prev, ref);
    fs.writeFileSync(fname, data);
    return prev;
};

const config = {};
// Obtain env values
const env = read_env();
let prev_config_fname;
// Prepare interactive reading from STDIN
if (opt.interactive)
    process_init();
// Define configuration file names
const config_fnames = opt.config_fnames
    || opt.config_fname && [opt.config_fname];
let workdir, appdir;
if (config_fnames?.length)
{
    // Read all configs into one `config` and update env fields
    for (let i=0; i<opt.config_fnames.length; i++)
    {
        const config_fname = opt.config_fnames[i];
        if (fs.existsSync(config_fname))
            read_config_and_merge(config, config_fname);
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
    // `workdir` is taken from the config
    // or defined by the path to the last config
    workdir = config.workdir
        || path.dirname(config_fnames[config_fnames.length-1]);
    // `appdir` := <workdir>/<config.app_dir>
    appdir = path.join(workdir, config.app_dir || '');
}
// If no configuration, then we still need `workdir`
else if (opt.workdir)
    workdir = opt.workdir;
else
    workdir = process.cwd();

config.workdir = workdir;

print_opt(`\tconfig.workdir: ${config.workdir}`);
// Print welcome message
if (opt.interactive)
{
    clear_screen();
    print_opt(
      `Welcome to BrightSDK Integration Code Generator for WebOS!
    Press CTRL+C at any time to break execution.
    NOTE: remember to save your uncommited changes first.
    `);
}

// Step 1: input `appdir` if it's not defined in `config.app_dir` or not exists
appdir = appdir || await get_value('Path to application directory', '',
    config.app_dir, {selectable: true, dir: workdir});
print_opt(`\tappdir: ${appdir}`);
if (!fs.existsSync(path.join(workdir, appdir)))
    workdir = path.dirname(appdir);

// If no configuration, then try to read it from the appdir
if (!prev_config_fname)
{
    const fname = get_config_fname(appdir);
    if (fs.existsSync(fname))
    {
        read_config_and_merge(config, prev_config_fname = fname);
        print_opt(`Loaded configuration: ${fname}`);
    }
}

// Define SDK path (why? /.sdk)
const root_dir = path.dirname(__dirname);
const sdk_dir_root = path.join(root_dir, '.sdk'); // output for SDK
print_colored(`\troot_dir: ${root_dir}`);
print_colored(`\tsdk_dir_root: ${sdk_dir_root}`);

// Step 2: input version and define output SDK dir
const sdk_ver = await get_value('SDK Version', '1.438.821', config.sdk_ver, {
    selectable: fs.existsSync(sdk_dir_root),
    lock_dir: true,
    dir: sdk_dir_root,
    strip: sdk_dir_root,
});

const default_components_dir = await get_components_dir(workdir, appdir);
print_colored(`default_components_dir: ${default_components_dir}`);
const components_dir = await get_value('Application `components` directory',
    default_components_dir,
    config.components_dir && path.join(appdir, config.components_dir||''),
    {selectable: true, dir: default_components_dir
        ? path.dirname(default_components_dir) : workdir}
);
// TODO update configuration files in the app
// const sdk_service_dir_def = await get_service_dir(workdir, appdir);

// TODO BrightData directory
// Step 3: input service directory name
// const sdk_service_dir = await get_value('SDK Service dir',
//    sdk_service_dir_def,
//    config.sdk_service_dir && path.join(workdir, config.sdk_service_dir), {
//        selectable: true,
//        dir: sdk_service_dir_def
//            ? path.dirname(sdk_service_dir_def)
//            : workdir,
//    });

// TODO use hardcoded URL to CDN (SDK is always there)
// Step 4: input SDK .zip URL
const sdk_url_mask = await get_value('SDK URL mask',
    'https://path/to/sdk_SDK_VER.zip', config.sdk_url);
const sdk_url = sdk_url_mask.replace(/SDK_VER/g, sdk_ver);
const sdk_zip = path.basename(sdk_url);
const sdk_zip_fpath = path.join(sdk_dir_root, sdk_zip);

// Define sdk_dir
const sdk_dir = path.join(sdk_dir_root, sdk_ver);

// Read appinfo.json
const appinfo = read_json(path.join(appdir, 'appinfo.json'));
const {id: appid} = appinfo;
// TODO what's that
const is_web_hosted = !components_dir.startsWith(appdir);
// Step 5: input path to index.html
// TODO (use config files instead)
// const index_def = path.relative(workdir, path.join(
//    is_web_hosted ? path.dirname(components_dir) : appdir, 'index.html'));
// const index_fname_def = config.index && path.join(workdir, config.index);
// const index_fname = await get_value('index.html location', index_def,
//    index_fname_def, {
//        selectable: true,
//        dir: index_fname_def ? path.dirname(index_fname_def) : appdir,
//    }
// );

print_opt('Starting...');

print_opt('Making directories...');
print_colored(`\tsdk_dir_root: ${sdk_dir_root}`);
print_colored(`\tsdk_dir: ${sdk_dir}`);

for (const dir of [sdk_dir_root]) // diff sdk_dir
{
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir);
}

// Read versions.json file. It contains all known SDK versions
// (previously downloaded)
const sdk_versions_fpath = path.join(sdk_dir_root, 'versions.json');
const sdk_versions = read_json(sdk_versions_fpath);
if (fs.existsSync(sdk_dir))
{
    print_colored(`${JSON.stringify(sdk_versions)}`);
    print_opt(`✔ Using cached SDK version
        ${sdk_ver} downloaded on ${sdk_versions[sdk_ver].date}`);
}
else
{
    print_opt('Download SDK:');
    await download_from_url(sdk_url, sdk_zip_fpath);
    print_opt(`✔ Downloaded ${sdk_zip}`);
    sdk_versions[sdk_ver] = {
        url: sdk_url,
        date: new Date().toISOString(),
    };
    write_json(sdk_versions_fpath, sdk_versions);
    await unzip(sdk_zip_fpath, sdk_dir);
    print_opt(`✔ SDK extracted into ${sdk_dir}`);
}

// Copy SDK
const sdk_components_dir = path.join(sdk_dir, 'sdk_wrapper', 'components');
const sdk_sdk_dir = path.join(sdk_components_dir, `${brd_api_base}`);
const dst_sdk_dir = path.join(components_dir, `${brd_api_base}`);
print_colored(`\tsdk_sdk_dir: ${sdk_sdk_dir}`);

if (await replace_file(sdk_sdk_dir, dst_sdk_dir))
    print_opt(`✔ Removed ${dst_sdk_dir}`);
print_opt(`✔ Copied ${sdk_sdk_dir} to ${dst_sdk_dir}`);

if (!opt.interactive)
{
    print_colored(`Sources updated: ${appdir}`);
    return;
}

// TODO check
if (!prev_config_fname)
{
    const next_config = {
        workdir,
        appdir,
        components_dir,
        sdk_ver,
        sdk_url: sdk_url_mask,
    };
    print_opt(`Generated config:
${JSON.stringify(next_config, null, 2)}
    `);
    const next_config_fname = get_config_fname(appdir);
    write_json(next_config_fname, next_config);
    print_opt(`✔ Saved config into ${next_config_fname}`);
}

if (opt.interactive)
{
    print_opt(`
Thank you for using our products!
To commit your changes, run:

cd ${appdir} && \\
git add ${path.basename(sdk_sdk_dir)} && \\
git commit -m 'BrightData SDK updated to v${sdk_ver}'

To start over, run

cd ${appdir} && git checkout . && cd -
`);
    process_close();
}

};

module.exports = {get_config_fname, process_roku};
