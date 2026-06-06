import { BOTHER_KEYWORD_MAP, type BotherCategory } from '../core/types/bother-keywords';

const CATEGORY_IDS = Object.keys(BOTHER_KEYWORD_MAP) as BotherCategory[];

/** Map stored block keywords back to wizard topic categories when possible. */
export function inferBotherCategoriesFromKeywords(
    keywords: readonly string[]
): readonly BotherCategory[] {
    const normalized = new Set(keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean));
    const matched: BotherCategory[] = [];

    for (const category of CATEGORY_IDS) {
        const categoryKeywords = BOTHER_KEYWORD_MAP[category];
        if (categoryKeywords.some((keyword) => normalized.has(keyword.toLowerCase()))) {
            matched.push(category);
        }
    }

    return matched.length > 0 ? matched : ['outrage', 'spam'];
}
