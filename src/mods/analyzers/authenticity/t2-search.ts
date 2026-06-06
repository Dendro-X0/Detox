import type { AuthenticitySettings } from './settings';
import type { SourceReference } from './types';
import { searchWikipedia, type WikipediaSearchHit } from './wikipedia-retrieval';

export type SearchHit = WikipediaSearchHit;

export async function runSearch(
    query: string,
    settings: AuthenticitySettings
): Promise<readonly SearchHit[]> {
    switch (settings.searchProvider) {
        case 'wikipedia':
            return searchWikipedia(query, settings.maxSearchResults);
        case 'brave':
            return searchBrave(query, settings);
        case 'custom':
            return searchCustom(query, settings);
        default:
            return [];
    }
}

async function searchBrave(query: string, settings: AuthenticitySettings): Promise<readonly SearchHit[]> {
    if (!settings.braveApiKey.trim()) return [];
    const params = new URLSearchParams({ q: query, count: String(settings.maxSearchResults) });
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
        headers: {
            Accept: 'application/json',
            'X-Subscription-Token': settings.braveApiKey.trim(),
        },
    });
    if (!response.ok) return [];
    const body = (await response.json()) as {
        readonly web?: { readonly results?: readonly { readonly url?: string; readonly title?: string; readonly description?: string }[] };
    };
    const results = body.web?.results ?? [];
    return results
        .filter((r): r is { readonly url: string; readonly title: string; readonly description: string } => !!r.url)
        .map((r) => ({
            url: r.url,
            title: r.title ?? r.url,
            description: r.description ?? '',
        }));
}

async function searchCustom(query: string, settings: AuthenticitySettings): Promise<readonly SearchHit[]> {
    const endpoint = settings.customSearchUrl.trim();
    if (!endpoint) return [];
    const url = endpoint.includes('{query}')
        ? endpoint.replace('{query}', encodeURIComponent(query))
        : `${endpoint}${endpoint.includes('?') ? '&' : '?'}q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const body = (await response.json()) as {
        readonly results?: readonly { readonly url?: string; readonly title?: string; readonly snippet?: string; readonly description?: string }[];
    };
    const results = body.results ?? [];
    return results
        .filter((r): r is { readonly url: string; readonly title?: string; readonly snippet?: string; readonly description?: string } => !!r.url)
        .slice(0, settings.maxSearchResults)
        .map((r) => ({
            url: r.url,
            title: r.title ?? r.url,
            description: r.snippet ?? r.description ?? '',
        }));
}

export function hitsToReferences(hits: readonly SearchHit[], prefix: string): readonly SourceReference[] {
    const now = Date.now();
    return hits.map((hit, index) => ({
        id: `${prefix}-ref-${index + 1}`,
        url: hit.url,
        title: hit.title,
        snippet: hit.description.slice(0, 400),
        fetchedAt: now,
        snippetVerified: false,
        stance: 'unknown' as const,
    }));
}
