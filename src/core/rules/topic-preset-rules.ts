import {
    BOTHER_KEYWORD_MAP,
    type BotherCategory,
} from '../types/bother-keywords';

export const TOPIC_PRESET_IDS: readonly BotherCategory[] = [
    'outrage',
    'spam',
    'hostile',
    'engagement-bait',
    'low-effort',
    'geopolitics',
];

const ALL_PRESET_KEYWORDS = new Set(
    Object.values(BOTHER_KEYWORD_MAP).flatMap((keywords) => keywords.map((k) => k.toLowerCase()))
);

export function isTopicPresetEnabled(
    category: BotherCategory,
    blockKeywords: readonly string[]
): boolean {
    const preset = BOTHER_KEYWORD_MAP[category];
    const blocked = new Set(blockKeywords.map((k) => k.toLowerCase()));
    return preset.every((keyword) => blocked.has(keyword.toLowerCase()));
}

export function enableTopicPreset(
    category: BotherCategory,
    blockKeywords: readonly string[]
): readonly string[] {
    return [...new Set([...blockKeywords, ...BOTHER_KEYWORD_MAP[category]])];
}

export function disableTopicPreset(
    category: BotherCategory,
    blockKeywords: readonly string[]
): readonly string[] {
    const remove = new Set(BOTHER_KEYWORD_MAP[category].map((k) => k.toLowerCase()));
    return blockKeywords.filter((keyword) => !remove.has(keyword.toLowerCase()));
}

export function partitionBlockKeywords(blockKeywords: readonly string[]): {
    readonly byCategory: Readonly<Partial<Record<BotherCategory, readonly string[]>>>;
    readonly custom: readonly string[];
} {
    const blocked = [...blockKeywords];
    const assigned = new Set<string>();
    const byCategory: Partial<Record<BotherCategory, string[]>> = {};

    for (const category of TOPIC_PRESET_IDS) {
        const preset = BOTHER_KEYWORD_MAP[category];
        const matches = blocked.filter((keyword) =>
            preset.some((entry) => entry.toLowerCase() === keyword.toLowerCase())
        );
        if (matches.length > 0) {
            byCategory[category] = matches;
            for (const keyword of matches) assigned.add(keyword.toLowerCase());
        }
    }

    const custom = blocked.filter((keyword) => !assigned.has(keyword.toLowerCase()));
    return { byCategory, custom };
}

export function isPresetManagedKeyword(keyword: string): boolean {
    return ALL_PRESET_KEYWORDS.has(keyword.toLowerCase());
}
