import type { AdaptationPageContext } from '../adaptation/page-context';
import { buildBrowsingModePatch } from '../modes/browsing-modes';
import { getThresholdForHost } from '../policy/policy-store';
import { PRESET_THRESHOLDS, type PolicyPreset } from '../types/policy';

/** Hosts where promo/bait heuristics are noisy — use a conservative default threshold. */
export const BUILTIN_NON_SOCIAL_HOST_THRESHOLDS: Readonly<Record<string, number>> = {
    'open.spotify.com': 0.72,
    'music.apple.com': 0.72,
    'music.youtube.com': 0.72,
    'listen.tidal.com': 0.72,
    'deezer.com': 0.72,
    'rateyourmusic.com': 0.72,
    'discogs.com': 0.72,
    'last.fm': 0.72,
    'metacritic.com': 0.72,
    'genius.com': 0.72,
    'allmusic.com': 0.72,
    'bandcamp.com': 0.72,
};

function normalizeHost(hostname: string): string {
    return hostname.trim().toLowerCase().replace(/^www\./, '');
}

function builtinThresholdForHost(hostname: string): number | undefined {
    const host = normalizeHost(hostname);
    const direct = BUILTIN_NON_SOCIAL_HOST_THRESHOLDS[host];
    if (direct !== undefined) return direct;

    for (const [siteHost, threshold] of Object.entries(BUILTIN_NON_SOCIAL_HOST_THRESHOLDS)) {
        if (host === siteHost || host.endsWith(`.${siteHost}`)) {
            return threshold;
        }
    }
    return undefined;
}

/**
 * Supplementary detectors (noise patterns, behavior signals) target feed-style promo/bait.
 * Skip them when no consumer feed context is detected (music players, reviews, docs, etc.).
 */
export function shouldApplySupplementaryDetectors(
    pageContexts: readonly AdaptationPageContext[] | null | undefined
): boolean {
    return Boolean(pageContexts && pageContexts.length > 0);
}

/** Effective classification threshold for a page, including built-in non-social host defaults. */
export function resolveClassificationThreshold(hostname: string): number {
    const userThreshold = getThresholdForHost(hostname);
    const builtin = builtinThresholdForHost(hostname);
    if (builtin === undefined) return userThreshold;
    return Math.max(userThreshold, builtin);
}

/** Audit / offline threshold for a browsing mode on a host (no user per-site overrides). */
export function resolveAuditThreshold(
    preset: PolicyPreset,
    hostname: string
): number {
    const presetThreshold = PRESET_THRESHOLDS[preset];
    const builtin = builtinThresholdForHost(hostname);
    if (builtin === undefined) return presetThreshold;
    return Math.max(presetThreshold, builtin);
}

export function auditThresholdForMode(
    mode: 'focus' | 'research',
    hostname: string
): number {
    const preset = buildBrowsingModePatch(mode).policy.preset;
    return resolveAuditThreshold(preset, hostname);
}

export function isBuiltinNonSocialHost(hostname: string): boolean {
    return builtinThresholdForHost(hostname) !== undefined;
}
