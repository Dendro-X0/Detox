import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    auditTopicCorpus,
    formatTopicAuditReport,
    matchesGeopoliticsKeywords,
    validateTopicCorpus,
    type TopicCorpus,
} from '../../src/core/filtering/topic-audit-engine';
import { TOPIC_IDS } from '../../src/core/filtering/topic-types';

const root = join(import.meta.dirname, '../..');
const corpusPath = join(import.meta.dirname, '../fixtures/filtering/topic-corpus.json');
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as TopicCorpus;

const reportJsonPath = join(root, 'artifacts/topic-audit-report.json');
const reportTextPath = join(root, 'artifacts/topic-audit-report.txt');

describe('topic corpus (Spike 1)', () => {
    it('validates corpus schema', () => {
        expect(validateTopicCorpus(corpus)).toEqual([]);
        expect(corpus.version).toBeGreaterThanOrEqual(1);
        expect(corpus.samples.length).toBeGreaterThanOrEqual(30);
    });

    it('covers all v0 topics at least once', () => {
        const covered = new Set(corpus.samples.map((s) => s.primaryTopic));
        for (const topic of TOPIC_IDS) {
            expect(covered.has(topic), `missing topic: ${topic}`).toBe(true);
        }
    });

    it('includes dogfood BBC political headlines without keyword hits', () => {
        const armenia = corpus.samples.find((s) => s.id === 'bbc-armenia-votes');
        expect(armenia).toBeDefined();
        expect(matchesGeopoliticsKeywords(armenia!.text)).toBe(false);
        expect(armenia!.blockUnderNewsDiet).toBe(true);
    });

    it('includes culture headline that should pass news diet', () => {
        const bartoli = corpus.samples.find((s) => s.id === 'bbc-bartoli-culture');
        expect(bartoli?.primaryTopic).toBe('culture-arts');
        expect(bartoli?.blockUnderNewsDiet).toBe(false);
    });

    it('writes D0 baseline audit report (research — not a ship gate)', () => {
        const report = auditTopicCorpus(corpus);
        mkdirSync(join(root, 'artifacts'), { recursive: true });
        writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        writeFileSync(reportTextPath, formatTopicAuditReport(report), 'utf8');

        expect(report.total).toBe(corpus.samples.length);
        // Document keyword baseline weakness on phrase-poor BBC headlines
        expect(report.worldAffairsRecall).toBeLessThan(1);
    });
});
