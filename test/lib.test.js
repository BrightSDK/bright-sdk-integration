const lib = require('../src/lib.js');
const path = require('path');
const os = require('os');
const https = require('follow-redirects').https;
const fs = require('fs-extra');
const unzipper = require('unzipper');
const { mockFs, restoreFs } = require('./setup');

// Mock external dependencies
jest.mock('follow-redirects');
jest.mock('fs-extra');
jest.mock('unzipper');

describe('lib utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFs();
    });

    afterEach(() => {
        restoreFs();
    });

    describe('Constants', () => {
        test('lbr should be platform-specific line break', () => {
            expect(lib.lbr).toBe(os.EOL);
        });
    });

    describe('print function', () => {
        let originalStdoutWrite;
        let capturedOutput;

        beforeEach(() => {
            capturedOutput = '';
            originalStdoutWrite = process.stdout.write;
            process.stdout.write = jest.fn((data) => {
                capturedOutput += data;
                return true;
            });
        });

        afterEach(() => {
            process.stdout.write = originalStdoutWrite;
        });

        test('should print text with line break', () => {
            const result = lib.print('Hello World');
            expect(capturedOutput).toBe(`Hello World${os.EOL}`);
            expect(result).toBe(`Hello World${os.EOL}`);
        });

        test('should print bold text when opt.bold is true', () => {
            const result = lib.print('Bold Text', { bold: true });
            expect(capturedOutput).toBe(`\x1b[1mBold Text${os.EOL}\x1b[0m`);
            expect(result).toBe(`\x1b[1mBold Text${os.EOL}\x1b[0m`);
        });
    });

    describe('exit function', () => {
        let originalProcessExit;
        let capturedOutput;
        let exitCode;

        beforeEach(() => {
            capturedOutput = '';
            exitCode = null;

            // Mock process.stdout.write
            const originalStdoutWrite = process.stdout.write;
            process.stdout.write = jest.fn((data) => {
                capturedOutput += data;
                return true;
            });

            // Mock process.exit
            originalProcessExit = process.exit;
            process.exit = jest.fn((code) => {
                exitCode = code;
            });
        });

        afterEach(() => {
            process.exit = originalProcessExit;
        });

        test('should exit with default code 1', () => {
            lib.exit('Error message');
            expect(capturedOutput).toBe(`Error message${os.EOL}`);
            expect(exitCode).toBe(1);
        });

        test('should exit with custom code', () => {
            lib.exit('Custom error', 42);
            expect(capturedOutput).toBe(`Custom error${os.EOL}`);
            expect(exitCode).toBe(42);
        });
    });

    describe('File operations', () => {
        test('read_json should parse JSON file content', () => {
            const mockContent = '{"test": "value"}';
            fs.readFileSync.mockReturnValue(mockContent);

            const result = lib.read_json('test.json');

            expect(fs.readFileSync).toHaveBeenCalledWith('test.json');
            expect(result).toEqual({ test: 'value' });
        });

        test('write_json should stringify and write JSON', () => {
            const data = { test: 'value' };

            lib.write_json('test.json', data);

            expect(fs.writeFileSync).toHaveBeenCalledWith(
                'test.json',
                JSON.stringify(data, null, 2),
                { encoding: 'utf-8' }
            );
        });
    });

    describe('search_directory', () => {
        beforeEach(() => {
            // Reset fs-extra mocks
            fs.promises.readdir.mockReset();
            fs.promises.stat.mockReset();
        });

        test('should find matching file in directory', async () => {
            const pattern = /test\.js$/;

            fs.promises.readdir.mockResolvedValue(['test.js', 'other.txt']);
            fs.promises.stat.mockResolvedValue({ isDirectory: () => false });

            const result = await lib.search_directory('/test/dir', pattern);

            expect(result).toBe(path.join('/test/dir', 'test.js'));
        });

        test('should search recursively in subdirectories', async () => {
            const pattern = /target\.js$/;

            // First call - directory with subdirectory
            fs.promises.readdir
                .mockResolvedValueOnce(['subdir', 'other.txt'])
                .mockResolvedValueOnce(['target.js']);

            fs.promises.stat
                .mockResolvedValueOnce({ isDirectory: () => true })
                .mockResolvedValueOnce({ isDirectory: () => false })
                .mockResolvedValueOnce({ isDirectory: () => false });

            const result = await lib.search_directory('/test/dir', pattern);

            expect(result).toBe(path.join('/test/dir/subdir', 'target.js'));
        });

        test('should exclude specified files', async () => {
            const pattern = /test\.js$/;
            const excludePath = path.join('/test/dir', 'test.js');

            fs.promises.readdir.mockResolvedValue(['test.js']);

            const result = await lib.search_directory('/test/dir', pattern, {
                exclude: [excludePath]
            });

            expect(result).toBeUndefined();
        });
    });

    describe('download_from_url', () => {
        let mockRequest;
        let mockResponse;

        beforeEach(() => {
            mockRequest = {
                on: jest.fn(),
                setTimeout: jest.fn(),
                destroy: jest.fn(),
            };
            mockResponse = {
                headers: {},
                on: jest.fn(),
                pipe: jest.fn(),
            };
            https.get.mockImplementation((url, optionsOrCallback, maybeCallback) => {
                const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback;
                callback(mockResponse);
                return mockRequest;
            });
        });

        test('should download JSON content', async () => {
            mockResponse.headers['content-type'] = 'application/json';
            fs.writeFile.mockImplementation((fname, data, encoding, callback) => {
                callback(null);
            });

            // Mock response data events
            mockResponse.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    callback('{"test": "data"}');
                } else if (event === 'end') {
                    callback();
                }
            });

            await lib.download_from_url('https://test.com/data.json', 'output.json');

            expect(https.get).toHaveBeenCalledWith('https://test.com/data.json', expect.any(Object), expect.any(Function));
            expect(fs.writeFile).toHaveBeenCalledWith('output.json', '{"test": "data"}', 'utf8', expect.any(Function));
        });

        test('should download binary content using streams', async () => {
            mockResponse.headers['content-type'] = 'application/octet-stream';
            const mockFileStream = {
                pipe: jest.fn(),
                on: jest.fn((event, callback) => {
                    if (event === 'finish') {
                        callback();
                    }
                }),
            };
            fs.createWriteStream.mockReturnValue(mockFileStream);

            mockResponse.pipe.mockReturnValue(mockFileStream);

            await lib.download_from_url('https://test.com/file.zip', 'output.zip');

            expect(fs.createWriteStream).toHaveBeenCalledWith('output.zip');
            expect(mockResponse.pipe).toHaveBeenCalledWith(mockFileStream);
        });

        test('should handle request errors', async () => {
            // Mock request error instead of response error
            https.get.mockImplementation((url, options, callback) => {
                const mockRequest = {
                    on: jest.fn((event, handler) => {
                        if (event === 'error') {
                            // Simulate error after a short delay
                            handler(new Error('Network error'));
                        }
                    }),
                    setTimeout: jest.fn(),
                    destroy: jest.fn(),
                };
                // Don't call the callback for error scenario
                return mockRequest;
            });

            await expect(lib.download_from_url('https://test.com/fail', {}, 'output')).rejects.toThrow('Network error');
        });

        test('should handle file write errors for JSON', async () => {
            mockResponse.headers['content-type'] = 'application/json';
            fs.writeFile.mockImplementation((fname, data, encoding, callback) => {
                callback(new Error('Write error'));
            });

            mockResponse.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    callback('{}');
                } else if (event === 'end') {
                    callback();
                }
            });

            await expect(lib.download_from_url('https://test.com/data.json', 'output.json')).rejects.toThrow('Write error');
        });
    });

    describe('set_json_props', () => {
        test('should update JSON file with new property values', () => {
            const mockJson = {
                section1: { prop1: 'old1' },
                section2: { prop2: 'old2' }
            };

            fs.readFileSync.mockReturnValue(JSON.stringify(mockJson));

            lib.set_json_props('config.json', ['section1.prop1', 'section2.prop2'], 'new_value');

            expect(fs.readFileSync).toHaveBeenCalledWith('config.json');
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                'config.json',
                JSON.stringify({
                    section1: { prop1: 'new_value' },
                    section2: { prop2: 'new_value' }
                }, null, 2),
                { encoding: 'utf-8' }
            );
        });
    });

    describe('replace_file', () => {
        test('should copy file when destination does not exist', async () => {
            fs.existsSync.mockReturnValue(false);
            fs.copy.mockResolvedValue();

            const replaced = await lib.replace_file('src.txt', 'dst.txt');

            expect(fs.existsSync).toHaveBeenCalledWith('dst.txt');
            expect(fs.remove).not.toHaveBeenCalled();
            expect(fs.copy).toHaveBeenCalledWith('src.txt', 'dst.txt');
            expect(replaced).toBe(undefined);
        });

        test('should remove and copy file when destination exists', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.remove.mockResolvedValue();
            fs.copy.mockResolvedValue();

            const replaced = await lib.replace_file('src.txt', 'dst.txt');

            expect(fs.existsSync).toHaveBeenCalledWith('dst.txt');
            expect(fs.remove).toHaveBeenCalledWith('dst.txt');
            expect(fs.copy).toHaveBeenCalledWith('src.txt', 'dst.txt');
            expect(replaced).toBe(true);
        });
    });
});

