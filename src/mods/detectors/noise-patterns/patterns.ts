import type { Verdict } from '../../../core/types/verdict';
import { BOTHER_KEYWORD_MAP } from '../../../core/types/bother-keywords';
import { scoreFromKeywordHits } from '../../../core/rules/keyword-score';
import { weightedKeywordHits } from '../../../core/rules/keyword-match';
import { DEFAULT_LABEL_ID, NOISE_PATTERNS_DETECTOR_ID } from '../constants';

import { getMergedAdaptationRules } from '../../../core/adaptation/adaptation-pack-registry';

export type NoisePatternCategory = 'promo' | 'outrage' | 'engagement-bait';

const CATEGORY_LABELS: Record<NoisePatternCategory, string> = {
    promo: 'promo',
    outrage: 'outrage',
    'engagement-bait': 'engagement-bait',
};

/** Extra patterns beyond user block lists — supplemental only; keep narrow to limit false positives. */
const EXTRA_PATTERNS_BY_CATEGORY: Record<NoisePatternCategory, readonly string[]> = {
    promo: ['% off', 'flash sale', 'limited time only', 'sign up now', 'giveaway'],
    outrage: [],
    'engagement-bait': [],
};

const PATTERNS_BY_CATEGORY: Record<NoisePatternCategory, readonly string[]> = {
    promo: [...BOTHER_KEYWORD_MAP.spam, ...EXTRA_PATTERNS_BY_CATEGORY.promo],
    outrage: [...BOTHER_KEYWORD_MAP.outrage, ...EXTRA_PATTERNS_BY_CATEGORY.outrage],
    'engagement-bait': [
        ...BOTHER_KEYWORD_MAP['engagement-bait'],
        ...EXTRA_PATTERNS_BY_CATEGORY['engagement-bait'],
    ],
};

function patternsForCategory(category: NoisePatternCategory): readonly string[] {
    const base = PATTERNS_BY_CATEGORY[category];
    const merged = getMergedAdaptationRules();
    const extra = merged.noisePatterns[category] ?? [];
    if (extra.length === 0) return base;
    return [...new Set([...base, ...extra])];
}

export function classifyNoisePatterns(text: string, threshold: number): Verdict {
    let best: Verdict = {
        matched: false,
        score: 0,
        labelId: DEFAULT_LABEL_ID,
        detectorId: NOISE_PATTERNS_DETECTOR_ID,
    };

    for (const category of Object.keys(PATTERNS_BY_CATEGORY) as NoisePatternCategory[]) {
        const keywords = patternsForCategory(category);
        const weight = weightedKeywordHits(text, keywords);
        if (weight <= 0) continue;

        const score = scoreFromKeywordHits(text, keywords);
        const matched = score >= threshold;
        if (score > best.score) {
            best = {
                matched,
                score,
                labelId: CATEGORY_LABELS[category],
                detectorId: NOISE_PATTERNS_DETECTOR_ID,
            };
        }
    }

    return best;
}
