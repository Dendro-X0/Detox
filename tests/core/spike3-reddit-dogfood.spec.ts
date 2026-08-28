// @vitest-environment node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    type TopicCorpus,
    type TopicCorpusSample,
    wouldBlockUnderTopicPolicy,
} from '../../src/core/filtering/topic-audit-engine';
import { DEFAULT_NEWS_DIET_POLICY } from '../../src/core/filtering/topic-types';
import {
    createD1TopicClassifierWithPromptEmbeddings,
    promptEmbeddingsFromSnapshot,
    type TopicCentroidsSnapshot,
} from '../../src/core/filtering/topic-embedding-classifier';
import promptSnapshot from '../../src/mods/detectors/topic-classifier/prompt-embeddings.snapshot.json';

const root = join(import.meta.dirname, '../..');
const corpusPath = join(import.meta.dirname, '../fixtures/filtering/topic-corpus.json');
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as TopicCorpus;
const cacheDir = join(root, '.cache/transformers');
const reportPath = join(root, 'artifacts/spike3-reddit-dogfood-report.txt');

/** Tech/music/culture on allow-list must not topic-block (Spike 3 exit). */
const MAX_ALLOW_FALSE_BLOCK_RATE = 0;
/** News-sub style political titles should mostly block. */
const MIN_NEWS_RECALL = 0.8;

async function loadD1Classifier() {
    const snapshot = promptSnapshot as TopicCentroidsSnapshot;
    return createD1TopicClassifierWithPromptEmbeddings({
        promptEmbeddings: promptEmbeddingsFromSnapshot(snapshot),
        modelId: snapshot.modelId,
        cacheDir,
        threshold: snapshot.threshold,
    });
}

function redditSamples(c: TopicCorpus): readonly TopicCorpusSample[] {
    return c.samples.filter((s) => s.source === 'reddit');
}

function formatRow(
    sample: TopicCorpusSample,
    blocked: boolean,
    topic: string,
    confidence: number
): string {
    const expect = sample.blockUnderNewsDiet ? 'block' : 'pass';
    const ok = sample.blockUnderNewsDiet === blocked ? 'OK' : 'MISS';
    return `${ok}  [${expect}] ${blocked ? 'BLOCK' : 'pass '} · ${topic} (${(confidence * 100).toFixed(0)}%) · ${sample.text.slice(0, 72)}`;
}

describe('Spike 3 — Reddit topic dogfood', () => {
    it(
        'Reddit corpus: news recall + zero allow-list topic false-blocks',
        async () => {
            const classifier = await loadD1Classifier();
            const samples = redditSamples(corpus);
            const news = samples.filter((s) => s.blockUnderNewsDiet);
            const allowPass = samples.filter((s) => !s.blockUnderNewsDiet);

            let newsBlocked = 0;
            let allowFalseBlocked = 0;
            const rows: string[] = [];

            for (const sample of samples) {
                const prediction = await classifier.classify(sample.text);
                const blocked = wouldBlockUnderTopicPolicy(prediction, DEFAULT_NEWS_DIET_POLICY);
                if (sample.blockUnderNewsDiet && blocked) newsBlocked += 1;
                if (!sample.blockUnderNewsDiet && blocked) allowFalseBlocked += 1;
                rows.push(formatRow(sample, blocked, prediction.primaryTopic, prediction.confidence));
            }

            const newsRecall = news.length > 0 ? newsBlocked / news.length : 1;
            const allowFpRate = allowPass.length > 0 ? allowFalseBlocked / allowPass.length : 0;

            const lines = [
                `Spike 3 Reddit dogfood @ ${new Date().toISOString()}`,
                `Model: ${classifier.modelId} (bundled prompt snapshot)`,
                `Policy: block ${DEFAULT_NEWS_DIET_POLICY.blockTopics.join(', ')}; allow ${DEFAULT_NEWS_DIET_POLICY.allowTopics.join(', ')}`,
                '',
                `News-sub recall: ${newsBlocked}/${news.length} (${(newsRecall * 100).toFixed(1)}%) — gate ≥ ${(MIN_NEWS_RECALL * 100).toFixed(0)}%`,
                `Allow-list false-block: ${allowFalseBlocked}/${allowPass.length} (${(allowFpRate * 100).toFixed(1)}%) — gate ≤ ${(MAX_ALLOW_FALSE_BLOCK_RATE * 100).toFixed(0)}%`,
                '',
                ...rows,
                '',
                'Manual follow-up: full build → Topic classifier + topic diet → reddit.com/r/technology and a news sub',
            ];

            mkdirSync(join(root, 'artifacts'), { recursive: true });
            writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

            expect(news.length).toBeGreaterThanOrEqual(2);
            expect(newsRecall).toBeGreaterThanOrEqual(MIN_NEWS_RECALL);
            expect(allowFpRate).toBeLessThanOrEqual(MAX_ALLOW_FALSE_BLOCK_RATE);
        },
        120_000
    );
});
