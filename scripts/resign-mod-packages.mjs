#!/usr/bin/env node
/**
 * Re-sign all mod unlock payloads under packages/mod-unlocks/src/.
 *
 * Usage:
 *   node scripts/resign-mod-packages.mjs
 *   node scripts/resign-mod-packages.mjs --private-key packages/signing/prod-private.pem
 */
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const payloadDir = join(repoRoot, 'packages/mod-unlocks/src');
const signScript = join(__dirname, 'sign-mod-package.mjs');

const keyIdx = process.argv.indexOf('--private-key');
const privateKeyArg = keyIdx !== -1 && process.argv[keyIdx + 1] ? process.argv[keyIdx + 1] : null;

const payloads = readdirSync(payloadDir).filter((name) => name.endsWith('.payload.json'));
if (payloads.length === 0) {
    console.error('No payload files found in packages/mod-unlocks/src/');
    process.exit(1);
}

for (const name of payloads) {
    const payloadPath = join(payloadDir, name);
    const args = [signScript, payloadPath];
    if (privateKeyArg) {
        args.push('--private-key', privateKeyArg);
    }
    const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

console.log(`Re-signed ${payloads.length} mod package(s).`);
