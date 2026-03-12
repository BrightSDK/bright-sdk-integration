// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const fs = require('fs');
const path = require('path');
const lib = require('../lib.js');
const navigation = require('../navigation.js');
const {get_config_fname} = require('./util.js');

const {
    lbr,
    print: print_base, process_init,
    read_json, write_json, search_directory,
    download_from_url, unzip, replace_file,
} = lib;

const {clear_screen, prompt} = navigation;

class BrightSdkUpdateBase {
    constructor(opt) {
        this.config_path = path.join(__dirname, '..', '..', 'config.json');
        this.app_config = fs.existsSync(this.config_path) ? read_json(this.config_path) : {};
        this.opt = opt;
        this.buffer = '';
        this.workdir = null;
        this.config = {};
        this.prev_config_fname = null;
        this.sdk_dir_root = null;
        this.sdk_dir = null;
        this.sdk_versions_fname = null;
        this.sdk_versions = {};
        this.sdk_ver = null;
        this.sdk_url_mask = null;
        this.sdk_url = null;
        this.sdk_zip = null;
        this.sdk_zip_fname = null;
        this.env = {};
        this.config_fnames = [];
    }
    print(s, opt={}){
        if (!this.opt.interactive && !this.opt.verbose)
            return;
        const printed = print_base(s, opt);
        this.buffer += printed;
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
    read_config(config, fname){
        this.print(`Reading configuration file ${fname}...`);
        const overrides = read_json(fname);
        Object.assign(config, overrides);
    }
    async search_workdir(name){
        return await search_directory(this.workdir, new RegExp(name), {
            exclude: this.get_workdir_excludes().map(p=>path.join(this.workdir, p)),
        });
    }
    get_workdir_excludes(){
        return [
            '.git',
            '.github',
            '.sdk',
            '.vscode',
            '.idea',
            '.build',
            'node_modules',
        ];
    }
    print_greeting(){
        const greeting = `Welcome to BrightSDK Integration Code Generator for ${this.opt.name}!`;
        const instructions = `Press CTRL+C at any time to break execution.
        NOTE: remember to save your uncommited changes first.
        `;
        clear_screen();
        this.print(greeting+lbr+instructions);
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
        this.sdk_dir_root = path.join(root_dir, '..', '.sdk', this.opt.platform);
    }
    create_sdk_dir_root(){
        if (!fs.existsSync(this.sdk_dir_root))
            fs.mkdirSync(this.sdk_dir_root, {recursive: true});
    }
    assign_sdk_versions_filename(){
        this.sdk_versions_fname = path.join(this.sdk_dir_root, 'versions.json');
    }
    async assign_sdk_versions(){
        this.sdk_versions = fs.existsSync(this.sdk_versions_fname)
            ? read_json(this.sdk_versions_fname) : {};
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
            const versions_url = this.app_config.urls?.sdk_versions;
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
    async assign_sdk_url(){
        const default_sdk_url = this.app_config.defaults?.sdk_url_mask;
        if (!default_sdk_url) {
            throw new Error('SDK URL mask not configured. Please add defaults.sdk_url_mask to config.json');
        }
        this.sdk_url_mask = await this.get_value('SDK URL mask',
            default_sdk_url, this.config.sdk_url);
        this.sdk_url = this.sdk_url_mask.replace(/SDK_VER/g, this.sdk_ver);
    }
    assign_sdk_dir(){
        this.sdk_dir = path.join(this.sdk_dir_root, this.sdk_ver);
    }
    create_sdk_dir(){
        if (!fs.existsSync(this.sdk_dir))
            fs.mkdirSync(this.sdk_dir);
    }
    assign_sdk_zip_names(){
        this.sdk_zip = path.basename(this.sdk_url);
        this.sdk_zip_fname = path.join(this.sdk_dir_root, this.sdk_zip);
    }
    update_sdk_files(){}
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
        return [];
    }
    async replace_sdk_files(){
        for (const [src, dst] of this.get_sdk_files())
        {
            if (await replace_file(src, dst))
                this.print(`✔ Removed ${dst}`);
            this.print(`✔ Copied ${src} to ${dst}`);
        }
    }
    read_env(){
        return {};
    }
    build_config(){
        this.env = this.read_env();
        this.config_fnames = this.opt.config_fnames
            || this.opt.config_fname && [this.opt.config_fname];
        if (this.opt.config) // where opt.config is assigned?
            Object.assign(this.config, this.opt.config);
        else if (this.config_fnames?.length)
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
                            this.config[name] = this.env[name];
                    }
                    this.prev_config_fname = config_fname;
                }
            }
        }
        this.workdir = this.config.workdir
            || this.opt.workdir
            || (this.config_fnames.length
                ? path.dirname(this.config_fnames[this.config_fnames.length-1])
                : process.cwd());
        this.config.workdir = this.workdir;
    }
    workdir_relative_path(s) {
        return path.relative(this.workdir, s) || '.';
    }
    get_config_to_save() {
        const config = {
            workdir: this.workdir_relative_path(this.workdir),
            sdk_ver: this.config?.sdk_ver || this.sdk_ver,
            sdk_ver_prev: this.sdk_ver,
            sdk_url: this.sdk_url_mask,
        };
        return config;
    }
    get_git_commit_files() {
        return [];
    }
    get_git_commit_commands(next_config_fname) {
        const sdk_ver_from = this.config.sdk_ver_prev && this.config.sdk_ver_prev != this.sdk_ver
            ? `from v${this.config.sdk_ver_prev} ` : '';
        const commands = [];
        if (path.resolve(this.workdir) != process.cwd())
            commands.push(`cd ${this.workdir}`);
        const commit_files = this.get_git_commit_files().map(f=>`git add ${f}`);
        commands.push(...commit_files);
        commands.push(...[
            `git add ${next_config_fname}`,
            `git commit -m 'update brd_sdk ${sdk_ver_from}to v${this.sdk_ver}'`,
        ]);
        return commands;
    }
    get_reset_command() {
        let reset = 'git checkout .';
        if (path.resolve(this.workdir) != process.cwd())
            reset = `cd ${this.workdir} && ${reset} && cd -`;
        return reset;
    }
    print_save_config(next_config_fname) {
        const commit_commands = this.get_git_commit_commands(next_config_fname).join(' && \\ \n');
        const reset = this.get_reset_command();
        this.print(`
Thank you for using our products!
To commit your changes, run:

${commit_commands}

To start over, run

${reset}
`);
    }
    save_config(){
        if (!this.opt.config)
        {
            const next_config = this.get_config_to_save();
            this.print(`Generated config:\n${JSON.stringify(next_config, null, 2)}\n`);
            const next_config_fname = get_config_fname(this.workdir);
            write_json(next_config_fname, next_config);
            this.print(`✔ Saved config into ${next_config_fname}`);
            this.print_save_config(next_config_fname);
        }
    }
    async prepare(){
        if (this.opt.interactive)
            process_init();
        this.build_config();
        this.print_greeting();
        await this.load_config();

        this.assign_sdk_dir_root();
        this.create_sdk_dir_root();
        await this.assign_sdk_ver();
        await this.check_sdk_ver();
        await this.assign_sdk_url();
        this.assign_sdk_zip_names();
        this.assign_sdk_dir();
        this.assign_sdk_versions_filename();
        await this.assign_sdk_versions();
    }
    async run_body(){
        await this.prepare();
        this.print('Starting...');
        this.create_sdk_dir();
        await this.download_sdk();
        await this.replace_sdk_files();
        this.update_sdk_files();
    }
    async run(){
        await this.run_body();
        this.save_config();
    }
}

module.exports = {BrightSdkUpdateBase};