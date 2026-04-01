// LICENSE_CODE ZON
'use strict'; /*jslint node:true es9:true*/

const unzipper = require('unzipper');
const fs = require('fs-extra');
const path = require('path');

const S_IFMT = 0o170000;
const S_IFLNK = 0o120000;

function findEOCD(buf) {
    for (let i = buf.length - 22; i >= 0; i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) // EOCD
            return i;
    }
    return -1;
}

function readZipUnixModes(zipPath) {
    const b = fs.readFileSync(zipPath);

    const eocd = findEOCD(b);
    if (eocd < 0)
        throw new Error('EOCD not found');

    const cdSize = b.readUInt32LE(eocd + 12);
    const cdOff = b.readUInt32LE(eocd + 16);

    let p = cdOff;
    const end = cdOff + cdSize;
    const modes = new Map();

    while (p < end) {
        if (b.readUInt32LE(p) !== 0x02014b50)
            throw new Error('Bad central directory header signature');

        const versionMadeBy = b.readUInt16LE(p + 4);
        const platform = versionMadeBy >> 8; // 3 = Unix
        const externalAttrs = b.readUInt32LE(p + 38);
        const mode = (externalAttrs >>> 16) & 0xffff;

        const nameLen = b.readUInt16LE(p + 28);
        const extraLen = b.readUInt16LE(p + 30);
        const commentLen = b.readUInt16LE(p + 32);

        const name = b.slice(p + 46, p + 46 + nameLen).toString('utf8');

        if (platform === 3 && mode)
            modes.set(name, mode);

        p = p + 46 + nameLen + extraLen + commentLen;
    }
    return modes;
}

function isSymlinkEntry(relPath, modes) {
    const mode = getUnixMode(relPath, modes);
    return mode && (mode & S_IFMT) === S_IFLNK;
}

function getUnixMode(relPath, modes) {
    return modes.get(relPath) || null;
}

function isPathInside(parent, child) {
    const rel = path.relative(parent, child);
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

async function unzip(fname, dst) {
    await fs.ensureDir(dst);
    const modes = readZipUnixModes(fname);
    const dstAbs = path.resolve(dst);

    const rs = fs.createReadStream(fname);
    const parser = rs.pipe(unzipper.Parse({forceStream: true}));

    for await (const entry of parser) {
        const relPath = entry.path.replace(/\\/g, '/');
        const outPath = path.resolve(dstAbs, relPath);

        if (!isPathInside(dstAbs, outPath)) {
            entry.autodrain();
            throw new Error(`Zip Slip detected: ${entry.path}`);
        }

        if (entry.type === 'Directory' || relPath.endsWith('/')) {
            await fs.ensureDir(outPath);
            entry.autodrain();
            continue;
        }

        if (isSymlinkEntry(relPath, modes)) {
            const buf = await entry.buffer();
            const linkTarget = buf.toString('utf8').replace(/\0/g, '');

            await fs.ensureDir(path.dirname(outPath));
            await fs.remove(outPath);
            await fs.symlink(linkTarget, outPath);
            continue;
        }

        await fs.ensureDir(path.dirname(outPath));

        await new Promise((resolve, reject) => {
            const ws = fs.createWriteStream(outPath, { mode: 0o666 });
            ws.on('error', reject);
            ws.on('finish', resolve);
            entry.pipe(ws);
        });

        const mode = getUnixMode(relPath, modes);
        if (mode)
            await fs.chmod(outPath, mode & 0o7777);
    }
}

module.exports = { unzip };