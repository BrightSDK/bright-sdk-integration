const fs = require('fs');
const lib = require('../src/lib.js');
const navigation = require('../src/navigation.js');
const { BrightSdkUpdateBase } = require('../src/platforms/BrightSdkUpdateBase.js');

jest.mock('fs');
jest.mock('../src/lib.js');
jest.mock('../src/navigation.js');

describe('BrightSdkUpdateBase.download_sdk', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync = jest.fn();

        lib.read_json.mockReturnValue({});
        lib.write_json.mockImplementation(() => { });
        lib.download_from_url.mockResolvedValue();
        lib.unzip.mockResolvedValue();
        lib.print.mockImplementation(() => { });
    });

    test('uses cached sdk when sdk_dir exists and versions entry exists', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.sdk_dir = '/cache/sdk/1.2.3';
        u.sdk_ver = '1.2.3';
        u.sdk_versions = { '1.2.3': { date: '2020-01-01T00:00:00Z' } };
        u.sdk_zip = 'sdk.zip';
        u.sdk_url = 'https://example/sdk.zip';
        u.sdk_zip_fname = '/cache/sdk.zip';

        fs.existsSync.mockImplementation(p => p === '/cache/sdk/1.2.3');

        await u.download_sdk();

        expect(lib.download_from_url).not.toHaveBeenCalled();
        expect(lib.unzip).not.toHaveBeenCalled();
        expect(lib.write_json).not.toHaveBeenCalled();
    });

    test('downloads and unzips sdk when not cached', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.sdk_dir = '/cache/sdk/1.2.3';
        u.sdk_ver = '1.2.3';
        u.sdk_versions_fname = '/cache/versions.json';
        u.sdk_versions = {};
        u.sdk_zip = 'sdk.zip';
        u.sdk_url = 'https://example/sdk.zip';
        u.sdk_zip_fname = '/cache/sdk.zip';

        fs.existsSync.mockReturnValue(false);

        await u.download_sdk();

        expect(lib.download_from_url).toHaveBeenCalledWith('https://example/sdk.zip', '/cache/sdk.zip');
        expect(lib.write_json).toHaveBeenCalledWith('/cache/versions.json', expect.any(Object));
        expect(lib.unzip).toHaveBeenCalledWith('/cache/sdk.zip', '/cache/sdk/1.2.3');
    });
});

describe('BrightSdkUpdateBase.save_config', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync = jest.fn();

        lib.write_json.mockImplementation(() => { });
        lib.print.mockImplementation(() => { });
    });

    test('writes config file when opt.config is not provided', () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: true,
            workdir: '/test/project',
        });

        u.workdir = '/test/project';
        u.appdir = 'app';
        u.libs_dir = 'app/js';
        u.sdk_service_dir = 'service';
        u.sdk_ver = '1.2.3';
        u.sdk_url_mask = 'https://example/sdk_SDK_VER.zip';
        u.brd_api_dst_fname = 'app/js/brd_api_v1.2.3.js';

        u.save_config();

        expect(lib.write_json).toHaveBeenCalledWith(
            '/test/project/brd_sdk.config.json',
            expect.objectContaining({
                app_dir: 'app',
                libs_dir: 'app/js',
                sdk_service_dir: 'service',
                sdk_ver: '1.2.3',
                sdk_url: 'https://example/sdk_SDK_VER.zip',
            })
        );
    });

    test('does not write config file when opt.config is provided', () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: true,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';
        u.sdk_ver = '1.2.3';
        u.sdk_url_mask = 'https://example/sdk_SDK_VER.zip';

        u.save_config();

        expect(lib.write_json).not.toHaveBeenCalled();
    });
});

describe('BrightSdkUpdateBase.assign_sdk_url', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        lib.print.mockImplementation(() => { });
    });

    test('builds sdk_url by replacing SDK_VER', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.app_config = { defaults: { sdk_url_mask: 'https://cdn/sdk_SDK_VER.zip' } };
        u.config = { sdk_url: 'https://cdn/sdk_SDK_VER.zip' };
        u.sdk_ver = '1.2.3';

        await u.assign_sdk_url();

        expect(u.sdk_url_mask).toBe('https://cdn/sdk_SDK_VER.zip');
        expect(u.sdk_url).toBe('https://cdn/sdk_1.2.3.zip');
    });

    test('throws if sdk_url_mask not configured', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.app_config = { defaults: {} };
        u.sdk_ver = '1.2.3';

        await expect(u.assign_sdk_url()).rejects.toThrow(/SDK URL mask not configured/);
    });
});

