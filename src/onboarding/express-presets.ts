import type { BrowsingModeId } from '../core/modes/browsing-modes';
import type { TopicPolicySettings } from '../core/rules/topic-policy-store';
import type { SiteWhitelistPresetId } from '../core/rules/site-whitelist-presets';
import type { BotherCategory } from '../core/types/bother-keywords';
import type { PolicyPreset } from '../core/types/policy';

/**
 * Express lifestyle presets — one-tap seeds for ≤1-minute setup (P1).
 * Layer 1 = bother keyword categories + browsing mode.
 * Layer 2 = topicPolicy seeds (applied when topic diet is available; inert on core until enabled).
 */
export type ExpressPresetId =
    | 'focus-calm'
    | 'less-politics'
    | 'tech-music'
    | 'comment-shield'
    | 'deep-read';

export type ExpressPresetDefinition = {
    readonly id: ExpressPresetId;
    readonly browsingModeId: BrowsingModeId;
    /** Extra bother categories beyond the browsing mode defaults (merged). */
    readonly extraBotherCategories: readonly BotherCategory[];
    /** When set, overrides the browsing mode policy preset. */
    readonly policyPreset?: PolicyPreset;
    readonly whitelistPresetIds: readonly SiteWhitelistPresetId[];
    /**
     * Topic diet seed. `enabled: false` still stores allow/block lists so the
     * user can turn Layer 2 on later without re-picking interests.
     */
    readonly topicPolicy: TopicPolicySettings;
};

export const EXPRESS_PRESET_IDS: readonly ExpressPresetId[] = [
    'focus-calm',
    'less-politics',
    'tech-music',
    'comment-shield',
    'deep-read',
] as const;

const EXPRESS_PRESETS: Readonly<Record<ExpressPresetId, ExpressPresetDefinition>> = {
    'focus-calm': {
        id: 'focus-calm',
        browsingModeId: 'focus',
        extraBotherCategories: [],
        whitelistPresetIds: [],
        topicPolicy: {
            enabled: false,
            blockTopics: [],
            allowTopics: [],
        },
    },
    'less-politics': {
        id: 'less-politics',
        browsingModeId: 'focus',
        /** Keyword bridge until semantic topic diet is on (phrase-poor headlines still need L2). */
        extraBotherCategories: ['geopolitics'],
        whitelistPresetIds: [],
        topicPolicy: {
            enabled: false,
            blockTopics: ['world-affairs', 'domestic-politics'],
            allowTopics: [],
        },
    },
    'tech-music': {
        id: 'tech-music',
        browsingModeId: 'focus',
        extraBotherCategories: ['geopolitics'],
        whitelistPresetIds: ['music-lyrics'],
        topicPolicy: {
            enabled: false,
            blockTopics: ['world-affairs', 'domestic-politics'],
            allowTopics: ['tech', 'music', 'culture-arts'],
        },
    },
    'comment-shield': {
        id: 'comment-shield',
        browsingModeId: 'unwind',
        extraBotherCategories: ['hostile'],
        whitelistPresetIds: [],
        topicPolicy: {
            enabled: false,
            blockTopics: [],
            allowTopics: [],
        },
    },
    'deep-read': {
        id: 'deep-read',
        browsingModeId: 'research',
        extraBotherCategories: [],
        whitelistPresetIds: [],
        topicPolicy: {
            enabled: false,
            blockTopics: [],
            allowTopics: [],
        },
    },
};

export function isExpressPresetId(value: string): value is ExpressPresetId {
    return (EXPRESS_PRESET_IDS as readonly string[]).includes(value);
}

export function getExpressPreset(id: ExpressPresetId): ExpressPresetDefinition {
    return EXPRESS_PRESETS[id];
}

export function listExpressPresets(): readonly ExpressPresetDefinition[] {
    return EXPRESS_PRESET_IDS.map((id) => EXPRESS_PRESETS[id]);
}
