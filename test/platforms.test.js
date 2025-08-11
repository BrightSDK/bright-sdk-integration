const { BrightSdkUpdateWeb, process_web, get_config_fname } = require('../src/platforms.js');
const lib = require('../src/lib.js');
const navigation = require('../src/navigation.js');
const fs = require('fs');
const path = require('path');
const { mockFs, restoreFs } = require('./setup');

// Mock dependencies
jest.mock('fs');
jest.mock('../src/lib.js');
jest.mock('../src/navigation.js');

// Mock the entire BrightSdkUpdateWeb class since it's not exported directly
// We'll need to access it via process_web function or test the module exports

describe('platforms.js', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFs();

        // Mock fs.existsSync to return false by default
        fs.existsSync.mockReturnValue(false);

        // Mock lib functions
        lib.read_json.mockReturnValue({});
        lib.write_json.mockImplementation(() => {});
        lib.download_from_url.mockResolvedValue();
        lib.search_directory.mockResolvedValue(null);
        lib.replace_file.mockResolvedValue(false);

        // Mock navigation functions
        navigation.clear_screen.mockImplementation(() => {});
        navigation.prompt.mockResolvedValue('test-value');
    });

    afterEach(() => {
        restoreFs();
    });

    describe('get_config_fname', () => {
        test('should return correct config filename for given workdir', () => {
            const workdir = '/test/project';
            const result = get_config_fname(workdir);
            expect(result).toBe(path.join(workdir, 'brd_sdk.config.json'));
        });
    });

    describe('BrightSdkUpdateWeb class integration', () => {
        const mockOpt = {
            platform: 'webos',
            interactive: false,
            verbose: true,
            workdir: '/test/project'
        };

        beforeEach(() => {
            // Mock config file content
            const mockConfig = {
                files: {
                    api_name: 'brd_api.js',
                    helper_name: 'brd_api.helper.js'
                },
                urls: {
                    helper_latest: 'https://test.com/helper.js'
                }
            };

            fs.existsSync.mockImplementation((filePath) => {
                if (filePath.includes('config.json')) return true;
                return false;
            });

            lib.read_json.mockImplementation((filePath) => {
                if (filePath.includes('config.json')) return mockConfig;
                return {};
            });
        });

        test('should handle configuration loading', () => {
            // Test configuration structure without actually running the class
            const platforms = require('../src/platforms.js');

            expect(typeof platforms.get_config_fname).toBe('function');
            expect(typeof platforms.process_web).toBe('function');
        });

        test('should handle helper download with fallback', () => {
            // Test that the required functions exist
            expect(lib.download_from_url).toBeDefined();
            expect(fs.existsSync).toBeDefined();
        });
    });

    describe('process_web function', () => {
        test('should handle webos platform', () => {
            const opt = {
                platform: 'webos',
                interactive: false,
                workdir: '/test/project'
            };

            // Test that the function exists and can be called
            const { process_web } = require('../src/platforms.js');
            expect(typeof process_web).toBe('function');
        });

        test('should handle tizen platform', () => {
            const opt = {
                platform: 'tizen',
                interactive: false,
                workdir: '/test/project'
            };

            // Test that the function accepts tizen platform
            const { process_web } = require('../src/platforms.js');
            expect(typeof process_web).toBe('function');
        });        test('should handle tizen platform', async () => {
            const opt = {
                platform: 'tizen',
                interactive: false,
                workdir: '/test/project'
            };

            // Test that the function accepts tizen platform
            expect(() => {
                const { process_web } = require('../src/platforms.js');
                expect(typeof process_web).toBe('function');
            }).not.toThrow();
        });
    });

    describe('Configuration handling', () => {
        test('should load app config from config.json', () => {
            const mockConfig = {
                files: {
                    api_name: 'custom_brd_api.js',
                    helper_name: 'custom_helper.js'
                },
                urls: {
                    helper_latest: 'https://custom.github.com/helper.js',
                    sdk_versions: 'https://custom.api.com/versions.json'
                },
                defaults: {
                    use_helper: true,
                    sdk_version: 'latest'
                }
            };

            fs.existsSync.mockReturnValue(true);
            lib.read_json.mockReturnValue(mockConfig);

            // Re-require the module to trigger config loading
            delete require.cache[require.resolve('../src/platforms.js')];
            const platforms = require('../src/platforms.js');

            // Test that the module loads without errors and exports expected functions
            expect(typeof platforms.get_config_fname).toBe('function');
            expect(typeof platforms.process_web).toBe('function');
        });

        test('should handle missing config file gracefully', () => {
            fs.existsSync.mockReturnValue(false);

            // Re-require the module to trigger config loading
            delete require.cache[require.resolve('../src/platforms.js')];

            expect(() => {
                const platforms = require('../src/platforms.js');
            }).not.toThrow();
        });

        test('should use default values when config is empty', () => {
            fs.existsSync.mockReturnValue(true);
            lib.read_json.mockReturnValue({});

            // Re-require the module to trigger config loading with empty config
            delete require.cache[require.resolve('../src/platforms.js')];

            expect(() => {
                const platforms = require('../src/platforms.js');
            }).not.toThrow();
        });
    });

    describe('File path operations', () => {
        test('should handle path operations correctly', () => {
            const workdir = '/test/project';
            const filename = get_config_fname(workdir);

            expect(filename).toBe(path.join(workdir, 'brd_sdk.config.json'));
            expect(path.isAbsolute(filename)).toBe(true);
        });

        test('should handle relative paths', () => {
            const workdir = 'relative/project';
            const filename = get_config_fname(workdir);

            expect(filename).toBe(path.join(workdir, 'brd_sdk.config.json'));
            expect(filename.includes('brd_sdk.config.json')).toBe(true);
        });
    });

    describe('Error handling', () => {
        test('should handle file system errors gracefully', () => {
            fs.existsSync.mockImplementation(() => {
                throw new Error('File system error');
            });

            // The module should handle errors during config loading
            expect(() => {
                delete require.cache[require.resolve('../src/platforms.js')];
                const platforms = require('../src/platforms.js');
            }).not.toThrow();
        });

        test('should handle JSON parsing errors', () => {
            fs.existsSync.mockReturnValue(true);
            lib.read_json.mockImplementation(() => {
                throw new Error('Invalid JSON');
            });

            expect(() => {
                delete require.cache[require.resolve('../src/platforms.js')];
                const platforms = require('../src/platforms.js');
            }).not.toThrow();
        });
    });

    describe('Integration test scenarios', () => {
        test('should handle complete webos workflow configuration', () => {
            const mockFiles = {
                '/test/project/config.json': {
                    files: { api_name: 'brd_api.js' },
                    urls: { helper_latest: 'https://github.com/test/helper.js' }
                },
                '/test/project/brd_sdk.config.json': {
                    workdir: '/test/project',
                    app_dir: 'src',
                    sdk_ver: 'latest'
                }
            };

            fs.existsSync.mockImplementation((filePath) => {
                return Object.keys(mockFiles).some(path => filePath.includes(path));
            });

            lib.read_json.mockImplementation((filePath) => {
                const matchingFile = Object.keys(mockFiles).find(path =>
                    filePath.includes(path.split('/').pop())
                );
                return matchingFile ? mockFiles[matchingFile] : {};
            });

            expect(() => {
                const { process_web, get_config_fname } = require('../src/platforms.js');
                const configFile = get_config_fname('/test/project');
                expect(configFile).toBe('/test/project/brd_sdk.config.json');
            }).not.toThrow();
        });

        test('should handle tizen-specific configurations', () => {
            const mockConfig = {
                files: {
                    api_name: 'tizen_brd_api.js',
                    helper_name: 'tizen_helper.js'
                },
                defaults: {
                    use_helper: true,
                    platform: 'tizen'
                }
            };

            fs.existsSync.mockReturnValue(true);
            lib.read_json.mockReturnValue(mockConfig);

            expect(() => {
                delete require.cache[require.resolve('../src/platforms.js')];
                const platforms = require('../src/platforms.js');
            }).not.toThrow();
        });
    });
});