describe('BrightSdkUpdateBase.get_value', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        navigation.clear_screen.mockImplementation(() => { });
        lib.print.mockImplementation(() => { });
    });

    test('non-interactive returns config_value as-is (even if undefined)', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';

        const v = await u.get_value('Q', 'default', undefined);
        expect(v).toBeUndefined();
    });
});

describe('BrightSdkUpdateBase.assign_sdk_ver (latest)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        lib.download_from_url.mockResolvedValue();
        lib.print.mockImplementation(() => { });
    });

    test('resolves "latest" using downloaded latest.json', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: true,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';
        u.sdk_dir_root = '/cache/.sdk/webos';
        u.app_config = { urls: { sdk_versions: 'https://example.com/versions.json' } };
        u.config = {};

        jest.spyOn(u, 'get_value').mockResolvedValue('latest');

        lib.read_json.mockImplementation((fname) => {
            if (String(fname).endsWith('latest.json'))
                return { webos: '9.9.9' };
            return {};
        });

        await u.assign_sdk_ver();

        expect(lib.download_from_url).toHaveBeenCalledWith(
            'https://example.com/versions.json',
            '/cache/.sdk/webos/latest.json'
        );
        expect(u.sdk_ver).toBe('9.9.9');
    });
});

describe('BrightSdkUpdateBase.assign_sdk_ver (explicit)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        lib.print.mockImplementation(() => { });
    });

    test('uses explicit version without downloading latest.json', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: true,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.sdk_dir_root = '/cache/.sdk/webos';
        u.config = {};

        jest.spyOn(u, 'get_value').mockResolvedValue('1.2.3');

        await u.assign_sdk_ver();

        expect(u.sdk_ver).toBe('1.2.3');
        expect(lib.download_from_url).not.toHaveBeenCalled();
    });
});

describe('BrightSdkUpdateBase.check_sdk_ver', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        lib.print.mockImplementation(() => { });
    });

    test('does not prompt in non-interactive mode', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.config = { sdk_ver_prev: '1.0.0' };

        const spy = jest.spyOn(u, 'get_value');

        await u.check_sdk_ver();

        expect(spy).not.toHaveBeenCalled();
    });

    test('prompts for force update in interactive mode', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: true,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.config = { sdk_ver_prev: '1.0.0' };

        jest.spyOn(u, 'get_value').mockResolvedValue('n');

        await u.check_sdk_ver();

        expect(u.get_value).toHaveBeenCalledWith('Force update? (y/n)', 'n');
    });
});

describe('BrightSdkUpdateBase.search_workdir', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('passes exclude list rooted at workdir', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';

        lib.search_directory.mockResolvedValue(null);

        await u.search_workdir('^x$');

        expect(lib.search_directory).toHaveBeenCalledWith(
            '/test/project',
            expect.any(RegExp),
            expect.objectContaining({
                exclude: expect.arrayContaining([
                    '/test/project/.git',
                    '/test/project/.sdk',
                    '/test/project/node_modules',
                ]),
            })
        );
    });
});

describe('BrightSdkUpdateBase.build_config', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('uses opt.config and opt.workdir', () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: {
                workdir: '/test/project',
                app_dir: 'app',
                libs_dir: 'libs',
            },
        });

        u.build_config();

        expect(u.workdir).toBe('/test/project');
        expect(u.appdir).toBe('app');
        expect(u.config.libs_dir).toBe('libs');
    });

    test('reads config from config_fnames when provided', () => {
        const cfgPath = '/test/project/brd_sdk.config.json';

        fs.existsSync.mockImplementation(p => p === cfgPath);

        lib.read_json.mockImplementation((p) => {
            if (p === cfgPath) {
                return { workdir: '/test/project', app_dir: 'app', libs_dir: 'libs' };
            }
            return {};
        });

        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            config_fnames: [cfgPath],
        });

        u.build_config();

        expect(u.workdir).toBe('/test/project');
        expect(u.appdir).toBe('app');
        expect(u.config.libs_dir).toBe('libs');
    });

    test('build_config applies env overrides on first config file', () => {
        const cfgPath = '/test/project/brd_sdk.config.json';

        fs.existsSync.mockImplementation(p => p === cfgPath);

        lib.read_json.mockImplementation((p) => {
            if (p === cfgPath) {
                return { workdir: '/test/project', libs_dir: 'libs_from_file' };
            }
            return {};
        });

        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            config_fnames: [cfgPath],
        });

        jest.spyOn(u, 'read_env').mockReturnValue({ libs_dir: 'libs_from_env' });

        u.build_config();

        expect(u.config.libs_dir).toBe('libs_from_env');
        expect(u.prev_config_fname).toBe(cfgPath);
    });

});

