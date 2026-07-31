import { useMemo } from 'react';
import type { EnforcementActionId } from '../core/types/enforcement';
import {
    FILTER_APPEARANCE_PRESETS,
    resolveFilterAppearance,
    type FilterAppearancePresetId,
    type FilterAppearanceSettings,
} from '../core/types/filter-appearance';
import { useLocale } from '../i18n/LocaleContext';

const PRESET_IDS: readonly FilterAppearancePresetId[] = ['balanced', 'soft', 'strong', 'custom'];

export type FilterAppearancePanelProps = {
    readonly appearance: FilterAppearanceSettings;
    readonly activeActionId: EnforcementActionId;
    readonly onChange: (next: FilterAppearanceSettings) => void;
};

function percentLabel(value: number): string {
    return `${Math.round(value * 100)}%`;
}

export default function FilterAppearancePanel({
    appearance,
    activeActionId,
    onChange,
}: FilterAppearancePanelProps) {
    const { t } = useLocale();
    const resolved = useMemo(() => resolveFilterAppearance(appearance), [appearance]);
    const isCustom = appearance.presetId === 'custom';

    const setPreset = (presetId: FilterAppearancePresetId): void => {
        if (presetId === 'custom') {
            onChange({ ...appearance, presetId: 'custom' });
            return;
        }
        onChange({
            presetId,
            ...FILTER_APPEARANCE_PRESETS[presetId],
        });
    };

    const setField = <K extends keyof FilterAppearanceSettings>(
        key: K,
        value: FilterAppearanceSettings[K]
    ): void => {
        onChange({
            ...appearance,
            presetId: 'custom',
            [key]: value,
        });
    };

    return (
        <div className="card policy-card sl-filter-appearance-panel sl-span-full">
            <h3>{t('settings.filtering.appearanceHeading')}</h3>
            <p className="muted sl-filtering-section-desc">{t('settings.filtering.appearanceDescription')}</p>

            <div className="sl-filter-appearance-presets">
                {PRESET_IDS.map((presetId) => (
                    <button
                        key={presetId}
                        type="button"
                        className={`sl-choice-chip${appearance.presetId === presetId ? ' is-active' : ''}`}
                        onClick={() => setPreset(presetId)}
                    >
                        {t(`settings.filtering.appearancePresets.${presetId}`)}
                    </button>
                ))}
            </div>

            <div
                className="sl-filter-appearance-preview"
                style={{
                    opacity: resolved.contentOpacity,
                    filter: `grayscale(${resolved.grayscalePercent}%)${activeActionId === 'blur' ? ` blur(${resolved.blurPx}px)` : ''}`,
                    borderWidth: resolved.frameBorderWidthPx,
                    borderColor: `rgba(74, 222, 128, ${resolved.frameBorderOpacity})`,
                    background: `rgba(15, 23, 20, ${resolved.frameFillOpacity})`,
                }}
                aria-hidden="true"
            >
                <span className="sl-filter-appearance-preview-label">
                    {t('settings.filtering.appearancePreviewLabel')}
                </span>
                {resolved.showRevealHint ? (
                    <span className="sl-filter-appearance-preview-hint">
                        {t('enforcement.clickToShow')}
                    </span>
                ) : null}
            </div>

            <div className="sl-filter-appearance-sliders">
                <label className="sl-filter-appearance-slider">
                    <span className="sl-filter-appearance-slider-head">
                        <strong>{t('settings.filtering.appearanceContentOpacity')}</strong>
                        <span className="muted">{percentLabel(resolved.contentOpacity)}</span>
                    </span>
                    <input
                        type="range"
                        min={12}
                        max={90}
                        value={Math.round(resolved.contentOpacity * 100)}
                        disabled={!isCustom}
                        onChange={(e) =>
                            setField('contentOpacity', Number(e.target.value) / 100)
                        }
                    />
                    <span className="muted sl-filter-appearance-slider-hint">
                        {t('settings.filtering.appearanceContentOpacityHint')}
                    </span>
                </label>

                <label className="sl-filter-appearance-slider">
                    <span className="sl-filter-appearance-slider-head">
                        <strong>{t('settings.filtering.appearanceGrayscale')}</strong>
                        <span className="muted">{resolved.grayscalePercent}%</span>
                    </span>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={resolved.grayscalePercent}
                        disabled={!isCustom}
                        onChange={(e) => setField('grayscalePercent', Number(e.target.value))}
                    />
                </label>

                {activeActionId === 'blur' ? (
                    <label className="sl-filter-appearance-slider">
                        <span className="sl-filter-appearance-slider-head">
                            <strong>{t('settings.filtering.appearanceBlur')}</strong>
                            <span className="muted">{resolved.blurPx}px</span>
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={20}
                            value={resolved.blurPx}
                            disabled={!isCustom}
                            onChange={(e) => setField('blurPx', Number(e.target.value))}
                        />
                    </label>
                ) : null}

                <label className="sl-filter-appearance-slider">
                    <span className="sl-filter-appearance-slider-head">
                        <strong>{t('settings.filtering.appearanceFrameBorder')}</strong>
                        <span className="muted">{percentLabel(resolved.frameBorderOpacity)}</span>
                    </span>
                    <input
                        type="range"
                        min={20}
                        max={100}
                        value={Math.round(resolved.frameBorderOpacity * 100)}
                        disabled={!isCustom}
                        onChange={(e) =>
                            setField('frameBorderOpacity', Number(e.target.value) / 100)
                        }
                    />
                </label>

                <label className="sl-filter-appearance-slider">
                    <span className="sl-filter-appearance-slider-head">
                        <strong>{t('settings.filtering.appearanceFrameFill')}</strong>
                        <span className="muted">{percentLabel(resolved.frameFillOpacity)}</span>
                    </span>
                    <input
                        type="range"
                        min={0}
                        max={45}
                        value={Math.round(resolved.frameFillOpacity * 100)}
                        disabled={!isCustom}
                        onChange={(e) =>
                            setField('frameFillOpacity', Number(e.target.value) / 100)
                        }
                    />
                </label>

                <label className="sl-filter-appearance-toggle">
                    <input
                        type="checkbox"
                        checked={resolved.showRevealHint}
                        disabled={!isCustom}
                        onChange={(e) => setField('showRevealHint', e.target.checked)}
                    />
                    <span>{t('settings.filtering.appearanceShowHint')}</span>
                </label>
            </div>

            {!isCustom ? (
                <p className="muted sl-filter-appearance-footnote">
                    {t('settings.filtering.appearanceCustomFootnote')}
                </p>
            ) : null}
        </div>
    );
}
