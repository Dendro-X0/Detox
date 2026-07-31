#!/usr/bin/env node
/**
 * Build + sign a single-file .signallens-mod.json from an adaptation pack directory.
 * The pack rules are embedded inline (no download URL required for install).
 *
 * Usage:
 *   node scripts/build-adaptation-mod-package.mjs <pack-directory> [output.json] [--private-key path.pem]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sign } from 'node:crypto';
import {
    buildModPayload,
    validateModMeta,
    validatePackJson,
} from './adaptation-pack-utils.mjs';

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
    if (keyIdx !== -1 && argv[keyIdx + 1]) return argv[keyIdx + 1];
    return defaultPrivateKeyPath;
}

const argv = process.argv.slice(2);
const filteredArgs = argv.filter((arg, index, all) => {
    if (arg === '--private-key') return false;
    if (index > 0 && all[index - 1] === '--private-key') return false;
    return true;
});

const dir = filteredArgs[0];
if (!dir) {
    console.error(
        'Usage: node scripts/build-adaptation-mod-package.mjs <pack-directory> [output.json] [--private-key path.pem]'
    );
    process.exit(1);
}

const packPath = join(dir, 'pack.json');
const metaPath = join(dir, 'mod.meta.json');
const pack = JSON.parse(readFileSync(packPath, 'utf8'));
const meta = JSON.parse(readFileSync(metaPath, 'utf8'));

const errors = [
    ...validateModMeta(meta),
    ...validatePackJson(pack, { modId: meta.modId }),
];
if (meta.version !== pack.version) {
    errors.push(`version mismatch between mod.meta.json and pack.json`);
}
if (errors.length > 0) {
    console.error('Validation failed — run validate-adaptation-pack.mjs first:');
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
}

const payload = buildModPayload(meta, pack);
const privateKeyPath = parsePrivateKeyPath(argv);
const privateKeyPem = readFileSync(privateKeyPath, 'utf8');
const signature = sign(null, Buffer.from(canonicalize(payload)), privateKeyPem);
const manifest = { ...payload, signature: signature.toString('base64') };

const stem = basename(dir);
const defaultOut = join(dir, `${stem}.signallens-mod.json`);
const outputPath = filteredArgs[1] ?? defaultOut;

writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Signed ${outputPath}`);
console.log(`  modId: ${meta.modId}`);
console.log(`  key: ${basename(privateKeyPath)}`);
