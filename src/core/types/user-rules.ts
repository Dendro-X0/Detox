export type UserRulesSettings = {
    /** Keywords that increase likelihood of filtering (heuristic). */
    readonly blockKeywords: readonly string[];
    /** Keywords that never get filtered even if score is high. */
    readonly allowKeywords: readonly string[];
    /** Domains where filtering is paused entirely. */
    readonly allowDomains: readonly string[];
};

export const DEFAULT_USER_RULES: UserRulesSettings = {
    blockKeywords: [],
    allowKeywords: [],
    allowDomains: [],
};

export type UserRulesStorageRecord = {
    readonly userRules?: UserRulesSettings;
    /** @deprecated Use userRules.blockKeywords */
    readonly userKeywords?: readonly string[];
};
