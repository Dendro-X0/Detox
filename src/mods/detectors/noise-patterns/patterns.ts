import type { Verdict } from '../../../core/types/verdict';
import { BOTHER_KEYWORD_MAP } from '../../../core/types/bother-keywords';
import { scoreFromKeywordWeight } from '../../../core/rules/keyword-score';
import { weightedKeywordHits } from '../../../core/rules/keyword-match';
import { DEFAULT_LABEL_ID, NOISE_PATTERNS_DETECTOR_ID } from '../constants';

export type NoisePatternCategory = 'promo' | 'outrage' | 'engagement-bait';

const CATEGORY_LABELS: Record<NoisePatternCategory, string> = {
    promo: 'promo',
    outrage: 'outrage',
    'engagement-bait': 'engagement-bait',
};

/** Extra patterns beyond user block lists — catches common feed noise phrasing. */
const EXTRA_PATTERNS_BY_CATEGORY: Record<NoisePatternCategory, readonly string[]> = {
    promo: ['% off', 'limited time only', 'sign up now', 'giveaway'],
    outrage: ['meltdown', 'clown show', 'peak clown'],
    'engagement-bait': ['mind blown', 'i was today years old', 'let that sink in'],
};

const PATTERNS_BY_CATEGORY: Record<NoisePatternCategory, readonly string[]> = {
    promo: [...BOTHER_KEYWORD_MAP.spam, ...EXTRA_PATTERNS_BY_CATEGORY.promo],
    outrage: [...BOTHER_KEYWORD_MAP.outrage, ...EXTRA_PATTERNS_BY_CATEGORY.outrage],
    'engagement-bait': [
        ...BOTHER_KEYWORD_MAP['engagement-bait'],
        ...EXTRA_PATTERNS_BY_CATEGORY['engagement-bait'],
    ],
};

export function classifyNoisePatterns(text: string, threshold: number): Verdict {
    let best: Verdict = {
        matched: false,
        score: 0,
        labelId: DEFAULT_LABEL_ID,
        detectorId: NOISE_PATTERNS_DETECTOR_ID,
    };

    for (const category of Object.keys(PATTERNS_BY_CATEGORY) as NoisePatternCategory[]) {
        const keywords = PATTERNS_BY_CATEGORY[category];
        const weight = weightedKeywordHits(text, keywords);
        if (weight <= 0) continue;

        const score = scoreFromKeywordWeight(weight);
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
