import { describe, expect, it } from 'vitest';
import {
    blockReasonLabelKey,
    formatBlockReasonLabel,
    formatBlockReasonSummary,
} from '../../src/core/filtering/format-block-reason';

describe('format-block-reason', () => {
    const t = (key: string, values?: Readonly<Record<string, string | number>>) => {
        const map: Record<string, string> = {
            'filterReasons.labels.noise': 'Noise',
            'filterReasons.labels.clickbait': 'Clickbait',
            'filterReasons.labels.world-affairs': 'World affairs',
            'filterReasons.labels.engagement-hook': 'Engagement hook',
            'filterReasons.withAlso': '{{primary}} · also {{also}}',
        };
        let out = map[key] ?? key;
        if (values) {
            for (const [k, v] of Object.entries(values)) {
                out = out.replace(`{{${k}}}`, String(v));
            }
        }
        return out;
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

    it('appends secondary noise label when topic is primary (P1-L2)', () => {
        expect(
            formatBlockReasonSummary(
                {
                    labelId: 'world-affairs',
                    score: 0.42,
                    secondaryReasons: [
                        {
                            labelId: 'engagement-hook',
                            detectorId: 'behavior-signals',
                            score: 0.9,
                        },
                    ],
                },
                t
            )
        ).toBe('World affairs · 42% · also Engagement hook');
    });
});
