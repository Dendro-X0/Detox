import type { AuthenticitySettings } from './settings';
import type { SourceReference } from './types';
import {
    fetchWikipediaExtractForUrl,
    isWikipediaArticleUrl,
} from './wikipedia-retrieval';
import { isUrlAllowed } from './url-allowlist';
import { snippetOverlapsFetchedText } from './snippet-verify';

function stripHtmlTags(fragment: string): string {
    return fragment.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extract readable text from HTML using title, meta description, and main/article body. */
export function extractReadableTextFromHtml(html: string, maxChars: number): string {
    const withoutScripts = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

    const titleMatch = withoutScripts.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? stripHtmlTags(titleMatch[1]) : '';

    const metaDescMatch =
        withoutScripts.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
        withoutScripts.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const description = metaDescMatch ? metaDescMatch[1].trim() : '';

    const mainMatch = withoutScripts.match(/<(?:article|main)[^>]*>([\s\S]*?)<\/(?:article|main)>/i);
    const bodyText = mainMatch ? stripHtmlTags(mainMatch[1]) : stripHtmlTags(withoutScripts);

    const combined = [title, description, bodyText].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    return combined.slice(0, maxChars);
}

export { snippetOverlapsFetchedText } from './snippet-verify';

export async function enrichReferenceFromFetch(
    reference: SourceReference,
    allowedUrls: ReadonlySet<string>,
    settings: AuthenticitySettings
): Promise<SourceReference> {
    if (!isUrlAllowed(reference.url, allowedUrls, settings.extraAllowedDomains)) {
        return { ...reference, snippetVerified: false, fetchedAt: Date.now() };
    }

    if (isWikipediaArticleUrl(reference.url)) {
        try {
            const extract = await fetchWikipediaExtractForUrl(reference.url, settings.maxSnippetChars);
            if (!extract) {
                return { ...reference, snippetVerified: false, fetchedAt: Date.now() };
            }
            const verified = snippetOverlapsFetchedText(extract, reference.snippet || extract.slice(0, 120));
            return {
                ...reference,
                snippet: extract.slice(0, 400),
                snippetVerified: verified || extract.length > 0,
                fetchedAt: Date.now(),
            };
        } catch {
            return { ...reference, snippetVerified: false, fetchedAt: Date.now() };
        }
    }

    try {
        const response = await fetch(reference.url, { credentials: 'omit' });
        if (!response.ok) {
            return { ...reference, snippetVerified: false, fetchedAt: Date.now() };
        }
        const contentType = response.headers.get('content-type') ?? '';
        const raw = await response.text();
        const text = contentType.includes('html') ? extractReadableTextFromHtml(raw, settings.maxSnippetChars) : raw;
        const excerpt = text.slice(0, settings.maxSnippetChars);
        const probe = reference.snippet?.trim() || excerpt.slice(0, 120);
        const verified = snippetOverlapsFetchedText(excerpt, probe);
        const displaySnippet = (reference.snippet && verified ? reference.snippet : excerpt).slice(0, 400);
        return {
            ...reference,
            snippet: displaySnippet,
            snippetVerified: verified,
            fetchedAt: Date.now(),
        };
    } catch {
        return { ...reference, snippetVerified: false, fetchedAt: Date.now() };
    }
}
