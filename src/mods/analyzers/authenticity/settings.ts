export type AuthenticitySearchProvider = 'none' | 'wikipedia' | 'brave' | 'custom';

export type AuthenticitySettings = {
    readonly enabled: boolean;
    readonly tierT0: boolean;
    readonly tierT2: boolean;
    readonly tierT3: boolean;
    /** When true, skip LLM synthesis even if T3 is enabled. */
    readonly searchOnlyDefault: boolean;
    readonly maxClaims: number;
    readonly maxSearchResults: number;
    readonly maxSnippetChars: number;
    readonly dailyQuota: number;
    readonly searchProvider: AuthenticitySearchProvider;
    readonly braveApiKey: string;
    readonly customSearchUrl: string;
    readonly llmEndpoint: string;
    readonly llmApiKey: string;
    readonly llmModel: string;
    readonly extraAllowedDomains: readonly string[];
};

export const DEFAULT_AUTHENTICITY_SETTINGS: AuthenticitySettings = {
    enabled: false,
    tierT0: true,
    tierT2: true,
    tierT3: false,
    searchOnlyDefault: true,
    maxClaims: 3,
    maxSearchResults: 5,
    maxSnippetChars: 1200,
    dailyQuota: 20,
    searchProvider: 'wikipedia',
    braveApiKey: '',
    customSearchUrl: '',
    llmEndpoint: '',
    llmApiKey: '',
    llmModel: 'gpt-4o-mini',
    extraAllowedDomains: [],
};

export type AuthenticityQuotaState = {
    readonly date: string;
    readonly used: number;
};

export type AuthenticityStorageRecord = {
    readonly authenticitySettings?: AuthenticitySettings;
    readonly authenticityQuota?: AuthenticityQuotaState;
};
