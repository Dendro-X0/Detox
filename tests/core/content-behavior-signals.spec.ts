import { describe, expect, it } from 'vitest';
import { analyzeTextBehavior, classifyTextBehavior } from '../../src/core/filtering/content-behavior-signals';
import { classifyUnifiedFilter } from '../../src/core/filtering/unified-filter';
import { buildBrowsingModePatch } from '../../src/core/modes/browsing-modes';

describe('content-behavior-signals', () => {
    it('flags promo-style shouting without keyword lists', () => {
        const result = classifyTextBehavior('FLASH SALE!!! 70% OFF — LIMITED TIME ONLY click here now!!!', {
            threshold: 0.5,
        });
        expect(result.matched).toBe(true);
        expect(result.hits.length).toBeGreaterThanOrEqual(2);
    });

    it('passes neutral professional prose', () => {
        const result = classifyTextBehavior(
            'Quarterly revenue grew twelve percent year over year according to the regulatory filing.',
            { threshold: 0.5 }
        );
        expect(result.matched).toBe(false);
    });

    it('detects engagement hooks', () => {
        const hits = analyzeTextBehavior("You won't believe what happened next — doctors hate this one trick.");
        expect(hits.some((h) => h.id === 'engagement-hook')).toBe(true);
    });

    it('does not block substantive tech prose with repeated product names', () => {
        const italianTech =
            'Ho risolto il problema scaricando Antigravity CLI nella virtual machine. ' +
            'Per quanto riguarda IDE, sto utilizzando VS Code dove lancio il terminale con Antigravity CLI. ' +
            'Antigravity CLI funziona decisamente meglio rispetto a Code Assist che verrà dismesso.';
        const result = classifyTextBehavior(italianTech, { threshold: 0.5 });
        expect(result.matched).toBe(false);
    });

    it('does not block medical prose with repeated clinical terms', () => {
        const medical =
            'The patient presented with hypertension and related cardiovascular risk. ' +
            'Treatment for hypertension followed established clinical guidelines. ' +
            'Follow-up monitoring tracked hypertension response across twelve weeks with stable outcomes.';
        const result = classifyTextBehavior(medical, { threshold: 0.5 });
        expect(result.matched).toBe(false);
    });

    it('still flags obvious repetition spam without substantive discourse', () => {
        const spam = 'WIN WIN WIN WIN!!! click now click now click now!!!';
        const result = classifyTextBehavior(spam, { threshold: 0.5 });
        expect(result.matched).toBe(true);
    });
});

describe('unified-filter preview path', () => {
    it('blocks promo sample when behavior + noise detectors enabled', () => {
        const keywords = buildBrowsingModePatch('focus').userRules.blockKeywords;
        const result = classifyUnifiedFilter('FLASH SALE!!! 70% OFF — LIMITED TIME ONLY click here now!!!', {
            threshold: 0.5,
            keywords,
            enableNoisePatterns: true,
            enableBehaviorSignals: true,
        });
        expect(result.blocked).toBe(true);
        expect(result.winner).not.toBeNull();
    });

    it('passes neutral sample', () => {
        const keywords = buildBrowsingModePatch('focus').userRules.blockKeywords;
        const result = classifyUnifiedFilter(
            'The committee published minutes from the March meeting without editorial comment.',
            {
                threshold: 0.5,
                keywords,
                enableNoisePatterns: true,
                enableBehaviorSignals: true,
            }
        );
        expect(result.blocked).toBe(false);
    });
});
