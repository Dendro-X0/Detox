import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DEFAULT_ASSIST_SETTINGS } from '../../src/assist/types';
import {
    ASSIST_QUOTA_ERROR,
    prepareComparePanel,
    prepareSearchHandoff,
} from '../../src/assist/assist-actions';
import { resetAssistQuotaForTests } from '../../src/assist/assist-quota-store';
import { readHandoffCache, writeHandoffCache } from '../../src/assist/handoff-cache';

vi.mock('../../src/assist/handoff-cache', () => ({
    readHandoffCache: vi.fn(async () => null),
    writeHandoffCache: vi.fn(async () => undefined),
}));

vi.mock('../../src/assist/assist-quota-store', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/assist/assist-quota-store')>();
    return {
        ...actual,
        loadAssistQuota: vi.fn(async () => actual.getAssistQuota()),
        consumeAssistActionQuota: vi.fn(async () => {
            const quota = actual.getAssistQuota();
            if (quota.used >= DEFAULT_ASSIST_SETTINGS.dailyActionQuota) return false;
            actual.resetAssistQuotaForTests({ ...quota, used: quota.used + 1 });
            return true;
        }),
    };
});

vi.mock('../../src/assist/compare-report', () => ({
    buildCompareReport: vi.fn(async (clip: string, text: string) => ({
        id: 'test-report',
        createdAt: Date.now(),
        sideA: { text: clip, label: 'clip' as const },
        sideB: { text, label: 'selection' as const },
        overlap: { sharedTerms: [], overlapScore: 0, noteKey: 'assist.compare.overlap.empty' },
        combinedSearchUrl: 'https://example.test/compare',
    })),
    saveCompareReport: vi.fn(async () => undefined),
    loadCompareReport: vi.fn(async () => null),
}));

import { saveCompareReport } from '../../src/assist/compare-report';

describe('assist actions', () => {
    beforeEach(() => {
        vi.mocked(readHandoffCache).mockResolvedValue(null);
        vi.mocked(writeHandoffCache).mockClear();
        resetAssistQuotaForTests({ date: new Date().toISOString().slice(0, 10), used: 0 });
    });

    it('prepares search handoff and records cache', async () => {
        const plan = await prepareSearchHandoff('hello', DEFAULT_ASSIST_SETTINGS);
        expect(plan.ok).toBe(true);
        expect(plan.urls?.[0]).toContain('hello');
        expect(writeHandoffCache).toHaveBeenCalled();
    });

    it('returns cached handoff without consuming quota path when cache hits', async () => {
        vi.mocked(readHandoffCache).mockResolvedValue({
            urls: ['https://cached.test'],
            openedAt: Date.now(),
        });
        const plan = await prepareSearchHandoff('hello', DEFAULT_ASSIST_SETTINGS);
        expect(plan.cached).toBe(true);
        expect(plan.urls).toEqual(['https://cached.test']);
        expect(writeHandoffCache).not.toHaveBeenCalled();
    });

    it('blocks when daily action quota is exhausted', async () => {
        resetAssistQuotaForTests({
            date: new Date().toISOString().slice(0, 10),
            used: DEFAULT_ASSIST_SETTINGS.dailyActionQuota,
        });
        const plan = await prepareSearchHandoff('hello', DEFAULT_ASSIST_SETTINGS);
        expect(plan.ok).toBe(false);
        expect(plan.error).toBe(ASSIST_QUOTA_ERROR);
    });

    it('builds compare panel report and stores session copy', async () => {
        const plan = await prepareComparePanel('clip a', 'clip b', DEFAULT_ASSIST_SETTINGS);
        expect(plan.ok).toBe(true);
        expect(plan.urls?.[0]).toBe('https://example.test/compare');
        expect(saveCompareReport).toHaveBeenCalled();
        expect(writeHandoffCache).toHaveBeenCalled();
    });
});
