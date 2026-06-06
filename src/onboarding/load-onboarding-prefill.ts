import type { EnforcementActionId } from '../core/types/enforcement';
import type { PolicyPreset } from '../core/types/policy';
import type { BotherCategory } from '../core/types/bother-keywords';
import { isBrowsingModeId, type BrowsingModeId } from '../core/modes/browsing-modes';
import { localeIdFromBrowserLanguage, resolveLocaleId } from '../i18n/registry';
import { LOCALE_STORAGE_KEY, type LocaleId } from '../i18n/types';
import { inferBotherCategoriesFromKeywords } from './infer-bother-categories';
import { enabledPresetIdsFromDomains, type SiteWhitelistPresetId } from '../core/rules/site-whitelist-presets';
import type { PreferredSite } from './types';

export type OnboardingPrefill = {
    readonly isSetupAgain: boolean;
    readonly localeId: LocaleId;
    readonly setupPath: 'preset-mode' | 'custom' | null;
    readonly browsingModeId: BrowsingModeId | null;
    readonly bothers: readonly BotherCategory[];
    readonly actionId: EnforcementActionId;
    readonly preset: PolicyPreset;
    readonly sites: readonly PreferredSite[];
    readonly whitelistPresetIds: readonly SiteWhitelistPresetId[];
};

const DEFAULT_BOTHERS: readonly BotherCategory[] = ['outrage', 'spam'];

export async function loadOnboardingPrefill(browserLanguage: string): Promise<OnboardingPrefill> {
    const result = await chrome.storage.local.get([
        LOCALE_STORAGE_KEY,
        'onboardingComplete',
        'activeBrowsingModeId',
        'policy',
        'enforcementAction',
        'userRules',
        'preferredSites',
    ]);

    const record = result as {
        readonly [LOCALE_STORAGE_KEY]?: string;
        readonly onboardingComplete?: boolean;
        readonly activeBrowsingModeId?: string | null;
        readonly policy?: { readonly preset?: PolicyPreset };
        readonly enforcementAction?: { readonly activeActionId?: EnforcementActionId };
        readonly userRules?: {
            readonly blockKeywords?: readonly string[];
            readonly allowDomains?: readonly string[];
        };
        readonly preferredSites?: readonly PreferredSite[];
    };

    const isSetupAgain = record.onboardingComplete === true;
    const storedLocale = record[LOCALE_STORAGE_KEY];
    const localeId = isSetupAgain && storedLocale
        ? resolveLocaleId(storedLocale)
        : localeIdFromBrowserLanguage(browserLanguage);

    const modeId =
        isSetupAgain &&
        record.activeBrowsingModeId &&
        isBrowsingModeId(record.activeBrowsingModeId)
            ? record.activeBrowsingModeId
            : null;

    const blockKeywords = record.userRules?.blockKeywords ?? [];
    const allowDomains = record.userRules?.allowDomains ?? [];
    const bothers =
        isSetupAgain && blockKeywords.length > 0
            ? inferBotherCategoriesFromKeywords(blockKeywords)
            : DEFAULT_BOTHERS;

    return {
        isSetupAgain,
        localeId,
        setupPath: modeId ? 'preset-mode' : isSetupAgain && blockKeywords.length > 0 ? 'custom' : null,
        browsingModeId: modeId,
        bothers,
        actionId: record.enforcementAction?.activeActionId ?? 'dim',
        preset: record.policy?.preset ?? 'balanced',
        sites: record.preferredSites?.length ? record.preferredSites : ['reddit'],
        whitelistPresetIds: isSetupAgain ? enabledPresetIdsFromDomains(allowDomains) : [],
    };
}
