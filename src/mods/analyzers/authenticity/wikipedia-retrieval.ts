/**
 * Script-first Wikipedia gather for authenticity T2 (search + public API extracts).
 * Uses MediaWiki opensearch + query extracts — no LLM, no HTML scraping.
 */
import type { SourceReference } from './types';

export const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/w/api.php';

export type WikipediaSearchHit = {
    readonly url: string;
    readonly title: string;
    readonly description: string;
};

const extractCache = new Map<string, { readonly text: string; readonly fetchedAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export function isWikipediaArticleUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return (
            parsed.hostname === 'en.wikipedia.org' &&
            parsed.pathname.startsWith('/wiki/') &&
            !parsed.pathname.startsWith('/wiki/Special:')
        );
    } catch {
        return false;
    }
}

export function titleFromWikipediaUrl(url: string): string | null {
    if (!isWikipediaArticleUrl(url)) return null;
    try {
        const segment = decodeURIComponent(new URL(url).pathname.replace(/^\/wiki\//, ''));
        return segment.replace(/_/g, ' ');
    } catch {
        return null;
    }
}

function cacheKey(title: string): string {
    return title.trim().toLowerCase();
}

function readCachedExtract(title: string): string | null {
    const entry = extractCache.get(cacheKey(title));
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
        extractCache.delete(cacheKey(title));
        return null;
    }
    return entry.text;
}

function writeCachedExtract(title: string, text: string): void {
    extractCache.set(cacheKey(title), { text, fetchedAt: Date.now() });
}

/** Parse opensearch JSON body into hits (testable without fetch). */
export function parseWikipediaOpensearchBody(
    body: readonly unknown[],
    limit: number
): readonly WikipediaSearchHit[] {
    const titles = (body[1] as string[] | undefined) ?? [];
    const descriptions = (body[2] as string[] | undefined) ?? [];
    const urls = (body[3] as string[] | undefined) ?? [];
    return titles.slice(0, limit).map((title, index) => ({
        url: urls[index] ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
        title,
        description: descriptions[index] ?? '',
    }));
}

/** Parse query extracts JSON into title → plain-text intro map. */
export function parseWikipediaExtractsBody(
    body: { readonly query?: { readonly pages?: Record<string, { readonly title?: string; readonly extract?: string }> } }
): ReadonlyMap<string, string> {
    const pages = body.query?.pages ?? {};
    const result = new Map<string, string>();
    for (const page of Object.values(pages)) {
        if (!page.title || !page.extract) continue;
        const text = page.extract.replace(/\s+/g, ' ').trim();
        if (text) result.set(page.title, text);
    }
    return result;
}

export async function searchWikipedia(
    query: string,
    limit: number,
    fetchImpl: typeof fetch = fetch
): Promise<readonly WikipediaSearchHit[]> {
    const params = new URLSearchParams({
        action: 'opensearch',
        search: query,
        limit: String(limit),
        namespace: '0',
        format: 'json',
        origin: '*',
    });
    const response = await fetchImpl(`${WIKIPEDIA_API_BASE}?${params.toString()}`);
    if (!response.ok) return [];
    const body = (await response.json()) as unknown[];
    return parseWikipediaOpensearchBody(body, limit);
}

export async function fetchWikipediaExtracts(
    titles: readonly string[],
    maxChars: number,
    fetchImpl: typeof fetch = fetch
): Promise<ReadonlyMap<string, string>> {
    const unique = [...new Set(titles.map((t) => t.trim()).filter(Boolean))];
    if (unique.length === 0) return new Map();

    const fromCache = new Map<string, string>();
    const missing: string[] = [];
    for (const title of unique) {
        const cached = readCachedExtract(title);
        if (cached) {
            fromCache.set(title, cached.slice(0, maxChars));
        } else {
            missing.push(title);
        }
    }
    if (missing.length === 0) return fromCache;

    const params = new URLSearchParams({
        action: 'query',
        prop: 'extracts',
        explaintext: '1',
        exintro: '1',
        titles: missing.join('|'),
        format: 'json',
        origin: '*',
    });
    const response = await fetchImpl(`${WIKIPEDIA_API_BASE}?${params.toString()}`);
    if (!response.ok) return fromCache;

    const body = (await response.json()) as {
        readonly query?: { readonly pages?: Record<string, { readonly title?: string; readonly extract?: string }> };
    };
    const fetched = parseWikipediaExtractsBody(body);
    for (const [title, text] of fetched) {
        writeCachedExtract(title, text);
        fromCache.set(title, text.slice(0, maxChars));
    }
    return fromCache;
}

export async function fetchWikipediaExtractForUrl(
    url: string,
    maxChars: number,
    fetchImpl: typeof fetch = fetch
): Promise<string | null> {
    const title = titleFromWikipediaUrl(url);
    if (!title) return null;
    const cached = readCachedExtract(title);
    if (cached) return cached.slice(0, maxChars);
    const extracts = await fetchWikipediaExtracts([title], maxChars, fetchImpl);
    return extracts.get(title) ?? null;
}

/** Batch-enrich Wikipedia references with verified API intro extracts. */
export async function enrichWikipediaReferences(
    references: readonly SourceReference[],
    maxSnippetChars: number,
    fetchImpl: typeof fetch = fetch
): Promise<readonly SourceReference[]> {
    const wikiRefs = references.filter((ref) => isWikipediaArticleUrl(ref.url));
    if (wikiRefs.length === 0) return references;

    const titles = wikiRefs.map((ref) => titleFromWikipediaUrl(ref.url) ?? ref.title);
    const extracts = await fetchWikipediaExtracts(titles, maxSnippetChars, fetchImpl);

    return references.map((ref) => {
        if (!isWikipediaArticleUrl(ref.url)) return ref;
        const title = titleFromWikipediaUrl(ref.url) ?? ref.title;
        const extract = extracts.get(title);
        if (!extract) {
            return { ...ref, snippetVerified: false, fetchedAt: Date.now() };
        }
        return {
            ...ref,
            snippet: extract.slice(0, 400),
            snippetVerified: true,
            fetchedAt: Date.now(),
        };
    });
}

/** Clear in-memory extract cache (tests). */
export function clearWikipediaExtractCache(): void {
    extractCache.clear();
}
