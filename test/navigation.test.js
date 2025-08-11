const navigation = require('../src/navigation.js');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const util = require('util');
const lib = require('../src/lib.js');
const { mockFs, restoreFs } = require('./setup');

// Mock dependencies
jest.mock('readline');
jest.mock('fs');
jest.mock('util');
jest.mock('../src/lib.js');

describe('navigation module', () => {
    let mockRl;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFs();

        // Mock readline interface
        mockRl = {
            close: jest.fn(),
            question: jest.fn(),
            input: {
                on: jest.fn(),
                once: jest.fn(),
            },
            output: {},
            on: jest.fn(),
        };

        readline.createInterface.mockReturnValue(mockRl);
        readline.cursorTo.mockImplementation(() => {});
        readline.clearScreenDown.mockImplementation(() => {});

        // Mock fs functions
        fs.readdir = jest.fn();
        fs.lstatSync.mockReturnValue({ isDirectory: () => false });
        util.promisify.mockReturnValue(fs.readdir);

        // Mock lib functions
        lib.print.mockImplementation(() => {});
        lib.exit.mockImplementation(() => {});
    });

    afterEach(() => {
        restoreFs();
    });

    describe('clear_screen', () => {
        test('should clear screen with provided readline interface', () => {
            navigation.clear_screen(mockRl);

            expect(readline.cursorTo).toHaveBeenCalledWith(mockRl.output, 0, 0);
            expect(readline.clearScreenDown).toHaveBeenCalledWith(mockRl.output);
            expect(mockRl.close).not.toHaveBeenCalled();
        });

        test('should create and close readline interface when none provided', () => {
            navigation.clear_screen();

            expect(readline.createInterface).toHaveBeenCalled();
            expect(readline.cursorTo).toHaveBeenCalled();
            expect(readline.clearScreenDown).toHaveBeenCalled();
            expect(mockRl.close).toHaveBeenCalled();
        });
    });

    describe('prompt', () => {
        test('should handle simple text input', async () => {
            const question = 'Enter your name';
            const defaultAnswer = 'John';
            const userAnswer = 'Jane';

            mockRl.question.mockImplementation((fullQuestion, callback) => {
                expect(fullQuestion).toBe(`${question} (${defaultAnswer}): `);
                callback(userAnswer);
            });

            const result = await navigation.prompt(question, defaultAnswer);

            expect(result).toBe(userAnswer);
            expect(mockRl.close).toHaveBeenCalled();
        });

        test('should use default answer when user provides empty input', async () => {
            const question = 'Enter value';
            const defaultAnswer = 'default';

            mockRl.question.mockImplementation((fullQuestion, callback) => {
                callback(''); // Empty user input
            });

            const result = await navigation.prompt(question, defaultAnswer);

            expect(result).toBe(defaultAnswer);
        });

        test('should exit when no value provided and no default', async () => {
            const question = 'Required field';

            mockRl.question.mockImplementation((fullQuestion, callback) => {
                callback(''); // Empty input, no default
            });

            await navigation.prompt(question);

            expect(lib.exit).toHaveBeenCalledWith('Value required!');
        });

        test('should format question with selectable option', async () => {
            const question = 'Select directory';
            const defaultAnswer = '/home';
            const options = { selectable: true };

            mockRl.question.mockImplementation((fullQuestion, callback) => {
                expect(fullQuestion).toBe(`${question} (${defaultAnswer}) (↑/↓ to navigate): `);
                callback('/test');
            });

            const result = await navigation.prompt(question, defaultAnswer, options);

            expect(result).toBe('/test');
        });
    });

    describe('Module functionality', () => {
        test('should export required functions', () => {
            expect(typeof navigation.clear_screen).toBe('function');
            expect(typeof navigation.prompt).toBe('function');
        });

        test('should handle readline interface creation', () => {
            navigation.clear_screen();

            expect(readline.createInterface).toHaveBeenCalledWith({
                input: process.stdin,
                output: process.stdout
            });
        });
    });
});