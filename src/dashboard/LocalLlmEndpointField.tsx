import { useMemo } from 'react';
import {
    detectLocalLlmPreset,
    LOCAL_LLM_PRESETS,
} from '../core/llm/local-endpoint-presets';
import { useLocale } from '../i18n/LocaleContext';
import SlSelect from './components/SlSelect';

type LocalLlmEndpointFieldProps = {
    readonly endpoint: string;
    readonly onEndpointChange: (value: string) => void;
};

export default function LocalLlmEndpointField({
    endpoint,
    onEndpointChange,
}: LocalLlmEndpointFieldProps) {
    const { t } = useLocale();
    const presetId = useMemo(() => detectLocalLlmPreset(endpoint), [endpoint]);

    const options = useMemo(
        () =>
            LOCAL_LLM_PRESETS.map((preset) => ({
                value: preset.id,
                label: t(`llm.presets.${preset.id}`),
            })),
        [t]
    );

    const onPresetChange = (value: string): void => {
        const preset = LOCAL_LLM_PRESETS.find((entry) => entry.id === value);
        if (!preset || preset.id === 'custom') return;
        onEndpointChange(preset.endpoint);
    };

    return (
        <div className="sl-form-stack">
            <SlSelect
                id="llm-endpoint-preset"
                label={t('llm.endpointPreset')}
                value={presetId}
                onChange={onPresetChange}
                options={options}
            />
            <div className="sl-form-field">
                <label className="sl-form-label" htmlFor="authenticity-llm-endpoint">
                    {t('authenticity.llmEndpoint')}
                </label>
                <input
                    id="authenticity-llm-endpoint"
                    type="url"
                    className="sl-input"
                    placeholder={t('authenticity.llmEndpointPlaceholder')}
                    value={endpoint}
                    onChange={(e) => onEndpointChange(e.target.value)}
                />
                <p className="sl-form-hint" style={{ marginBottom: 0 }}>
                    {t('llm.localEndpointHint')}
                </p>
            </div>
        </div>
    );
}
