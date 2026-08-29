import { getBuildProfile } from '../../build-profile';
import type { EnforcementActionId } from '../types/enforcement';
import { DEFAULT_ENFORCEMENT_ACTION_SETTINGS } from '../types/enforcement';
import { isModUnlocked, REQUIRED_MOD_IDS } from '../../mods/mod-manifest';
import type { PolicyPreset, PolicySettings } from '../types/policy';
import { PRESET_THRESHOLDS } from '../types/policy';
import type { UserRulesSettings } from '../types/user-rules';
import { BOTHER_KEYWORD_MAP, type BotherCategory } from '../types/bother-keywords';
import type { TopicPolicyStorageRecord } from '../rules/topic-policy-store';
import {
    FOCUS_ADAPTATION_MOD_IDS,
    RESEARCH_ADAPTATION_MOD_IDS,
    UNWIND_ADAPTATION_MOD_IDS,
} from './adaptation-mode-bundles';
import {
    loadTopicPolicyFromRecord,
    parseTopicDietModePause,
    resolveModePolicyCoherence,
    TOPIC_DIET_MODE_PAUSE_KEY,
} from './policy-coherence';

export type BrowsingModeId = 'focus' | 'research' | 'unwind';

export type BrowsingModeDefinition = {
    readonly id: BrowsingModeId;
    readonly label: string;
    readonly description: string;
    readonly preset: PolicyPreset;
    readonly botherCategories: readonly BotherCategory[];
    readonly actionId: EnforcementActionId;
    readonly hintModIds: readonly string[];
    readonly detectorModIds: readonly string[];
    readonly adaptationModIds: readonly string[];
};

export const BUILTIN_BROWSING_MODES: readonly BrowsingModeDefinition[] = [
    {
        id: 'focus',
        label: 'Focus',
        description: 'Balanced filtering for everyday browsing — outrage, spam, and bait.',
        preset: 'balanced',
        botherCategories: ['outrage', 'spam', 'engagement-bait'],
        actionId: 'dim',
        hintModIds: ['adapter-reddit'],
        detectorModIds: ['detector-noise-patterns', 'detector-behavior-signals'],
        adaptationModIds: [...FOCUS_ADAPTATION_MOD_IDS],
    },
    {
        id: 'research',
        label: 'Research',
        description: 'Conservative threshold with light keyword rules — fewer false positives.',
        preset: 'conservative',
        botherCategories: ['spam'],
        actionId: 'dim',
        hintModIds: [],
        detectorModIds: [],
        adaptationModIds: [...RESEARCH_ADAPTATION_MOD_IDS],
    },
    {
        id: 'unwind',
        label: 'Unwind',
        description: 'Strict filtering across common noise categories.',
        preset: 'strict',
        botherCategories: ['outrage', 'spam', 'hostile', 'engagement-bait', 'low-effort'],
        actionId: 'blur',
        hintModIds: ['adapter-reddit', 'adapter-youtube'],
        detectorModIds: ['detector-noise-patterns', 'detector-behavior-signals'],
        adaptationModIds: [...UNWIND_ADAPTATION_MOD_IDS],
    },
] as const;

const MODE_BY_ID = new Map(BUILTIN_BROWSING_MODES.map((mode) => [mode.id, mode] as const));

export function getBrowsingMode(id: BrowsingModeId): BrowsingModeDefinition {
    const mode = MODE_BY_ID.get(id);
    if (!mode) throw new Error(`Unknown browsing mode: ${id}`);
    return mode;
}

export function isBrowsingModeId(value: string): value is BrowsingModeId {
    return MODE_BY_ID.has(value as BrowsingModeId);
}

function keywordsFromCategories(categories: readonly BotherCategory[]): readonly string[] {
    const keywords = new Set<string>();
    for (const category of categories) {
        for (const keyword of BOTHER_KEYWORD_MAP[category]) {
            keywords.add(keyword);
        }
    }
    return [...keywords];
}

