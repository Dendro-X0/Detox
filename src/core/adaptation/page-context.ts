/** Page context tags for adaptation pack matching (see pack.json `contexts`). */
export type AdaptationPageContext = 'social-feed' | 'news' | 'ecommerce';

export const ADAPTATION_PAGE_CONTEXTS: readonly AdaptationPageContext[] = [
    'social-feed',
    'news',
    'ecommerce',
] as const;

const SOCIAL_HOST_RE =
    /(?:^|\.)(?:twitter|x|reddit|instagram|facebook|tiktok|threads|bsky\.app|mastodon|tumblr|linkedin|discord|pinterest)(?:\.|$)/i;

const NEWS_HOST_RE =
    /(?:^|\.)(?:bbc|cnn|nytimes|reuters|theguardian|apnews|npr|wsj|bloomberg|ft|economist|politico|substack)(?:\.|$)/i;

const ECOMMERCE_HOST_RE =
    /(?:^|\.)(?:amazon|ebay|etsy|shopify|aliexpress|walmart|target|bestbuy)(?:\.|$)/i;

/** Scholarly / reference pages — no consumer context packs should apply. */
const ACADEMIC_HOST_RE =
    /(?:^|\.)(?:arxiv|doi|scholar\.google|researchgate|academia|jstor|springer|sciencedirect|nature|ieee)(?:\.|$)/i;

const NEWS_PATH_RE = /\/(?:news|article|articles|story|stories|politics|world|opinion|live)(?:\/|$)/i;
const ECOMMERCE_PATH_RE = /\/(?:shop|product|products|cart|checkout|store|buy|dp\/|gp\/product)(?:\/|$)/i;
const SOCIAL_PATH_RE = /\/(?:status|comments|r\/|u\/|user\/|post\/|posts\/|feed|home|explore)(?:\/|$)/i;

/**
 * Infer page contexts from URL for adaptation pack gating.
 * Returns empty array on academic/reference hosts or unrecognized pages.
 */
export function detectPageContexts(pageUrl: string): readonly AdaptationPageContext[] {
    let parsed: URL;
    try {
        parsed = new URL(pageUrl);
    } catch {
        return [];
    }

    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (ACADEMIC_HOST_RE.test(host)) {
        return [];
    }

    const contexts = new Set<AdaptationPageContext>();

    if (SOCIAL_HOST_RE.test(host) || SOCIAL_PATH_RE.test(path)) {
        contexts.add('social-feed');
    }
    if (NEWS_HOST_RE.test(host) || NEWS_PATH_RE.test(path)) {
        contexts.add('news');
    }
    if (ECOMMERCE_HOST_RE.test(host) || ECOMMERCE_PATH_RE.test(path)) {
        contexts.add('ecommerce');
    }

    return [...contexts];
}

export function packAppliesToPageContext(
    packContexts: readonly string[] | undefined,
    pageContexts: readonly AdaptationPageContext[] | null
): boolean {
    if (!packContexts || packContexts.length === 0) return true;
    if (!pageContexts || pageContexts.length === 0) return false;
    return packContexts.some((ctx) => pageContexts.includes(ctx as AdaptationPageContext));
}
