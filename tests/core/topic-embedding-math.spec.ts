import { describe, expect, it } from 'vitest';
import {
    classifyTopicFromCentroids,
    cosineSimilarity,
    meanEmbedding,
    normalizeEmbedding,
    type EmbeddingVector,
} from '../../src/core/filtering/topic-embedding-classifier';
import type { TopicId } from '../../src/core/filtering/topic-types';

function vec(values: number[]): EmbeddingVector {
    return normalizeEmbedding(new Float32Array(values));
}

describe('topic embedding math (D1)', () => {
    it('cosineSimilarity returns 1 for identical normalized vectors', () => {
        const a = vec([1, 0, 0]);
        expect(cosineSimilarity(a, a)).toBeCloseTo(1, 5);
    });

    it('cosineSimilarity returns 0 for orthogonal vectors', () => {
        const a = vec([1, 0, 0]);
        const b = vec([0, 1, 0]);
        expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });

    it('meanEmbedding averages prompt vectors', () => {
        const a = vec([1, 0]);
        const b = vec([0, 1]);
        const centroid = meanEmbedding([a, b]);
        expect(centroid[0]).toBeCloseTo(0.707, 2);
        expect(centroid[1]).toBeCloseTo(0.707, 2);
    });

    it('classifyTopicFromCentroids picks nearest centroid above threshold', () => {
        const centroids: Partial<Record<TopicId, EmbeddingVector>> = {
            tech: vec([1, 0, 0]),
            'world-affairs': vec([0, 1, 0]),
        };
        const techLike = vec([0.95, 0.1, 0]);
        const result = classifyTopicFromCentroids(techLike, centroids, 0.5);
        expect(result.primaryTopic).toBe('tech');
        expect(result.method).toBe('d1-embeddings');
    });

    it('classifyTopicFromCentroids returns unknown below threshold', () => {
        const centroids: Partial<Record<TopicId, EmbeddingVector>> = {
            tech: vec([1, 0]),
        };
        const unrelated = vec([0, 1]);
        const result = classifyTopicFromCentroids(unrelated, centroids, 0.8);
        expect(result.primaryTopic).toBe('unknown');
    });
});
