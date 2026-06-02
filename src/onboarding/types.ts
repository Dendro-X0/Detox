import type { EnforcementActionId } from '../core/types/enforcement';
import type { PolicyPreset } from '../core/types/policy';

export type BotherCategory =
    | 'outrage'
    | 'spam'
    | 'hostile'
    | 'engagement-bait'
    | 'low-effort';

export type PreferredSite = 'reddit' | 'youtube' | 'quora' | 'generic';

export type OnboardingDraft = {
    readonly bothers: readonly BotherCategory[];
    readonly actionId: EnforcementActionId;
    readonly sites: readonly PreferredSite[];
    readonly preset: PolicyPreset;
};

export type OnboardingStorageRecord = {
    readonly onboardingComplete?: boolean;
    readonly userKeywords?: readonly string[];
    readonly preferredSites?: readonly PreferredSite[];
    readonly enabledModIds?: readonly string[];
};

export const BOTHER_KEYWORD_MAP: Readonly<Record<BotherCategory, readonly string[]>> = {
    outrage: ['outrage', 'rant', 'furious', 'disgusting'],
    spam: ['buy now', 'click here', 'sponsored', 'limited offer', 'subscribe now'],
    hostile: ['kill', 'kys', 'idiot', 'moron', 'stupid'],
    'engagement-bait': ["you won't believe", 'shocking', 'gone wrong', 'what happens next'],
    'low-effort': ['lol', 'lmao', 'this.', 'same', 'underrated comment'],
};

export const SITE_MOD_MAP: Readonly<Record<PreferredSite, string>> = {
    reddit: 'adapter-reddit',
    youtube: 'adapter-youtube',
    quora: 'adapter-quora',
    generic: 'adapter-generic',
};
