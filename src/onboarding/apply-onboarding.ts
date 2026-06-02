import { DEFAULT_ENFORCEMENT_ACTION_SETTINGS } from '../core/types/enforcement';
import { PRESET_THRESHOLDS } from '../core/types/policy';
import { DEFAULT_ROUTING_SETTINGS } from '../core/types/routing';
import { DEFAULT_USER_RULES } from '../core/types/user-rules';
import { BOTHER_KEYWORD_MAP, SITE_MOD_MAP, type OnboardingDraft } from './types';

function keywordsFromBothers(bothers: OnboardingDraft['bothers']): readonly string[] {
    const keywords = new Set<string>();
    for (const category of bothers) {
        for (const keyword of BOTHER_KEYWORD_MAP[category]) {
            keywords.add(keyword);
        }
    }
    return [...keywords];
}

export function buildOnboardingStoragePatch(draft: OnboardingDraft): Record<string, unknown> {
    const preset = draft.preset;
    const enabledModIds = draft.sites.map((site) => SITE_MOD_MAP[site]);

    const blockKeywords = keywordsFromBothers(draft.bothers);

    return {
        onboardingComplete: true,
        enabled: true,
        userRules: {
            ...DEFAULT_USER_RULES,
            blockKeywords,
        },
        userKeywords: blockKeywords,
        preferredSites: draft.sites,
        enabledModIds,
        policy: {
            preset,
            threshold: PRESET_THRESHOLDS[preset],
            perSite: {},
        },
        inferenceRouting: {
            ...DEFAULT_ROUTING_SETTINGS,
            primaryMode: 'heuristic',
        },
        enforcementAction: {
            activeActionId: draft.actionId ?? DEFAULT_ENFORCEMENT_ACTION_SETTINGS.activeActionId,
        },
        preferredDetectorId: 'heuristic-keywords',
    };
}

export async function applyOnboardingDraft(draft: OnboardingDraft): Promise<void> {
    await chrome.storage.local.set(buildOnboardingStoragePatch(draft));
}
