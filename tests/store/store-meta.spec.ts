import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '../..');
const meta = JSON.parse(readFileSync(join(repoRoot, 'store/store-meta.json'), 'utf8'));

describe('store metadata', () => {
    it('defines a GitHub privacy policy URL and local PRIVACY.md', () => {
        expect(meta.privacyPolicyUrl).toMatch(/^https:\/\//);
        expect(meta.repoUrl).toMatch(/^https:\/\//);
        expect(existsSync(join(repoRoot, 'store/PRIVACY.md'))).toBe(true);
    });
});