describe('fetch_releases', () => {
    let mockRequest;
    let mockResponse;
    let original_sdk_api_key;

    beforeEach(() => {
        jest.clearAllMocks();
        original_sdk_api_key = process.env.SDK_API_KEY;
        process.env.SDK_API_KEY = 'test-api-key';
        mockRequest = {
            on: jest.fn(),
            setTimeout: jest.fn(),
            destroy: jest.fn(),
        };
        mockResponse = {
            statusCode: 200,
            on: jest.fn(),
            resume: jest.fn(),
        };
        https.get.mockImplementation((_url, _opts, callback) => {
            callback(mockResponse);
            return mockRequest;
        });
    });

    afterEach(() => {
        if (original_sdk_api_key === undefined)
            delete process.env.SDK_API_KEY;
        else
            process.env.SDK_API_KEY = original_sdk_api_key;
    });

    test('should reject when SDK_API_KEY is not set', async () => {
        delete process.env.SDK_API_KEY;
        await expect(lib.fetch_releases('https://bright-sdk.com/sdk_api/sdk/releases'))
            .rejects.toThrow('SDK_API_KEY environment variable is required');
        expect(https.get).not.toHaveBeenCalled();
    });

    test('should fetch and parse releases JSON with api-key header', async () => {
        const releases_data = {
            webos: {ver: '2.5.0', url: 'https://cdn.example.com/brd_sdk_webos-2.5.0.zip'},
            win: {ver: '3.1.0', url: 'https://cdn.example.com/bright_sdk_win-3.1.0.zip'},
        };
        mockResponse.on.mockImplementation((event, callback) => {
            if (event === 'data')
                callback(JSON.stringify(releases_data));
            else if (event === 'end')
                callback();
        });

        const result = await lib.fetch_releases('https://bright-sdk.com/sdk_api/sdk/releases');

        expect(https.get).toHaveBeenCalledWith(
            'https://bright-sdk.com/sdk_api/sdk/releases',
            expect.objectContaining({
                headers: expect.objectContaining({'api-key': 'test-api-key'}),
            }),
            expect.any(Function)
        );
        expect(result).toEqual(releases_data);
    });

    test('should reject on non-2xx HTTP status', async () => {
        mockResponse.statusCode = 403;
        await expect(lib.fetch_releases('https://bright-sdk.com/sdk_api/sdk/releases'))
            .rejects.toThrow('Releases fetch failed: HTTP 403');
    });

    test('should reject on invalid JSON in response', async () => {
        mockResponse.on.mockImplementation((event, callback) => {
            if (event === 'data')
                callback('not valid json{{');
            else if (event === 'end')
                callback();
        });

        await expect(lib.fetch_releases('https://bright-sdk.com/sdk_api/sdk/releases'))
            .rejects.toThrow('Failed to parse releases JSON');
    });

    test('should reject on request error', async () => {
        https.get.mockImplementation((_url, _opts, _callback) => {
            const req = {
                on: jest.fn((event, handler) => {
                    if (event === 'error')
                        handler(new Error('Network error'));
                }),
                setTimeout: jest.fn(),
                destroy: jest.fn(),
            };
            return req;
        });

        await expect(lib.fetch_releases('https://bright-sdk.com/sdk_api/sdk/releases'))
            .rejects.toThrow('Network error');
    });
});

