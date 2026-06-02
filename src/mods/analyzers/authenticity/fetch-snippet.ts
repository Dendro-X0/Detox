import type { AuthenticitySettings } from './settings';
import type { SourceReference } from './types';
import { isUrlAllowed } from './url-allowlist';

function stripHtml(html: string): string {
    const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
    const text = withoutScripts.replace(/<[^>]+>/g, ' ');
    return text.replace(/\s+/g, ' ').trim();
}

function snippetOverlap(fetched: string, snippet: string): boolean {
    const normalizedFetched = fetched.toLowerCase();
    const normalizedSnippet = snippet.toLowerCase().trim();
    if (normalizedSnippet.length < 24) return true;
    const probe = normalizedSnippet.slice(0, Math.min(80, normalizedSnippet.length));
    return normalizedFetched.includes(probe);
}

export async function enrichReferenceFromFetch(
    reference: SourceReference,
    allowedUrls: ReadonlySet<string>,
    settings: AuthenticitySettings
): Promise<SourceReference> {
    if (!isUrlAllowed(reference.url, allowedUrls, settings.extraAllowedDomains)) {
        return { ...reference, snippetVerified: false };
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
        const verified = snippetOverlap(excerpt, reference.snippet || excerpt.slice(0, 120));
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
