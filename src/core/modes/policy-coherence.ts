import { isFullBuild } from '../../build-profile';
import { isModUnlocked } from '../../mods/mod-manifest';
import {
    parseTopicPolicyRecord,
    type TopicPolicySettings,
    type TopicPolicyStorageRecord,
} from '../rules/topic-policy-store';
import type { BrowsingModeId } from './browsing-modes';

export const TOPIC_CLASSIFIER_MOD_ID = 'detector-topic-classifier';

/** Set when Research mode pauses an active topic diet so Focus/Unwind can restore it. */
export const TOPIC_DIET_MODE_PAUSE_KEY = 'topicDietPausedByBrowsingMode';

export type TopicDietModePause = {
    readonly paused: boolean;
    readonly wasEnabled: boolean;
};

export type ModePolicyCoherenceInput = {
    readonly modeId: BrowsingModeId;
    readonly modeEnabledModIds: readonly string[];
    readonly previousEnabledModIds: readonly string[];
    readonly topicPolicy: TopicPolicySettings;
    readonly previousPause: TopicDietModePause | null;
};

export type ModePolicyCoherencePatch = {
    readonly enabledModIds: readonly string[];
    readonly topicPolicy?: TopicPolicySettings;
    readonly [TOPIC_DIET_MODE_PAUSE_KEY]?: TopicDietModePause;
};

export function parseTopicDietModePause(value: unknown): TopicDietModePause | null {
    if (!value || typeof value !== 'object') return null;
    const record = value as { readonly paused?: unknown; readonly wasEnabled?: unknown };
    if (typeof record.paused !== 'boolean' || typeof record.wasEnabled !== 'boolean') {
        return null;
    }
    return { paused: record.paused, wasEnabled: record.wasEnabled };
}

function canPreserveTopicClassifier(): boolean {
    return isFullBuild() && isModUnlocked(TOPIC_CLASSIFIER_MOD_ID, 'full');
}

/**
 * Keep mode + packs + topic diet from fighting (P1-L3).
 * - Research stays conservative: topic diet enforcement off; topic mod not enabled by mode.
 * - Focus/Unwind: preserve a user-enabled topic classifier across mode switches; restore diet
 *   if Research had paused it.
 */
export function resolveModePolicyCoherence(
    input: ModePolicyCoherenceInput
): ModePolicyCoherencePatch {
    const hadTopicMod = input.previousEnabledModIds.includes(TOPIC_CLASSIFIER_MOD_ID);
    const baseMods = input.modeEnabledModIds.filter((id) => id !== TOPIC_CLASSIFIER_MOD_ID);

    if (input.modeId === 'research') {
        const wasEnabled = input.topicPolicy.enabled === true;
        const enabledModIds = baseMods;
        if (!wasEnabled) {
            return {
                enabledModIds,
                [TOPIC_DIET_MODE_PAUSE_KEY]: { paused: false, wasEnabled: false },
            };
        }
        return {
            enabledModIds,
            topicPolicy: { ...input.topicPolicy, enabled: false },
            [TOPIC_DIET_MODE_PAUSE_KEY]: { paused: true, wasEnabled: true },
        };
    }

    const restoreDiet =
        input.previousPause?.paused === true && input.previousPause.wasEnabled === true;
    const keepTopicMod = canPreserveTopicClassifier() && (hadTopicMod || restoreDiet);
    const enabledModIds = keepTopicMod ? [...baseMods, TOPIC_CLASSIFIER_MOD_ID] : baseMods;

    if (restoreDiet) {
        return {
            enabledModIds,
            topicPolicy: { ...input.topicPolicy, enabled: true },
            [TOPIC_DIET_MODE_PAUSE_KEY]: { paused: false, wasEnabled: false },
        };
    }

    return {
        enabledModIds,
        [TOPIC_DIET_MODE_PAUSE_KEY]: { paused: false, wasEnabled: false },
    };
}

export function loadTopicPolicyFromRecord(record: TopicPolicyStorageRecord): TopicPolicySettings {
    return parseTopicPolicyRecord(record);
}
