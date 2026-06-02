export type PolicyPreset = 'conservative' | 'balanced' | 'strict';

export type PolicySettings = {
    readonly preset: PolicyPreset;
    readonly threshold: number;
    readonly perSite: Record<string, number>;
};

export const PRESET_THRESHOLDS: Record<PolicyPreset, number> = {
    conservative: 0.7,
    balanced: 0.5,
    strict: 0.3,
};

export const DEFAULT_POLICY: PolicySettings = {
    preset: 'balanced',
    threshold: PRESET_THRESHOLDS.balanced,
    perSite: {},
};
