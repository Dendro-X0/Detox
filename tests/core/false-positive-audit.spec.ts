import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    auditFilterCorpusForMode,
    buildFilterAuditSummary,
    classifyForAudit,
    formatFilterAuditSummary,
    type FilterCorpus,
} from '../../src/core/filtering/filter-audit-engine';

const root = join(import.meta.dirname, '../..');
const corpusPath = join(import.meta.dirname, '../fixtures/filtering/focus-corpus.json');
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as FilterCorpus;

const reportJsonPath = join(root, 'artifacts/filter-audit-report.json');
const reportTextPath = join(root, 'artifacts/filter-audit-report.txt');

const MAX_FALSE_POSITIVES = 0;

function assertNoFalsePositives(mode: 'focus' | 'research'): void {
    const report = auditFilterCorpusForMode(corpus, mode);
    if (report.falsePositives.length > 0) {
        const lines = report.falsePositives.map(
            (m) =>
                `FP ${m.id}: ${m.note ?? ''} (${m.winnerDetectorId ?? 'none'} score=${m.winnerScore?.toFixed(2) ?? 'n/a'})`
        );
        expect.fail(`${mode} false positives (${report.falsePositives.length}):\n${lines.join('\n')}`);
    }
}

describe('false-positive audit — dogfood corpus', () => {
    it('corpus has labeled pass and block samples', () => {
        const pass = corpus.samples.filter((s) => s.expect === 'pass').length;
        const block = corpus.samples.filter((s) => s.expect === 'block').length;
        expect(pass).toBeGreaterThanOrEqual(12);
        expect(block).toBeGreaterThanOrEqual(8);
    });

    it('Focus (balanced) has zero false positives on pass samples', () => {
        assertNoFalsePositives('focus');
    });

    it('Research (conservative) has zero false positives on pass samples', () => {
        assertNoFalsePositives('research');
    });

    it('Focus on non-social hosts has zero false positives', () => {
        const report = buildFilterAuditSummary(corpus).nonSocialFocus;
        expect(report.falsePositives.length).toBeLessThanOrEqual(MAX_FALSE_POSITIVES);
        expect(report.total).toBeGreaterThanOrEqual(5);
    });

    it('documents known benign edge cases individually', () => {
        for (const id of [
            'pass-symbolic-lol',
            'pass-saas-docs',
            'pass-postgres-today',
            'pass-theater-review',
            'pass-rym-album-review',
            'pass-spotify-tracklist',
        ]) {
            const sample = corpus.samples.find((s) => s.id === id);
            expect(sample, id).toBeDefined();
            const ctx = {
                pageContexts: sample!.pageContexts,
                hostname: sample!.hostname,
            };
            const focus = classifyForAudit(sample!.text, 'focus', ctx);
            const research = classifyForAudit(sample!.text, 'research', ctx);
            expect(focus.blocked, `${id} should pass in Focus`).toBe(false);
            expect(research.blocked, `${id} should pass in Research`).toBe(false);
        }
    });

    it('writes filter audit report artifacts', () => {
        const summary = buildFilterAuditSummary(corpus);
        mkdirSync(join(root, 'artifacts'), { recursive: true });
        writeFileSync(reportJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
        writeFileSync(reportTextPath, `${formatFilterAuditSummary(summary)}\n`, 'utf8');

        expect(summary.focus.falsePositives.length).toBeLessThanOrEqual(MAX_FALSE_POSITIVES);
        expect(summary.research.falsePositives.length).toBeLessThanOrEqual(MAX_FALSE_POSITIVES);
        expect(summary.nonSocialFocus.falsePositives.length).toBeLessThanOrEqual(MAX_FALSE_POSITIVES);
    });
});
