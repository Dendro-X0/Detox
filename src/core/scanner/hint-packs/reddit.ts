import type { SiteHintPack } from '../site-hints';

/** Reddit hint pack — ignores feed chrome and boosts comment/post text slots. */
export const REDDIT_HINT_PACK: SiteHintPack = {
    id: 'reddit',
    modId: 'adapter-reddit',
    hostPattern: /(^|\.)reddit\.com$/i,
    hints: {
        ignoreSelectors: [
            'shreddit-subreddit-header',
            'shreddit-async-loader[bundlename*="sidebar"]',
            '[data-testid="subreddit-sidebar"]',
            '[data-testid="reddit-sidebar"]',
            'aside[aria-label="Related"]',
            '[data-testid="promoted"]',
            '.promotedlink',
            'faceplate-partial[id*="sidebar"]',
            '#SHORTCUT_FOCUSABLE_DIV',
        ],
        boostSelectors: [
            'shreddit-comment',
            'shreddit-post',
            '[data-testid="comment"]',
            '[data-testid="post-container"]',
            '.reddit-comment',
            'div[slot="text"]',
        ],
    },
};
