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
            const mockFileStream = { pipe: jest.fn(), on: jest.fn() };
            fs.createWriteStream.mockReturnValue(mockFileStream);

            // Mock response end event
            mockResponse.on.mockImplementation((event, callback) => {
                if (event === 'end') {
                    callback();
                }
            });

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

    describe('unzip function', () => {
        test('should extract zip file to destination', async () => {
            const mockReadStream = {
                pipe: jest.fn().mockReturnThis(),
            };
            const mockExtractor = {
                on: jest.fn().mockImplementation((event, callback) => {
                    if (event === 'finish') {
                        callback();
                    }
                    return mockExtractor;
                }),
            };

            fs.createReadStream.mockReturnValue(mockReadStream);
            unzipper.Extract.mockReturnValue(mockExtractor);
            mockReadStream.pipe.mockReturnValue(mockExtractor);

            await lib.unzip('test.zip', '/extract/path');

            expect(fs.createReadStream).toHaveBeenCalledWith('test.zip');
            expect(unzipper.Extract).toHaveBeenCalledWith({ path: '/extract/path' });
            expect(mockReadStream.pipe).toHaveBeenCalledWith(mockExtractor);
        });

        test('should handle extraction errors', async () => {
            const mockReadStream = {
                pipe: jest.fn().mockReturnThis(),
            };
            const mockExtractor = {
                on: jest.fn().mockImplementation((event, callback) => {
                    if (event === 'error') {
                        callback(new Error('Extraction failed'));
                    }
                    return mockExtractor;
                }),
            };

            fs.createReadStream.mockReturnValue(mockReadStream);
            unzipper.Extract.mockReturnValue(mockExtractor);
            mockReadStream.pipe.mockReturnValue(mockExtractor);

            await expect(lib.unzip('test.zip', '/extract/path')).rejects.toThrow('Extraction failed');
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
