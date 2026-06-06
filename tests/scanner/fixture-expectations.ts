/** Expected scannable units per HTML fixture (invariant I1 targets). */
export type ScannerFixtureSpec = {
    readonly file: string;
    readonly expectedUnitIds: readonly string[];
    readonly chromeIds: readonly string[];
    readonly minCompleteness: number;
};

export const SCANNER_FIXTURES: readonly ScannerFixtureSpec[] = [
    {
        file: 'blog-article.html',
        expectedUnitIds: ['article-p1', 'article-p2', 'article-p3'],
        chromeIds: ['nav-about', 'sidebar-ad'],
        minCompleteness: 0.9,
    },
    {
        file: 'nested-comments.html',
        expectedUnitIds: ['post-body', 'comment-1', 'comment-1-reply', 'comment-2'],
        chromeIds: [],
        minCompleteness: 0.9,
    },
    {
        file: 'dom-swap.html',
        expectedUnitIds: ['swap-comment'],
        chromeIds: [],
        minCompleteness: 1,
    },
    {
        file: 'shadow-dom.html',
        expectedUnitIds: ['light-dom', 'shadow-comment'],
        chromeIds: [],
        minCompleteness: 0.9,
    },
    {
        file: 'chrome-heavy.html',
        expectedUnitIds: ['main-content', 'thread-reply'],
        chromeIds: ['header-btn', 'nav-trending', 'related-widget', 'footer-legal'],
        minCompleteness: 0.9,
    },
];

/** Stable logical ids for dom-swap fingerprint tests (S2). */
export const DOM_SWAP_STABLE_ID = 'comment-alpha';
