import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    auditFilterCorpus,
    classifyFocusModeText,
    type FilterCorpus,
} from '../../src/core/filtering/focus-classifier';

const corpusPath = join(import.meta.dirname, '../fixtures/filtering/focus-corpus.json');
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as FilterCorpus;

describe('false-positive audit — Focus balanced', () => {
    it('corpus has labeled pass and block samples', () => {
        const pass = corpus.samples.filter((s) => s.expect === 'pass').length;
        const block = corpus.samples.filter((s) => s.expect === 'block').length;
        expect(pass).toBeGreaterThanOrEqual(8);
        expect(block).toBeGreaterThanOrEqual(8);
    });

    it('meets accuracy target with zero false positives on dogfood corpus', () => {
        const report = auditFilterCorpus(corpus);
        if (report.falsePositives.length > 0 || report.falseNegatives.length > 0) {
            const lines = [
                ...report.falsePositives.map(
                    (m) => `FP ${m.id}: ${m.note ?? ''} (heuristic=${m.heuristicScore.toFixed(2)}, noise=${m.noiseMatched})`
                ),
                ...report.falseNegatives.map(
                    (m) => `FN ${m.id}: ${m.note ?? ''} (heuristic=${m.heuristicScore.toFixed(2)}, noise=${m.noiseMatched})`
                ),
            ];
            expect.fail(`Filter audit mismatches:\n${lines.join('\n')}`);
        }
        expect(report.accuracy).toBe(1);
    });

    it('documents known benign edge cases individually', () => {
        for (const id of [
            'pass-symbolic-lol',
            'pass-saas-docs',
            'pass-postgres-today',
            'pass-theater-review',
        ]) {
            const sample = corpus.samples.find((s) => s.id === id);
            expect(sample, id).toBeDefined();
            const result = classifyFocusModeText(sample!.text);
            expect(result.blocked, `${id} should pass`).toBe(false);
        }
    });
});
