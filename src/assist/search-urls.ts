import type { AssistSearchEngineId, AssistSettings } from './types';
import { DEFAULT_ASSIST_SETTINGS } from './types';

const SEARCH_TEMPLATES: Readonly<Record<Exclude<AssistSearchEngineId, 'custom'>, string>> = {
    duckduckgo: 'https://duckduckgo.com/?q=%s',
    google: 'https://www.google.com/search?q=%s',
    bing: 'https://www.bing.com/search?q=%s',
};

export function buildSearchUrl(text: string, settings: AssistSettings): string {
    const query = text.trim();
    const template =
        settings.searchEngineId === 'custom'
            ? settings.customSearchUrlTemplate.includes('%s')
                ? settings.customSearchUrlTemplate
                : DEFAULT_ASSIST_SETTINGS.customSearchUrlTemplate
            : SEARCH_TEMPLATES[settings.searchEngineId];
    return template.replace('%s', encodeURIComponent(query));
}

export function buildWikipediaDefineUrl(text: string, lang = 'en'): string {
    const query = text.trim();
    return `https://${lang}.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}&go=Go`;
}

export function buildCompareSearchUrl(clipA: string, clipB: string, settings: AssistSettings): string {
    const a = clipA.trim().slice(0, 120);
    const b = clipB.trim().slice(0, 120);
    return buildSearchUrl(`"${a}" "${b}"`, settings);
}
