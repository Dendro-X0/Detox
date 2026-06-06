export type AuthenticitySearchProvider = 'none' | 'wikipedia' | 'claimreview' | 'brave' | 'custom';

export type AuthenticitySettings = {
    readonly enabled: boolean;
    readonly tierT0: boolean;
    readonly tierT1: boolean;
    readonly tierT2: boolean;
    readonly tierT3: boolean;
    /** When true, skip LLM synthesis even if T3 is enabled. */
    readonly searchOnlyDefault: boolean;
    /** Allow full-page scope in the side panel (discouraged on dense sites). */
    readonly allowFullPage: boolean;
    readonly maxClaims: number;
    readonly maxSearchResults: number;
    readonly maxSnippetChars: number;
    readonly dailyQuota: number;
    readonly searchProvider: AuthenticitySearchProvider;
    readonly factCheckApiKey: string;
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
    tierT1: true,
    tierT2: true,
    tierT3: false,
    searchOnlyDefault: true,
    allowFullPage: true,
    maxClaims: 3,
    maxSearchResults: 5,
    maxSnippetChars: 1200,
    dailyQuota: 20,
    searchProvider: 'wikipedia',
    factCheckApiKey: '',
    braveApiKey: '',
    customSearchUrl: '',
    llmEndpoint: '',
    llmApiKey: '',
    llmModel: '',
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
