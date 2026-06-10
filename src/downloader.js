// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/
const { execFileSync, spawnSync } = require('child_process');
const https = require('follow-redirects').https;
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const BIN_NAME = 'bright-sdk-downloader';
const DOWNLOADER_REPO = 'BrightSDK/bright-sdk-downloader-rs';
const DOWNLOADER_VERSION = '1.0.0';

const get_asset_name = () => {
    const platform = process.platform;
    const arch = process.arch;
    if (platform === 'win32') {
        return 'bright-sdk-downloader-win-x64.exe';
    }
    if (platform === 'darwin') {
        return arch === 'arm64'
            ? 'bright-sdk-downloader-macos-arm64'
            : 'bright-sdk-downloader-macos-x64';
    }
    return 'bright-sdk-downloader-linux-x64';
};

const get_cache_dir = () => {
    const dir = path.join(os.homedir(), '.bright-sdk', 'bin');
    fs.ensureDirSync(dir);
    return dir;
};

const get_cached_bin = () => {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(get_cache_dir(), BIN_NAME + ext);
};

const is_in_path = name => {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const r = spawnSync(cmd, [name], { stdio: 'pipe' });
    return r.status === 0;
};

const download_bin = () => {
    const asset = get_asset_name();
    const url =
        `https://github.com/${DOWNLOADER_REPO}/releases/download/` +
        `${DOWNLOADER_VERSION}/${asset}`;
    const dest = get_cached_bin();
    process.stderr.write(`Downloading ${BIN_NAME} v${DOWNLOADER_VERSION}...\n`);
    const tmp = dest + '.tmp';
    const file = fs.createWriteStream(tmp);
    return new Promise((resolve, reject) => {
        https
            .get(url, { headers: { 'User-Agent': 'bright-sdk-integration' } }, res => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    res.resume();
                    return void reject(
                        new Error(`Failed to download ${BIN_NAME}: HTTP ${res.statusCode}`),
                    );
                }
                res.pipe(file);
                file.on('finish', () => {
                    file.close();
                    fs.renameSync(tmp, dest);
                    if (process.platform !== 'win32') {
                        fs.chmodSync(dest, 0o755);
                    }
                    process.stderr.write(`Saved to ${dest}\n`);
                    resolve(dest);
                });
            })
            .on('error', reject);
    });
};

const ensure_bin = () => {
    const cached = get_cached_bin();
    if (fs.existsSync(cached)) {
        return cached;
    }
    if (is_in_path(BIN_NAME)) {
        return BIN_NAME;
    }
    // Synchronous download via spawnSync calling node
    const script = `
        const d = require('${__filename.replace(/\\/g, '/')}');
        d.download_bin().then(p => process.stdout.write(p))
            .catch(e => { process.stderr.write(e.message+'\\n'); process.exit(1); });
    `;
    const r = spawnSync(process.execPath, ['-e', script], {
        env: process.env,
        stdio: ['pipe', 'pipe', 'inherit'],
        timeout: 120000,
    });
    if (r.status !== 0) {
        throw new Error(
            `${BIN_NAME} not found and auto-download failed. ` +
                'Install it manually or set BRIGHT_SDK_DOWNLOADER_BIN.',
        );
    }
    return r.stdout.toString().trim();
};

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
    return ensure_bin();
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
    if (version && version !== 'latest') {
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
    if (version && version !== 'latest') {
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
    download_bin,
};
