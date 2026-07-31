import { describe, expect, it } from 'vitest';
import { BOTHER_KEYWORD_MAP } from '../../src/core/types/bother-keywords';
import { classifyUnifiedFilter } from '../../src/core/filtering/unified-filter';
import { textMatchesKeyword } from '../../src/core/rules/keyword-match';

/** Dogfood headlines from BBC homepage (2026-06) — phrase-poor political news. */
const BBC_DOGFOOD_HEADLINES = [
    'Israeli air strikes hit Lebanese city of Tyre after Iranian warning to stop attacks',
    'Trump tells BBC Netanyahu did not defy him',
    '300 migrants bound for UK kidnapped and threatened with kidney removal',
    'Man arrested on suspected murder knife attack in Belfast',
    "AI giants' race to raise funds heats up as ChatGPT-owner plans stock market debut",
] as const;

describe('BBC dogfood headlines (noise + geopolitics keywords)', () => {
    const allKeywords = Object.values(BOTHER_KEYWORD_MAP).flat();

    it('documents low keyword recall on factual BBC headlines', () => {
        let blocked = 0;
        for (const headline of BBC_DOGFOOD_HEADLINES) {
            const result = classifyUnifiedFilter(headline, {
                threshold: 0.5,
                keywords: allKeywords,
                enableNoisePatterns: true,
                enableBehaviorSignals: true,
            });
            if (result.blocked) blocked += 1;
        }
        expect(blocked).toBe(0);
    });

    it('shows airstrike keyword does not match spaced "air strikes"', () => {
        const headline = BBC_DOGFOOD_HEADLINES[0];
        expect(textMatchesKeyword(headline, 'airstrike')).toBe(false);
        expect(textMatchesKeyword(headline, 'air strikes')).toBe(true);
    });
});
