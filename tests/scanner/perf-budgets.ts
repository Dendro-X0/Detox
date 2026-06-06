/** Offline perf budgets for scanner + coordinator (CI, happy-dom). */
export const SCANNER_PERF_BUDGETS = {
    /** Full scan of static-article acceptance fixture. */
    staticArticleScanMs: 250,
    /** Full scan of recorded reddit-thread snapshot (48 comments). */
    redditThreadScanMs: 600,
    /** Coordinator first scan cycle on static-article fixture. */
    coordinatorFirstScanMs: 350,
    /** Maximum scan cycles after triple rescan on dom-swap (I2 plateau). */
    domSwapRescanCyclesMax: 4,
} as const;

export function expectWithinBudget(actualMs: number, budgetMs: number, label: string): void {
    if (actualMs > budgetMs) {
        throw new Error(`${label}: ${actualMs.toFixed(1)}ms exceeds budget ${budgetMs}ms`);
    }
}
