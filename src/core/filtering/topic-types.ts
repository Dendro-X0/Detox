/** v0 topic taxonomy for semantic filtering research (Track D). */
export type TopicId =
    | 'world-affairs'
    | 'domestic-politics'
    | 'tech'
    | 'music'
    | 'culture-arts'
    | 'business'
    | 'health-science'
    | 'sports';

export const TOPIC_IDS: readonly TopicId[] = [
    'world-affairs',
    'domestic-politics',
    'tech',
    'music',
    'culture-arts',
    'business',
    'health-science',
    'sports',
] as const;

/** Default research policy: block news topics, allow tech/music/culture. */
export type TopicUserPolicy = {
    readonly blockTopics: readonly TopicId[];
    readonly allowTopics: readonly TopicId[];
};

export const DEFAULT_NEWS_DIET_POLICY: TopicUserPolicy = {
    blockTopics: ['world-affairs', 'domestic-politics'],
    allowTopics: ['tech', 'music', 'culture-arts'],
};

export function isTopicId(value: string): value is TopicId {
    return (TOPIC_IDS as readonly string[]).includes(value);
}
