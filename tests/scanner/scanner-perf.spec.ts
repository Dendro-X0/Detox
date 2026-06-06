import { describe, expect, it } from 'vitest';
import { createScanCoordinator } from '../../src/core/scanner/scan-coordinator';
import { scanUniversal } from '../../src/core/scanner/universal-scanner';
import { loadRedditThreadDocument } from './acceptance-helpers';
import { loadAcceptanceFixture } from './load-acceptance-fixture';
import { loadScannerFixture } from './load-fixture';
import { expectWithinBudget, SCANNER_PERF_BUDGETS } from './perf-budgets';

function measureMs(work: () => void): number {
    const start = performance.now();
    work();
    return performance.now() - start;
}

async function measureAsyncMs(work: () => Promise<void> | void): Promise<number> {
    const start = performance.now();
    await work();
    return performance.now() - start;
}

describe('8.4 — scanner perf budgets', () => {
    it('scans static-article fixture within budget', () => {
        const document = loadAcceptanceFixture('static-article.html');
        const elapsed = measureMs(() => {
            const units = scanUniversal(document);
            expect(units.length).toBeGreaterThan(0);
        });

        expectWithinBudget(elapsed, SCANNER_PERF_BUDGETS.staticArticleScanMs, 'static-article scan');
    });

    it('scans reddit-thread snapshot within budget', () => {
        const { document } = loadRedditThreadDocument();
        const elapsed = measureMs(() => {
            const units = scanUniversal(document);
            expect(units.length).toBeGreaterThan(40);
        });

        expectWithinBudget(elapsed, SCANNER_PERF_BUDGETS.redditThreadScanMs, 'reddit-thread scan');
    });

    it('coordinator first scan completes within budget', async () => {
        const document = loadAcceptanceFixture('static-article.html');
        let added = 0;

        const coordinator = createScanCoordinator(document, {
            onAdded: (units) => {
                added += units.length;
            },
        }, { observeMutations: false, debounceMs: 5 });

        const elapsed = await measureAsyncMs(async () => {
            coordinator.start();
            coordinator.flush();
        });

        expect(added).toBeGreaterThan(0);
        expectWithinBudget(elapsed, SCANNER_PERF_BUDGETS.coordinatorFirstScanMs, 'coordinator first scan');
        coordinator.stop();
    });

    it('dom-swap rescans plateau without runaway cycles (I2 perf)', () => {
        const document = loadScannerFixture('dom-swap.html');
        const coordinator = createScanCoordinator(document, {
            onAdded: () => undefined,
        }, { observeMutations: false, debounceMs: 5 });

        coordinator.start();
        const afterFirst = coordinator.getDiagnostics().scanCycles;
        coordinator.rescan();
        coordinator.rescan();
        coordinator.rescan();
        const afterRescans = coordinator.getDiagnostics().scanCycles;

        expect(afterRescans - afterFirst).toBeLessThanOrEqual(SCANNER_PERF_BUDGETS.domSwapRescanCyclesMax);
        coordinator.stop();
    });
});
