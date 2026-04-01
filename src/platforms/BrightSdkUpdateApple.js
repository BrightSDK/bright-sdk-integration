// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const path = require('path');
const {BrightSdkUpdateBase} = require('./BrightSdkUpdateBase.js');

class BrightSdkUpdateApple extends BrightSdkUpdateBase {
    constructor(opt){
        super(opt);
    }
    async assign_brd_api_filename(){
        this.brd_api_fname = path.join(this.sdk_dir, this.brd_api_name);
    }
}

class BrightSdkUpdateAppleMobile extends BrightSdkUpdateApple {
    constructor(opt){
        super(opt);
        this.brd_api_name = 'brdsdk.xcframework';
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