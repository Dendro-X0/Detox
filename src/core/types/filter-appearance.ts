/** Built-in visual presets; `custom` uses stored overrides for community-style tuning later. */
export type FilterAppearancePresetId = 'balanced' | 'soft' | 'strong' | 'custom';

export type FilterAppearanceValues = {
    /** Opacity applied to filtered content (lower = darker). */
    readonly contentOpacity: number;
    /** Grayscale filter on filtered content (0–100). */
    readonly grayscalePercent: number;
    /** Blur radius when blur style is active (px). */
    readonly blurPx: number;
    /** Frame border opacity (0–1). */
    readonly frameBorderOpacity: number;
    /** Frame fill tint opacity (0–1). */
    readonly frameFillOpacity: number;
    /** Frame border width (px). */
    readonly frameBorderWidthPx: number;
    readonly showRevealHint: boolean;
};

export type FilterAppearanceSettings = FilterAppearanceValues & {
    readonly presetId: FilterAppearancePresetId;
};

export type ResolvedFilterAppearance = FilterAppearanceValues & {
    readonly presetId: FilterAppearancePresetId;
};

export const DEFAULT_FILTER_APPEARANCE: FilterAppearanceSettings = {
    presetId: 'balanced',
    contentOpacity: 0.35,
    grayscalePercent: 40,
    blurPx: 10,
    frameBorderOpacity: 0.72,
    frameFillOpacity: 0.14,
    frameBorderWidthPx: 2,
    showRevealHint: true,
};

export const FILTER_APPEARANCE_PRESETS: Readonly<
    Record<Exclude<FilterAppearancePresetId, 'custom'>, FilterAppearanceValues>
> = {
    balanced: {
        contentOpacity: 0.35,
        grayscalePercent: 40,
        blurPx: 10,
        frameBorderOpacity: 0.72,
        frameFillOpacity: 0.14,
        frameBorderWidthPx: 2,
        showRevealHint: true,
    },
    soft: {
        contentOpacity: 0.55,
        grayscalePercent: 22,
        blurPx: 6,
        frameBorderOpacity: 0.55,
        frameFillOpacity: 0.08,
        frameBorderWidthPx: 2,
        showRevealHint: true,
    },
    strong: {
        contentOpacity: 0.2,
        grayscalePercent: 65,
        blurPx: 14,
        frameBorderOpacity: 0.9,
        frameFillOpacity: 0.22,
        frameBorderWidthPx: 3,
        showRevealHint: true,
    },
};

export type FilterAppearanceStorageRecord = {
    readonly filterAppearance?: Partial<FilterAppearanceSettings>;
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function normalizeFilterAppearance(
    raw: Partial<FilterAppearanceSettings> | undefined
): FilterAppearanceSettings {
    const base = DEFAULT_FILTER_APPEARANCE;
    const presetId =
        raw?.presetId && (raw.presetId === 'custom' || raw.presetId in FILTER_APPEARANCE_PRESETS)
            ? raw.presetId
            : base.presetId;

    return {
        presetId,
        contentOpacity: clamp(raw?.contentOpacity ?? base.contentOpacity, 0.12, 0.9),
        grayscalePercent: clamp(raw?.grayscalePercent ?? base.grayscalePercent, 0, 100),
        blurPx: clamp(raw?.blurPx ?? base.blurPx, 0, 20),
        frameBorderOpacity: clamp(raw?.frameBorderOpacity ?? base.frameBorderOpacity, 0.2, 1),
        frameFillOpacity: clamp(raw?.frameFillOpacity ?? base.frameFillOpacity, 0, 0.45),
        frameBorderWidthPx: clamp(raw?.frameBorderWidthPx ?? base.frameBorderWidthPx, 1, 4),
        showRevealHint: raw?.showRevealHint ?? base.showRevealHint,
    };
}

export function resolveFilterAppearance(
    settings: FilterAppearanceSettings = DEFAULT_FILTER_APPEARANCE
): ResolvedFilterAppearance {
    if (settings.presetId !== 'custom') {
        const preset = FILTER_APPEARANCE_PRESETS[settings.presetId];
        return { presetId: settings.presetId, ...preset };
    }
    return {
        presetId: 'custom',
        contentOpacity: settings.contentOpacity,
        grayscalePercent: settings.grayscalePercent,
        blurPx: settings.blurPx,
        frameBorderOpacity: settings.frameBorderOpacity,
        frameFillOpacity: settings.frameFillOpacity,
        frameBorderWidthPx: settings.frameBorderWidthPx,
        showRevealHint: settings.showRevealHint,
    };
}
