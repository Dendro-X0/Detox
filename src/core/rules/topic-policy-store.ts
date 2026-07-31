import {
    DEFAULT_NEWS_DIET_POLICY,
    isTopicId,
    TOPIC_IDS,
    type TopicId,
    type TopicUserPolicy,
} from '../filtering/topic-types';

export type TopicPolicySettings = TopicUserPolicy & {
    /** When false, topic classifier returns no matches even if mod is enabled. */
    readonly enabled: boolean;
};

export const DEFAULT_TOPIC_POLICY: TopicPolicySettings = {
    enabled: false,
    blockTopics: [...DEFAULT_NEWS_DIET_POLICY.blockTopics],
    allowTopics: [...DEFAULT_NEWS_DIET_POLICY.allowTopics],
};

export type TopicPolicyStorageRecord = {
    readonly topicPolicy?: Partial<TopicPolicySettings> & {
        readonly blockTopics?: readonly string[];
        readonly allowTopics?: readonly string[];
    };
};

function normalizeTopicList(values: readonly string[] | undefined): readonly TopicId[] {
    if (!Array.isArray(values)) return [];
    return values.filter((value): value is TopicId => isTopicId(value));
}

function mergeTopicPolicyFromStorage(record: TopicPolicyStorageRecord): TopicPolicySettings {
    const stored = record.topicPolicy;
    if (!stored) return DEFAULT_TOPIC_POLICY;

    // Empty arrays are intentional (e.g. Express focus-calm seeds). Only fall
    // back to defaults when the field is missing, not when it is [].
    return {
        enabled: stored.enabled === true,
        blockTopics: Array.isArray(stored.blockTopics)
            ? normalizeTopicList(stored.blockTopics)
            : DEFAULT_TOPIC_POLICY.blockTopics,
        allowTopics: Array.isArray(stored.allowTopics)
            ? normalizeTopicList(stored.allowTopics)
            : DEFAULT_TOPIC_POLICY.allowTopics,
    };
}

/** @internal exported for unit tests */
export function parseTopicPolicyRecord(record: TopicPolicyStorageRecord): TopicPolicySettings {
    return mergeTopicPolicyFromStorage(record);
}

let currentPolicy: TopicPolicySettings = DEFAULT_TOPIC_POLICY;

export function getTopicPolicy(): TopicPolicySettings {
    return currentPolicy;
}

export function getActiveTopicUserPolicy(): TopicUserPolicy | null {
    if (!currentPolicy.enabled) return null;
    return {
        blockTopics: currentPolicy.blockTopics,
        allowTopics: currentPolicy.allowTopics,
    };
}

export async function loadTopicPolicy(): Promise<TopicPolicySettings> {
    const result = await chrome.storage.local.get('topicPolicy');
    currentPolicy = mergeTopicPolicyFromStorage(result as TopicPolicyStorageRecord);
    return currentPolicy;
}

export async function saveTopicPolicy(policy: TopicPolicySettings): Promise<void> {
    const normalized: TopicPolicySettings = {
        enabled: policy.enabled,
        blockTopics: policy.blockTopics.filter((id): id is TopicId => isTopicId(id)),
        allowTopics: policy.allowTopics.filter((id): id is TopicId => isTopicId(id)),
    };
    currentPolicy = normalized;
    await chrome.storage.local.set({ topicPolicy: normalized });
}

export function toggleTopicBlock(
    policy: TopicPolicySettings,
    topic: TopicId,
    blocked: boolean
): TopicPolicySettings {
    const blockSet = new Set(policy.blockTopics);
    const allowSet = new Set(policy.allowTopics);
    if (blocked) {
        blockSet.add(topic);
        allowSet.delete(topic);
    } else {
        blockSet.delete(topic);
    }
    return {
        ...policy,
        blockTopics: TOPIC_IDS.filter((id) => blockSet.has(id)),
        allowTopics: TOPIC_IDS.filter((id) => allowSet.has(id)),
    };
}

export function toggleTopicAllow(
    policy: TopicPolicySettings,
    topic: TopicId,
    allowed: boolean
): TopicPolicySettings {
    const blockSet = new Set(policy.blockTopics);
    const allowSet = new Set(policy.allowTopics);
    if (allowed) {
        allowSet.add(topic);
        blockSet.delete(topic);
    } else {
        allowSet.delete(topic);
    }
    return {
        ...policy,
        blockTopics: TOPIC_IDS.filter((id) => blockSet.has(id)),
        allowTopics: TOPIC_IDS.filter((id) => allowSet.has(id)),
    };
}

export function subscribeToTopicPolicyChanges(onChange: (policy: TopicPolicySettings) => void): void {
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.topicPolicy) {
            void loadTopicPolicy().then((policy) => onChange(policy));
        }
    });
}
