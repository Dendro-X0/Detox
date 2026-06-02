import { getUserRules, loadUserRules } from '../../../core/rules/user-rules-store';

const BUILTIN_KEYWORDS: readonly string[] = ['kill', 'kys', 'die', 'stupid', 'idiot', 'moron'] as const;

export async function getActiveKeywords(): Promise<readonly string[]> {
    await loadUserRules();
    const custom = getUserRules().blockKeywords;

    if (custom.length === 0) {
        return BUILTIN_KEYWORDS;
    }

    return [...new Set([...BUILTIN_KEYWORDS, ...custom])];
}
