const {
    BrightSdkUpdateWeb,
    BrightSdkUpdateWebos,
} = require('../src/platforms/BrightSdkUpdateWeb.js');
const lib = require('../src/lib.js');
const navigation = require('../src/navigation.js');
const fs = require('fs');

// Mock dependencies
jest.mock('fs');
jest.mock('../src/lib.js');
jest.mock('../src/navigation.js');

describe('platforms/BrightSdkUpdateWeb.js', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockImplementation(() => {});
        fs.readFileSync.mockImplementation(() => '');
        fs.writeFileSync.mockImplementation(() => {});
        fs.unlinkSync.mockImplementation(() => {});
        lib.read_json.mockReturnValue({});
        lib.write_json.mockImplementation(() => {});
        lib.download_from_url.mockResolvedValue();
        lib.unzip.mockResolvedValue();
        lib.replace_file.mockResolvedValue(false);
        lib.search_directory.mockResolvedValue(null);
        navigation.clear_screen.mockImplementation(() => {});
        navigation.prompt.mockImplementation(() => {});
    });

    test('paths: keep config paths relative', async () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: {
                workdir: '/test/project',
                sdk_service_dir: 'service',
            },
        });

        u.workdir = '/test/project';
        u.config = { sdk_service_dir: 'service' };
        u.sdk_service_fname = '/abs/sdk/service';

        jest.spyOn(u, 'get_service_dir_def').mockResolvedValue('service');

        await u.assign_sdk_service_dir();

        expect(u.sdk_service_dir).toBe('service');
        expect(navigation.prompt).not.toHaveBeenCalled();
    });

    test('replace_sdk_files resolves relative dst against workdir', async () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';

        jest.spyOn(u, 'get_sdk_files').mockReturnValue([['/abs/src/file', 'libs/file.js']]);

        lib.replace_file.mockResolvedValue(false);
        await u.replace_sdk_files();
        expect(lib.replace_file).toHaveBeenCalledWith(
            '/abs/src/file',
            '/test/project/libs/file.js',
        );
    });

    test('build_config keeps appdir relative', () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: {
                workdir: '/test/project',
                app_dir: 'app',
            },
        });

        u.build_config();

        expect(u.workdir).toBe('/test/project');
        expect(u.appdir).toBe('app');
    });

    test('get_libs_dir_def prefers existing brd_api file location', async () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project', app_dir: 'app' },
        });

        u.build_config();
        jest.spyOn(u, 'search_workdir').mockResolvedValue('/test/project/libs/brd_api.js');
        const res = await u.get_libs_dir_def();
        expect(res).toBe('libs');
    });

    test('get_libs_dir_def falls back to app/<common-dir> if exists', async () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project', app_dir: 'app' },
        });
        u.build_config();

        jest.spyOn(u, 'search_workdir').mockResolvedValue(null);
        fs.existsSync.mockImplementation(p => p === '/test/project/app/js');

        const res = await u.get_libs_dir_def();
        expect(res).toBe('app/js');
    });

    test('get_service_dir_def returns dir of found services.json (relative)', async () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });
        u.build_config();

        jest.spyOn(u, 'find_service_dir').mockResolvedValue('/test/project/service/services.json');

        const res = await u.get_service_dir_def();
        expect(res).toBe('service');
    });

    test('get_service_dir_def falls back to /workdir/service', async () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });
        u.build_config();

        jest.spyOn(u, 'find_service_dir').mockResolvedValue(null);

        fs.existsSync.mockImplementation(p => p === '/test/project/service');

        const res = await u.get_service_dir_def();
        expect(res).toBe('service');
    });

    test('create_libs_dir creates <workdir>/<libs_dir>', () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';
        u.libs_dir = 'libs';

        fs.existsSync.mockImplementation(p => p !== '/test/project/libs');
        fs.mkdirSync.mockImplementation(() => {});

        u.create_libs_dir();

        expect(fs.mkdirSync).toHaveBeenCalledWith('/test/project/libs', { recursive: true });
    });

    test('update_index_ref reads/writes index.html via absolute path', () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';
        u.brd_api_base = 'brd_api';
        u.js_ext = '.js';

        fs.existsSync.mockImplementation(p => p === '/test/project/app/index.html');
        fs.readFileSync.mockReturnValue('<script src="brd_api.js"></script>');
        fs.writeFileSync.mockImplementation(() => {});

        const prev = u.update_index_ref('app/index.html', 'brd_api_v1.js');

        expect(prev).toBe('brd_api.js');
        expect(fs.readFileSync).toHaveBeenCalledWith('/test/project/app/index.html');
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            '/test/project/app/index.html',
            '<script src="brd_api_v1.js"></script>',
        );
    });

    test('update_brd_api unlinks previous brd_api file via absolute path', () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';
        u.libs_dir = 'app/js';
        u.brd_api_dst_fname = 'app/js/brd_api_v1.js';
        u.brd_api_dst_name = 'brd_api_v1.js';
        u.is_web_hosted = false;

        jest.spyOn(u, 'update_index_ref').mockReturnValue('brd_api.js');

        fs.existsSync.mockImplementation(p => p === '/test/project/app/js/brd_api.js');
        fs.unlinkSync = jest.fn();

        u.update_brd_api();

        expect(fs.unlinkSync).toHaveBeenCalledWith('/test/project/app/js/brd_api.js');
    });

    test('assign_web_hosted: libs_dir under appdir => is_web_hosted=false', () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.appdir = 'app';
        u.libs_dir = 'app/js';

        u.assign_web_hosted();
        expect(u.is_web_hosted).toBe(false);
    });

    test('assign_web_hosted: libs_dir outside appdir => is_web_hosted=true', () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.appdir = 'app';
        u.libs_dir = 'public/js';

        u.assign_web_hosted();
        expect(u.is_web_hosted).toBe(true);
    });

    test('assign_index_filename uses config.index as relative path', async () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project', index: 'app/index.html' },
        });

        u.workdir = '/test/project';
        u.appdir = 'app';
        u.libs_dir = 'app/js';
        u.is_web_hosted = false;
        u.config = { index: 'app/index.html' };

        await u.assign_index_filename();

        expect(u.index_fname).toBe('app/index.html');
        expect(navigation.prompt).not.toHaveBeenCalled();
    });

    test('assign_index_filename default is <appdir>/index.html when not web-hosted', async () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: true,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';
        u.appdir = 'app';
        u.libs_dir = 'app/js';
        u.is_web_hosted = false;
        u.config = {};

        navigation.prompt.mockImplementation(async (_q, def) => def);

        await u.assign_index_filename();

        expect(u.index_fname).toBe('app/index.html');
    });

    test('assign_use_helper uses config value in non-interactive mode', async () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project', use_helper: true },
        });

        u.workdir = '/test/project';
        u.config = { use_helper: true };

        await u.assign_use_helper();

        expect(u.use_helper).toBe(true);
        expect(navigation.prompt).not.toHaveBeenCalled();
    });

    test('assign_brd_api_helper_filename downloads helper into <workdir>/temp', async () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: true,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';
        u.app_config = {
            urls: { helper_latest: 'https://example.com/helper.js' },
            files: { helper_name: 'brd_api.helper.js' },
        };

        u.brd_api_helper_name = 'brd_api.helper.js';

        fs.existsSync.mockImplementation(p => p !== '/test/project/temp');
        lib.download_from_url.mockResolvedValue();

        await u.assign_brd_api_helper_filename();
        expect(lib.download_from_url).toHaveBeenCalledWith(
            'https://example.com/helper.js',
            '/test/project/temp/brd_api.helper.js',
        );
        expect(u.brd_api_helper_fname).toBe('/test/project/temp/brd_api.helper.js');
    });

    test('assign_brd_api_helper_filename falls back to local assets on download failure', async () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: true,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.workdir = '/test/project';
        u.app_config = {
            urls: { helper_latest: 'https://example.com/helper.js' },
            files: { helper_name: 'brd_api.helper.js' },
        };

        u.brd_api_helper_name = 'brd_api.helper.js';

        lib.download_from_url.mockRejectedValue(new Error('Network error'));
        fs.existsSync.mockImplementation(p => {
            if (p === '/test/project/temp') return true;
            if (typeof p === 'string' && p.includes('assets') && p.endsWith('brd_api.helper.js')) {
                return true;
            }
            return false;
        });

        await u.assign_brd_api_helper_filename();

        expect(lib.download_from_url).toHaveBeenCalled();
        expect(u.brd_api_helper_fname).toContain('assets');
        expect(u.brd_api_helper_fname).toContain('brd_api.helper.js');
    });

    test('get_sdk_files includes helper mapping when use_helper=true', () => {
        const u = new BrightSdkUpdateWeb({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir: '/test/project',
            config: { workdir: '/test/project' },
        });

        u.use_helper = true;
        u.brd_api_helper_fname = '/test/project/temp/brd_api.helper.js';
        u.brd_api_helper_dst_fname = 'app/js/brd_api.helper.js';
        u.sdk_service_fname = '/sdk/service';
        u.sdk_service_dir = 'service';
        u.brd_api_fname = '/sdk/consent/brd_api.js';
        u.brd_api_dst_fname = 'app/js/brd_api_v1.js';

        const files = u.get_sdk_files();

        expect(files).toEqual([
            ['/sdk/service', 'service'],
            ['/sdk/consent/brd_api.js', 'app/js/brd_api_v1.js'],
            ['/test/project/temp/brd_api.helper.js', 'app/js/brd_api.helper.js'],
        ]);
    });
});

