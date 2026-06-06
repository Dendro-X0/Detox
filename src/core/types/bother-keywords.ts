export type BotherCategory =
    | 'outrage'
    | 'spam'
    | 'hostile'
    | 'engagement-bait'
    | 'low-effort';

/**
 * Curated keyword groups for heuristic filtering on social feeds.
 * Prefer multi-word phrases; single tokens use word-boundary matching.
 */
export const BOTHER_KEYWORD_MAP: Readonly<Record<BotherCategory, readonly string[]>> = {
    outrage: [
        'outraged',
        'outrageous',
        'furious',
        'disgusting',
        'boycott',
        'how is this allowed',
        'worst take',
        'absolutely unhinged',
    ],
    spam: [
        'buy now',
        'click here',
        'sponsored',
        'limited offer',
        'subscribe now',
        'use code',
        'promo code',
        'affiliate link',
        'link in bio',
        'free trial',
        'act now',
        'discount code',
        'order now',
    ],
    hostile: [
        'kys',
        'kill yourself',
        'idiot',
        'moron',
        'shut up',
        'go die',
    ],
    'engagement-bait': [
        "you won't believe",
        'you wont believe',
        'shocking',
        'gone wrong',
        'what happens next',
        'hot take',
        'unpopular opinion',
        'change my mind',
        'wait until you see',
        'this changes everything',
    ],
    'low-effort': [
        'lol',
        'lmao',
        'rofl',
        'underrated comment',
        'came here to say',
        'this is the way',
    ],
};
