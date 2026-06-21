// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const js = require('@eslint/js');
const pluginN = require('eslint-plugin-n').default;
const pluginPromise = require('eslint-plugin-promise');
const prettier = require('eslint-config-prettier');

module.exports = [
    js.configs.recommended,
    pluginN.configs['flat/recommended'],
    pluginPromise.configs['flat/recommended'],
    prettier,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                require: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                URL: 'readonly',
                // Jest globals
                describe: 'readonly',
                test: 'readonly',
                it: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                jest: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-console': 'off',
            'prefer-const': 'error',
            'no-var': 'error',
            eqeqeq: 'warn',
            curly: ['error', 'multi-line'],
            'no-throw-literal': 'error',
            'no-cond-assign': 'warn',
            'n/no-process-exit': 'off',
            'n/no-unpublished-require': 'off',
            'n/no-missing-require': 'off',
            'promise/always-return': 'off',
            'promise/catch-or-return': 'warn',
        },
    },
    {
        ignores: [
            'node_modules/**',
            'coverage/**',
            'dist/**',
            'assets/**',
            'example/**',
            '.sdk/**',
        ],
    },
];