describe('BrightSdkUpdateBase.prepare', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        lib.print.mockImplementation(() => { });
    });

    test('calls the main preparation steps', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        jest.spyOn(u, 'build_config').mockImplementation(() => { u.workdir = '/test/project'; });
        jest.spyOn(u, 'print_greeting').mockImplementation(() => { });
        jest.spyOn(u, 'load_config').mockResolvedValue();

        jest.spyOn(u, 'assign_sdk_dir_root').mockImplementation(() => { });
        jest.spyOn(u, 'create_sdk_dir_root').mockImplementation(() => { });
        jest.spyOn(u, 'assign_sdk_ver').mockResolvedValue();
        jest.spyOn(u, 'check_sdk_ver').mockResolvedValue();
        jest.spyOn(u, 'assign_sdk_url').mockResolvedValue();
        jest.spyOn(u, 'assign_sdk_zip_names').mockImplementation(() => { });
        jest.spyOn(u, 'assign_sdk_dir').mockImplementation(() => { });
        jest.spyOn(u, 'assign_sdk_versions_filename').mockImplementation(() => { u.sdk_versions_fname = '/x'; });
        jest.spyOn(u, 'assign_sdk_versions').mockResolvedValue();

        jest.spyOn(u, 'assign_appdir').mockResolvedValue();
        jest.spyOn(u, 'assign_libs_dir').mockResolvedValue();
        jest.spyOn(u, 'create_libs_dir').mockImplementation(() => { });
        jest.spyOn(u, 'assign_sdk_service_filename').mockImplementation(() => { });
        jest.spyOn(u, 'assign_sdk_service_dir').mockResolvedValue();
        jest.spyOn(u, 'assign_brd_api_filename').mockImplementation(() => { });
        jest.spyOn(u, 'assign_brd_api_dest_name').mockImplementation(() => { });
        jest.spyOn(u, 'assign_brd_api_dest_filename').mockImplementation(() => { });

        await u.prepare();

        expect(u.build_config).toHaveBeenCalled();
        expect(u.print_greeting).toHaveBeenCalled();
        expect(u.load_config).toHaveBeenCalled();

        expect(u.assign_sdk_dir_root).toHaveBeenCalled();
        expect(u.assign_sdk_ver).toHaveBeenCalled();
        expect(u.assign_sdk_url).toHaveBeenCalled();

        expect(u.assign_appdir).toHaveBeenCalled();
        expect(u.assign_libs_dir).toHaveBeenCalled();
        expect(u.create_libs_dir).toHaveBeenCalled();

        expect(u.assign_brd_api_dest_filename).toHaveBeenCalled();
    });
});

describe('BrightSdkUpdateBase: constructor config loading', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fs.existsSync.mockReturnValue(true);
        lib.read_json.mockReturnValue({ defaults: { sdk_url_mask: 'x' } });
    });

    test('loads app_config from config.json when exists', () => {
        const u = new BrightSdkUpdateBase({ platform: 'webos', name: 'WebOS' });
        expect(lib.read_json).toHaveBeenCalled();
        expect(u.app_config).toEqual({ defaults: { sdk_url_mask: 'x' } });
    });
});

describe('BrightSdkUpdateBase.get_value path stripping', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        navigation.clear_screen.mockImplementation(() => { });
        lib.print.mockImplementation(() => { });
    });

    test('strips workdir prefix from prompted path', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: true,
            verbose: false,
        });

        u.workdir = '/test/project';
        navigation.prompt.mockResolvedValue('/test/project/app/js');

        const v = await u.get_value('Q', '', null, {});
        expect(v).toBe('app/js');
    });
});

