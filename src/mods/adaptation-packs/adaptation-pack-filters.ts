import type { AdaptationContentType } from '../../core/adaptation/adaptation-pack-types';
import type { AdaptationPackDescriptor } from './catalog';

export type AdaptationLanguageFilter = 'all' | 'universal' | 'en' | 'de';

export type AdaptationLanguageGroup = 'universal' | 'en' | 'de' | 'other';

export function getPackLanguageGroup(pack: AdaptationPackDescriptor): AdaptationLanguageGroup {
    if (pack.languages.includes('*')) return 'universal';
    if (pack.languages.includes('en')) return 'en';
    if (pack.languages.includes('de')) return 'de';
    return 'other';
}

export function filterAdaptationPacks(
    packs: readonly AdaptationPackDescriptor[],
    languageFilter: AdaptationLanguageFilter,
    contentTypeFilter: AdaptationContentType | 'all'
): readonly AdaptationPackDescriptor[] {
    return packs.filter((pack) => {
        if (languageFilter !== 'all') {
            const group = getPackLanguageGroup(pack);
            if (group !== languageFilter) return false;
        }
        if (contentTypeFilter !== 'all' && !pack.contentTypes.includes(contentTypeFilter)) {
            return false;
        }
        return true;
    });
}

export function groupAdaptationPacksByLanguage(
    packs: readonly AdaptationPackDescriptor[]
): ReadonlyMap<AdaptationLanguageGroup, readonly AdaptationPackDescriptor[]> {
    const order: readonly AdaptationLanguageGroup[] = ['en', 'de', 'universal', 'other'];
    const groups = new Map<AdaptationLanguageGroup, AdaptationPackDescriptor[]>();
    for (const group of order) {
        groups.set(group, []);
    }
    for (const pack of packs) {
        const group = getPackLanguageGroup(pack);
        groups.get(group)?.push(pack);
    }
    return groups;
}
