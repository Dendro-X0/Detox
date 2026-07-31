import { describe, expect, it } from 'vitest';
import {
    DEFAULT_TOPIC_POLICY,
    parseTopicPolicyRecord,
} from '../../src/core/rules/topic-policy-store';
import { buildExpressOnboardingPatch } from '../../src/onboarding/apply-onboarding';

describe('topic policy storage merge', () => {
    it('preserves empty block/allow lists from Express focus-calm seeds', () => {
        const patch = buildExpressOnboardingPatch({
            setupPath: 'express',
            expressPresetId: 'focus-calm',
            localeId: 'en',
        });
        const parsed = parseTopicPolicyRecord({
            topicPolicy: patch.topicPolicy as {
                enabled: boolean;
                blockTopics: readonly string[];
                allowTopics: readonly string[];
            },
        });
        expect(parsed.enabled).toBe(false);
        expect(parsed.blockTopics).toEqual([]);
        expect(parsed.allowTopics).toEqual([]);
        expect(parsed.blockTopics).not.toEqual(DEFAULT_TOPIC_POLICY.blockTopics);
    });

    it('preserves tech-music allow/block seeds without enabling diet', () => {
        const patch = buildExpressOnboardingPatch({
            setupPath: 'express',
            expressPresetId: 'tech-music',
            localeId: 'en',
        });
        const parsed = parseTopicPolicyRecord({
            topicPolicy: patch.topicPolicy as {
                enabled: boolean;
                blockTopics: readonly string[];
                allowTopics: readonly string[];
            },
        });
        expect(parsed).toEqual({
            enabled: false,
            blockTopics: ['world-affairs', 'domestic-politics'],
            allowTopics: ['tech', 'music', 'culture-arts'],
        });
    });

    it('falls back to defaults only when topic lists are omitted', () => {
        const parsed = parseTopicPolicyRecord({
            topicPolicy: { enabled: true },
        });
        expect(parsed.enabled).toBe(true);
        expect(parsed.blockTopics).toEqual(DEFAULT_TOPIC_POLICY.blockTopics);
        expect(parsed.allowTopics).toEqual(DEFAULT_TOPIC_POLICY.allowTopics);
    });

    it('filters invalid topic ids from stored lists', () => {
        const parsed = parseTopicPolicyRecord({
            topicPolicy: {
                enabled: false,
                blockTopics: ['world-affairs', 'not-a-topic'],
                allowTopics: ['tech', 'bogus'],
            },
        });
        expect(parsed.blockTopics).toEqual(['world-affairs']);
        expect(parsed.allowTopics).toEqual(['tech']);
    });
});
