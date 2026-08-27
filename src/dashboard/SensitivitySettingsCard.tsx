import type { PolicyPreset } from '../core/types/policy';
import { useLocale } from '../i18n/LocaleContext';

export type SensitivitySettingsCardProps = {
    readonly preset: PolicyPreset;
    readonly threshold: number;
    readonly onPresetChange: (preset: PolicyPreset) => void;
};

const SENSITIVITY_PRESETS: readonly PolicyPreset[] = ['conservative', 'balanced', 'strict'];

export default function SensitivitySettingsCard({
    preset,
    threshold,
    onPresetChange,
}: SensitivitySettingsCardProps) {
    const { t } = useLocale();

    return (
        <div className="card policy-card">
            <h4 className="sl-preferences-card-title">{t('settings.filtering.sensitivityHeading')}</h4>
            <p className="muted sl-preferences-card-desc">{t('settings.filtering.sensitivityDescription')}</p>
            <div className="sl-choice-list">
                {SENSITIVITY_PRESETS.map((id) => (
                    <button
                        key={id}
                        type="button"
                        className={`sl-choice-item${preset === id ? ' is-active' : ''}`}
                        onClick={() => onPresetChange(id)}
                    >
                        <span className="sl-choice-item-body">
                            <strong>
                                {t(`wizard.sensitivityPresets.${id}.label`)}
                                {id === 'balanced' ? (
                                    <span className="sl-badge-recommended">
                                        {t('wizard.mode.recommended')}
                                    </span>
                                ) : null}
                            </strong>
                            <span className="muted sl-choice-item-hint">
                                {t(`wizard.sensitivityPresets.${id}.hint`)}
                            </span>
                        </span>
                    </button>
                ))}
            </div>
            <p className="sl-filtering-threshold">
                {t('settings.filtering.threshold', { percent: (threshold * 100).toFixed(0) })}
            </p>
        </div>
    );
}
