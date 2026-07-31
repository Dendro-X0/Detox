import { describe, expect, it } from 'vitest';
import { BOTHER_KEYWORD_MAP } from '../../src/core/types/bother-keywords';
import { classifyUnifiedFilter } from '../../src/core/filtering/unified-filter';

describe('bother keyword presets', () => {
    it('includes geopolitics phrases', () => {
        expect(BOTHER_KEYWORD_MAP.geopolitics.length).toBeGreaterThanOrEqual(10);
    });

    it('blocks news headline when geopolitics preset keywords are enabled', () => {
        const result = classifyUnifiedFilter(
            'Breaking news: diplomatic crisis escalates after military strike near the border',
            {
                threshold: 0.5,
                keywords: BOTHER_KEYWORD_MAP.geopolitics,
                enableNoisePatterns: false,
                enableBehaviorSignals: false,
            }
        );
        expect(result.blocked).toBe(true);
    });

    it('does not block tech discussion without geopolitics keywords enabled', () => {
        const keywords = BOTHER_KEYWORD_MAP.spam;
        const result = classifyUnifiedFilter(
            'Antigravity CLI works better than Code Assist in VS Code terminal workflows',
            {
                threshold: 0.5,
                keywords,
                enableNoisePatterns: false,
                enableBehaviorSignals: false,
            }
        );
        expect(result.blocked).toBe(false);
    });
});
