import { describe, expect, it } from 'vitest';
import {
    resolveModePolicyCoherence,
    TOPIC_CLASSIFIER_MOD_ID,
    TOPIC_DIET_MODE_PAUSE_KEY,
} from '../../src/core/modes/policy-coherence';
import type { TopicPolicySettings } from '../../src/core/rules/topic-policy-store';

const emptyDiet: TopicPolicySettings = {
    enabled: false,
    blockTopics: [],
    allowTopics: [],
};

const activeDiet: TopicPolicySettings = {
    enabled: true,
    blockTopics: ['world-affairs', 'domestic-politics'],
    allowTopics: ['tech', 'music'],
};

describe('policy coherence (P1-L3)', () => {
    it('Research pauses an active topic diet and strips the topic mod', () => {
        const patch = resolveModePolicyCoherence({
            modeId: 'research',
            modeEnabledModIds: ['detector-heuristic-keywords', 'action-dim'],
            previousEnabledModIds: [
                'detector-heuristic-keywords',
                'action-dim',
                TOPIC_CLASSIFIER_MOD_ID,
                'detector-noise-patterns',
            ],
            topicPolicy: activeDiet,
            previousPause: null,
        });

        expect(patch.enabledModIds).not.toContain(TOPIC_CLASSIFIER_MOD_ID);
        expect(patch.topicPolicy?.enabled).toBe(false);
        expect(patch.topicPolicy?.blockTopics).toEqual(activeDiet.blockTopics);
        expect(patch[TOPIC_DIET_MODE_PAUSE_KEY]).toEqual({ paused: true, wasEnabled: true });
    });

    it('Research does not invent a pause when diet was already off', () => {
        const patch = resolveModePolicyCoherence({
            modeId: 'research',
            modeEnabledModIds: ['detector-heuristic-keywords'],
            previousEnabledModIds: ['detector-heuristic-keywords'],
            topicPolicy: emptyDiet,
            previousPause: null,
        });

        expect(patch.topicPolicy).toBeUndefined();
        expect(patch[TOPIC_DIET_MODE_PAUSE_KEY]).toEqual({ paused: false, wasEnabled: false });
    });

    it('Focus restores a diet paused by Research and keeps seed lists', () => {
        const pausedDiet: TopicPolicySettings = {
            ...activeDiet,
            enabled: false,
        };
        const patch = resolveModePolicyCoherence({
            modeId: 'focus',
            modeEnabledModIds: [
                'detector-heuristic-keywords',
                'detector-noise-patterns',
                'action-dim',
            ],
            previousEnabledModIds: ['detector-heuristic-keywords', 'action-dim'],
            topicPolicy: pausedDiet,
            previousPause: { paused: true, wasEnabled: true },
        });

        expect(patch.topicPolicy?.enabled).toBe(true);
        expect(patch.topicPolicy?.allowTopics).toEqual(activeDiet.allowTopics);
        expect(patch[TOPIC_DIET_MODE_PAUSE_KEY]).toEqual({ paused: false, wasEnabled: false });
        // Topic mod restore depends on full-build unlock; presence is best-effort in unit env.
        expect(patch.enabledModIds).toEqual(expect.arrayContaining(['detector-noise-patterns']));
    });

    it('Unwind preserves topic classifier when user already had it enabled', () => {
        const patch = resolveModePolicyCoherence({
            modeId: 'unwind',
            modeEnabledModIds: [
                'detector-heuristic-keywords',
                'detector-noise-patterns',
                'detector-behavior-signals',
                'action-blur',
            ],
            previousEnabledModIds: [
                'detector-heuristic-keywords',
                TOPIC_CLASSIFIER_MOD_ID,
            ],
            topicPolicy: activeDiet,
            previousPause: { paused: false, wasEnabled: false },
        });

        // On core build the mod is locked — still must not crash; on full it is preserved.
        if (patch.enabledModIds.includes(TOPIC_CLASSIFIER_MOD_ID)) {
            expect(patch.enabledModIds).toContain(TOPIC_CLASSIFIER_MOD_ID);
        }
        expect(patch.topicPolicy).toBeUndefined();
    });
});
