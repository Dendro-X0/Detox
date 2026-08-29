import { getBuildProfile } from '../build-profile';
import { buildBrowsingModePatch, getBrowsingMode } from '../core/modes/browsing-modes';
import { DEFAULT_ENFORCEMENT_ACTION_SETTINGS } from '../core/types/enforcement';
import { PRESET_THRESHOLDS } from '../core/types/policy';
import { DEFAULT_ROUTING_SETTINGS } from '../core/types/routing';
import { isModUnlocked, REQUIRED_MOD_IDS } from '../mods/mod-manifest';
import { LOCALE_STORAGE_KEY } from '../i18n/types';
import { domainsFromPresetIds, type SiteWhitelistPresetId } from '../core/rules/site-whitelist-presets';
import { BOTHER_KEYWORD_MAP, type BotherCategory } from '../core/types/bother-keywords';
import { buildWizardAssistSettings, buildWizardAuthenticitySettings } from './authenticity-opt-in';
import { getExpressPreset } from './express-presets';
import type { OnboardingDraft } from './types';

function resolveAllowDomains(
    whitelistPresetIds: readonly SiteWhitelistPresetId[] | undefined
): readonly string[] {
    return domainsFromPresetIds(whitelistPresetIds ?? []);
}

function keywordsFromBothers(bothers: readonly BotherCategory[]): readonly string[] {
    const keywords = new Set<string>();
    for (const category of bothers) {
        for (const keyword of BOTHER_KEYWORD_MAP[category]) {
            keywords.add(keyword);
        }
    }
    return [...keywords];
}

function resolveCustomEnabledModIds(): readonly string[] {
    const profile = getBuildProfile();
    const ids = new Set<string>();
    for (const required of REQUIRED_MOD_IDS) {
        if (isModUnlocked(required, profile)) ids.add(required);
    }
    if (isModUnlocked('detector-noise-patterns', profile)) {
        ids.add('detector-noise-patterns');
    }
    if (isModUnlocked('detector-behavior-signals', profile)) {
        ids.add('detector-behavior-signals');
    }
    return [...ids];
}

const INFERENCE_DEFAULTS = {
    inferenceRouting: {
        ...DEFAULT_ROUTING_SETTINGS,
        primaryMode: 'heuristic' as const,
    },
    preferredDetectorId: 'heuristic-keywords',
    enabled: true,
    onboardingComplete: true,
};

function assistPatchForDraft(draft: OnboardingDraft): Record<string, unknown> {
    return {
        assistSettings: buildWizardAssistSettings(draft.authenticityAssist),
        authenticitySettings: buildWizardAuthenticitySettings(draft.authenticityAssist),
    };
}

export function buildPresetModeOnboardingPatch(
    draft: Extract<OnboardingDraft, { setupPath: 'preset-mode' }>
): Record<string, unknown> {
    const allowDomains = resolveAllowDomains(draft.whitelistPresetIds);
    const modePatch = buildBrowsingModePatch(draft.browsingModeId, {
        allowDomains,
        allowKeywords: [],
    });
    return {
        ...INFERENCE_DEFAULTS,
        [LOCALE_STORAGE_KEY]: draft.localeId,
        ...modePatch,
        ...assistPatchForDraft(draft),
    };
}

/**
 * Express lifestyle preset: browsing mode + optional extra noise categories (engine)
 * + topic-diet seeds (stored disabled until Layer 2 is turned on).
 * Keyword lists in storage are engine mirrors only — not user-edited.
 */
export function buildExpressOnboardingPatch(
    draft: Extract<OnboardingDraft, { setupPath: 'express' }>
): Record<string, unknown> {
    const express = getExpressPreset(draft.expressPresetId);
    const mode = getBrowsingMode(express.browsingModeId);
    const whitelistIds = [
        ...new Set([...(express.whitelistPresetIds ?? []), ...(draft.whitelistPresetIds ?? [])]),
    ];
    const allowDomains = resolveAllowDomains(whitelistIds);
    const modePatch = buildBrowsingModePatch(express.browsingModeId, {
        allowDomains,
        allowKeywords: [],
    });

    const mergedCategories = [
        ...new Set([...mode.botherCategories, ...express.extraBotherCategories]),
    ];
    const blockKeywords = keywordsFromBothers(mergedCategories);
    const policyPreset = express.policyPreset ?? mode.preset;

    return {
        ...INFERENCE_DEFAULTS,
        [LOCALE_STORAGE_KEY]: draft.localeId,
        ...modePatch,
        policy: {
            preset: policyPreset,
            threshold: PRESET_THRESHOLDS[policyPreset],
            perSite: {},
        },
        userRules: {
            ...modePatch.userRules,
            blockKeywords,
            allowDomains,
            allowKeywords: [],
        },
        userKeywords: blockKeywords,
        topicPolicy: express.topicPolicy,
        expressPresetId: express.id,
        ...assistPatchForDraft(draft),
    };
}

/** Custom path: mode + style/sensitivity — no user keyword lists. */
export function buildCustomOnboardingPatch(draft: Extract<OnboardingDraft, { setupPath: 'custom' }>): Record<string, unknown> {
    const allowDomains = resolveAllowDomains(draft.whitelistPresetIds);
    const modePatch = buildBrowsingModePatch(draft.browsingModeId, {
        allowDomains,
        allowKeywords: [],
    });

    return {
        ...INFERENCE_DEFAULTS,
        [LOCALE_STORAGE_KEY]: draft.localeId,
        ...modePatch,
        enabledModIds: resolveCustomEnabledModIds().length
            ? resolveCustomEnabledModIds()
            : modePatch.enabledModIds,
        policy: {
            preset: draft.preset,
            threshold: PRESET_THRESHOLDS[draft.preset],
            perSite: {},
        },
        enforcementAction: {
            activeActionId: draft.actionId ?? DEFAULT_ENFORCEMENT_ACTION_SETTINGS.activeActionId,
        },
        ...assistPatchForDraft(draft),
    };
}

export function buildOnboardingStoragePatch(draft: OnboardingDraft): Record<string, unknown> {
    if (draft.setupPath === 'preset-mode') {
        return buildPresetModeOnboardingPatch(draft);
    }
    if (draft.setupPath === 'express') {
        return buildExpressOnboardingPatch(draft);
    }
    return buildCustomOnboardingPatch(draft);
}

export async function applyOnboardingDraft(draft: OnboardingDraft): Promise<void> {
    await chrome.storage.local.set(buildOnboardingStoragePatch(draft));
}
