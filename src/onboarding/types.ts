import type { EnforcementActionId } from '../core/types/enforcement';
import type { PolicyPreset } from '../core/types/policy';
import type { BotherCategory } from '../core/types/bother-keywords';
import type { BrowsingModeId } from '../core/modes/browsing-modes';
import type { LocaleId } from '../i18n/types';
import type { SiteWhitelistPresetId } from '../core/rules/site-whitelist-presets';
import type { ExpressPresetId } from './express-presets';

export type { BotherCategory } from '../core/types/bother-keywords';
export { BOTHER_KEYWORD_MAP } from '../core/types/bother-keywords';

export type PreferredSite = 'reddit' | 'youtube';

/** Optional wizard step — off by default; enables search-only Wikipedia assist. */
export type AuthenticityAssistOptIn = {
    readonly enabled: boolean;
    readonly llmApiKey?: string;
};

export type PresetModeOnboardingDraft = {
    readonly setupPath: 'preset-mode';
    readonly browsingModeId: BrowsingModeId;
    readonly localeId: LocaleId;
    readonly whitelistPresetIds?: readonly SiteWhitelistPresetId[];
    readonly authenticityAssist?: AuthenticityAssistOptIn;
};

/** One-tap lifestyle seed — Express path (≤1 min setup). */
export type ExpressOnboardingDraft = {
    readonly setupPath: 'express';
    readonly expressPresetId: ExpressPresetId;
    readonly localeId: LocaleId;
    readonly whitelistPresetIds?: readonly SiteWhitelistPresetId[];
    readonly authenticityAssist?: AuthenticityAssistOptIn;
};

export type CustomOnboardingDraft = {
    readonly setupPath: 'custom';
    readonly localeId: LocaleId;
    readonly bothers: readonly BotherCategory[];
    readonly actionId: EnforcementActionId;
    readonly preset: PolicyPreset;
    readonly whitelistPresetIds?: readonly SiteWhitelistPresetId[];
    readonly authenticityAssist?: AuthenticityAssistOptIn;
};

export type OnboardingDraft =
    | PresetModeOnboardingDraft
    | ExpressOnboardingDraft
    | CustomOnboardingDraft;

export type OnboardingStorageRecord = {
    readonly onboardingComplete?: boolean;
    readonly preferredLocale?: LocaleId;
    readonly userKeywords?: readonly string[];
    readonly preferredSites?: readonly PreferredSite[];
    readonly enabledModIds?: readonly string[];
};

/** @deprecated Site adapters are optional hints; kept for storage compatibility. */
export const SITE_MOD_MAP: Readonly<Record<PreferredSite, string>> = {
    reddit: 'adapter-reddit',
    youtube: 'adapter-youtube',
};
