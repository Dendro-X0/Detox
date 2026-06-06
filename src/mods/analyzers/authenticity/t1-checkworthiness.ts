import { i18nMessage } from '../../../i18n/localize';
import type { Claim } from './types';

const STATISTIC_PATTERN = /\b\d+(\.\d+)?%|\b\d{1,3}(,\d{3})+\b|\$\d+/;
const FACTUAL_CUE_PATTERN =
    /\b(study|report|according to|data shows|official|percent|million|billion|researchers|scientists)\b/i;
const OPINION_PATTERN = /\b(i think|in my opinion|imo|feel that|should|clearly|obviously)\b/i;
const PREDICTION_PATTERN = /\b(will|going to|expect|predict|by 20\d{2})\b/i;

export type CheckworthinessScore = {
    readonly score: number;
    readonly reasons: readonly string[];
};

export function scoreCheckworthiness(text: string): CheckworthinessScore {
    const normalized = text.trim();
    const reasons: string[] = [];
    let score = 0.15;

    if (normalized.length < 32) {
        return { score: 0.1, reasons: ['Too short for factual verification'] };
    }

    if (STATISTIC_PATTERN.test(normalized)) {
        score += 0.35;
        reasons.push('Contains numbers or statistics');
    }
    if (FACTUAL_CUE_PATTERN.test(normalized)) {
        score += 0.25;
        reasons.push('Uses factual-reporting language');
    }
    if (/\bhttp|www\./i.test(normalized)) {
        score -= 0.15;
        reasons.push('Includes a link in the claim');
    }
    if (OPINION_PATTERN.test(normalized)) {
        score -= 0.25;
        reasons.push('Reads as opinion');
    }
    if (PREDICTION_PATTERN.test(normalized)) {
        score -= 0.1;
        reasons.push('Forward-looking statement');
    }
    if (normalized.length >= 80) {
        score += 0.08;
    }

    return {
        score: Math.max(0, Math.min(1, score)),
        reasons,
    };
}

const T1_MIN_SCORE = 0.35;

export type T1ClaimFilterResult = {
    readonly claims: readonly Claim[];
    readonly notes: readonly string[];
};

/**
 * Ranks claims by local checkworthiness and keeps the top candidates for search/LLM tiers.
 */
export function filterClaimsWithT1(claims: readonly Claim[], maxClaims: number): T1ClaimFilterResult {
    if (claims.length === 0) {
        return { claims: [], notes: [i18nMessage('authenticity.notes.t1NoClaims')] };
    }

    const ranked = claims
        .map((claim) => ({ claim, ...scoreCheckworthiness(claim.text) }))
        .sort((left, right) => right.score - left.score);

    const kept = ranked.filter((entry) => entry.score >= T1_MIN_SCORE).slice(0, maxClaims);
    const selected = kept.length > 0 ? kept : ranked.slice(0, Math.min(1, maxClaims));

    const notes: string[] = [
        i18nMessage('authenticity.notes.t1Ranking', { kept: selected.length, total: claims.length }),
    ];
    if (kept.length === 0 && claims.length > 0) {
        notes.push(i18nMessage('authenticity.notes.t1Fallback'));
    }

    return {
        claims: selected.map((entry) => entry.claim),
        notes,
    };
}
