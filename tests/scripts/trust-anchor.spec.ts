import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { publicKeyBase64FromPem } from '../../scripts/mod-signing-utils.mjs';
import { MOD_PACKAGE_PUBLIC_KEY_BASE64 } from '../../src/core/mods/trust-anchor';

const repoRoot = join(import.meta.dirname, '../..');
const devPrivatePem = readFileSync(join(repoRoot, 'packages/signing/dev-private.pem'), 'utf8');
const DEV_PUBLIC_KEY = publicKeyBase64FromPem(devPrivatePem);

describe('mod trust anchor', () => {
    it('does not ship the development public key in production builds', () => {
        expect(MOD_PACKAGE_PUBLIC_KEY_BASE64).not.toBe(DEV_PUBLIC_KEY);
        expect(MOD_PACKAGE_PUBLIC_KEY_BASE64.length).toBeGreaterThan(20);
    });
});
