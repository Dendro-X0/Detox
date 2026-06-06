/**
 * Script-first ClaimReview gather via Google Fact Check Tools API (T2).
 * Requires user-supplied API key — structured public fact-check metadata only.
 */
import type { SourceReference } from './types';

export const FACT_CHECK_API_BASE = 'https://factchecktools.googleapis.com/v1alpha1/claims:search';

export type ClaimReviewSearchHit = {
    readonly url: string;
    readonly title: string;
    readonly description: string;
    readonly textualRating: string;
    readonly publisher: string;
};

type ClaimReviewEntry = {
    readonly url?: string;
    readonly title?: string;
    readonly textualRating?: string;
    readonly publisher?: { readonly name?: string };
};

type ClaimReviewClaim = {
    readonly text?: string;
    readonly claimReview?: readonly ClaimReviewEntry[];
};

export function parseClaimReviewSearchBody(
    body: { readonly claims?: readonly ClaimReviewClaim[] },
    limit: number
): readonly ClaimReviewSearchHit[] {
    const claims = (body.claims ?? []) as readonly ClaimReviewClaim[];
    const hits: ClaimReviewSearchHit[] = [];

    for (const claim of claims) {
        for (const review of claim.claimReview ?? []) {
            if (!review.url) continue;
            const publisher = review.publisher?.name ?? 'Fact check';
            const rating = review.textualRating ?? 'Review';
            const title = review.title ?? claim.text ?? review.url;
            hits.push({
                url: review.url,
                title,
                description: `${publisher}: ${rating}`,
                textualRating: rating,
                publisher,
            });
            if (hits.length >= limit) return hits;
        }
    }

    return hits;
}

export async function searchClaimReview(
    query: string,
    apiKey: string,
    limit: number,
    fetchImpl: typeof fetch = fetch
): Promise<readonly ClaimReviewSearchHit[]> {
    const key = apiKey.trim();
    if (!key) return [];

    const params = new URLSearchParams({
        query,
        key,
        pageSize: String(Math.min(limit, 10)),
        languageCode: 'en',
    });
    const response = await fetchImpl(`${FACT_CHECK_API_BASE}?${params.toString()}`);
    if (!response.ok) return [];

    const body = (await response.json()) as { readonly claims?: readonly ClaimReviewClaim[] };
    return parseClaimReviewSearchBody(body, limit);
}

export function isClaimReviewPublisherUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
        return false;
    }
}

/** Enrich ClaimReview API hits — snippets are structured; mark verified when rating present. */
export function enrichClaimReviewReferences(
    references: readonly SourceReference[],
    hitsByUrl: ReadonlyMap<string, ClaimReviewSearchHit>
): readonly SourceReference[] {
    return references.map((ref) => {
        const hit = hitsByUrl.get(ref.url);
        if (!hit) return ref;
        return {
            ...ref,
            title: hit.title,
            snippet: hit.description.slice(0, 400),
            snippetVerified: hit.textualRating.length > 0,
            fetchedAt: Date.now(),
            stance: mapRatingToStance(hit.textualRating),
        };
    });
}

function mapRatingToStance(rating: string): SourceReference['stance'] {
    const normalized = rating.toLowerCase();
    if (normalized.includes('false') || normalized.includes('incorrect') || normalized.includes('misleading')) {
        return 'contradicts';
    }
    if (normalized.includes('true') || normalized.includes('correct') || normalized.includes('accurate')) {
        return 'supports';
    }
    if (normalized.includes('part') || normalized.includes('mixed') || normalized.includes('context')) {
        return 'neutral';
    }
    return 'unknown';
}

/** Clear test state — no persistent cache in this module. */
export function clearClaimReviewCache(): void {
    /* no-op — reserved for future session cache */
}