describe('BrightSdkUpdateBase.load_config', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        lib.print.mockImplementation(() => { });
    });

    test('loads brd_sdk.config.json when exists and no opt.config', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
        });

        u.workdir = '/test/project';

        fs.existsSync.mockImplementation(p => p === '/test/project/brd_sdk.config.json');
        lib.read_json.mockReturnValue({ libs_dir: 'libs', app_dir: 'app' });

        await u.load_config();

        expect(u.config.libs_dir).toBe('libs');
        expect(u.prev_config_fname).toBe('/test/project/brd_sdk.config.json');
    });
});

describe('BrightSdkUpdateBase.run_body/run', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        lib.print.mockImplementation(() => { });
    });

    test('run_body executes the main pipeline', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        jest.spyOn(u, 'prepare').mockResolvedValue();
        jest.spyOn(u, 'create_sdk_dir').mockImplementation(() => { });
        jest.spyOn(u, 'download_sdk').mockResolvedValue();
        jest.spyOn(u, 'replace_sdk_files').mockResolvedValue();
        jest.spyOn(u, 'update_sdk_files').mockImplementation(() => { });

        await u.run_body();

        expect(u.prepare).toHaveBeenCalled();
        expect(u.create_sdk_dir).toHaveBeenCalled();
        expect(u.download_sdk).toHaveBeenCalled();
        expect(u.replace_sdk_files).toHaveBeenCalled();
        expect(u.update_sdk_files).toHaveBeenCalled();
    });

    test('run calls run_body then save_config', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        jest.spyOn(u, 'run_body').mockResolvedValue();
        jest.spyOn(u, 'save_config').mockImplementation(() => { });

        await u.run();

        expect(u.run_body).toHaveBeenCalled();
        expect(u.save_config).toHaveBeenCalled();
    });
});

describe('BrightSdkUpdateBase: sdk dir creation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fs.mkdirSync = jest.fn();
    });

    test('create_sdk_dir_root creates directory when missing', () => {
        const u = new BrightSdkUpdateBase({ platform: 'webos', name: 'WebOS' });

        u.sdk_dir_root = '/cache/.sdk/webos';

        fs.existsSync.mockImplementation(p => p !== '/cache/.sdk/webos');

        u.create_sdk_dir_root();

        expect(fs.mkdirSync).toHaveBeenCalledWith('/cache/.sdk/webos', { recursive: true });
    });

    test('create_sdk_dir creates directory when missing', () => {
        const u = new BrightSdkUpdateBase({ platform: 'webos', name: 'WebOS' });

        u.sdk_dir = '/cache/.sdk/webos/1.2.3';

        fs.existsSync.mockImplementation(p => p !== '/cache/.sdk/webos/1.2.3');

        u.create_sdk_dir();

        expect(fs.mkdirSync).toHaveBeenCalledWith('/cache/.sdk/webos/1.2.3');
    });
});

describe('BrightSdkUpdateBase.prepare (real path, no stubs)', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync = jest.fn();
        fs.readFileSync = jest.fn().mockReturnValue('{}');
        fs.writeFileSync = jest.fn();

        lib.download_from_url.mockResolvedValue();
        lib.unzip.mockResolvedValue();
        lib.write_json.mockImplementation(() => { });
        lib.print.mockImplementation(() => { });
        navigation.clear_screen.mockImplementation(() => { });
    });

    test('runs through prepare without interactive prompts', async () => {
        const u = new BrightSdkUpdateBase({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: true,
            workdir: '/test/project',
            config: {
                workdir: '/test/project',
                sdk_ver: '1.2.3',
                sdk_url: 'https://cdn/sdk_SDK_VER.zip',
                libs_dir: 'libs',
            },
        });

        u.app_config = { defaults: { sdk_url_mask: 'https://cdn/sdk_SDK_VER.zip' } };
        u.assign_appdir = jest.fn(async () => { u.appdir = 'app'; });
        u.brd_api_name = 'artifact.bin';
        u.sdk_service_fname = null;

        await u.prepare();

        expect(u.sdk_dir_root).toContain('/.sdk/webos');
        expect(u.sdk_dir).toContain('/.sdk/webos/1.2.3');
        expect(u.brd_api_dst_fname).toBe('libs/artifact.bin');
        expect(fs.mkdirSync).toHaveBeenCalled();
    });
});
