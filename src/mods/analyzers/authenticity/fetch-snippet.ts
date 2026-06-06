import type { AuthenticitySettings } from './settings';
import type { SourceReference } from './types';
import {
    fetchWikipediaExtractForUrl,
    isWikipediaArticleUrl,
} from './wikipedia-retrieval';
import { isUrlAllowed } from './url-allowlist';
import { snippetOverlapsFetchedText } from './snippet-verify';

function stripHtml(html: string): string {
    const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
    const text = withoutScripts.replace(/<[^>]+>/g, ' ');
    return text.replace(/\s+/g, ' ').trim();
}

export { snippetOverlapsFetchedText } from './snippet-verify';

export async function enrichReferenceFromFetch(
    reference: SourceReference,
    allowedUrls: ReadonlySet<string>,
    settings: AuthenticitySettings
): Promise<SourceReference> {
    if (!isUrlAllowed(reference.url, allowedUrls, settings.extraAllowedDomains)) {
        return { ...reference, snippetVerified: false };
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
            return { ...reference, snippetVerified: false };
        }
        const contentType = response.headers.get('content-type') ?? '';
        const raw = await response.text();
        const text = contentType.includes('html') ? stripHtml(raw) : raw;
        const excerpt = text.slice(0, settings.maxSnippetChars);
        const verified = snippetOverlapsFetchedText(excerpt, reference.snippet || excerpt.slice(0, 120));
        return {
            ...reference,
            snippet: verified ? reference.snippet || excerpt.slice(0, 400) : excerpt.slice(0, 400),
            snippetVerified: verified,
            fetchedAt: Date.now(),
        };
    } catch {
        return { ...reference, snippetVerified: false };
    }
}
