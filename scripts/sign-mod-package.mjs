#!/usr/bin/env node
/**
 * Signs a mod package payload JSON and writes a .signallens-mod.json manifest.
 *
 * Usage:
 *   node scripts/sign-mod-package.mjs <payload.json> [output.json]
 *   node scripts/sign-mod-package.mjs <payload.json> --private-key path/to.pem
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sign } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultPrivateKeyPath = join(__dirname, '../packages/signing/dev-private.pem');

function sortValue(value) {
    if (Array.isArray(value)) return value.map(sortValue);
    if (value !== null && typeof value === 'object') {
        const sorted = {};
        for (const key of Object.keys(value).sort()) {
            sorted[key] = sortValue(value[key]);
        }
        return sorted;
    }
    return value;
}

function canonicalize(payload) {
    return JSON.stringify(sortValue(payload));
}

function parsePrivateKeyPath(argv) {
    const keyIdx = argv.indexOf('--private-key');
    if (keyIdx !== -1 && argv[keyIdx + 1]) {
        return argv[keyIdx + 1];
    }
    return defaultPrivateKeyPath;
}

const args = process.argv.slice(2).filter((arg, index, all) => {
    if (arg === '--private-key') return false;
    if (index > 0 && all[index - 1] === '--private-key') return false;
    return true;
});

const inputPath = args[0];
if (!inputPath) {
    console.error('Usage: node scripts/sign-mod-package.mjs <payload.json> [output.json] [--private-key path.pem]');
    process.exit(1);
}

const privateKeyPath = parsePrivateKeyPath(process.argv);

const payload = JSON.parse(readFileSync(inputPath, 'utf8'));
if (payload.signature) {
    console.error('Payload must not include a signature field.');
    process.exit(1);
}

const privateKeyPem = readFileSync(privateKeyPath, 'utf8');
const canonical = canonicalize(payload);
const signature = sign(null, Buffer.from(canonical), privateKeyPem);

const manifest = { ...payload, signature: signature.toString('base64') };
const payloadDir = dirname(inputPath);
const unlockDir = basename(payloadDir) === 'src' ? dirname(payloadDir) : payloadDir;
const stem = basename(inputPath).replace(/\.payload\.json$/i, '');
const defaultOut = join(unlockDir, `${stem}.signallens-mod.json`);
const outputPath = args[1] ?? defaultOut;

writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Signed ${basename(outputPath)} (${basename(privateKeyPath)})`);
