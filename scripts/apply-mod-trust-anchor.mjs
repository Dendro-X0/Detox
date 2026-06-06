#!/usr/bin/env node
/**
 * Update MOD_PACKAGE_PUBLIC_KEY_BASE64 in trust-anchor.ts.
 *
 * Usage:
 *   node scripts/apply-mod-trust-anchor.mjs --public-key <base64>
 *   node scripts/apply-mod-trust-anchor.mjs --pem packages/signing/prod-public.pem
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicKeyBase64FromPem } from './mod-signing-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const trustAnchorPath = join(__dirname, '../src/core/mods/trust-anchor.ts');

function parseArgs(argv) {
    const publicKeyIdx = argv.indexOf('--public-key');
    if (publicKeyIdx !== -1 && argv[publicKeyIdx + 1]) {
        return argv[publicKeyIdx + 1];
    }
    const pemIdx = argv.indexOf('--pem');
    if (pemIdx !== -1 && argv[pemIdx + 1]) {
        return publicKeyBase64FromPem(argv[pemIdx + 1]);
    }
    return null;
}

const base64 = parseArgs(process.argv);
if (!base64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
    console.error('Usage: node scripts/apply-mod-trust-anchor.mjs --public-key <base64>');
    console.error('   or: node scripts/apply-mod-trust-anchor.mjs --pem <path-to-public.pem>');
    process.exit(1);
}

const source = readFileSync(trustAnchorPath, 'utf8');
const pattern = /export const MOD_PACKAGE_PUBLIC_KEY_BASE64 = '[^']+';/;
if (!pattern.test(source)) {
    console.error('Could not find MOD_PACKAGE_PUBLIC_KEY_BASE64 in trust-anchor.ts');
    process.exit(1);
}

const updated = source.replace(
    pattern,
    `export const MOD_PACKAGE_PUBLIC_KEY_BASE64 = '${base64}';`
);
writeFileSync(trustAnchorPath, updated);
console.log(`Updated trust anchor: ${base64}`);
