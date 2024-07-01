// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const path = require('path');
const lib = require('./src/lib.js');
const utils = require('./src/processors.js');
const processor_roku = require('./src/processor_roku.js');
const processor_webos = require('./src/processor_webos.js');

const {print} = lib;
const {get_config_fname} = utils;
const {process_roku} = processor_roku;
const {process_webos} = processor_webos;

module.exports = {process_roku, processor_webos};

/**
- The apps must be in a directory inside a working directory.
- Configuration file must be in the working directory.
- Input parameters are full paths to configuration files.
- The working directory and app's directory are defined relatevely to
the configuration file path, e.g.
```
node index.js /Users/user1/mydir/brd_sdk.config.json.
```
/Users/user1/mydir - will be working directory (`workdir`) if not set in
`config.workdir`.
If config contains `app_dir` field, then it defines the app directory name
inside `workdir`. If it's missing, then it will be asked in CLI.

If config is not provided, then you enter `workdir` and `app_dir` in CLI.
Then the app tries to read config from the `workdir`.

If `config.app_dir` is missing, then workdir will be used.
*/
if (require.main == module)
{
    (async function(){
        const platform_parameter_keys = ['--platform', '-p'];
        const supported_platforms = ['roku', 'webos'];
        let platform = 'webos';
        const opt = {interactive: false, verbose: true, config_fnames: []};
        for (let i=2; i<process.argv.length; i++)
        {
            const arg = process.argv[i];
            print('arg[' + i + ']: ' + arg);
            print(get_config_fname(path.dirname(arg)));
            if (platform_parameter_keys.includes(arg))
            {
                i += 1;
                const platform_param = process.argv[i];
                if (supported_platforms.includes(platform_param))
                    platform = platform_param;
                else
                {
                    print('\u001b[1;91mUnsupported platform: '
                        + platform_param + '\u001b[0m');
                }
            }
            else if (arg == get_config_fname(path.dirname(arg)))
            {
                print('Using configuration file: ' + arg);
                opt.config_fnames.push(arg);
            }
            else
            {
                print('Using appdir: ' + arg);
                opt.appdir = arg;
                break;
            }
        }
        if (platform == 'roku')
            await process_roku(opt);
        else if (platform == 'webos')
            await process_webos(opt);
    })();
}
