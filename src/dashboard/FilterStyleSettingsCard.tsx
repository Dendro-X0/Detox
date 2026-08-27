import { useMemo } from 'react';
import { isFullBuild } from '../build-profile';
import type { EnforcementActionId, EnforcementActionSettings } from '../core/types/enforcement';
import { useLocale } from '../i18n/LocaleContext';
import FilterStylePreview from './FilterStylePreview';
import { getVisibleFilterStyles } from './filter-styles';

export type FilterStyleSettingsCardProps = {
    readonly enforcementAction: EnforcementActionSettings;
    readonly onActionChange: (actionId: EnforcementActionId) => void;
};

export default function FilterStyleSettingsCard({
    enforcementAction,
    onActionChange,
}: FilterStyleSettingsCardProps) {
    const { t } = useLocale();
    const visibleStyles = useMemo(() => getVisibleFilterStyles(t), [t]);

    return (
        <div className="card policy-card">
            <h4 className="sl-preferences-card-title">{t('settings.filtering.filterStyleHeading')}</h4>
            <p className="muted sl-preferences-card-desc">{t('settings.filtering.filterStyleDescription')}</p>
            {(!isFullBuild() && visibleStyles.length === 1) ? (
                <p className="sl-wizard-callout">{t('wizard.style.coreBuildNote')}</p>
            ) : null}
            <div className="sl-choice-list">
                {visibleStyles.map((action) => (
                    <button
                        key={action.id}
                        type="button"
                        className={`sl-choice-item sl-choice-item--with-preview${
                            enforcementAction.activeActionId === action.id ? ' is-active' : ''
                        }`}
                        onClick={() => onActionChange(action.id)}
                    >
                        <span className="sl-choice-item-body">
                            <strong>{action.label}</strong>
                            <span className="muted sl-choice-item-hint">
                                {t('wizard.style.previewLabel')}
                            </span>
                        </span>
                        <FilterStylePreview styleId={action.id} />
                    </button>
                ))}
            </div>
        </div>
    );
}
