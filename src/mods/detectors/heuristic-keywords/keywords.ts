const BUILTIN_KEYWORDS: readonly string[] = ['kill', 'kys', 'die', 'stupid', 'idiot', 'moron'] as const;

export async function getActiveKeywords(): Promise<readonly string[]> {
    const result = await chrome.storage.local.get('userKeywords');
    const record = result as { readonly userKeywords?: unknown };
    const custom = record.userKeywords;

    if (!Array.isArray(custom)) {
        return BUILTIN_KEYWORDS;
    }

    const normalized = custom
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0);

    if (normalized.length === 0) {
        return BUILTIN_KEYWORDS;
    }

    return [...new Set([...BUILTIN_KEYWORDS, ...normalized])];
}
