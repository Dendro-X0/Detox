#!/usr/bin/env node
/**
 * Generate a production Ed25519 keypair for mod package signing.
 * Writes packages/signing/prod-private.pem and prod-public.pem (gitignored).
 *
 * Usage: node scripts/generate-mod-signing-key.mjs [--force]
 */
import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicKeyBase64FromPem } from './mod-signing-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const signingDir = join(__dirname, '../packages/signing');
const privatePath = join(signingDir, 'prod-private.pem');
const publicPath = join(signingDir, 'prod-public.pem');
const force = process.argv.includes('--force');

if (!force && (existsSync(privatePath) || existsSync(publicPath))) {
    console.error('Production key files already exist. Pass --force to overwrite.');
    process.exit(1);
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
writeFileSync(
    privatePath,
    privateKey.export({ type: 'pkcs8', format: 'pem' }),
    { mode: 0o600 }
);
writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }));

const base64 = publicKeyBase64FromPem(publicPath);
console.log('Wrote packages/signing/prod-private.pem (keep offline; never commit)');
console.log('Wrote packages/signing/prod-public.pem');
console.log('');
console.log('Next: node scripts/apply-mod-trust-anchor.mjs --public-key', base64);
console.log('Then: node scripts/resign-mod-packages.mjs --private-key packages/signing/prod-private.pem');
