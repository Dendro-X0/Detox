import type { SourceReference } from './types';

const DEFAULT_TRUSTED_SUFFIXES = ['.gov', '.edu', '.int'];

export function isUrlAllowed(
    url: string,
    allowedUrls: ReadonlySet<string>,
    extraDomains: readonly string[]
): boolean {
    if (allowedUrls.has(url)) return true;
    try {
        const host = new URL(url).hostname.toLowerCase();
        for (const suffix of DEFAULT_TRUSTED_SUFFIXES) {
            if (host.endsWith(suffix)) return true;
        }
        for (const domain of extraDomains) {
            const normalized = domain.trim().toLowerCase().replace(/^www\./, '');
            if (host === normalized || host.endsWith(`.${normalized}`)) return true;
        }
    } catch {
        return false;
    }
    return allowedUrls.has(url);
}

export function filterReferencesToAllowlist(
    references: readonly SourceReference[],
    allowedUrls: ReadonlySet<string>,
    extraDomains: readonly string[]
): readonly SourceReference[] {
    return references.filter((ref) => isUrlAllowed(ref.url, allowedUrls, extraDomains));
}

export function stripModelUrlsFromJson<T extends Record<string, unknown>>(
    payload: T,
    allowedUrls: ReadonlySet<string>
): T {
    const clone = { ...payload };
    if (typeof clone.url === 'string' && !allowedUrls.has(clone.url)) {
        delete clone.url;
    }
    if (Array.isArray(clone.referenceIds)) {
        return clone;
    }
    return clone;
}
