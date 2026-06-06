import { i18nMessage } from '../../../i18n/localize';
import type { Claim } from './types';

const STATISTIC_PATTERN = /\b\d+(\.\d+)?%|\b\d{1,3}(,\d{3})+\b|\$\d+/;
const FACTUAL_CUE_PATTERN = /\b(study|report|according to|data shows|official|percent|million|billion)\b/i;

export function runT0Heuristics(text: string, claims: readonly Claim[]): readonly string[] {
    const notes: string[] = [];
    if (text.trim().length < 40) {
        notes.push(i18nMessage('authenticity.notes.selectionShort'));
    }
    if (STATISTIC_PATTERN.test(text)) {
        notes.push(i18nMessage('authenticity.notes.hasStatistics'));
    }
    if (FACTUAL_CUE_PATTERN.test(text) && !/\bhttp/i.test(text)) {
        notes.push(i18nMessage('authenticity.notes.factualWithoutLinks'));
    }
    if (claims.length === 0) {
        notes.push(i18nMessage('authenticity.notes.noClaims'));
    }
    return notes;
}

export function extractClaimsFromText(text: string, maxClaims: number): readonly Claim[] {
    const sentences = text
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 24);

    const claims: Claim[] = [];
    for (const sentence of sentences) {
        if (claims.length >= maxClaims) break;
        const type = classifyClaimType(sentence);
        if (type === 'opinion' && !STATISTIC_PATTERN.test(sentence) && !FACTUAL_CUE_PATTERN.test(sentence)) {
            continue;
        }
        claims.push({
            id: `claim-${claims.length + 1}`,
            text: sentence.slice(0, 500),
            type,
        });
    }

    if (claims.length === 0 && text.trim().length >= 24) {
        claims.push({
            id: 'claim-1',
            text: text.trim().slice(0, 500),
            type: 'unknown',
        });
    }

    return claims;
}

function classifyClaimType(sentence: string): Claim['type'] {
    if (/\b(will|going to|expect|predict)\b/i.test(sentence)) return 'prediction';
    if (/\b(i think|in my opinion|imo|feel that|should)\b/i.test(sentence)) return 'opinion';
    if (STATISTIC_PATTERN.test(sentence) || FACTUAL_CUE_PATTERN.test(sentence)) return 'factual';
    return 'unknown';
}

export function buildSearchQueryForClaim(claim: Claim): string {
    const cleaned = claim.text.replace(/\s+/g, ' ').trim();
    return cleaned.length > 120 ? `${cleaned.slice(0, 120)}` : cleaned;
}