describe('platforms/BrightSdkUpdateWebos - path resolution', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockImplementation(() => {});
        fs.readFileSync.mockImplementation(() => '');
        fs.writeFileSync.mockImplementation(() => {});
        lib.read_json.mockReturnValue({});
        lib.write_json.mockImplementation(() => {});
        lib.set_json_props.mockImplementation(() => {});
        lib.download_from_url.mockResolvedValue();
        lib.unzip.mockResolvedValue();
        lib.replace_file.mockResolvedValue(false);
        lib.search_directory.mockResolvedValue(null);
        navigation.clear_screen.mockImplementation(() => {});
        navigation.prompt.mockImplementation(() => {});
    });

    function createWebosInstance(workdir = '/test/project') {
        const u = new BrightSdkUpdateWebos({
            platform: 'webos',
            name: 'WebOS',
            interactive: false,
            verbose: false,
            workdir,
            config: { workdir },
        });
        u.workdir = workdir;
        u.appdir = 'app';
        u.sdk_service_dir = 'service';
        u.appid = 'com.test.app';
        return u;
    }

    test('assign_sdk_package_filename produces relative path', () => {
        const u = createWebosInstance();
        u.assign_sdk_package_filename();
        expect(u.sdk_package_fname).toBe('service/package.json');
    });

    test('assign_sdk_services_filename produces relative path', () => {
        const u = createWebosInstance();
        u.assign_sdk_services_filename();
        expect(u.sdk_services_fname).toBe('service/services.json');
    });

    test('read_sdk_package resolves against workdir', () => {
        const u = createWebosInstance();
        u.assign_sdk_package_filename();
        lib.read_json.mockReturnValue({ name: 'com.old.brd_sdk' });

        u.read_sdk_package();

        expect(lib.read_json).toHaveBeenCalledWith('/test/project/service/package.json');
        expect(u.sdk_service_id).toBe('com.test.app.brd_sdk');
    });

    test('update_sdk_package resolves against workdir', () => {
        const u = createWebosInstance();
        u.assign_sdk_package_filename();
        u.sdk_service_id = 'com.test.app.brd_sdk';

        u.update_sdk_package();

        expect(lib.set_json_props).toHaveBeenCalledWith(
            '/test/project/service/package.json',
            ['name'],
            'com.test.app.brd_sdk',
        );
    });

    test('update_sdk_services resolves against workdir', () => {
        const u = createWebosInstance();
        u.assign_sdk_services_filename();
        u.sdk_service_id = 'com.test.app.brd_sdk';

        u.update_sdk_services();

        expect(lib.set_json_props).toHaveBeenCalledWith(
            '/test/project/service/services.json',
            ['id', 'services.0.id', 'services.0.name'],
            'com.test.app.brd_sdk',
        );
    });

    test('update_sdk_files works when CWD differs from workdir', () => {
        // Simulate running from a different directory (e.g. /home/user)
        const u = createWebosInstance('/opt/apps/myapp');
        u.appid = 'com.myapp';
        u.assign_sdk_package_filename();
        u.assign_sdk_services_filename();
        lib.read_json.mockReturnValue({ name: 'com.old.brd_sdk' });

        u.update_sdk_files();

        expect(lib.read_json).toHaveBeenCalledWith('/opt/apps/myapp/service/package.json');
        expect(lib.set_json_props).toHaveBeenCalledWith(
            '/opt/apps/myapp/service/package.json',
            ['name'],
            'com.myapp.brd_sdk',
        );
        expect(lib.set_json_props).toHaveBeenCalledWith(
            '/opt/apps/myapp/service/services.json',
            ['id', 'services.0.id', 'services.0.name'],
            'com.myapp.brd_sdk',
        );
    });
});
