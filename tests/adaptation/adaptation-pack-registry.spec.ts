import { afterEach, describe, expect, it } from 'vitest';
import {
    activateAdaptationPack,
    clearAdaptationPacks,
    deactivateAdaptationPack,
    getMergedAdaptationRules,
    setAdaptationPageContext,
    setAdaptationPageLanguage,
} from '../../src/core/adaptation/adaptation-pack-registry';

describe('adaptation-pack-registry', () => {
    afterEach(() => {
        clearAdaptationPacks();
        setAdaptationPageLanguage(null);
        setAdaptationPageContext(null);
    });

    it('loads bundled English promo patterns when language and context match', async () => {
        setAdaptationPageLanguage('en');
        setAdaptationPageContext(['social-feed']);
        const ok = await activateAdaptationPack('adaptation-en-promo');
        expect(ok).toBe(true);

        const merged = getMergedAdaptationRules();
        expect(merged.activePackIds).toContain('adaptation-en-promo');
        expect(merged.supplementalKeywords).toContain('act now');
        expect(merged.noisePatterns.promo).toContain('use code at checkout');
    });

    it('skips language-specific packs when page language does not match', async () => {
        setAdaptationPageLanguage('fr');
        setAdaptationPageContext(['social-feed']);
        await activateAdaptationPack('adaptation-en-promo');
        await activateAdaptationPack('adaptation-universal-social');

        const merged = getMergedAdaptationRules();
        expect(merged.activePackIds).toEqual(['adaptation-universal-social']);
        expect(merged.supplementalKeywords).not.toContain('act now');
    });

    it('skips context-specific packs on academic pages with no detected context', async () => {
        setAdaptationPageLanguage('en');
        setAdaptationPageContext([]);
        await activateAdaptationPack('adaptation-en-promo');
        await activateAdaptationPack('adaptation-en-clickbait');

        const merged = getMergedAdaptationRules();
        expect(merged.activePackIds).toEqual([]);
        expect(merged.supplementalKeywords).toHaveLength(0);
    });

    it('applies ecommerce packs only on ecommerce context', async () => {
        setAdaptationPageLanguage('en');
        await activateAdaptationPack('adaptation-en-promo');

        setAdaptationPageContext(['news']);
        expect(getMergedAdaptationRules().activePackIds).toEqual([]);

        setAdaptationPageContext(['ecommerce']);
        expect(getMergedAdaptationRules().activePackIds).toContain('adaptation-en-promo');
    });

    it('deactivates packs cleanly', async () => {
        setAdaptationPageContext(['social-feed']);
        await activateAdaptationPack('adaptation-universal-social');
        deactivateAdaptationPack('adaptation-universal-social');
        expect(getMergedAdaptationRules().activePackIds).toEqual([]);
    });
});
