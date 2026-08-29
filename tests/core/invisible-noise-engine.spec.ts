import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveKeywords } from '../../src/mods/detectors/heuristic-keywords/keywords';
import { textMatchesAllowKeywords, loadUserRules } from '../../src/core/rules/user-rules-store';
import { BOTHER_KEYWORD_MAP } from '../../src/core/types/bother-keywords';

const storageLocal = new Map<string, unknown>();

vi.stubGlobal('chrome', {
    storage: {
        local: {
            get: vi.fn(async (keys: string | readonly string[]) => {
                const list = typeof keys === 'string' ? [keys] : [...keys];
                const out: Record<string, unknown> = {};
                for (const key of list) {
                    if (storageLocal.has(key)) out[key] = storageLocal.get(key);
                }
                return out;
            }),
            set: vi.fn(async (values: Record<string, unknown>) => {
                for (const [key, value] of Object.entries(values)) {
                    storageLocal.set(key, value);
                }
            }),
        },
    },
});

describe('invisible noise engine keywords', () => {
    beforeEach(() => {
        storageLocal.clear();
        storageLocal.set('invisibleNoiseEngineMigrated', true);
    });

    it('ignores user-authored blockKeywords and uses focus mode set', async () => {
        storageLocal.set('activeBrowsingModeId', 'focus');
        storageLocal.set('userRules', {
            blockKeywords: ['totally-custom-user-phrase-xyz'],
            allowKeywords: ['allow-me'],
            allowDomains: [],
        });

        const keywords = await getActiveKeywords();
        expect(keywords).toEqual(expect.arrayContaining([...BOTHER_KEYWORD_MAP.outrage.slice(0, 1)]));
        expect(keywords).not.toContain('totally-custom-user-phrase-xyz');
    });

    it('uses research mode spam-only categories', async () => {
        storageLocal.set('activeBrowsingModeId', 'research');
        const keywords = await getActiveKeywords();
        expect(keywords).toEqual(expect.arrayContaining([...BOTHER_KEYWORD_MAP.spam.slice(0, 1)]));
        expect(keywords.some((k) => BOTHER_KEYWORD_MAP.outrage.includes(k as never))).toBe(false);
    });

    it('merges express geopolitics extras', async () => {
        storageLocal.set('activeBrowsingModeId', 'focus');
        storageLocal.set('expressPresetId', 'less-politics');
        const keywords = await getActiveKeywords();
        expect(keywords).toEqual(expect.arrayContaining([...BOTHER_KEYWORD_MAP.geopolitics.slice(0, 1)]));
    });

    it('never matches allow-keywords after Assist-first pivot', async () => {
        storageLocal.set('userRules', {
            blockKeywords: [],
            allowKeywords: ['science'],
            allowDomains: [],
        });
        await loadUserRules();
        expect(textMatchesAllowKeywords('science breakthrough today')).toBe(false);
    });
});
