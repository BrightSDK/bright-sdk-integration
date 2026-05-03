// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const fs = require('fs');
const path = require('path');
const {read_json} = require('../lib.js');
const {BrightSdkUpdateBase} = require('./BrightSdkUpdateBase.js');
const lib_xcode = require('../lib_xcode.js');

class BrightSdkUpdateApple extends BrightSdkUpdateBase {
    constructor(opt){
        super(opt);
        this.xcodeproj_dir = null;
    }
    async assign_brd_api_filename(){
        this.brd_api_fname = path.join(this.sdk_dir, this.brd_api_name);
    }
    async get_libs_dir_def(){
        if (this.xcodeproj_dir)
            return path.join(path.dirname(this.xcodeproj_dir), 'BrightSDK');
        return null;
    }
    libs_dir_prompt(){
        return 'Framework destination directory';
    }
    async assign_appdir(){
        const excludes = this.get_workdir_excludes().map(p=>path.join(this.workdir, p));
        const found = lib_xcode.find_xcodeproj(this.workdir, excludes);
        if (found.length === 1)
        {
            this.xcodeproj_dir = found[0];
            this.print(`✔ Found Xcode project: ${path.relative(this.workdir, this.xcodeproj_dir)}`);
        }
        else if (found.length > 1)
        {
            const rel = found.map(p=>path.relative(this.workdir, p));
            const chosen = await this.get_value(
                'Multiple Xcode projects found. Select one',
                rel[0],
                this.config.xcodeproj_dir,
                {selectable: true, dir: this.workdir}
            );
            this.xcodeproj_dir = path.isAbsolute(chosen)
                ? chosen
                : path.join(this.workdir, chosen);
        }
        else
        {
            this.print('No .xcodeproj found in workdir — Xcode project patching will be skipped.');
            this.xcodeproj_dir = null;
        }
    }
    get_config_to_save(){
        const base = super.get_config_to_save();
        if (this.xcodeproj_dir)
            base.xcodeproj_dir = path.relative(this.workdir, this.xcodeproj_dir);
        return base;
    }
    async assign_sdk_ver(){
        await super.assign_sdk_ver();
        if (this.sdk_ver=='latest' && this.opt.platform=='tvos')
        {
            const latest_fname = path.join(this.sdk_dir_root, 'latest.json');
            if (fs.existsSync(latest_fname))
            {
                const versions = read_json(latest_fname);
                if (versions['ios'])
                    this.sdk_ver = versions['ios'];
            }
        }
    }
}

class BrightSdkUpdateAppleMobile extends BrightSdkUpdateApple {
    constructor(opt){
        super(opt);
        this.brd_api_name = 'brdsdk.xcframework';
    }
    async update_sdk_files(){
        if (!this.xcodeproj_dir)
        {
            this.print('⚠ Xcode project not set — skipping Xcode project patching.');
            return;
        }
        const pbxproj_path = path.join(this.xcodeproj_dir, 'project.pbxproj');
        const project = lib_xcode.open_project(pbxproj_path);

        const fw_rel = path.relative(
            path.dirname(this.xcodeproj_dir),
            path.join(this.workdir, this.libs_dir, this.brd_api_name)
        );
        const added = lib_xcode.add_framework_embed_sign(project, fw_rel);
        if (added)
            this.print(`✔ Added ${this.brd_api_name} to Xcode project (Embed & Sign)`);
        else
            this.print(`✔ ${this.brd_api_name} already present in Xcode project`);

        lib_xcode.set_build_setting(project, 'FRAMEWORK_SEARCH_PATHS',
            `("$(inherited)", "${path.dirname(fw_rel)}")`);

        lib_xcode.save_project(pbxproj_path, project);
        this.print(`✔ Saved ${path.relative(this.workdir, pbxproj_path)}`);
    }
}

