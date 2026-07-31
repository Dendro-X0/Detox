import { describe, expect, it } from 'vitest';
import {
    emptyTopicVerdict,
    verdictFromTopicClassification,
} from '../../src/core/filtering/topic-classifier-policy';
import { DEFAULT_NEWS_DIET_POLICY } from '../../src/core/filtering/topic-types';
import { mergeClassifyResults } from '../../src/core/runtime/merge-classify-results';
import { TOPIC_CLASSIFIER_DETECTOR_ID } from '../../src/core/runtime/constants';

describe('topic classifier policy (Spike 3)', () => {
    it('blocks world-affairs under default news diet', () => {
        const verdict = verdictFromTopicClassification(
            {
                primaryTopic: 'world-affairs',
                confidence: 0.42,
                scores: { 'world-affairs': 0.42 },
                method: 'd1-embeddings',
            },
            DEFAULT_NEWS_DIET_POLICY
        );
        expect(verdict?.matched).toBe(true);
        expect(verdict?.labelId).toBe('world-affairs');
        expect(verdict?.detectorId).toBe(TOPIC_CLASSIFIER_DETECTOR_ID);
    });

    it('allows tech under default news diet even when classified', () => {
        const verdict = verdictFromTopicClassification(
            {
                primaryTopic: 'tech',
                confidence: 0.5,
                scores: { tech: 0.5 },
                method: 'd1-embeddings',
            },
            DEFAULT_NEWS_DIET_POLICY
        );
        expect(verdict).toBeNull();
    });

    it('does not block unknown topic', () => {
        const verdict = verdictFromTopicClassification(
            {
                primaryTopic: 'unknown',
                confidence: 0.2,
                scores: {},
                method: 'd1-embeddings',
            },
            DEFAULT_NEWS_DIET_POLICY
        );
        expect(verdict).toBeNull();
    });

    it('emptyTopicVerdict is non-matching', () => {
        expect(emptyTopicVerdict().matched).toBe(false);
    });

    it('merge prefers topic badge when topic matches alongside noise', () => {
        const primary = [
            {
                id: 'a',
                matched: true,
                score: 0.95,
                labelId: 'engagement-hook',
                detectorId: 'behavior-signals',
            },
        ];
        const supplemental = [
            {
                id: 'a',
                matched: true,
                score: 0.38,
                labelId: 'world-affairs',
                detectorId: TOPIC_CLASSIFIER_DETECTOR_ID,
            },
        ];
        const merged = mergeClassifyResults(primary, supplemental);
        expect(merged[0]?.matched).toBe(true);
        expect(merged[0]?.labelId).toBe('world-affairs');
        expect(merged[0]?.detectorId).toBe(TOPIC_CLASSIFIER_DETECTOR_ID);
    });
});
