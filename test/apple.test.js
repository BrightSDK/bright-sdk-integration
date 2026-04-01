const fs = require('fs');
const lib = require('../src/lib.js');
const navigation = require('../src/navigation.js');
const { BrightSdkUpdateAppleMobile, BrightSdkUpdateAppleDesktop } =
    require('../src/platforms/BrightSdkUpdateApple.js');

jest.mock('fs');
jest.mock('../src/lib.js');
jest.mock('../src/navigation.js');

describe('Apple updaters', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // fs stubs
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync = jest.fn();

        // lib stubs (чтобы модуль грузился без сюрпризов)
        lib.read_json.mockReturnValue({});
        lib.write_json.mockImplementation(() => { });
        lib.download_from_url.mockResolvedValue();
        lib.unzip.mockResolvedValue();
        lib.replace_file.mockResolvedValue(false);
    });

    test('iOS/tvOS: get_sdk_files maps brdsdk.xcframework into libs_dir', () => {
        const u = new BrightSdkUpdateAppleMobile({
            platform: 'ios',
            name: 'iOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';
        u.sdk_dir = '/cache/sdk/1.2.3';
        u.libs_dir = 'libs';

        u.brd_api_dst_name = u.brd_api_name;
        u.brd_api_dst_fname = 'libs/brdsdk.xcframework';

        u.assign_brd_api_filename();

        const files = u.get_sdk_files();
        expect(files).toEqual([
            ['/cache/sdk/1.2.3/brdsdk.xcframework', 'libs/brdsdk.xcframework'],
        ]);
    });

    test('macOS: get_sdk_files includes net_updater.app and brdsdk.framework', () => {
        const u = new BrightSdkUpdateAppleDesktop({
            platform: 'macos',
            name: 'macOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';
        u.sdk_dir = '/cache/sdk/1.2.3';
        u.libs_dir = 'libs';
        u.sdk_service_dir = 'libs';
        u.assign_sdk_service_filename();
        u.brd_api_dst_name = u.brd_api_name;
        u.brd_api_dst_fname = 'libs/brdsdk.framework';
        u.assign_brd_api_filename();

        const files = u.get_sdk_files();

        expect(files).toEqual([
            ['/cache/sdk/1.2.3/net_updater.app', 'libs/net_updater.app'],
            ['/cache/sdk/1.2.3/brdsdk.framework', 'libs/brdsdk.framework'],
        ]);
    });

    test('Apple: replace_sdk_files resolves relative dst against workdir', async () => {
        const u = new BrightSdkUpdateAppleMobile({
            platform: 'ios',
            name: 'iOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';

        jest.spyOn(u, 'get_sdk_files').mockReturnValue([
            ['/abs/src/brdsdk.xcframework', 'libs/brdsdk.xcframework']
        ]);

        lib.replace_file.mockResolvedValue(false);

        await u.replace_sdk_files();

        expect(lib.replace_file).toHaveBeenCalledWith(
            '/abs/src/brdsdk.xcframework',
            '/test/project/libs/brdsdk.xcframework'
        );
    });

    test('process_apple selects correct implementation by platform', async () => {
        const mod = require('../src/platforms/BrightSdkUpdateApple.js');

        const spyMobile = jest.spyOn(mod.BrightSdkUpdateAppleMobile.prototype, 'run')
            .mockResolvedValue();
        const spyDesktop = jest.spyOn(mod.BrightSdkUpdateAppleDesktop.prototype, 'run')
            .mockResolvedValue();

        await mod.process_apple({ platform: 'ios', interactive: false, workdir: '/test/project' });
        await mod.process_apple({ platform: 'tvos', interactive: false, workdir: '/test/project' });
        await mod.process_apple({ platform: 'macos', interactive: false, workdir: '/test/project' });

        expect(spyMobile).toHaveBeenCalledTimes(2);
        expect(spyDesktop).toHaveBeenCalledTimes(1);

        spyMobile.mockRestore();
        spyDesktop.mockRestore();
    });

    test('process_apple throws on unsupported platform', async () => {
        const mod = require('../src/platforms/BrightSdkUpdateApple.js');

        await expect(mod.process_apple({ platform: 'android' }))
            .rejects.toThrow();
    });

    test('Apple prepare uses config.libs_dir and creates directory', async () => {
        const u = new BrightSdkUpdateAppleMobile({
            platform: 'ios',
            name: 'iOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: {
                workdir: '/test/project',
                libs_dir: 'libs',
                sdk_ver: '1.2.3',
                sdk_url: 'https://cdn/sdk_SDK_VER.zip',
            },
        });

        jest.spyOn(u, 'assign_sdk_ver').mockImplementation(async () => { u.sdk_ver = '1.2.3'; });
        jest.spyOn(u, 'assign_sdk_url').mockImplementation(async () => {
            u.sdk_url_mask = 'https://cdn/sdk_SDK_VER.zip';
            u.sdk_url = 'https://cdn/sdk_1.2.3.zip';
        });
        jest.spyOn(u, 'assign_sdk_versions').mockImplementation(async () => { u.sdk_versions = {}; });

        fs.existsSync.mockImplementation(p => p !== '/test/project/libs');
        fs.mkdirSync = jest.fn();

        await u.prepare();

        expect(u.libs_dir).toBe('libs');
        expect(fs.mkdirSync).toHaveBeenCalledWith('/test/project/libs', { recursive: true });
    });

    test('macOS: assign_sdk_service_filename sets net_updater.app path', async () => {
        const u = new BrightSdkUpdateAppleDesktop({
            platform: 'macos',
            name: 'macOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.sdk_dir = '/cache/sdk/1.2.3';

        await u.assign_sdk_service_filename();

        expect(u.sdk_service_fname).toBe('/cache/sdk/1.2.3/net_updater.app');
    });

    test('iOS: assign_brd_api_filename sets xcframework path', async () => {
        const u = new BrightSdkUpdateAppleMobile({
            platform: 'ios',
            name: 'iOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.sdk_dir = '/cache/sdk/1.2.3';

        await u.assign_brd_api_filename();

        expect(u.brd_api_fname).toBe('/cache/sdk/1.2.3/brdsdk.xcframework');
    });

});