describe('resolve_url_tpl', () => {
    const releases = {
        templates: {
            base: 'https://bsdk-cdn.zspeed-cdn.com/static',
            common: '{{base}}/bright_sdk_{{platform}}-{{version}}.zip',
            tv: '{{base}}/brd_sdk_{{platform}}-{{version}}.zip',
        },
        platforms: {
            win:     {last_version: '1.617.770', url_tpl: '{{common}}'},
            webos:   {last_version: '1.617.770', url_tpl: '{{tv}}'},
            android: {last_version: '1.617.770', url_tpl: '{{base}}/bright_sdk_{{platform}}-{{version}}.tar.gz'},
        },
    };

    test('resolves url_tpl_common for win', () => {
        const url = lib.resolve_url_tpl(releases, 'win', '1.617.770');
        expect(url).toBe('https://bsdk-cdn.zspeed-cdn.com/static/bright_sdk_win-1.617.770.zip');
    });

    test('resolves url_tpl_tv for webos', () => {
        const url = lib.resolve_url_tpl(releases, 'webos', '1.617.770');
        expect(url).toBe('https://bsdk-cdn.zspeed-cdn.com/static/brd_sdk_webos-1.617.770.zip');
    });

    test('resolves android url_tpl with tar.gz extension', () => {
        const url = lib.resolve_url_tpl(releases, 'android', '1.617.770');
        expect(url).toBe('https://bsdk-cdn.zspeed-cdn.com/static/bright_sdk_android-1.617.770.tar.gz');
    });

    test('substitutes arbitrary version, not just last_version', () => {
        const url = lib.resolve_url_tpl(releases, 'win', '1.500.000');
        expect(url).toBe('https://bsdk-cdn.zspeed-cdn.com/static/bright_sdk_win-1.500.000.zip');
    });

    test('returns null for unknown platform', () => {
        const url = lib.resolve_url_tpl(releases, 'unknown', '1.0.0');
        expect(url).toBeNull();
    });
});