function resolveEnabledModIds(mode: BrowsingModeDefinition): readonly string[] {
    const profile = getBuildProfile();
    const ids = new Set<string>();
    for (const required of REQUIRED_MOD_IDS) {
        if (isModUnlocked(required, profile)) ids.add(required);
    }
    for (const modId of [...mode.hintModIds, ...mode.detectorModIds, ...mode.adaptationModIds]) {
        if (isModUnlocked(modId, profile)) ids.add(modId);
    }
    return [...ids];
}

function resolveActionId(preferred: EnforcementActionId): EnforcementActionId {
    const actionModId = `action-${preferred}`;
    if (isModUnlocked(actionModId, getBuildProfile())) return preferred;
    return DEFAULT_ENFORCEMENT_ACTION_SETTINGS.activeActionId;
}

export type BrowsingModeSettingsPatch = {
    readonly activeBrowsingModeId: BrowsingModeId;
    readonly policy: PolicySettings;
    readonly userRules: UserRulesSettings;
    readonly userKeywords: readonly string[];
    readonly enforcementAction: { readonly activeActionId: EnforcementActionId };
    readonly enabledModIds: readonly string[];
};

export function buildBrowsingModePatch(
    modeId: BrowsingModeId,
    preserveRules?: Pick<UserRulesSettings, 'allowKeywords' | 'allowDomains'>
): BrowsingModeSettingsPatch {
    const mode = getBrowsingMode(modeId);
    const blockKeywords = keywordsFromCategories(mode.botherCategories);

    return {
        activeBrowsingModeId: modeId,
        policy: {
            preset: mode.preset,
            threshold: PRESET_THRESHOLDS[mode.preset],
            perSite: {},
        },
        userRules: {
            blockKeywords,
            allowKeywords: preserveRules?.allowKeywords ?? [],
            allowDomains: preserveRules?.allowDomains ?? [],
        },
        userKeywords: blockKeywords,
        enforcementAction: { activeActionId: resolveActionId(mode.actionId) },
        enabledModIds: resolveEnabledModIds(mode),
    };
}

export async function loadPreserveRulesForModeSwitch(): Promise<
    Pick<UserRulesSettings, 'allowKeywords' | 'allowDomains'>
> {
    const result = await chrome.storage.local.get('userRules');
    const rules = (result as { userRules?: UserRulesSettings }).userRules;
    return {
        allowKeywords: [],
        allowDomains: rules?.allowDomains ?? [],
    };
}

export async function applyBrowsingMode(modeId: BrowsingModeId): Promise<void> {
    const preserve = await loadPreserveRulesForModeSwitch();
    const patch = buildBrowsingModePatch(modeId, preserve);

    const stored = await chrome.storage.local.get([
        'enabledModIds',
        'topicPolicy',
        TOPIC_DIET_MODE_PAUSE_KEY,
    ]);
    const previousEnabledModIds = Array.isArray(
        (stored as { readonly enabledModIds?: unknown }).enabledModIds
    )
        ? ((stored as { readonly enabledModIds: readonly string[] }).enabledModIds)
        : [];
    const topicPolicy = loadTopicPolicyFromRecord(stored as TopicPolicyStorageRecord);
    const previousPause = parseTopicDietModePause(
        (stored as Record<string, unknown>)[TOPIC_DIET_MODE_PAUSE_KEY]
    );

    const coherence = resolveModePolicyCoherence({
        modeId,
        modeEnabledModIds: patch.enabledModIds,
        previousEnabledModIds,
        topicPolicy,
        previousPause,
    });

    await chrome.storage.local.set({
        ...patch,
        ...coherence,
    });
}

export async function markSettingsCustomized(): Promise<void> {
    await chrome.storage.local.set({ activeBrowsingModeId: null });
}

export async function clearActiveBrowsingMode(): Promise<void> {
    await markSettingsCustomized();
}

export type BrowsingModeStorageRecord = {
    readonly activeBrowsingModeId?: BrowsingModeId | null;
};

export async function loadActiveBrowsingModeId(): Promise<BrowsingModeId | null> {
    const result = await chrome.storage.local.get('activeBrowsingModeId');
    const record = result as BrowsingModeStorageRecord;
    const id = record.activeBrowsingModeId;
    if (id && isBrowsingModeId(id)) return id;
    return null;
}
