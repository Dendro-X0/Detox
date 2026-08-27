// @vitest-environment node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    auditTopicCorpusAsync,
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
const reportPath = join(root, 'artifacts/spike3-bbc-dogfood-report.txt');

const BBC_RSS_URL = 'https://feeds.bbci.co.uk/news/rss.xml';
const MIN_BBC_NEWS_DIET_RECALL = 0.8;
const MAX_BBC_FALSE_BLOCK_RATE = 0.15;

type LiveHeadline = {
    readonly title: string;
    readonly link: string;
};

async function loadD1Classifier() {
    const snapshot = promptSnapshot as TopicCentroidsSnapshot;
    return createD1TopicClassifierWithPromptEmbeddings({
        promptEmbeddings: promptEmbeddingsFromSnapshot(snapshot),
        modelId: snapshot.modelId,
        cacheDir,
        threshold: snapshot.threshold,
    });
}

function bbcSamples(c: TopicCorpus): readonly TopicCorpusSample[] {
    return c.samples.filter((s) => s.source === 'bbc');
}

async function fetchLiveBbcHeadlines(): Promise<readonly LiveHeadline[]> {
    const response = await fetch(BBC_RSS_URL, {
        headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
    });
    if (!response.ok) {
        throw new Error(`BBC RSS fetch failed: ${response.status}`);
    }
    const xml = await response.text();
    const titles = [...xml.matchAll(/<title><!\[CDATA\[([\s\S]*?)]]><\/title>/g)].map((m) => m[1]!.trim());
    const links = [...xml.matchAll(/<link>([\s\S]*?)<\/link>/g)].map((m) => m[1]!.trim());
    const headlines: LiveHeadline[] = [];
    for (let i = 1; i < Math.min(titles.length, links.length, 13); i += 1) {
        const title = titles[i]!;
        if (title.length < 12) continue;
        headlines.push({ title, link: links[i] ?? '' });
    }
    return headlines;
}

function formatSampleRow(
    sample: TopicCorpusSample,
    blocked: boolean,
    topic: string,
    confidence: number
): string {
    const expect = sample.blockUnderNewsDiet ? 'block' : 'pass';
    const ok = sample.blockUnderNewsDiet === blocked ? 'OK' : 'MISS';
    return `${ok}  [${expect}] ${blocked ? 'BLOCK' : 'pass '} · ${topic} (${(confidence * 100).toFixed(0)}%) · ${sample.text.slice(0, 72)}`;
}

describe('Spike 3 — BBC topic dogfood', () => {
    it(
        'BBC corpus recall under default news diet meets Spike 3 gate',
        async () => {
            const classifier = await loadD1Classifier();
            const bbcCorpus: TopicCorpus = {
                version: corpus.version,
                samples: bbcSamples(corpus),
            };

            const report = await auditTopicCorpusAsync(
                bbcCorpus,
                classifier.classify,
                'd1-embeddings',
                DEFAULT_NEWS_DIET_POLICY
            );

            const political = bbcCorpus.samples.filter((s) => s.blockUnderNewsDiet);
            const culture = bbcCorpus.samples.filter((s) => !s.blockUnderNewsDiet);

            let politicalBlocked = 0;
            let cultureBlocked = 0;
            const rowLines: string[] = [];

            for (const sample of bbcCorpus.samples) {
                const prediction = await classifier.classify(sample.text);
                const blocked = wouldBlockUnderTopicPolicy(prediction, DEFAULT_NEWS_DIET_POLICY);
                if (sample.blockUnderNewsDiet && blocked) politicalBlocked += 1;
                if (!sample.blockUnderNewsDiet && blocked) cultureBlocked += 1;
                rowLines.push(formatSampleRow(sample, blocked, prediction.primaryTopic, prediction.confidence));
            }

            const politicalRecall = political.length > 0 ? politicalBlocked / political.length : 0;
            const cultureFalseBlockRate = culture.length > 0 ? cultureBlocked / culture.length : 0;

            let liveSection = 'Live BBC RSS: skipped (network unavailable)\n';
            try {
                const live = await fetchLiveBbcHeadlines();
                const liveRows: string[] = [];
                let liveBlocked = 0;
                for (const headline of live) {
                    const prediction = await classifier.classify(headline.title);
                    const blocked = wouldBlockUnderTopicPolicy(prediction, DEFAULT_NEWS_DIET_POLICY);
                    if (blocked) liveBlocked += 1;
                    liveRows.push(
                        `  ${blocked ? 'BLOCK' : 'pass '} · ${prediction.primaryTopic} (${(prediction.confidence * 100).toFixed(0)}%) · ${headline.title}`
                    );
                }
                liveSection = [
                    `Live BBC RSS (${live.length} headlines @ ${BBC_RSS_URL}):`,
                    `  Would block under news diet: ${liveBlocked}/${live.length}`,
                    ...liveRows,
                    '',
                ].join('\n');
            } catch (error) {
                liveSection = `Live BBC RSS: skipped (${error instanceof Error ? error.message : String(error)})\n`;
            }

            const lines = [
                `Spike 3 BBC dogfood @ ${new Date().toISOString()}`,
                `Model: ${classifier.modelId} (bundled prompt snapshot)`,
                `Policy: block ${DEFAULT_NEWS_DIET_POLICY.blockTopics.join(', ')}; allow ${DEFAULT_NEWS_DIET_POLICY.allowTopics.join(', ')}`,
                '',
                '--- Seed corpus (BBC samples) ---',
                `Political recall: ${politicalBlocked}/${political.length} (${(politicalRecall * 100).toFixed(1)}%) — gate ≥ ${(MIN_BBC_NEWS_DIET_RECALL * 100).toFixed(0)}%`,
                `Culture/tech false-block: ${cultureBlocked}/${culture.length} (${(cultureFalseBlockRate * 100).toFixed(1)}%) — gate ≤ ${(MAX_BBC_FALSE_BLOCK_RATE * 100).toFixed(0)}%`,
                `Report bbcNewsDietRecall: ${(report.bbcNewsDietRecall * 100).toFixed(1)}%`,
                '',
                ...rowLines,
                '',
                '---',
                liveSection,
                '',
                'Manual follow-up: load full build, enable Topic classifier + topic diet, verify badges on https://www.bbc.com/news',
            ];

            mkdirSync(join(root, 'artifacts'), { recursive: true });
            writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

            expect(politicalRecall).toBeGreaterThanOrEqual(MIN_BBC_NEWS_DIET_RECALL);
            expect(cultureFalseBlockRate).toBeLessThanOrEqual(MAX_BBC_FALSE_BLOCK_RATE);
        },
        120_000
    );
});
