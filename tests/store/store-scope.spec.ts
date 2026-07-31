import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = join(import.meta.dirname, '../..');
const meta = JSON.parse(readFileSync(join(repoRoot, 'store/store-meta.json'), 'utf8'));

const forbiddenPatterns = [
    /block(s)? misinformation/i,
    /fight(s)? misinformation/i,
    /fact[- ]check your feed/i,
    /analyz(e|es) images/i,
    /block(s)? false/i,
];

describe('store scope honesty (§F)', () => {
    it('defines scope FAQ URL and local doc', () => {
        expect(meta.scopeFaqUrl).toMatch(/^https:\/\//);
        expect(existsSync(join(repoRoot, 'docs/scope-faq.md'))).toBe(true);
    });

    it('listing drafts avoid forbidden claims and include text-first boundary', () => {
        for (const name of ['listing-chrome.md', 'listing-firefox.md']) {
            const content = readFileSync(join(repoRoot, 'store', name), 'utf8');
            for (const pattern of forbiddenPatterns) {
                expect(content, name).not.toMatch(pattern);
            }
            expect(content, name).toMatch(/image-only/i);
            expect(content, name).toMatch(/reveal|reversible/i);
            expect(content, name).toMatch(/\btext(ual)?\b/i);
        }
    });

    it('wizard welcome includes text-only limitation key', () => {
        const en = JSON.parse(readFileSync(join(repoRoot, 'src/i18n/locales/en.json'), 'utf8'));
        expect(en.wizard.welcome.textOnlyLimitation).toMatch(/image-only|Image-only/i);
    });

    it('filtering tab links scope FAQ in locale strings', () => {
        const en = JSON.parse(readFileSync(join(repoRoot, 'src/i18n/locales/en.json'), 'utf8'));
        expect(en.settings.filtering.scopeHonestyNote).toBeTruthy();
        expect(en.settings.filtering.scopeFaqLink).toBeTruthy();
    });
});
