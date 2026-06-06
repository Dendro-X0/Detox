import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publicKeyBase64FromPem } from '../../scripts/mod-signing-utils.mjs';

const DEV_PUBLIC_KEY = 'wqs2rsAbevgjB03maJlFjsC26tZD1x5dv0arBy1bDBc=';
const devPrivatePem = readFileSync(
    join(import.meta.dirname, '../../packages/signing/dev-private.pem'),
    'utf8'
);

describe('mod-signing-utils', () => {
    it('extracts raw Ed25519 public key from dev private PEM', () => {
        expect(publicKeyBase64FromPem(devPrivatePem)).toBe(DEV_PUBLIC_KEY);
    });
});
