import { getBuildProfile } from '../build-profile';
import { buildBrowsingModePatch } from '../core/modes/browsing-modes';
import { DEFAULT_ENFORCEMENT_ACTION_SETTINGS } from '../core/types/enforcement';
import { PRESET_THRESHOLDS } from '../core/types/policy';
import { DEFAULT_ROUTING_SETTINGS } from '../core/types/routing';
import { DEFAULT_USER_RULES } from '../core/types/user-rules';
import { isModUnlocked, REQUIRED_MOD_IDS } from '../mods/mod-manifest';
import { LOCALE_STORAGE_KEY } from '../i18n/types';
import { domainsFromPresetIds } from '../core/rules/site-whitelist-presets';
import { BOTHER_KEYWORD_MAP, type OnboardingDraft } from './types';

function resolveAllowDomains(draft: OnboardingDraft): readonly string[] {
    return domainsFromPresetIds(draft.whitelistPresetIds ?? []);
}

function keywordsFromBothers(bothers: readonly (keyof typeof BOTHER_KEYWORD_MAP)[]): readonly string[] {
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

export function buildPresetModeOnboardingPatch(
    draft: Extract<OnboardingDraft, { setupPath: 'preset-mode' }>
): Record<string, unknown> {
    const allowDomains = resolveAllowDomains(draft);
    const modePatch = buildBrowsingModePatch(draft.browsingModeId, {
        allowDomains,
        allowKeywords: [],
    });
    return {
        ...INFERENCE_DEFAULTS,
        [LOCALE_STORAGE_KEY]: draft.localeId,
        ...modePatch,
    };
}

export function buildCustomOnboardingPatch(draft: Extract<OnboardingDraft, { setupPath: 'custom' }>): Record<string, unknown> {
    const preset = draft.preset;
    const blockKeywords = keywordsFromBothers(draft.bothers);
    const allowDomains = resolveAllowDomains(draft);

    return {
        ...INFERENCE_DEFAULTS,
        [LOCALE_STORAGE_KEY]: draft.localeId,
        activeBrowsingModeId: null,
        userRules: {
            ...DEFAULT_USER_RULES,
            blockKeywords,
            allowDomains,
        },
        userKeywords: blockKeywords,
        enabledModIds: resolveCustomEnabledModIds(),
        policy: {
            preset,
            threshold: PRESET_THRESHOLDS[preset],
            perSite: {},
        },
        enforcementAction: {
            activeActionId: draft.actionId ?? DEFAULT_ENFORCEMENT_ACTION_SETTINGS.activeActionId,
        },
    };
}

export function buildOnboardingStoragePatch(draft: OnboardingDraft): Record<string, unknown> {
    if (draft.setupPath === 'preset-mode') {
        return buildPresetModeOnboardingPatch(draft);
    }
    return buildCustomOnboardingPatch(draft);
}

export async function applyOnboardingDraft(draft: OnboardingDraft): Promise<void> {
    await chrome.storage.local.set(buildOnboardingStoragePatch(draft));
}
