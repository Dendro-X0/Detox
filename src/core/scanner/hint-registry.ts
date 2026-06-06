import { REDDIT_HINT_PACK } from './hint-packs/reddit';
import { YOUTUBE_HINT_PACK } from './hint-packs/youtube';
import { mergeSiteHints, type SiteHintPack, type SiteScanHints } from './site-hints';

export const BUNDLED_HINT_PACKS: readonly SiteHintPack[] = [
    REDDIT_HINT_PACK,
    YOUTUBE_HINT_PACK,
];

export type HintModGate = (modId: string) => boolean;

/**
 * Resolve merged hints for a hostname. Returns null when no enabled packs match.
 * Scanner behavior is unchanged when null (zero hints).
 */
export function resolveSiteHints(
    hostname: string,
    isModEnabled: HintModGate = () => true
): SiteScanHints | null {
    const matched: SiteScanHints[] = [];

    for (const pack of BUNDLED_HINT_PACKS) {
        if (!pack.hostPattern.test(hostname)) continue;
        if (!isModEnabled(pack.modId)) continue;
        matched.push(pack.hints);
    }

    if (matched.length === 0) return null;
    return mergeSiteHints(matched);
}

export function resolveActiveHintPackIds(
    hostname: string,
    isModEnabled: HintModGate = () => true
): readonly string[] {
    const ids: string[] = [];
    for (const pack of BUNDLED_HINT_PACKS) {
        if (!pack.hostPattern.test(hostname)) continue;
        if (!isModEnabled(pack.modId)) continue;
        ids.push(pack.id);
    }
    return ids;
}

export function getHintPackById(id: string): SiteHintPack | undefined {
    return BUNDLED_HINT_PACKS.find((pack) => pack.id === id);
}
