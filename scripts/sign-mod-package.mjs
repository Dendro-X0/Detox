#!/usr/bin/env node
/**
 * Signs a mod package payload JSON and writes a .signallens-mod.json manifest.
 *
 * Usage: node scripts/sign-mod-package.mjs <payload.json> [output.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sign } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const privateKeyPath = join(__dirname, '../packages/signing/dev-private.pem');

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

const inputPath = process.argv[2];
if (!inputPath) {
    console.error('Usage: node scripts/sign-mod-package.mjs <payload.json> [output.json]');
    process.exit(1);
}

const payload = JSON.parse(readFileSync(inputPath, 'utf8'));
if (payload.signature) {
    console.error('Payload must not include a signature field.');
    process.exit(1);
}

const privateKeyPem = readFileSync(privateKeyPath, 'utf8');
const canonical = canonicalize(payload);
const signature = sign(null, Buffer.from(canonical), privateKeyPem);

const manifest = { ...payload, signature: signature.toString('base64') };
const defaultOut = inputPath.replace(/\.payload\.json$/i, '.signallens-mod.json');
const outputPath = process.argv[3] ?? defaultOut;

writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Signed ${basename(outputPath)}`);