class BrightSdkUpdateAppleDesktop extends BrightSdkUpdateApple {
    constructor(opt){
        super(opt);
        this.brd_api_name = 'brdsdk.framework';
    }
    async assign_sdk_service_filename(){
        this.sdk_service_fname = path.join(this.sdk_dir, 'net_updater.app');
    }
    get_sdk_files(){
        const result = [];
        if (this.sdk_service_dir && this.sdk_service_fname)
        {
            const dst = path.join(this.sdk_service_dir, path.basename(this.sdk_service_fname));
            result.push([this.sdk_service_fname, dst]);
        }
        if (this.brd_api_fname && this.brd_api_dst_fname)
            result.push([this.brd_api_fname, this.brd_api_dst_fname]);
        return result;
    }
    async update_sdk_files(){
        if (!this.xcodeproj_dir)
        {
            this.print('⚠ Xcode project not set — skipping Xcode project patching.');
            return;
        }
        const pbxproj_path = path.join(this.xcodeproj_dir, 'project.pbxproj');
        const project = lib_xcode.open_project(pbxproj_path);
        const proj_parent = path.dirname(this.xcodeproj_dir);

        // 1. brdsdk.framework — Embed & Sign
        const fw_rel = path.relative(
            proj_parent,
            path.join(this.workdir, this.libs_dir, this.brd_api_name)
        );
        const fw_added = lib_xcode.add_framework_embed_sign(project, fw_rel);
        if (fw_added)
            this.print(`✔ Added ${this.brd_api_name} to Xcode project (Embed & Sign)`);
        else
            this.print(`✔ ${this.brd_api_name} already present in Xcode project`);

        lib_xcode.set_build_setting(project, 'FRAMEWORK_SEARCH_PATHS',
            `("$(inherited)", "${path.dirname(fw_rel)}")`);
        lib_xcode.set_build_setting(project, 'LD_RUNPATH_SEARCH_PATHS',
            '"$(inherited) @executable_path/../Frameworks"');

        // 2. net_updater.app → Copy Files phase → Contents/Library/LoginItems
        if (this.sdk_service_fname && this.sdk_service_dir)
        {
            const app_dst = path.join(this.workdir, this.sdk_service_dir,
                path.basename(this.sdk_service_fname));
            const app_rel = path.relative(proj_parent, app_dst);
            lib_xcode.add_copy_files_phase(
                project,
                [app_rel],
                'Copy net_updater.app',
                'wrapper',
                'Contents/Library/LoginItems'
            );
            this.print('✔ Added "Copy net_updater.app" build phase (LoginItems)');
        }

        // 3. Resign net_updater.app run-script phase
        const entitlements_src = path.join(this.sdk_dir, 'net_updater.entitlements');
        const resign_src = path.join(this.sdk_dir, 'resign_net_updater.sh');
        if (!fs.existsSync(entitlements_src) || !fs.existsSync(resign_src))
        {
            this.print('⚠ net_updater.entitlements or resign_net_updater.sh not found in SDK — '
                +'skipping Resign build phase. Add it manually from the SDK docs.');
        }
        else
        {
            const entitlements_dst = path.join(this.workdir, this.libs_dir,
                path.basename(entitlements_src));
            const entitlements_rel = path.relative(proj_parent, entitlements_dst);
            const resign_script = [
                '"$SRCROOT/resign_net_updater.sh"',
                '"$CODESIGNING_FOLDER_PATH/Contents/Library/LoginItems/net_updater.app"',
                `"${entitlements_rel}"`,
            ].join(' \\\n  ');

            lib_xcode.add_shell_script_phase(project, 'Resign net_updater.app', {
                shellPath: '/bin/sh',
                shellScript: resign_script,
                inputPaths: [],
                outputPaths: [],
            });
            this.print('✔ Added "Resign net_updater.app" build phase');

            // copy resign_net_updater.sh to project root alongside .xcodeproj
            const resign_dst = path.join(proj_parent, 'resign_net_updater.sh');
            if (!fs.existsSync(resign_dst))
                fs.copyFileSync(resign_src, resign_dst);

            lib_xcode.set_build_setting(project, 'NET_UPDATER_ENTITLEMENTS',
                entitlements_rel);
        }

        lib_xcode.set_build_setting(project, 'ENABLE_USER_SCRIPT_SANDBOXING', 'NO');

        lib_xcode.save_project(pbxproj_path, project);
        this.print(`✔ Saved ${path.relative(this.workdir, pbxproj_path)}`);
    }
}

const process_apple = async(opt={})=>{
    const platforms = {
        ios: {name: 'iOS', Implementation: BrightSdkUpdateAppleMobile},
        tvos: {name: 'tvOS', Implementation: BrightSdkUpdateAppleMobile},
        macos: {name: 'macOS', Implementation: BrightSdkUpdateAppleDesktop},
    };
    const platform = platforms[opt.platform];
    if (!platform)
        throw new Error(`Unsupported platform: ${opt.platform}. Supported: ${Object.keys(platforms).join(', ')}`);
    return new platform.Implementation({...opt, name: platform.name}).run();
};

module.exports = {process_apple, BrightSdkUpdateAppleMobile, BrightSdkUpdateAppleDesktop};
