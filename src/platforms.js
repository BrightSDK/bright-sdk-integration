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

// Load configuration
const config_path = path.join(__dirname, '..', 'config.json');
const app_config = fs.existsSync(config_path) ? read_json(config_path) : {};

const js_ext = '.js';
const brd_api_base = 'brd_api';
const brd_api_name = app_config.files?.api_name;

if (!brd_api_name && fs.existsSync(config_path)) {
    throw new Error('API filename not configured. Please add files.api_name to config.json');
}

const get_config_fname = workdir=>path.join(workdir, 'brd_sdk.config.json');

class BrightSdkUpdateWeb {
    constructor(opt){
        this.buffer = '';
        this.opt = {};
        this.env = {};
        this.config = {};
        this.prev_config_fname = null;
        this.config_fnames = [];
        this.workdir = null;
        this.appdir = null;
        this.sdk_dir_root = null;
        this.js_dir = null;
        this.js_name = null;
        this.appid = null;
        this.opt = opt;
        this.index_fname = null;
        this.use_helper = null;
        this.sdk_versions_fname = null;
        this.sdk_versions = {};
        this.sdk_ver = null;
        this.sdk_url_mask = null;
        this.sdk_url = null;
        this.sdk_service_dir = null;
        this.sdk_service_fname = null;
        this.brd_api_fname = null;
        this.brd_api_dst_name = null;
        this.brd_api_dst_fname = null;
        this.brd_api_helper_name = null;
        this.brd_api_helper_fname = null;
        this.brd_api_helper_dst_fname = null;
    }
    print(s, opt={}){
        if (!this.opt.interactive && !this.opt.verbose)
            return;
        const printed = print_base(s, opt);
        this.buffer += printed;
    }
    read_env(){
        return {
            js_dir: process.env.JS_DIR,
            app_dir: process.env.APP_DIR,
            index: process.env.INDEX,
        };
    }
    read_config(config, fname){
        this.print(`Reading configuration file ${fname}...`);
        const overrides = read_json(fname);
        Object.assign(config, overrides);
    }
    async get_value(question, def_answer, config_value, _opt={}){
        let value;
        if (!this.opt.interactive || config_value)
            value = config_value;
        else
        {
            _opt.buffer = this.buffer;
            value = await prompt(question, def_answer, _opt);
            for (const parent of [this.workdir, _opt.strip])
            {
                if (parent && value.startsWith(parent))
                    value = path.relative(parent, value);
            }
        }
        clear_screen();
        print_base(this.buffer);
        this.print(`${question}: ${value}`);
        return value;
    }
    async get_js_dir(workdir, appdir, _opt){
        let def_value;
        const existing = await this.search_workdir(
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
    }
    async find_service_dir(){
        return await this.search_workdir('^services.json$');
    }
    get_service_dir_default(){
        return path.join(this.appdir, 'service');
    }
    async get_service_dir(){
        let def_value;
        const existing = await this.find_service_dir();
        if (existing)
            def_value = path.dirname(existing);
        else
        {
            for (const name of ['service', 'bright_sdk_service'])
            {
                const dir = path.join(this.workdir, name);
                if (fs.existsSync(dir))
                {
                    def_value = dir;
                    break;
                }
            }
        }
        def_value = def_value || this.get_service_dir_default();
        return path.relative(this.workdir, def_value);
    }
    update_index_ref(fname, ref){
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
    }
    async search_workdir(name){
        return await search_directory(this.workdir, new RegExp(name), {exclude: [
            '.git',
            '.sdk',
            '.vscode',
            '.idea',
            'node_modules',
        ].map(p=>path.join(this.workdir, p))});
    }
    build_config(){
        this.env = this.read_env();
        this.config_fnames = this.opt.config_fnames
            || this.opt.config_fname && [this.opt.config_fname];
        if (this.opt.config)
        {
            Object.assign(this.config, this.opt.config);
            this.workdir = this.config.workdir;
            this.appdir = path.join(this.workdir, this.config.app_dir);
        }
        else
        {
            if (this.config_fnames?.length)
            {
                for (let i=0; i<this.config_fnames.length; i++)
                {
                    const config_fname = this.config_fnames[i];
                    if (fs.existsSync(config_fname))
                        this.read_config(this.config, config_fname);
                    if (!i)
                    {
                        for (const name in this.env)
                        {
                            if (this.env[name])
                                this.config[name] = env[name];
                        }
                        this.prev_config_fname = config_fname;
                    }
                }
                this.workdir = this.config.workdir
                    || path.dirname(this.config_fnames[this.config_fnames.length-1]);
                this.appdir = path.join(this.workdir, this.config.app_dir || '');
            }
            else if (this.opt.workdir)
                this.workdir = this.opt.workdir;
            else
                this.workdir = process.cwd();
            this.config.workdir = this.workdir;
        }
    }
    print_greeting(){
        const greeting = `Welcome to BrightSDK Integration Code Generator for ${this.opt.name}!`;
        const instructions = `Press CTRL+C at any time to break execution.
        NOTE: remember to save your uncommited changes first.
        `;
        clear_screen();
        this.print(greeting+lbr+instructions);
    }
    async assign_appdir(){
        if (!this.appdir)
        {
            this.appdir = await this.get_value('Path to application directory', '',
                this.config.app_dir, {selectable: true, dir: this.workdir});
            if (!fs.existsSync(path.join(this.workdir, this.appdir)))
                this.workdir = path.dirname(this.appdir);
        }
    }
    async load_config(){
        if (!this.opt.config && !this.prev_config_fname)
        {
            const fname = get_config_fname(this.workdir);
            if (fs.existsSync(fname))
            {
                this.read_config(this.config, this.prev_config_fname = fname);
                this.print(`Loaded configuration: ${fname}`);
            }
        }
    }
    assign_sdk_dir_root(){
        const root_dir = path.dirname(__dirname);
        this.sdk_dir_root = path.join(root_dir, '.sdk', this.opt.platform);
    }
    create_sdk_dir_root(){
        if (!fs.existsSync(this.sdk_dir_root))
            fs.mkdirSync(this.sdk_dir_root, {recursive: true});
    }
    create_sdk_dir(){
        if (!fs.existsSync(this.sdk_dir))
            fs.mkdirSync(this.sdk_dir);
    }
    async assign_sdk_ver(){
        let ver = await this.get_value('SDK Version', 'latest', this.config.sdk_ver, {
            selectable: fs.existsSync(this.sdk_dir_root),
            lock_dir: true,
            dir: this.sdk_dir_root,
            strip: this.sdk_dir_root,
        });
        if (ver == 'latest')
        {
            const latest_fname = path.join(this.sdk_dir_root, 'latest.json');
            const versions_url = app_config.urls?.sdk_versions;
            if (!versions_url) {
                throw new Error('SDK versions URL not configured. Please add urls.sdk_versions to config.json');
            }
            try {
                await download_from_url(versions_url, latest_fname);
            } catch(e){
                this.print('Failed to download latest version info');
                if (fs.existsSync(latest_fname))
                    this.print('Falling back to cached version info');
                else
                {
                    throw new Error('Please check your internet connection and'
                        +' try again or provide cached sdk version name');
                }
            }
            const latest = read_json(latest_fname)[this.opt.platform];
            if (latest)
                ver = latest;
        }
        this.sdk_ver = ver;
    }
    async check_sdk_ver(){
        if (this.config.sdk_ver_prev)
        {
            this.print('SDK is already of the latest version.');
            const force = this.opt.interactive && await this.get_value('Force update? (y/n)', 'n');
            if (force != 'y')
                return;
        }
    }
    async assign_js_dir(){
        const js_dir_config = this.config.js_dir && path.join(this.workdir, this.config.js_dir);
        const js_dir_def = js_dir_config || await this.get_js_dir(this.workdir, this.appdir);
        this.js_dir = await this.get_value('Application JS directory', js_dir_def, js_dir_config,
            {selectable: true, dir: js_dir_def ? path.dirname(js_dir_def) : this.workdir}
        );
    }
    assign_js_name(){
        this.js_name = this.js_dir == this.appdir ? '' : path.basename(this.js_dir);
    }
    async assign_sdk_service_dir(){
        const sdk_service_dir_def = await this.get_service_dir();
        this.sdk_service_dir = await this.get_value('SDK Service dir', sdk_service_dir_def,
            this.config.sdk_service_dir && path.join(this.workdir, this.config.sdk_service_dir),
            {
                selectable: true,
                dir: sdk_service_dir_def
                    ? path.dirname(sdk_service_dir_def)
                    : this.workdir,
            }
        );
    }
    async assign_sdk_url(){
        const default_sdk_url = app_config.defaults?.sdk_url_mask;
        if (!default_sdk_url) {
            throw new Error('SDK URL mask not configured. Please add defaults.sdk_url_mask to config.json');
        }
        this.sdk_url_mask = await this.get_value('SDK URL mask',
            default_sdk_url, this.config.sdk_url);
        this.sdk_url = this.sdk_url_mask.replace(/SDK_VER/g, this.sdk_ver);
    }
    assign_sdk_zip_names(){
        this.sdk_zip = path.basename(this.sdk_url);
        this.sdk_zip_fname = path.join(this.sdk_dir_root, this.sdk_zip);
    }
    assign_sdk_dir(){
        this.sdk_dir = path.join(this.sdk_dir_root, this.sdk_ver);
    }
    assign_appid(){
        const appinfo = read_json(path.join(this.appdir, 'appinfo.json'));
        this.appid = appinfo.id;
    }
    assign_web_hosted(){
        this.is_web_hosted = !this.js_dir.startsWith(this.appdir);
    }
    async assign_index_filename(){
        const index_def = path.relative(this.workdir, path.join(
            this.is_web_hosted ? path.dirname(this.js_dir) : this.appdir, 'index.html'));
        const index_fname_def = this.config.index && path.join(this.workdir, this.config.index);
        this.index_fname = await this.get_value('index.html location', index_def,
            index_fname_def, {
                selectable: true,
                dir: index_fname_def ? path.dirname(index_fname_def) : this.appdir,
            }
        );
    }
    async assign_use_helper(){
        const use_helper_yes_no = await this.get_value('Use BrightSDK Integration Helper? (y/n)',
            'y', this.config.use_helper && 'y');
        this.use_helper = use_helper_yes_no == 'y';
    }
    assign_sdk_versions_filename(){
        this.sdk_versions_fname = path.join(this.sdk_dir_root, 'versions.json');
    }
    async assign_sdk_versions(){
        this.sdk_versions = fs.existsSync(this.sdk_versions_fname)
            ? read_json(this.sdk_versions_fname) : {};
    }
    async assign_sdk_service_filename(){
        this.sdk_service_fname = path.join(this.sdk_dir, 'sdk', 'service');
    }
    async assign_brd_api_filename(){
        this.brd_api_fname = path.join(this.sdk_dir, 'sdk', 'consent', brd_api_name);
    }
    async assign_brd_api_dest_name(){
        this.brd_api_dst_name = brd_api_name.replace(js_ext,
            `_v${this.sdk_ver}${js_ext}`);
    }
    async assign_brd_api_dest_filename(){
        this.brd_api_dst_fname = path.join(this.js_dir, this.brd_api_dst_name);
    }
    async assign_brd_api_helper_name(){
        this.brd_api_helper_name = app_config.files?.helper_name;
        if (!this.brd_api_helper_name) {
            throw new Error('Helper filename not configured. Please add files.helper_name to config.json');
        }
    }
    async assign_brd_api_helper_filename(){
        // Download the helper from GitHub instead of using local assets
        const helper_url = app_config.urls?.helper_latest;
        if (!helper_url) {
            throw new Error('Helper URL not configured. Please add urls.helper_latest to config.json');
        }
        const temp_dir = path.join(this.workdir, 'temp');

        // Ensure temp directory exists
        if (!fs.existsSync(temp_dir)) {
            fs.mkdirSync(temp_dir, { recursive: true });
        }

        this.brd_api_helper_fname = path.join(temp_dir, this.brd_api_helper_name);

        try {
            this.print('Downloading BrightSDK Integration Helper...');
            await download_from_url(helper_url, this.brd_api_helper_fname);
            this.print('✔ Downloaded BrightSDK Integration Helper');
        } catch (err) {
            this.print(`✗ Failed to download helper: ${err.message}`);
            // Fall back to local file if download fails
            this.brd_api_helper_fname = path.join(__dirname, '..', 'assets', this.brd_api_helper_name);
            if (!fs.existsSync(this.brd_api_helper_fname)) {
                throw new Error('Helper file not available locally or from remote source');
            }
            this.print('Using local helper file as fallback');
        }
    }
    async assign_brd_api_helper_dest_filename(){
        this.brd_api_helper_dst_fname = path.join(this.js_dir, this.brd_api_helper_name);
    }
    async download_sdk(){
        if (fs.existsSync(this.sdk_dir) && this.sdk_versions[this.sdk_ver])
        {
            this.print(`✔ Using cached SDK version ${
                this.sdk_ver} downloaded on ${this.sdk_versions[this.sdk_ver].date}`);
        }
        else
        {
            await download_from_url(this.sdk_url, this.sdk_zip_fname);
            this.print(`✔ Downloaded ${this.sdk_zip}`);
            this.sdk_versions[this.sdk_ver] = {
                url: this.sdk_url,
                date: new Date().toISOString(),
            };
            write_json(this.sdk_versions_fname, this.sdk_versions);
            await unzip(this.sdk_zip_fname, this.sdk_dir);
            this.print(`✔ SDK extracted into ${this.sdk_dir}`);
        }
    }
    get_sdk_files(){
        const files = [
            [this.sdk_service_fname, this.sdk_service_dir],
            [this.brd_api_fname, this.brd_api_dst_fname],
        ];
        if (this.use_helper)
        {
            files.push([
                this.brd_api_helper_fname,
                this.brd_api_helper_dst_fname
            ]);
        }
        return files;
    }
    async replace_sdk_files(){
        for (const [src, dst] of this.get_sdk_files())
        {
            if (await replace_file(src, dst))
                this.print(`✔ Removed ${dst}`);
            this.print(`✔ Copied ${src} to ${dst}`);
        }
    }
    update_sdk_files(){}
    update_brd_api(){
        let brd_api_name_prev, brd_api_fname_prev = 'none';
        if (brd_api_name_prev = this.update_index_ref(this.index_fname, this.brd_api_dst_name))
        {
            brd_api_fname_prev = path.join(this.js_dir, brd_api_name_prev);
            if (!this.is_web_hosted && brd_api_fname_prev != this.brd_api_dst_fname)
            {
                if (fs.existsSync(brd_api_fname_prev))
                    fs.unlinkSync(brd_api_fname_prev);
            }
        }
        this.print(`✔ Processed ${brd_api_fname_prev} -> ${this.brd_api_dst_fname}`);
    }
    save_config(){
        if (!this.opt.config)
        {
            // @TODO: use path.relative
            const simplify = s=>path.relative(this.workdir, s) || '.';
            const next_config = {
                workdir: simplify(this.workdir),
                app_dir: simplify(this.appdir),
                js_dir: simplify(this.js_dir),
                index: simplify(this.index_fname),
                sdk_service_dir: simplify(this.sdk_service_dir),
                sdk_ver: this.config?.sdk_ver || this.sdk_ver,
                sdk_ver_prev: this.sdk_ver,
                sdk_url: this.sdk_url_mask,
                use_helper: this.use_helper,
            };
            this.print(`Generated config:\n${JSON.stringify(next_config, null, 2)}\n`);
            const next_config_fname = get_config_fname(this.workdir);
            write_json(next_config_fname, next_config);
            this.print(`✔ Saved config into ${next_config_fname}`);
            const sdk_ver_from = this.config.sdk_ver_prev && this.config.sdk_ver_prev != this.sdk_ver
                ? `from v${this.config.sdk_ver_prev} ` : '';
            const commands = [];
            if (path.resolve(this.workdir) != process.cwd())
                commands.push(`cd ${this.workdir}`);
            commands.push(...[
                `git add ${path.join(this.js_name, this.brd_api_dst_name)}`,
                `git add ${this.sdk_service_dir}`,
                `git add ${next_config_fname}`,
                `git commit -m 'update brd_sdk ${sdk_ver_from}to v${this.sdk_ver}'`,
            ]);
            const reset = 'git checkout .';
            if (path.resolve(this.workdir) != process.cwd())
                reset = `cd ${this.workdir} && ${reset} && cd -`;

            this.print(`
Thank you for using our products!
To commit your changes, run:

${commands.join(' && \\ \n')}

To start over, run

${reset}
`);
        }
    }
    async prepare(){
        if (this.opt.interactive)
            process_init();
        this.build_config();
        this.print_greeting();
        await this.assign_appdir();
        await this.load_config();
        this.assign_sdk_dir_root();
        this.create_sdk_dir_root();
        await this.assign_sdk_ver();
        await this.check_sdk_ver();
        await this.assign_js_dir();
        this.assign_js_name();
        await this.assign_sdk_service_dir();
        await this.assign_sdk_url();
        this.assign_sdk_zip_names();
        this.assign_sdk_dir();
        this.assign_web_hosted();
        await this.assign_index_filename();
        await this.assign_use_helper();
        this.assign_sdk_versions_filename();
        await this.assign_sdk_versions();
        this.assign_sdk_service_filename();
        this.assign_brd_api_filename();
        this.assign_brd_api_dest_name();
        this.assign_brd_api_dest_filename();
        if (this.use_helper)
        {
            this.assign_brd_api_helper_name();
            this.assign_brd_api_helper_filename();
            this.assign_brd_api_helper_dest_filename();
        }
    }
    async run(){
        await this.prepare();
        this.print('Starting...');
        this.create_sdk_dir();
        await this.download_sdk();
        await this.replace_sdk_files();
        this.update_sdk_files();
        this.update_brd_api();
        this.save_config();
    }
}

class BrightSdkUpdateWebos extends BrightSdkUpdateWeb {
    constructor(opt){
        super(opt);
        this.sdk_package_fname = null;
        this.sdk_package = {};
        this.sdk_services_fname = null;
        this.sdk_service_id = null;
    }
    assign_sdk_package_filename(){
        this.sdk_package_fname = path.join(this.sdk_service_dir, 'package.json');
    }
    assign_sdk_services_filename(){
        this.sdk_services_fname = path.join(this.sdk_service_dir, 'services.json');
    }
    read_sdk_package(){
        this.sdk_package = read_json(this.sdk_package_fname);
        this.sdk_service_id = this.sdk_package.name
            .replace(/.+(\.brd_sdk)$/, this.appid+'$1');
    }
    update_sdk_package(){
        set_json_props(this.sdk_package_fname, ['name'], this.sdk_service_id);
        this.print(`✔ Processed ${this.sdk_package_fname}`);
    }
    update_sdk_services(){
        set_json_props(this.sdk_services_fname, ['id', 'services.0.id', 'services.0.name'],
            this.sdk_service_id);
        this.print(`✔ Processed ${this.sdk_services_fname}`);
    }
    async prepare(){
        await super.prepare();
        this.assign_appid();
        this.assign_sdk_package_filename();
        this.assign_sdk_services_filename();
    }
    async update_sdk_files(){
        this.read_sdk_package();
        this.update_sdk_package();
        this.update_sdk_services();
    }
}

class BrightSdkUpdateTizen extends BrightSdkUpdateWeb {
    async find_service_dir(){
        return await this.search_workdir('^ver_conf.js$');
    }
}

const process_web = async(opt={})=>{
    const platforms = {
        webos: {name: 'WebOS', Implementation: BrightSdkUpdateWebos},
        tizen: {name: 'Tizen', Implementation: BrightSdkUpdateTizen},
    };
    const platform = platforms[opt.platform];
    new platform.Implementation({...opt, name: platform.name}).run();
};

module.exports = {get_config_fname, process_web};
