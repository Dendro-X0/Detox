import { DEFAULT_USER_RULES, type UserRulesSettings, type UserRulesStorageRecord } from '../types/user-rules';

function normalizeHost(hostname: string): string {
    return hostname.trim().toLowerCase().replace(/^www\./, '');
}

function normalizeKeywordList(values: readonly string[]): readonly string[] {
    const normalized = values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0);
    return [...new Set(normalized)];
}

function mergeRulesFromStorage(record: UserRulesStorageRecord): UserRulesSettings {
    const fromRules = record.userRules;
    const legacyKeywords = record.userKeywords;

    const blockKeywords = normalizeKeywordList(
        fromRules?.blockKeywords?.length
            ? fromRules.blockKeywords
            : Array.isArray(legacyKeywords)
                ? legacyKeywords.filter((value): value is string => typeof value === 'string')
                : []
    );

    return {
        blockKeywords,
        allowKeywords: normalizeKeywordList(fromRules?.allowKeywords ?? []),
        allowDomains: normalizeKeywordList(fromRules?.allowDomains ?? []).map((domain) =>
            domain.replace(/^https?:\/\//, '').split('/')[0] ?? domain
        ),
    };
}

let currentRules: UserRulesSettings = DEFAULT_USER_RULES;

export function getUserRules(): UserRulesSettings {
    return currentRules;
}

export function isDomainAllowlisted(hostname: string): boolean {
    const host = normalizeHost(hostname);
    return currentRules.allowDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function textMatchesAllowKeywords(text: string): boolean {
    const normalized = text.toLowerCase();
    return currentRules.allowKeywords.some((keyword) => normalized.includes(keyword));
}

export async function loadUserRules(): Promise<UserRulesSettings> {
    const result = await chrome.storage.local.get(['userRules', 'userKeywords']);
    const record = result as UserRulesStorageRecord;
    currentRules = mergeRulesFromStorage(record);
    return currentRules;
}

export async function saveUserRules(rules: UserRulesSettings): Promise<void> {
    const normalized: UserRulesSettings = {
        blockKeywords: normalizeKeywordList(rules.blockKeywords),
        allowKeywords: normalizeKeywordList(rules.allowKeywords),
        allowDomains: normalizeKeywordList(rules.allowDomains),
    };
    currentRules = normalized;
    await chrome.storage.local.set({
        userRules: normalized,
        userKeywords: normalized.blockKeywords,
    });
}

export function subscribeToUserRulesChanges(onChange: (rules: UserRulesSettings) => void): void {
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.userRules || changes.userKeywords) {
            void loadUserRules().then((rules) => onChange(rules));
        }
    });
}

export function installUserRulesLoader(): void {
    void loadUserRules();
    subscribeToUserRulesChanges(() => {
        // Reads via getUserRules() stay fresh.
    });
}
