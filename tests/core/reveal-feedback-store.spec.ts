import { describe, expect, it } from 'vitest';
import {
    appendFeedbackRecordToLog,
    computeFeedbackStats,
    type RevealFeedbackRecord,
} from '../../src/core/feedback/reveal-feedback-store';

const sample: RevealFeedbackRecord = {
    id: 'block-1',
    feedback: 'wrong',
    detectorId: 'detector-noise-patterns',
    labelId: 'promo',
    score: 0.8,
    preview: 'FLASH SALE',
    hostname: 'example.com',
    timestamp: 1,
};

describe('reveal-feedback-store', () => {
    it('computes wrong and ok totals', () => {
        const stats = computeFeedbackStats([
            sample,
            { ...sample, id: 'block-2', feedback: 'ok' },
            { ...sample, id: 'block-3', feedback: 'wrong', detectorId: 'detector-behavior-signals' },
        ]);
        expect(stats.wrong).toBe(2);
        expect(stats.ok).toBe(1);
        expect(stats.byDetector['detector-noise-patterns']).toEqual({ wrong: 1, ok: 1 });
        expect(stats.byDetector['detector-behavior-signals']).toEqual({ wrong: 1, ok: 0 });
    });

    it('replaces prior feedback for the same block id', () => {
        const log = appendFeedbackRecordToLog([sample], { ...sample, feedback: 'ok' });
        expect(log).toHaveLength(1);
        expect(log[0]?.feedback).toBe('ok');
    });
});
