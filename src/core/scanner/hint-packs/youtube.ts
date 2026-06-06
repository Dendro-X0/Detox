import type { SiteHintPack } from '../site-hints';

/** YouTube hint pack — ignores recommendations chrome and boosts comment text. */
export const YOUTUBE_HINT_PACK: SiteHintPack = {
    id: 'youtube',
    modId: 'adapter-youtube',
    hostPattern: /(^|\.)youtube\.com$/i,
    hints: {
        ignoreSelectors: [
            '#related',
            '#secondary',
            'ytd-watch-next-secondary-results-renderer',
            'ytd-compact-video-renderer',
            '#masthead',
            '#guide',
            'ytd-popup-container',
        ],
        boostSelectors: [
            'ytd-comment-thread-renderer',
            'ytd-comment-renderer',
            '#content-text',
            '#expander',
            'yt-formatted-string#content-text',
        ],
    },
};
