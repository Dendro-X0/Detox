import { getMergedAdaptationRules } from '../../../core/adaptation/adaptation-pack-registry';
import {
    getBrowsingMode,
    isBrowsingModeId,
    type BrowsingModeId,
} from '../../../core/modes/browsing-modes';
import { BOTHER_KEYWORD_MAP, type BotherCategory } from '../../../core/types/bother-keywords';
import {
    EXPRESS_PRESET_IDS,
    getExpressPreset,
    type ExpressPresetId,
} from '../../../onboarding/express-presets';

const DEFAULT_CATEGORIES: readonly BotherCategory[] = ['outrage', 'spam', 'engagement-bait'];

function keywordsFromCategories(categories: readonly BotherCategory[]): readonly string[] {
    const keywords = new Set<string>();
    for (const category of categories) {
        for (const keyword of BOTHER_KEYWORD_MAP[category]) {
            keywords.add(keyword);
        }
    }
    return [...keywords];
}

function isExpressPresetId(value: string): value is ExpressPresetId {
    return (EXPRESS_PRESET_IDS as readonly string[]).includes(value);
}

/**
 * Invisible noise engine — ignore user-authored block lists.
 * Sources: browsing mode bother maps + express extras + adaptation packs.
 * @see docs/planning/invisible-noise-engine.md
 */
export async function getActiveKeywords(): Promise<readonly string[]> {
    const stored = await chrome.storage.local.get(['activeBrowsingModeId', 'expressPresetId']);
    const record = stored as {
        readonly activeBrowsingModeId?: string | null;
        readonly expressPresetId?: string;
    };

    let categories: readonly BotherCategory[] = DEFAULT_CATEGORIES;
    const modeId = record.activeBrowsingModeId;
    if (typeof modeId === 'string' && isBrowsingModeId(modeId)) {
        categories = getBrowsingMode(modeId as BrowsingModeId).botherCategories;
    }

    const expressId = record.expressPresetId;
    if (typeof expressId === 'string' && isExpressPresetId(expressId)) {
        const extras = getExpressPreset(expressId).extraBotherCategories;
        categories = [...new Set([...categories, ...extras])];
    }

    const merged = getMergedAdaptationRules();
    return [...new Set([...keywordsFromCategories(categories), ...merged.supplementalKeywords])];
}

/** @deprecated Prefer getActiveKeywords — kept for tests that assert default set shape. */
export function defaultInvisibleEngineKeywords(): readonly string[] {
    return keywordsFromCategories(DEFAULT_CATEGORIES);
}
