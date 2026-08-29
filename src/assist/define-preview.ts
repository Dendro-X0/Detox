import {
    fetchWikipediaExtracts,
    searchWikipedia,
} from '../mods/analyzers/authenticity/wikipedia-retrieval';

export type DefinePreview = {
    readonly title: string;
    readonly url: string;
    readonly excerpt: string;
};

const EXCERPT_CHARS = 280;

export async function fetchDefinePreview(
    query: string,
    fetchImpl: typeof fetch = fetch,
    signal?: AbortSignal
): Promise<DefinePreview | null> {
    const trimmed = query.trim();
    if (!trimmed || signal?.aborted) {
        if (signal?.aborted) throw new Error('cancelled');
        return null;
    }

    const boundFetch: typeof fetch = (input, init) =>
        fetchImpl(input, { ...init, signal: signal ?? init?.signal });

    const hits = await searchWikipedia(trimmed, 1, boundFetch);
    const hit = hits[0];
    if (!hit) return null;

    const extracts = await fetchWikipediaExtracts([hit.title], EXCERPT_CHARS, boundFetch);
    const excerpt = extracts.get(hit.title) ?? hit.description;
    if (!excerpt?.trim()) return null;

    return {
        title: hit.title,
        url: hit.url,
        excerpt: excerpt.trim(),
    };
}
