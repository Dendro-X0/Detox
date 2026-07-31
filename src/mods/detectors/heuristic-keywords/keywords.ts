import { getMergedAdaptationRules } from '../../../core/adaptation/adaptation-pack-registry';
import { BOTHER_KEYWORD_MAP, type BotherCategory } from '../../../core/types/bother-keywords';
import { getUserRules, loadUserRules } from '../../../core/rules/user-rules-store';

const DEFAULT_CATEGORIES: readonly BotherCategory[] = ['outrage', 'spam', 'engagement-bait'];

function defaultBlockKeywords(): readonly string[] {
    const keywords = new Set<string>();
    for (const category of DEFAULT_CATEGORIES) {
        for (const keyword of BOTHER_KEYWORD_MAP[category]) {
            keywords.add(keyword);
        }
    }
    return [...keywords];
}

export async function getActiveKeywords(): Promise<readonly string[]> {
    await loadUserRules();
    const custom = getUserRules().blockKeywords;

    if (custom.length === 0) {
        const merged = getMergedAdaptationRules();
        return [...new Set([...defaultBlockKeywords(), ...merged.supplementalKeywords])];
    }

    const merged = getMergedAdaptationRules();
    return [...new Set([...custom, ...merged.supplementalKeywords])];
}
