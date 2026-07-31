import { describe, expect, it } from 'vitest';
import {
    blockReasonLabelKey,
    formatBlockReasonLabel,
    formatBlockReasonSummary,
} from '../../src/core/filtering/format-block-reason';

describe('format-block-reason', () => {
    const t = (key: string) => {
        const map: Record<string, string> = {
            'filterReasons.labels.noise': 'Noise',
            'filterReasons.labels.clickbait': 'Clickbait',
        };
        return map[key] ?? key;
    };

    it('maps unknown labels to filterReasons key', () => {
        expect(blockReasonLabelKey('clickbait')).toBe('filterReasons.labels.clickbait');
        expect(blockReasonLabelKey('noise')).toBe('filterReasons.labels.noise');
    });

    it('formats label with fallback for missing translations', () => {
        expect(formatBlockReasonLabel('clickbait', t)).toBe('Clickbait');
        expect(formatBlockReasonLabel('custom-label', t)).toBe('custom-label');
    });

    it('formats summary with score percent', () => {
        expect(
            formatBlockReasonSummary({ labelId: 'clickbait', score: 0.923 }, t)
        ).toBe('Clickbait · 92%');
    });
});
