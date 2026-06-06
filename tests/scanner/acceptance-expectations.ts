/** Recorded acceptance snapshots (S4) — offline stand-ins for live URLs. */
export type AcceptanceScenarioId =
    | 'static-article'
    | 'reddit-thread'
    | 'infinite-scroll'
    | 'spa-navigation'
    | 'shadow-dom';

export type AcceptanceScenarioSpec = {
    readonly id: AcceptanceScenarioId;
    readonly snapshotFile?: string;
    readonly manualUrl?: string;
    readonly minCompleteness: number;
    readonly scanTolerance: number;
    readonly maxScanMultiplier: number;
};

export const ACCEPTANCE_SCENARIOS: readonly AcceptanceScenarioSpec[] = [
    {
        id: 'static-article',
        snapshotFile: 'static-article.html',
        manualUrl: 'https://www.bbc.com/news (or any long-form article)',
        minCompleteness: 0.9,
        scanTolerance: 0.15,
        maxScanMultiplier: 1.15,
    },
    {
        id: 'reddit-thread',
        snapshotFile: 'reddit-thread.html',
        manualUrl: 'https://www.reddit.com/r/test/comments/ (250–1k comment thread)',
        minCompleteness: 0.85,
        scanTolerance: 0.15,
        maxScanMultiplier: 1.15,
    },
    {
        id: 'infinite-scroll',
        snapshotFile: 'infinite-scroll.html',
        manualUrl: 'https://news.ycombinator.com/ (scroll feed)',
        minCompleteness: 0.9,
        scanTolerance: 0.15,
        maxScanMultiplier: 1.2,
    },
    {
        id: 'spa-navigation',
        snapshotFile: 'spa-route-a.html',
        manualUrl: 'https://www.reddit.com/ (SPA route change)',
        minCompleteness: 0.9,
        scanTolerance: 0.15,
        maxScanMultiplier: 1.15,
    },
    {
        id: 'shadow-dom',
        snapshotFile: '../scanner/shadow-dom.html',
        manualUrl: 'Sites using web components (e.g. some forums)',
        minCompleteness: 0.9,
        scanTolerance: 0.15,
        maxScanMultiplier: 1.15,
    },
];

export const REDDIT_ACCEPTANCE_COMMENT_COUNT = 48;
