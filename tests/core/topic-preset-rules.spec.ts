import { describe, expect, it } from 'vitest';
import { BOTHER_KEYWORD_MAP } from '../../src/core/types/bother-keywords';
import {
    disableTopicPreset,
    enableTopicPreset,
    isTopicPresetEnabled,
    partitionBlockKeywords,
} from '../../src/core/rules/topic-preset-rules';

describe('topic-preset-rules', () => {
    it('enables and disables a full preset group', () => {
        const empty: readonly string[] = [];
        const withOutrage = enableTopicPreset('outrage', empty);
        expect(isTopicPresetEnabled('outrage', withOutrage)).toBe(true);
        expect(withOutrage.length).toBe(BOTHER_KEYWORD_MAP.outrage.length);

        const cleared = disableTopicPreset('outrage', withOutrage);
        expect(isTopicPresetEnabled('outrage', cleared)).toBe(false);
        expect(cleared.length).toBe(0);
    });

    it('partitions preset and custom keywords', () => {
        const keywords = ['my-custom-term', ...BOTHER_KEYWORD_MAP.spam.slice(0, 2)];
        const { byCategory, custom } = partitionBlockKeywords(keywords);
        expect(custom).toEqual(['my-custom-term']);
        expect(byCategory.spam?.length).toBe(2);
    });
});
