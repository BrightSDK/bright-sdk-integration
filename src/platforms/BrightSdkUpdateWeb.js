// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const fs = require('fs');
const path = require('path');
const lib = require('../lib.js');
const {BrightSdkUpdateBase} = require('./BrightSdkUpdateBase.js');

const {
    read_json, download_from_url, set_json_props,
} = lib;

class BrightSdkUpdateWeb extends BrightSdkUpdateBase {
    constructor(opt){
        super(opt);
        this.brd_api_base = 'brd_api';
        this.brd_api_name = this.app_config.files?.api_name;
        if (!this.brd_api_name && fs.existsSync(this.config_path)) {
            throw new Error('API filename not configured. Please add files.api_name to config.json');
        }
        this.js_ext = '.js';
        this.appid = null;
        this.index_fname = null;
        this.use_helper = null;
        this.brd_api_helper_name = null;
        this.brd_api_helper_fname = null;
        this.brd_api_helper_dst_fname = null;
    }
    read_env(){
        const parent = super.read_env();
        return Object.assign(parent, {
            libs_dir: parent.libs_dir || process.env.JS_DIR,
            index: process.env.INDEX,
        });
    }
    async get_libs_dir_def(){ // doesn't use parent implementation
        let def_value;
        const existing = await this.search_workdir(
            `^${this.brd_api_base}(_.+)?\.${this.js_ext}$`);
        if (existing)
            def_value = path.dirname(existing);
        else
        {
            for (const name of ['src', 'source', 'js', '/'])
            {
                const dir = path.join(this.workdir, this.appdir, name);
                if (fs.existsSync(dir))
                {
                    def_value = dir;
                    break;
                }
            }
        }
        def_value = def_value || path.join(this.workdir);
        return this.workdir_relative_path(def_value);
    }
    async find_service_dir(){
        return await this.search_workdir('^services.json$');
    }
    async get_service_dir_def(){
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
        if (def_value)
            return this.workdir_relative_path(def_value);
        return null;
    }
    update_index_ref(fname, ref){
        const fname_abs = path.isAbsolute(fname) ? fname : path.join(this.workdir, fname);
        if (!fs.existsSync(fname_abs))
            throw new Error(`index.html not found at ${fname}`);
        let data = fs.readFileSync(fname_abs).toString();
        const regex = new RegExp(`${this.brd_api_base}(_v[\\d.]+)?\\${this.js_ext}`);
        const [prev] = data.match(regex)||[];
        if (!prev) // @TODO: initial sdk injection
            throw new Error('BrightSDK not found, configuration unsupported.');
        data = data.replace(prev, ref);
        fs.writeFileSync(fname_abs, data);
        return prev;
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
    libs_dir_prompt(){
        return 'Application JS directory';
    }
    assign_appid(){
        const appinfo = read_json(path.join(this.workdir, this.appdir, 'appinfo.json'));
        this.appid = appinfo.id;
    }
    assign_web_hosted(){
        this.is_web_hosted = !this.libs_dir.startsWith(this.appdir);
    }
    async assign_index_filename(){
        const index_def = path.join(
            this.is_web_hosted ? path.dirname(this.libs_dir) : this.appdir,
            'index.html'
        );
        const index_fname_def = this.config.index;
        this.index_fname = await this.get_value('index.html location', index_def,
            index_fname_def, {
                selectable: true,
                dir: index_fname_def ? path.dirname(path.join(this.workdir, index_fname_def)) : path.join(this.workdir, this.appdir),
            }
        );
    }
    async assign_use_helper(){
        const use_helper_yes_no = await this.get_value('Use BrightSDK Integration Helper? (y/n)',
            'y', this.config.use_helper && 'y');
        this.use_helper = use_helper_yes_no == 'y';
    }
    async assign_sdk_service_filename(){
        this.sdk_service_fname = path.join(this.sdk_dir, 'sdk', 'service');
    }
    async assign_brd_api_filename(){
        this.brd_api_fname = path.join(this.sdk_dir, 'sdk', 'consent', this.brd_api_name);
    }
    async assign_brd_api_dest_name(){
        this.brd_api_dst_name = this.brd_api_name.replace(this.js_ext,
            `_v${this.sdk_ver}${this.js_ext}`);
    }
    async assign_brd_api_helper_name(){
        this.brd_api_helper_name = this.app_config.files?.helper_name;
        if (!this.brd_api_helper_name) {
            throw new Error('Helper filename not configured. Please add files.helper_name to config.json');
        }
    }
    async assign_brd_api_helper_filename(){
        const helper_url = this.app_config.urls?.helper_latest;
        const temp_dir = path.join(this.workdir, 'temp');

        // Ensure temp directory exists
        if (!fs.existsSync(temp_dir)) {
            fs.mkdirSync(temp_dir, { recursive: true });
        }

        this.brd_api_helper_fname = path.join(temp_dir, this.brd_api_helper_name);

        if (helper_url) {
            try {
                this.print('Downloading BrightSDK Integration Helper...');
                await download_from_url(helper_url, this.brd_api_helper_fname);
                this.print('✔ Downloaded BrightSDK Integration Helper');
                return;
            } catch (err) {
                this.print(`✗ Failed to download helper: ${err.message}`);
                // Continue to fallback below
            }
        }
        // Fall back to local file if download fails or helper_url is missing
        if (this.app_config.files?.helper_name_local) {
            this.brd_api_helper_fname = path.join(__dirname, '..', this.app_config.files.helper_name_local);
        } else {
            this.brd_api_helper_fname = path.join(__dirname, '..', '..', 'assets', this.brd_api_helper_name);
        }
        if (!fs.existsSync(this.brd_api_helper_fname)) {
            throw new Error('Helper file not available locally or from remote source');
        }
        this.print('Using local helper file as fallback');
    }
    async assign_brd_api_helper_dest_filename(){
        this.brd_api_helper_dst_fname = path.join(this.libs_dir, this.brd_api_helper_name);
    }
    get_sdk_files(){
        const files = super.get_sdk_files();
        if (this.use_helper)
        {
            files.push([
                this.brd_api_helper_fname,
                this.brd_api_helper_dst_fname
            ]);
        }
        return files;
    }
    update_brd_api(){
        let brd_api_name_prev, brd_api_fname_prev = 'none';
        if (brd_api_name_prev = this.update_index_ref(this.index_fname, this.brd_api_dst_name))
        {
            brd_api_fname_prev = path.join(this.libs_dir, brd_api_name_prev);
            if (!this.is_web_hosted && brd_api_fname_prev != this.brd_api_dst_fname)
            {
                const abs = path.isAbsolute(brd_api_fname_prev) ? brd_api_fname_prev : path.join(this.workdir, brd_api_fname_prev);
                if (fs.existsSync(abs))
                    fs.unlinkSync(abs);
            }
        }
        this.print(`✔ Processed ${brd_api_fname_prev} -> ${this.brd_api_dst_fname}`);
    }
    get_config_to_save() {
        const additional = {
            index: this.index_fname,
            use_helper: this.use_helper,
        };
        return Object.assign(super.get_config_to_save(), additional);
    }
    async prepare(){
        await super.prepare();

        this.assign_web_hosted();
        await this.assign_index_filename();
        await this.assign_use_helper();
        if (this.use_helper)
        {
            this.assign_brd_api_helper_name();
            await this.assign_brd_api_helper_filename();
            this.assign_brd_api_helper_dest_filename();
        }
    }
    async run_body() {
        await super.run_body();
        this.update_brd_api();
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
    if (!platform)
        throw new Error(`Unsupported platform: ${opt.platform}. Supported: ${Object.keys(platforms).join(', ')}`);
    return new platform.Implementation({...opt, name: platform.name}).run();
};

module.exports = {process_web, BrightSdkUpdateWeb};
