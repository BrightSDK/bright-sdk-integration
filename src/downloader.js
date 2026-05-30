// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const { execFileSync } = require('child_process');
const https = require('follow-redirects').https;
const fs = require('fs-extra');
const path = require('path');

const BIN_NAME = 'bright-sdk-downloader';

const get_bin_path = () => {
    if (process.env.BRIGHT_SDK_DOWNLOADER_BIN) {
        return process.env.BRIGHT_SDK_DOWNLOADER_BIN;
    }
    // Check sibling repo (dev convenience)
    const dev_path = path.resolve(
        __dirname,
        '..',
        '..',
        'bright-sdk-downloader-rs',
        'target',
        'release',
        BIN_NAME,
    );
    if (fs.existsSync(dev_path)) {
        return dev_path;
    }
    return BIN_NAME; // rely on PATH
};

const exec_downloader = args => {
    const bin = get_bin_path();
    const result = execFileSync(bin, args, {
        env: process.env,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'inherit'],
        timeout: 120000,
    });
    return JSON.parse(result.trim());
};

/**
 * Resolve SDK version and download URL.
 * @param {string} platform - Platform key (e.g. 'tizen', 'ios')
 * @param {string} [version='latest'] - Version or 'latest'
 * @returns {{platform: string, version: string, url: string, sha256?: string}}
 */
const resolve_sdk = (platform, version = 'latest') => {
    const args = ['resolve', '-p', platform];
    if (version && version != 'latest') {
        args.push('-v', version);
    }
    return exec_downloader(args);
};

/**
 * Download and extract SDK archive.
 * @param {string} platform - Platform key
 * @param {string} [version='latest'] - Version or 'latest'
 * @param {string} [output='.'] - Output directory
 * @returns {{platform: string, version: string, url: string, output: string,
 *   sha256?: string, files?: string[]}}
 */
const fetch_sdk = (platform, version = 'latest', output = '.') => {
    const args = ['fetch', '-p', platform, '-o', output];
    if (version && version != 'latest') {
        args.push('-v', version);
    }
    return exec_downloader(args);
};

/**
 * List available platform keys.
 * @returns {Array<{key: string, last_version: string}>}
 */
const list_platforms = () => exec_downloader(['platforms']);

/**
 * Download a file from URL to local path (simple HTTP GET).
 * Used for helper file downloads — not SDK archives.
 * @param {string} url - Remote URL
 * @param {string} fname - Local destination path
 */
const download_from_url = (url, fname) =>
    new Promise((resolve, reject) => {
        const request = https.get(
            url,
            {
                headers: { 'User-Agent': 'bright-sdk-integration/1.7' },
            },
            response => {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    response.resume();
                    return void reject(
                        new Error(`Download failed: HTTP ${response.statusCode} for ${url}`),
                    );
                }
                const ws = fs.createWriteStream(fname);
                ws.on('error', reject);
                response.pipe(ws);
                ws.on('finish', resolve);
            },
        );
        request.on('error', reject);
        request.setTimeout(60000, () => {
            request.destroy(new Error('Download timed out'));
        });
    });

module.exports = {
    get_bin_path,
    resolve_sdk,
    fetch_sdk,
    list_platforms,
    download_from_url,
};
