import { describe, expect, it } from 'vitest';
import { buildBrowsingModePatch, getBrowsingMode, isBrowsingModeId } from '../../src/core/modes/browsing-modes';

describe('10 — browsing modes', () => {
    it('defines three built-in modes', () => {
        expect(isBrowsingModeId('focus')).toBe(true);
        expect(isBrowsingModeId('research')).toBe(true);
        expect(isBrowsingModeId('unwind')).toBe(true);
        expect(isBrowsingModeId('custom')).toBe(false);
    });

    it('focus mode uses balanced threshold and outrage-related keywords', () => {
        const patch = buildBrowsingModePatch('focus', { allowKeywords: ['keep'], allowDomains: ['example.com'] });
        expect(patch.policy.preset).toBe('balanced');
        expect(patch.policy.threshold).toBe(0.5);
        expect(patch.userRules.allowKeywords).toEqual(['keep']);
        expect(patch.userRules.allowDomains).toEqual(['example.com']);
        expect(patch.userRules.blockKeywords).toContain('outrageous');
        expect(patch.userRules.blockKeywords).toContain('sponsored');
        expect(patch.activeBrowsingModeId).toBe('focus');
    });

    it('research mode is conservative with lighter keyword set', () => {
        const patch = buildBrowsingModePatch('research');
        expect(patch.policy.preset).toBe('conservative');
        expect(patch.policy.threshold).toBe(0.7);
        expect(patch.userRules.blockKeywords).toContain('sponsored');
        expect(patch.userRules.blockKeywords).not.toContain('outrageous');
    });

    it('unwind mode is strict with broader keyword set', () => {
        const patch = buildBrowsingModePatch('unwind');
        expect(patch.policy.preset).toBe('strict');
        expect(patch.policy.threshold).toBe(0.3);
        expect(patch.userRules.blockKeywords).toContain('lol');
        expect(patch.userRules.blockKeywords).toContain('outrageous');
    });

    it('includes required detector and action mods', () => {
        const patch = buildBrowsingModePatch('focus');
        expect(patch.enabledModIds).toContain('detector-heuristic-keywords');
        expect(patch.enabledModIds).toContain('action-dim');
        expect(patch.enabledModIds).toContain('detector-noise-patterns');
    });

    it('research mode omits optional noise pattern detector', () => {
        const patch = buildBrowsingModePatch('research');
        expect(patch.enabledModIds).not.toContain('detector-noise-patterns');
    });

    it('getBrowsingMode returns metadata', () => {
        const mode = getBrowsingMode('research');
        expect(mode.label).toBe('Research');
    });
});
