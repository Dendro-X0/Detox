// @vitest-environment node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    auditTopicCorpusAsync,
    formatTopicAuditReport,
    type TopicCorpus,
} from '../../src/core/filtering/topic-audit-engine';
import {
    centroidsFromSnapshot,
    createD1TopicClassifier,
    createD1TopicClassifierWithCentroids,
    createD1TopicClassifierWithPromptEmbeddings,
    promptEmbeddingsFromSnapshot,
    type TopicCentroidsSnapshot,
} from '../../src/core/filtering/topic-embedding-classifier';

const root = join(import.meta.dirname, '../..');
const corpusPath = join(import.meta.dirname, '../fixtures/filtering/topic-corpus.json');
const centroidsPath = join(import.meta.dirname, '../fixtures/filtering/topic-centroids.d1.json');
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as TopicCorpus;

const reportJsonPath = join(root, 'artifacts/topic-embedding-audit-report.json');
const reportTextPath = join(root, 'artifacts/topic-embedding-audit-report.txt');
const cacheDir = join(root, '.cache/transformers');

const SPIKE2_BBC_RECALL_LIFT = 0.5;
const MAX_TECH_FALSE_BLOCK_RATE = 0.05;

async function loadD1Classifier() {
    if (existsSync(centroidsPath)) {
        const snapshot = JSON.parse(readFileSync(centroidsPath, 'utf8')) as TopicCentroidsSnapshot;
        if (snapshot.mode === 'prompts' && snapshot.prompts) {
            return createD1TopicClassifierWithPromptEmbeddings({
                promptEmbeddings: promptEmbeddingsFromSnapshot(snapshot),
                modelId: snapshot.modelId,
                cacheDir,
                threshold: snapshot.threshold,
            });
        }
        if (snapshot.centroids) {
            return createD1TopicClassifierWithCentroids({
                centroids: centroidsFromSnapshot(snapshot),
                modelId: snapshot.modelId,
                cacheDir,
                threshold: snapshot.threshold,
            });
        }
    }
    return createD1TopicClassifier({ cacheDir });
}

describe('topic embedding audit (Spike 2 — D1 offline)', () => {
    it(
        'runs D1 prompt-embedding classifier and writes audit report',
        async () => {
            const classifier = await loadD1Classifier();
            const report = await auditTopicCorpusAsync(
                corpus,
                classifier.classify,
                'd1-embeddings'
            );

            mkdirSync(join(root, 'artifacts'), { recursive: true });
            writeFileSync(
                reportJsonPath,
                `${JSON.stringify({ modelId: classifier.modelId, report }, null, 2)}\n`,
                'utf8'
            );
            writeFileSync(reportTextPath, formatTopicAuditReport(report), 'utf8');

            expect(report.method).toBe('d1-embeddings');
            expect(report.total).toBe(corpus.samples.length);

            // Spike 2 exit: beat geopolitics keyword block rate on BBC by ≥50pp
            expect(report.bbcNewsDietRecall).toBeGreaterThanOrEqual(
                report.bbcGeopoliticsKeywordBlockRate + SPIKE2_BBC_RECALL_LIFT
            );

            // Hold tech/music allow-list
            expect(report.techFalseBlockRate).toBeLessThanOrEqual(MAX_TECH_FALSE_BLOCK_RATE);

            // Overall topic labeling should beat D0 keyword baseline (~57% on seed corpus)
            expect(report.topicLabelAccuracy).toBeGreaterThan(0.57);
        },
        300_000
    );
});
