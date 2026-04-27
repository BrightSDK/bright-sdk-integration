const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { execFileSync } = require('child_process');

const { unzip } = require('../src/unzip.js');

const canRunSymlinkTest =
    process.platform !== 'win32' && (() => {
        try {
            execFileSync('zip', ['-v'], { stdio: 'ignore' });
            return true;
        } catch (e) {
            return false;
        }
    })();

const maybeTest = canRunSymlinkTest ? test : test.skip;

describe('unzipping', () => {
    maybeTest('unzip preserves symlinks', async () => {
        const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'unzip-int-'));
        const src = path.join(tmp, 'src');
        const dst = path.join(tmp, 'dst');
        await fs.ensureDir(src);

        await fs.writeFile(path.join(src, 'target.txt'), 'hello', 'utf8');
        await fs.symlink('target.txt', path.join(src, 'link.txt'));

        execFileSync('zip', ['-y', 'test.zip', 'target.txt', 'link.txt'], { cwd: src });

        await unzip(path.join(src, 'test.zip'), dst);

        const st = await fs.lstat(path.join(dst, 'link.txt'));
        expect(st.isSymbolicLink()).toBe(true);

        const linkTarget = await fs.readlink(path.join(dst, 'link.txt'));
        expect(linkTarget).toBe('target.txt');
    });

    maybeTest('unzip preserves executable bit', async () => {
        const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'unzip-int-'));
        const src = path.join(tmp, 'src');
        const dst = path.join(tmp, 'dst');
        await fs.ensureDir(src);

        const execPath = path.join(src, 'exec.sh');
        await fs.writeFile(execPath, '#!/bin/sh\necho ok\n', 'utf8');
        await fs.chmod(execPath, 0o755);

        execFileSync('zip', ['-y', 'test.zip', 'exec.sh'], { cwd: src });

        await unzip(path.join(src, 'test.zip'), dst);

        const st = await fs.stat(path.join(dst, 'exec.sh'));
        expect(st.mode & 0o111).toBeTruthy();
    });

    maybeTest('unzip is idempotent (second run does not fail, symlink stays symlink)', async () => {
        const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'unzip-int-'));
        const src = path.join(tmp, 'src');
        const dst = path.join(tmp, 'dst');
        await fs.ensureDir(src);

        await fs.writeFile(path.join(src, 'target.txt'), 'hello', 'utf8');
        await fs.symlink('target.txt', path.join(src, 'link.txt'));

        execFileSync('zip', ['-y', 'test.zip', 'target.txt', 'link.txt'], { cwd: src });

        const zipPath = path.join(src, 'test.zip');

        await unzip(zipPath, dst);
        await unzip(zipPath, dst);

        const st = await fs.lstat(path.join(dst, 'link.txt'));
        expect(st.isSymbolicLink()).toBe(true);

        const linkTarget = await fs.readlink(path.join(dst, 'link.txt'));
        expect(linkTarget).toBe('target.txt');
    });

    maybeTest('unzip preserves relative symlink in nested dirs', async () => {
        const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'unzip-int-'));
        const src = path.join(tmp, 'src');
        const dst = path.join(tmp, 'dst');
        await fs.ensureDir(path.join(src, 'a'));
        await fs.ensureDir(path.join(src, 'b'));

        await fs.writeFile(path.join(src, 'a', 'target.txt'), 'hello', 'utf8');
        await fs.symlink('../a/target.txt', path.join(src, 'b', 'link.txt'));

        execFileSync('zip', ['-y', '-r', 'test.zip', 'a', 'b'], { cwd: src });

        await unzip(path.join(src, 'test.zip'), dst);

        const linkPath = path.join(dst, 'b', 'link.txt');
        const st = await fs.lstat(linkPath);
        expect(st.isSymbolicLink()).toBe(true);

        const linkTarget = await fs.readlink(linkPath);
        expect(linkTarget).toBe('../a/target.txt');

        const content = await fs.readFile(linkPath, 'utf8');
        expect(content).toBe('hello');
    });

});
