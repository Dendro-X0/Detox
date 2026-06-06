import { describe, expect, it } from 'vitest';
import { scoreFromKeywordHits, scoreFromKeywordWeight } from '../../src/core/rules/keyword-score';
import { weightedKeywordHits } from '../../src/core/rules/keyword-match';
import { BOTHER_KEYWORD_MAP } from '../../src/core/types/bother-keywords';
import { classifyNoisePatterns } from '../../src/mods/detectors/noise-patterns/patterns';

const FOCUS_KEYWORDS = [
    ...BOTHER_KEYWORD_MAP.outrage,
    ...BOTHER_KEYWORD_MAP.spam,
    ...BOTHER_KEYWORD_MAP['engagement-bait'],
];

describe('heuristic scoring', () => {
    it('requires phrase or multiple hits at balanced threshold (0.5)', () => {
        expect(scoreFromKeywordHits('This is absolutely unhinged behavior online.', FOCUS_KEYWORDS)).toBeGreaterThanOrEqual(0.5);
        expect(scoreFromKeywordHits('People are furious today.', FOCUS_KEYWORDS)).toBeLessThan(0.5);
        expect(
            scoreFromKeywordHits('People are furious and outraged today.', FOCUS_KEYWORDS)
        ).toBeGreaterThanOrEqual(0.5);
    });

    it('matches single-token spam at strict threshold (0.3)', () => {
        const score = scoreFromKeywordHits('Get this limited offer today.', FOCUS_KEYWORDS);
        expect(score).toBeGreaterThanOrEqual(0.3);
    });

    it('avoids substring false positives on short tokens', () => {
        expect(weightedKeywordHits('symbolic logic course notes', ['lol'])).toBe(0);
        expect(weightedKeywordHits('skill building workshop', ['kill'])).toBe(0);
    });

    it('weights multi-word phrases higher than lone tokens', () => {
        const phraseWeight = weightedKeywordHits('Sponsored post with buy now CTA', ['buy now']);
        const tokenWeight = weightedKeywordHits('People are furious', ['furious']);
        expect(phraseWeight).toBeGreaterThan(tokenWeight);
    });

    it('noise patterns catch supplemental promo phrasing', () => {
        const verdict = classifyNoisePatterns('Flash sale — 50% off today only!', 0.5);
        expect(verdict.matched).toBe(true);
        expect(verdict.labelId).toBe('promo');
    });

    it('scoreFromKeywordWeight caps at 1', () => {
        expect(scoreFromKeywordWeight(10)).toBe(1);
    });

    it('matches E2E fixture copy at balanced threshold with default outrage keywords', () => {
        const keywords = ['outrageous', 'furious', 'outraged'];
        const score = scoreFromKeywordHits(
            'This is an outrageous scandal that has everyone furious online today. People are sharing angry rants about the decision and demanding immediate change from leadership teams worldwide.',
            keywords
        );
        expect(score).toBeGreaterThanOrEqual(0.5);
    });
});

describe('focus mode keyword coverage', () => {
    it('matches typical spam comment', () => {
        expect(scoreFromKeywordHits('Use code SAVE20 for a free trial — link in bio', FOCUS_KEYWORDS)).toBeGreaterThanOrEqual(0.5);
    });

    it('matches engagement bait headline', () => {
        expect(
            scoreFromKeywordHits("You won't believe what happens next in this shocking story.", FOCUS_KEYWORDS)
        ).toBeGreaterThanOrEqual(0.5);
    });

    it('does not match neutral discussion', () => {
        expect(
            scoreFromKeywordHits(
                'We reviewed the quarterly results and the team shared thoughtful feedback on next steps.',
                FOCUS_KEYWORDS
            )
        ).toBeLessThan(0.5);
    });
});
