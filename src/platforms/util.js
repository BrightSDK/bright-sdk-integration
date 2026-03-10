// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const path = require('path');

const get_config_fname = workdir=>path.join(workdir, 'brd_sdk.config.json');

module.exports = {get_config_fname};