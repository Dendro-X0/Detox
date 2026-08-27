/**
 * Wizard-first configuration matrix — which storage keys the wizard writes
 * vs which dashboard areas are advanced-only fine-tuning.
 */

/** Keys always written when onboarding completes (both paths). */
export const WIZARD_BASE_STORAGE_KEYS = [
    'enabled',
    'onboardingComplete',
    'inferenceRouting',
    'preferredDetectorId',
    'preferredLocale',
] as const;

/** Additional keys written by preset-mode wizard (Focus / Research / Unwind). */
export const WIZARD_PRESET_MODE_STORAGE_KEYS = [
    'activeBrowsingModeId',
    'policy',
    'userRules',
    'userKeywords',
    'enforcementAction',
    'enabledModIds',
] as const;

/** Additional keys written by express lifestyle preset path. */
export const WIZARD_EXPRESS_STORAGE_KEYS = [
    'activeBrowsingModeId',
    'policy',
    'userRules',
    'userKeywords',
    'enforcementAction',
    'enabledModIds',
    'topicPolicy',
    'expressPresetId',
] as const;

/** Additional keys written by custom wizard path. */
export const WIZARD_CUSTOM_STORAGE_KEYS = [
    'activeBrowsingModeId',
    'policy',
    'userRules',
    'userKeywords',
    'enforcementAction',
    'enabledModIds',
] as const;

/** Nested fields under `userRules` set by wizard whitelist step. */
export const WIZARD_USER_RULES_FIELDS = ['blockKeywords', 'allowKeywords', 'allowDomains'] as const;

/** Dashboard surfaces that should not be required for first-run setup. */
export const DASHBOARD_ADVANCED_SURFACES = [
    'filtering.inferenceRemoteApi',
    'filtering.languagePack',
    'filtering.perSiteThresholds',
    'rules.customKeywordEditor',
    'rules.perSiteThresholds',
    'plugins.modInstall',
    'plugins.authenticityAssist',
    'privacy.exportImport',
    'privacy.debugDiagnostics',
    'overview.runtimeStatus',
] as const;

export type DashboardAdvancedSurface = (typeof DASHBOARD_ADVANCED_SURFACES)[number];

/** Wizard steps → primary storage effect (documentation + QA). */
export const WIZARD_STEP_COVERAGE = {
    welcome: {
        storageKeys: [] as const,
        notes: 'Express preset selection or quick start; customize opens guided path.',
    },
    language: { storageKeys: ['preferredLocale'] as const, notes: 'UI locale only.' },
    mode: {
        storageKeys: ['activeBrowsingModeId', 'policy', 'userRules', 'userKeywords', 'enforcementAction', 'enabledModIds'] as const,
        notes: 'Preset path bundles mode; custom path defers topics/style/sensitivity.',
    },
    topics: { storageKeys: ['userRules', 'userKeywords'] as const, notes: 'Custom path only — blockKeywords from bother categories.' },
    style: { storageKeys: ['enforcementAction'] as const, notes: 'Custom path only — dim/blur/collapse.' },
    sensitivity: { storageKeys: ['policy'] as const, notes: 'Custom path only — preset + threshold.' },
    whitelist: { storageKeys: ['userRules'] as const, notes: 'Merges preset domains into userRules.allowDomains.' },
    authenticity: {
        storageKeys: ['authenticitySettings'] as const,
        notes: 'Optional opt-in; search-only Wikipedia default when enabled.',
    },
    done: { storageKeys: ['onboardingComplete', 'enabled'] as const, notes: 'Marks setup complete; enables filtering.' },
} as const;
