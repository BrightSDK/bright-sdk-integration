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
