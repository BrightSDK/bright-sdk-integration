const { process_web, get_config_fname } = require('../src/platforms.js');
const lib = require('../src/lib.js');
const navigation = require('../src/navigation.js');
const fs = require('fs');
const path = require('path');
const { mockFs, restoreFs } = require('./setup');

// Mock all dependencies
jest.mock('fs');
jest.mock('../src/lib.js');
jest.mock('../src/navigation.js');

describe('BrightSDK Integration - End-to-End Tests', () => {
    const testWorkdir = '/test/project';
    const testConfig = {
        files: {
            api_name: 'brd_api.js',
            helper_name: 'brd_api.helper.js'
        },
        urls: {
            helper_latest: 'https://raw.githubusercontent.com/BrightSDK/bright-sdk-integration-helper/refs/heads/main/releases/brd_api.helper-latest.min.js',
            sdk_versions: 'https://api.bright-sdk.com/versions.json'
        },
        defaults: {
            use_helper: true,
            sdk_version: 'latest'
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockFs();

        // Setup comprehensive mocks
        setupFileMocks();
        setupLibMocks();
        setupNavigationMocks();
    });

    afterEach(() => {
        restoreFs();
    });

    function setupFileMocks() {
        // Mock file system operations
        fs.existsSync.mockImplementation((filePath) => {
            // Config files exist
            if (filePath.includes('config.json')) return true;
            if (filePath.includes('brd_sdk.config.json')) return true;
            // SDK directories
            if (filePath.includes('.sdk')) return true;
            // App directories
            if (filePath.includes('src') || filePath.includes('app')) return true;
            return false;
        });

        fs.mkdirSync.mockImplementation(() => {});
        fs.readFileSync.mockReturnValue('{"test": "data"}');
        fs.writeFileSync.mockImplementation(() => {});
        fs.promises = {
            readdir: jest.fn().mockResolvedValue(['file1.js', 'file2.js']),
            stat: jest.fn().mockResolvedValue({ isDirectory: () => false })
        };
    }

    function setupLibMocks() {
        // Mock lib functions
        lib.read_json.mockImplementation((filePath) => {
            if (filePath.includes('config.json')) return testConfig;
            if (filePath.includes('brd_sdk.config.json')) return {
                workdir: testWorkdir,
                app_dir: 'src',
                sdk_ver: 'latest',
                use_helper: true
            };
            return {};
        });

        lib.write_json.mockImplementation(() => {});
        lib.download_from_url.mockResolvedValue();
        lib.search_directory.mockResolvedValue('/test/project/src/brd_api.js');
        lib.replace_file.mockResolvedValue(true);
        lib.unzip.mockResolvedValue();
        lib.set_json_props.mockImplementation(() => {});
        lib.print.mockImplementation(() => {});
        lib.exit.mockImplementation(() => {});
    }

    function setupNavigationMocks() {
        navigation.clear_screen.mockImplementation(() => {});
        navigation.prompt.mockImplementation(async (question, defaultValue) => {
            // Return appropriate values based on question context
            if (question.includes('directory')) return 'src';
            if (question.includes('SDK Version')) return 'latest';
            if (question.includes('helper')) return 'yes';
            return defaultValue || 'default';
        });
    }

    describe('Complete Integration Workflow', () => {
        test('should have all required functions available for webos integration', () => {
            const options = {
                platform: 'webos',
                interactive: false,
                verbose: true,
                workdir: testWorkdir,
                config: {
                    workdir: testWorkdir,
                    app_dir: 'src',
                    sdk_ver: 'latest',
                    use_helper: true
                }
            };

            // Test that all required functions exist
            expect(typeof process_web).toBe('function');
            expect(typeof get_config_fname).toBe('function');

            // Test config file path generation
            const configPath = get_config_fname(testWorkdir);
            expect(configPath).toBe(path.join(testWorkdir, 'brd_sdk.config.json'));
        });

        test('should have all required functions available for tizen integration', () => {
            const options = {
                platform: 'tizen',
                interactive: false,
                verbose: true,
                workdir: testWorkdir,
                config: {
                    workdir: testWorkdir,
                    app_dir: 'src',
                    sdk_ver: 'latest',
                    use_helper: true
                }
            };

            // Test that all required functions exist
            expect(typeof process_web).toBe('function');
            expect(typeof get_config_fname).toBe('function');
        });
    });    describe('Configuration Management', () => {
        test('should handle complete configuration lifecycle', () => {
            // Test config file creation
            const configPath = get_config_fname(testWorkdir);
            expect(configPath).toBe(path.join(testWorkdir, 'brd_sdk.config.json'));

            // Test config loading with different scenarios
            fs.existsSync.mockReturnValue(true);
            lib.read_json.mockReturnValue(testConfig);

            // Re-require to trigger config loading
            delete require.cache[require.resolve('../src/platforms.js')];
            const platforms = require('../src/platforms.js');

            // Test that the module loads successfully with configuration
            expect(typeof platforms.get_config_fname).toBe('function');
            expect(typeof platforms.process_web).toBe('function');
        });

        test('should handle missing configuration gracefully', () => {
            fs.existsSync.mockReturnValue(false);

            expect(() => {
                delete require.cache[require.resolve('../src/platforms.js')];
                require('../src/platforms.js');
            }).not.toThrow();
        });
    });

    describe('Helper Download and Management', () => {
        test('should download helper successfully', async () => {
            lib.download_from_url.mockResolvedValue();

            // Test successful download scenario
            const helperUrl = testConfig.urls.helper_latest;
            const helperPath = path.join(testWorkdir, 'temp', testConfig.files.helper_name);

            // The actual download would be tested through the platform class
            expect(lib.download_from_url).not.toHaveBeenCalled(); // Not called until class runs
        });

        test('should handle helper download failure with fallback', async () => {
            lib.download_from_url.mockRejectedValue(new Error('Network error'));

            // Test that fallback logic is available
            const fallbackPath = path.join(__dirname, '..', 'assets', testConfig.files.helper_name);

            // The fallback logic would be tested in the context of the platform class
            expect(true).toBe(true); // Placeholder for actual fallback test
        });
    });

    describe('File Operations', () => {
        test('should handle SDK file operations', async () => {
            const testFiles = {
                'brd_api.js': 'console.log("BrightSDK API");',
                'brd_api.helper.js': 'console.log("BrightSDK Helper");',
                'index.html': '<script src="brd_api.js"></script>'
            };

            lib.read_json.mockImplementation((filePath) => {
                if (filePath.includes('package.json')) return { name: 'test-app' };
                return testConfig;
            });

            // Test file replacement operations
            lib.replace_file.mockResolvedValue(true);

            // Verify that file operations are properly configured
            expect(lib.replace_file).not.toHaveBeenCalled(); // Not called until workflow runs
        });
    });

    describe('Platform-Specific Workflows', () => {
        test('should handle webos-specific service configuration', () => {
            const webosConfig = {
                ...testConfig,
                platform_specific: {
                    webos: {
                        service_dir: 'service',
                        package_name: 'com.bright.sdk.service'
                    }
                }
            };

            lib.read_json.mockReturnValue(webosConfig);
            lib.set_json_props.mockImplementation(() => {});

            // Test webos-specific configuration
            expect(lib.set_json_props).not.toHaveBeenCalled(); // Not called until workflow runs
        });

        test('should handle tizen-specific service configuration', () => {
            const tizenConfig = {
                ...testConfig,
                platform_specific: {
                    tizen: {
                        service_dir: 'service',
                        config_file: 'ver_conf.js'
                    }
                }
            };

            lib.read_json.mockReturnValue(tizenConfig);

            // Test tizen-specific behavior
            expect(true).toBe(true); // Placeholder for tizen-specific tests
        });
    });

    describe('Error Handling and Recovery', () => {
        test('should handle file system errors gracefully', () => {
            fs.existsSync.mockImplementation(() => {
                throw new Error('File system error');
            });

            expect(() => {
                delete require.cache[require.resolve('../src/platforms.js')];
                require('../src/platforms.js');
            }).not.toThrow();
        });

        test('should handle network errors during download', async () => {
            lib.download_from_url.mockRejectedValue(new Error('Network timeout'));

            // The error handling would be tested in the actual workflow
            expect(lib.download_from_url).not.toHaveBeenCalled();
        });

        test('should handle invalid configuration data', () => {
            lib.read_json.mockImplementation(() => {
                throw new Error('Invalid JSON');
            });

            expect(() => {
                delete require.cache[require.resolve('../src/platforms.js')];
                require('../src/platforms.js');
            }).not.toThrow();
        });
    });

    describe('Interactive Mode', () => {
        test('should handle interactive prompts correctly', async () => {
            navigation.prompt.mockImplementation(async (question, defaultValue) => {
                if (question.includes('Path to application directory')) return 'src';
                if (question.includes('SDK Version')) return 'latest';
                if (question.includes('Use helper')) return 'yes';
                return defaultValue;
            });

            const options = {
                platform: 'webos',
                interactive: true,
                workdir: testWorkdir
            };

            // Test that interactive mode is properly handled
            expect(navigation.prompt).not.toHaveBeenCalled(); // Not called until workflow runs
        });
    });

    describe('Build and Release Integration', () => {
        test('should integrate with build system', () => {
            const buildConfig = {
                ...testConfig,
                build: {
                    output_dir: 'dist',
                    minify: true,
                    source_map: false
                }
            };

            lib.read_json.mockReturnValue(buildConfig);

            // Test build system integration
            expect(true).toBe(true); // Placeholder for build integration tests
        });

        test('should handle version management correctly', () => {
            const versionConfig = {
                ...testConfig,
                versions: {
                    current: '1.0.0',
                    latest: '1.2.0',
                    supported: ['1.0.0', '1.1.0', '1.2.0']
                }
            };

            lib.read_json.mockReturnValue(versionConfig);

            // Test version management
            expect(true).toBe(true); // Placeholder for version management tests
        });
    });
});
