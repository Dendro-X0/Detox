import { describe, expect, it } from 'vitest';
import {
    filterAdaptationPacks,
    getPackLanguageGroup,
    groupAdaptationPacksByLanguage,
} from '../../src/mods/adaptation-packs/adaptation-pack-filters';
import { ADAPTATION_PACK_CATALOG } from '../../src/mods/adaptation-packs/catalog';

describe('adaptation-pack-filters', () => {
    it('groups English packs separately from German and universal', () => {
        expect(getPackLanguageGroup(ADAPTATION_PACK_CATALOG[1])).toBe('en');
        expect(getPackLanguageGroup(ADAPTATION_PACK_CATALOG[5])).toBe('de');
        expect(getPackLanguageGroup(ADAPTATION_PACK_CATALOG[0])).toBe('universal');
    });

    it('filters by language and content type', () => {
        const englishPromo = filterAdaptationPacks(ADAPTATION_PACK_CATALOG, 'en', 'promotional');
        expect(englishPromo).toHaveLength(1);
        expect(englishPromo[0]?.id).toBe('adaptation-en-promo');

        const germanClickbait = filterAdaptationPacks(ADAPTATION_PACK_CATALOG, 'de', 'clickbait');
        expect(germanClickbait).toHaveLength(1);
        expect(germanClickbait[0]?.id).toBe('adaptation-de-clickbait');
    });

    it('groups filtered packs by language for section headings', () => {
        const grouped = groupAdaptationPacksByLanguage(ADAPTATION_PACK_CATALOG);
        expect(grouped.get('en')).toHaveLength(4);
        expect(grouped.get('de')).toHaveLength(4);
        expect(grouped.get('universal')).toHaveLength(1);
    });
});
