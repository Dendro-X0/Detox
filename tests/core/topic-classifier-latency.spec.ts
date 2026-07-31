// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    auditTopicCorpusAsync,
    type TopicCorpus,
} from '../../src/core/filtering/topic-audit-engine';
import { DEFAULT_NEWS_DIET_POLICY } from '../../src/core/filtering/topic-types';
import {
    createD1TopicClassifierWithPromptEmbeddings,
    promptEmbeddingsFromSnapshot,
    type TopicCentroidsSnapshot,
} from '../../src/core/filtering/topic-embedding-classifier';
import promptSnapshot from '../../src/mods/detectors/topic-classifier/prompt-embeddings.snapshot.json';

const corpusPath = join(import.meta.dirname, '../fixtures/filtering/topic-corpus.json');
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as TopicCorpus;
const cacheDir = join(import.meta.dirname, '../../.cache/transformers');

const MAX_P95_MS = 80;
const MAX_TECH_FALSE_BLOCK_RATE = 0.05;

function percentile(values: readonly number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[Math.max(0, index)]!;
}

describe('topic classifier latency (Spike 3)', () => {
    it(
        'warm p95 per unit is under 80ms and FP gates pass on holdout corpus',
        async () => {
            const snapshot = promptSnapshot as TopicCentroidsSnapshot;
            const classifier = await createD1TopicClassifierWithPromptEmbeddings({
                promptEmbeddings: promptEmbeddingsFromSnapshot(snapshot),
                modelId: snapshot.modelId,
                cacheDir,
                threshold: snapshot.threshold,
            });

            // Warmup
            await classifier.classify(corpus.samples[0]!.text);

            const timings: number[] = [];
            for (const sample of corpus.samples) {
                const start = performance.now();
                await classifier.classify(sample.text);
                timings.push(performance.now() - start);
            }

            const p95 = percentile(timings, 95);
            expect(p95).toBeLessThanOrEqual(MAX_P95_MS);

            const report = await auditTopicCorpusAsync(
                corpus,
                classifier.classify,
                'd1-embeddings',
                DEFAULT_NEWS_DIET_POLICY
            );

            expect(report.techFalseBlockRate).toBeLessThanOrEqual(MAX_TECH_FALSE_BLOCK_RATE);
            expect(report.policyFalsePositives.length).toBe(0);
        },
        300_000
    );
});
