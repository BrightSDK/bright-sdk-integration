// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const fs = require('fs');
const path = require('path');
const {BrightSdkUpdateBase} = require('./BrightSdkUpdateBase.js');

const CSPROJ_MARKER = '<!-- lum_sdk -->';

function find_csproj(dir, excludes=[]){
    const results = [];
    if (excludes.includes(dir))
        return results;
    for (const entry of fs.readdirSync(dir, {withFileTypes: true}))
    {
        const full = path.join(dir, entry.name);
        if (excludes.includes(full))
            continue;
        if (entry.isDirectory())
            results.push(...find_csproj(full, excludes));
        else if (entry.isFile() && entry.name.endsWith('.csproj'))
            results.push(full);
    }
    return results;
}

function patch_csproj(csproj_fname, dll_hint_path, libs_dir_rel){
    let content = fs.readFileSync(csproj_fname, 'utf8');
    if (content.includes(CSPROJ_MARKER))
        return false; // already patched
    const block = [
        '',
        `  ${CSPROJ_MARKER}`,
        '  <ItemGroup>',
        '    <Reference Include="lum_sdk">',
        `      <HintPath>${dll_hint_path}</HintPath>`,
        '    </Reference>',
        '  </ItemGroup>',
        '  <ItemGroup>',
        '    <None Include="brd_config.json">',
        '      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>',
        '    </None>',
        `    <Content Include="${libs_dir_rel}\\net_updater64.exe">`,
        '      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>',
        '    </Content>',
        `    <Content Include="${libs_dir_rel}\\lum_sdk_managed_x64.dll">`,
        '      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>',
        '    </Content>',
        '  </ItemGroup>',
        '',
    ].join('\n');
    content = content.replace(/(<\/Project>)/, `${block}$1`);
    fs.writeFileSync(csproj_fname, content);
    return true;
}

class BrightSdkUpdateWin extends BrightSdkUpdateBase {
    constructor(opt){
        super(opt);
        this.csproj_fname = null;
        this.brd_api_name = 'lum_sdk.dll';
    }
    get_platform_version_key(){
        return 'win';
    }
    async assign_brd_api_filename(){
        this.brd_api_fname = path.join(this.sdk_dir, this.brd_api_name);
    }
    async get_libs_dir_def(){
        if (this.csproj_fname)
            return path.join(path.dirname(this.csproj_fname), 'BrightSDK');
        return null;
    }
    libs_dir_prompt(){
        return 'SDK destination directory';
    }
    async assign_appdir(){
        const excludes = this.get_workdir_excludes().map(p=>path.join(this.workdir, p));
        // exclude libs_dir — extracted SDK zips contain sample .csproj files
        if (this.config.libs_dir)
            excludes.push(path.join(this.workdir, this.config.libs_dir));
        const found = find_csproj(this.workdir, excludes);
        if (found.length === 1)
        {
            this.csproj_fname = found[0];
            this.print(`✔ Found project: ${path.relative(this.workdir, this.csproj_fname)}`);
        }
        else if (found.length > 1)
        {
            const rel = found.map(p=>path.relative(this.workdir, p));
            const chosen = await this.get_value(
                'Multiple .csproj files found. Select one',
                rel[0],
                this.config.csproj_fname,
                {selectable: true, dir: this.workdir}
            );
            this.csproj_fname = path.isAbsolute(chosen)
                ? chosen
                : path.join(this.workdir, chosen);
        }
        else
        {
            this.print('No .csproj found in workdir — project patching will be skipped.');
            this.csproj_fname = null;
        }
    }
    async assign_sdk_service_filename(){
        this.sdk_service_fname = path.join(this.sdk_dir, 'net_updater64.exe');
    }
    async get_service_dir_def(){
        return this.libs_dir || null;
    }
    get_sdk_files(){
        const files = [];
        // service exe: sdk_service_dir is a directory — append filename to get full dst path
        if (this.sdk_service_fname && this.sdk_service_dir)
        {
            const svc_dst = path.join(this.sdk_service_dir,
                path.basename(this.sdk_service_fname));
            files.push([this.sdk_service_fname, svc_dst]);
        }
        // api dll
        if (this.brd_api_fname && this.brd_api_dst_fname)
            files.push([this.brd_api_fname, this.brd_api_dst_fname]);
        // managed wrapper dll (loaded at runtime by lum_sdk.dll)
        if (this.brd_api_fname)
        {
            const managed = path.join(path.dirname(this.brd_api_fname), 'lum_sdk_managed_x64.dll');
            if (fs.existsSync(managed) && this.sdk_service_dir)
                files.push([managed, path.join(this.sdk_service_dir, 'lum_sdk_managed_x64.dll')]);
        }
        // brd_config.json must land next to the .csproj for CopyToOutputDirectory to work
        if (this.csproj_fname)
        {
            const brd_config_src = path.join(this.sdk_dir, 'brd_config.json');
            const brd_config_dst = path.join(path.dirname(this.csproj_fname), 'brd_config.json');
            files.push([brd_config_src, brd_config_dst]);
        }
        return files;
    }
    get_config_to_save(){
        const base = super.get_config_to_save();
        if (this.csproj_fname)
            base.csproj_fname = path.relative(this.workdir, this.csproj_fname);
        return base;
    }
    async update_sdk_files(){
        if (!this.csproj_fname)
        {
            this.print('⚠ .csproj not set — skipping project patching.');
            return;
        }
        const csproj_dir = path.dirname(this.csproj_fname);
        const hint_path = path.relative(
            csproj_dir,
            path.join(this.workdir, this.libs_dir, this.brd_api_name)
        );
        const libs_dir_rel = path.relative(
            csproj_dir,
            path.join(this.workdir, this.libs_dir)
        );
        const patched = patch_csproj(this.csproj_fname, hint_path, libs_dir_rel);
        if (patched)
            this.print(`✔ Patched ${path.relative(this.workdir, this.csproj_fname)} (added lum_sdk reference + brd_config.json)`);
        else
            this.print(`✔ ${path.relative(this.workdir, this.csproj_fname)} already patched`);
    }
}

const process_windows = async(opt={})=>{
    return new BrightSdkUpdateWin({...opt, name: 'Windows'}).run();
};

module.exports = {process_windows, BrightSdkUpdateWin};
