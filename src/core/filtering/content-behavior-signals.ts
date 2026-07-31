/**
 * Language-agnostic text behavior signals — no keyword lists, no ML training.
 * Combines weak heuristics (caps bursts, punctuation, emoji density, URL spam,
 * repetition, engagement hooks) the way lightweight spam filters work without models.
 */

export type BehaviorSignalId =
    | 'caps-shouting'
    | 'punctuation-burst'
    | 'emoji-spam'
    | 'url-heavy'
    | 'repetition'
    | 'engagement-hook'
    | 'listicle-structure'
    | 'symbol-noise';

export type BehaviorSignalHit = {
    readonly id: BehaviorSignalId;
    readonly score: number;
};

const EMOJI_RE =
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu;
const URL_RE = /https?:\/\/|www\.\S+/gi;
const WORD_RE = /[\p{L}\p{N}']+/gu;
const ALL_CAPS_WORD_RE = /\b[A-Z]{3,}\b/g;
/** Letter/bang repetition — excludes `.` so technical ellipses (`....`) do not count as spam. */
const REPEAT_CHAR_RE = /([!?\p{L}])\1{3,}/iu;
const REPEAT_WORD_RE = /\b([\p{L}\p{N}]{2,})\b(?:.*\b\1\b){2,}/iu;
const LISTICLE_RE = /^\s*\d{1,3}[.)]\s+\S+/;
const ENGAGEMENT_HOOK_RE =
    /(?:\?\?+|\!\!+|you\s+(?:won'?t|need\s+to)\s+believe|\d+\s+(?:reasons|ways|things|secrets|hacks|tips)\b|what\s+happened\s+next|doctors?\s+hate|one\s+weird\s+trick)/i;

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

function countMatches(text: string, re: RegExp): number {
    return [...text.matchAll(re)].length;
}

function scoreCapsShouting(text: string): number {
    const words = text.match(WORD_RE) ?? [];
    if (words.length < 3) return 0;
    const capsWords = text.match(ALL_CAPS_WORD_RE) ?? [];
    const ratio = capsWords.length / words.length;
    if (ratio < 0.35) return 0;
    return clamp01((ratio - 0.35) / 0.45);
}

function scorePunctuationBurst(text: string): number {
    const bursts = countMatches(text, /[!?]{2,}/g);
    if (bursts === 0) return 0;
    const lenFactor = text.length <= 120 ? 1 : clamp01(120 / text.length);
    return clamp01(bursts * 0.35 * lenFactor);
}

function scoreEmojiSpam(text: string): number {
    const emojis = text.match(EMOJI_RE) ?? [];
    if (emojis.length === 0) return 0;
    const density = emojis.length / Math.max(text.length, 1);
    if (density < 0.04) return 0;
    return clamp01((density - 0.04) / 0.12);
}

function scoreUrlHeavy(text: string): number {
    const urls = countMatches(text, URL_RE);
    if (urls >= 2) return clamp01(0.55 + urls * 0.15);
    const urlChars = (text.match(URL_RE) ?? []).join('').length;
    const ratio = urlChars / Math.max(text.length, 1);
    if (ratio < 0.2) return 0;
    return clamp01((ratio - 0.2) / 0.35);
}

/** Unique-token ratio — high in substantive tech/medical prose even when one term repeats. */
function lexicalDiversity(text: string): number {
    const words = (text.match(WORD_RE) ?? []).map((w) => w.toLowerCase());
    if (words.length < 6) return 0;
    return new Set(words).size / words.length;
}

function looksLikeSubstantiveDiscourse(text: string): boolean {
    const words = text.match(WORD_RE) ?? [];
    if (words.length < 24 || text.length < 140) return false;
    return lexicalDiversity(text) >= 0.48;
}

function scoreRepetition(text: string): number {
    const substantive = looksLikeSubstantiveDiscourse(text);

    if (REPEAT_CHAR_RE.test(text)) {
        return substantive ? 0.28 : 0.75;
    }

    if (REPEAT_WORD_RE.test(text)) {
        if (substantive) return 0;
        if (text.length >= 100 && lexicalDiversity(text) >= 0.42) return 0.3;
        return 0.65;
    }

    return 0;
}

function scoreEngagementHook(text: string): number {
    if (!ENGAGEMENT_HOOK_RE.test(text)) return 0;
    return text.length <= 160 ? 0.72 : 0.55;
}

function scoreListicleStructure(text: string): number {
    if (!LISTICLE_RE.test(text.trim())) return 0;
    return 0.48;
}

function scoreSymbolNoise(text: string): number {
    if (text.length < 24) return 0;
    let noisy = 0;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text[i]!;
        if (!/[\p{L}\p{N}\s]/u.test(ch)) noisy += 1;
    }
    const ratio = noisy / text.length;
    if (ratio < 0.18) return 0;
    return clamp01((ratio - 0.18) / 0.22);
}

/** Individual signal scores for explainability. */
export function analyzeTextBehavior(text: string): readonly BehaviorSignalHit[] {
    const trimmed = text.trim();
    if (trimmed.length < 8) return [];

    const scores: BehaviorSignalHit[] = [
        { id: 'caps-shouting', score: scoreCapsShouting(trimmed) },
        { id: 'punctuation-burst', score: scorePunctuationBurst(trimmed) },
        { id: 'emoji-spam', score: scoreEmojiSpam(trimmed) },
        { id: 'url-heavy', score: scoreUrlHeavy(trimmed) },
        { id: 'repetition', score: scoreRepetition(trimmed) },
        { id: 'engagement-hook', score: scoreEngagementHook(trimmed) },
        { id: 'listicle-structure', score: scoreListicleStructure(trimmed) },
        { id: 'symbol-noise', score: scoreSymbolNoise(trimmed) },
    ];

    return scores.filter((hit) => hit.score > 0);
}

export type BehaviorCombineOptions = {
    readonly threshold: number;
    /** Boost when DOM marks content as sponsored / ad-like (0–1). */
    readonly domBoost?: number;
};

export type BehaviorClassifyResult = {
    readonly matched: boolean;
    readonly score: number;
    readonly labelId: string;
    readonly hits: readonly BehaviorSignalHit[];
};

function labelFromTopHit(hits: readonly BehaviorSignalHit[]): string {
    if (hits.length === 0) return 'behavior';
    const sorted = [...hits].sort((a, b) => b.score - a.score);
    return sorted[0]!.id;
}

/**
 * Combine weak signals — requires corroboration (2+ signals) unless one is very strong,
 * or a single moderate signal plus DOM sponsorship context.
 */
export function classifyTextBehavior(
    text: string,
    options: BehaviorCombineOptions
): BehaviorClassifyResult {
    const hits = analyzeTextBehavior(text);
    if (hits.length === 0) {
        return { matched: false, score: 0, labelId: 'behavior', hits: [] };
    }

    const sorted = [...hits].sort((a, b) => b.score - a.score);
    const top = sorted[0]!.score;
    const second = sorted[1]?.score ?? 0;
    const avgTop2 = (top + second) / 2;
    const domBoost = options.domBoost ?? 0;
    let combined = Math.max(top * 0.92, avgTop2 * 0.88) + domBoost;
    combined = clamp01(combined);

    const topId = sorted[0]!.id;
    const corroboratingStrong = hits.filter(
        (h) => h.score >= 0.45 && h.id !== 'repetition' && h.id !== 'listicle-structure'
    ).length;
    const soloStrongEligible = topId !== 'repetition' && topId !== 'listicle-structure';
    const matched =
        combined >= options.threshold &&
        (corroboratingStrong >= 2 ||
            (top >= 0.72 && soloStrongEligible) ||
            (domBoost > 0 && top >= 0.42 && combined >= options.threshold));

    return {
        matched,
        score: combined,
        labelId: labelFromTopHit(hits),
        hits,
    };
}
