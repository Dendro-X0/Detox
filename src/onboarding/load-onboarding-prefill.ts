import type { EnforcementActionId } from '../core/types/enforcement';
import type { PolicyPreset } from '../core/types/policy';
import { isBrowsingModeId, type BrowsingModeId } from '../core/modes/browsing-modes';
import { localeIdFromBrowserLanguage, resolveLocaleId } from '../i18n/registry';
import { LOCALE_STORAGE_KEY, type LocaleId } from '../i18n/types';
import { enabledPresetIdsFromDomains, type SiteWhitelistPresetId } from '../core/rules/site-whitelist-presets';
import { isExpressPresetId, type ExpressPresetId } from './express-presets';
import type { PreferredSite } from './types';

export type OnboardingPrefill = {
    readonly isSetupAgain: boolean;
    readonly localeId: LocaleId;
    readonly setupPath: 'express' | 'preset-mode' | 'custom' | null;
    readonly expressPresetId: ExpressPresetId | null;
    readonly browsingModeId: BrowsingModeId | null;
    readonly actionId: EnforcementActionId;
    readonly preset: PolicyPreset;
    readonly sites: readonly PreferredSite[];
    readonly whitelistPresetIds: readonly SiteWhitelistPresetId[];
    readonly assistEnabled: boolean;
    readonly verifyEnabled: boolean;
    readonly authenticityLlmApiKey: string;
};

export async function loadOnboardingPrefill(browserLanguage: string): Promise<OnboardingPrefill> {
    const result = await chrome.storage.local.get([
        LOCALE_STORAGE_KEY,
        'onboardingComplete',
        'activeBrowsingModeId',
        'policy',
        'enforcementAction',
        'userRules',
        'preferredSites',
        'authenticitySettings',
        'assistSettings',
        'expressPresetId',
    ]);

    const record = result as {
        readonly [LOCALE_STORAGE_KEY]?: string;
        readonly onboardingComplete?: boolean;
        readonly activeBrowsingModeId?: string | null;
        readonly policy?: { readonly preset?: PolicyPreset };
        readonly enforcementAction?: { readonly activeActionId?: EnforcementActionId };
        readonly userRules?: {
            readonly allowDomains?: readonly string[];
        };
        readonly preferredSites?: readonly PreferredSite[];
        readonly authenticitySettings?: { readonly enabled?: boolean; readonly llmApiKey?: string };
        readonly assistSettings?: { readonly selectionToolbarEnabled?: boolean };
        readonly expressPresetId?: string;
    };

    const isSetupAgain = record.onboardingComplete === true;
    const storedLocale = record[LOCALE_STORAGE_KEY];
    const localeId = isSetupAgain && storedLocale
        ? resolveLocaleId(storedLocale)
        : localeIdFromBrowserLanguage(browserLanguage);

    const expressPresetId =
        isSetupAgain && record.expressPresetId && isExpressPresetId(record.expressPresetId)
            ? record.expressPresetId
            : null;

    const modeId =
        isSetupAgain &&
        record.activeBrowsingModeId &&
        isBrowsingModeId(record.activeBrowsingModeId)
            ? record.activeBrowsingModeId
            : null;

    const allowDomains = record.userRules?.allowDomains ?? [];

    const authSettings = record.authenticitySettings;
    const assistSettings = record.assistSettings;
    const assistEnabled =
        isSetupAgain && assistSettings?.selectionToolbarEnabled === true;
    const verifyEnabled = isSetupAgain && authSettings?.enabled === true;
    const authenticityLlmApiKey =
        isSetupAgain && authSettings?.llmApiKey ? authSettings.llmApiKey : '';

    const setupPath = expressPresetId
        ? 'express'
        : modeId
          ? 'preset-mode'
          : isSetupAgain
            ? 'custom'
            : null;

    return {
        isSetupAgain,
        localeId,
        setupPath,
        expressPresetId,
        browsingModeId: modeId,
        actionId: record.enforcementAction?.activeActionId ?? 'dim',
        preset: record.policy?.preset ?? 'balanced',
        sites: record.preferredSites?.length ? record.preferredSites : ['reddit'],
        whitelistPresetIds: isSetupAgain ? enabledPresetIdsFromDomains(allowDomains) : [],
        assistEnabled,
        verifyEnabled,
        authenticityLlmApiKey,
    };
}
