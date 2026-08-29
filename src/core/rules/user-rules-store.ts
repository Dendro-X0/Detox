import { DEFAULT_USER_RULES, type UserRulesSettings, type UserRulesStorageRecord } from '../types/user-rules';

function normalizeHost(hostname: string): string {
    return hostname.trim().toLowerCase().replace(/^www\./, '');
}

export function normalizeHostname(hostname: string): string {
    return normalizeHost(hostname);
}

export function isHostnameAllowlisted(hostname: string, allowDomains: readonly string[]): boolean {
    const host = normalizeHost(hostname);
    return allowDomains.some((domain) => {
        const normalized = normalizeHost(domain);
        return host === normalized || host.endsWith(`.${normalized}`);
    });
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
    return isHostnameAllowlisted(hostname, currentRules.allowDomains);
}

/** Assist-first: allow-keyword exemptions retired from UX; always false. */
export function textMatchesAllowKeywords(_text: string): boolean {
    return false;
}

export async function loadUserRules(): Promise<UserRulesSettings> {
    const result = await chrome.storage.local.get([
        'userRules',
        'userKeywords',
        'invisibleNoiseEngineMigrated',
    ]);
    const record = result as UserRulesStorageRecord & {
        readonly invisibleNoiseEngineMigrated?: boolean;
    };
    currentRules = mergeRulesFromStorage(record);

    // One-time: clear user-authored block/allow lists; domains kept. Mode re-apply restores engine keywords.
    if (!record.invisibleNoiseEngineMigrated) {
        const cleared: UserRulesSettings = {
            blockKeywords: [],
            allowKeywords: [],
            allowDomains: currentRules.allowDomains,
        };
        currentRules = cleared;
        await chrome.storage.local.set({
            userRules: cleared,
            userKeywords: [],
            invisibleNoiseEngineMigrated: true,
        });
    }

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
