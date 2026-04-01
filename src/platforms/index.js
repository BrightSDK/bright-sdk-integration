// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const {get_config_fname} = require('./util.js');
const {process_web} = require('./BrightSdkUpdateWeb.js');
const {process_apple} = require('./BrightSdkUpdateApple.js');

module.exports = {get_config_fname, process_web, process_apple};