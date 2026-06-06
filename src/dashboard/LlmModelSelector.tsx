import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAvailableLlmModels } from '../core/llm/openai-models-adapter';
import { useLocale } from '../i18n/LocaleContext';
import SlSelect from './components/SlSelect';

type LlmModelSelectorProps = {
    readonly endpoint: string;
    readonly apiKey: string;
    readonly value: string;
    readonly onChange: (modelId: string) => void;
};

export default function LlmModelSelector({ endpoint, apiKey, value, onChange }: LlmModelSelectorProps) {
    const { t } = useLocale();
    const [models, setModels] = useState<readonly string[]>([]);
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const lastFetchKey = useRef('');

    const loadModels = useCallback(async (force = false) => {
        const fetchKey = `${endpoint.trim()}|${apiKey.trim()}`;
        if (!endpoint.trim()) {
            setModels([]);
            setStatus('idle');
            setStatusMessage(t('llm.configureUrl'));
            return;
        }
        if (!force && fetchKey === lastFetchKey.current && models.length > 0) {
            return;
        }

        setStatus('loading');
        setStatusMessage(t('llm.fetching'));

        const result = await fetchAvailableLlmModels(endpoint, apiKey);
        lastFetchKey.current = fetchKey;

        if (!result.ok) {
            setModels([]);
            setStatus('error');
            setStatusMessage(result.error);
            return;
        }

        setModels(result.models);
        setStatus('ready');
        setStatusMessage(t('llm.modelsFound', { count: result.models.length }));

        if (!value.trim() && result.models.length > 0) {
            onChange(result.models[0]);
        } else if (value.trim() && !result.models.includes(value.trim())) {
            setStatusMessage(t('llm.modelsFoundCustom', { count: result.models.length }));
        }
    }, [apiKey, endpoint, models.length, onChange, t, value]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadModels();
        }, 700);
        return () => window.clearTimeout(timer);
    }, [endpoint, apiKey, loadModels]);

    const selectOptions = value.trim() && !models.includes(value.trim())
        ? [
            { value: value.trim(), label: `${value.trim()}${t('llm.customSuffix')}` },
            ...models.map((modelId) => ({ value: modelId, label: modelId })),
        ]
        : models.map((modelId) => ({ value: modelId, label: modelId }));

    return (
        <div className="sl-form-field">
            {selectOptions.length > 0 ? (
                <div className="sl-form-control-row sl-form-control-row--select">
                    <SlSelect
                        id="llm-model-select"
                        label={t('llm.model')}
                        value={value}
                        onChange={onChange}
                        options={selectOptions}
                        placeholder={t('llm.selectModel')}
                        disabled={status === 'loading'}
                        className="sl-select--grow"
                    />
                    <button
                        type="button"
                        className="sl-btn sl-btn-ghost"
                        onClick={() => void loadModels(true)}
                        disabled={status === 'loading' || !endpoint.trim()}
                    >
                        {status === 'loading' ? t('llm.loading') : t('llm.refresh')}
                    </button>
                </div>
            ) : (
                <>
                    <label className="sl-form-label" htmlFor="llm-model-input">{t('llm.model')}</label>
                    <div className="sl-form-control-row">
                        <input
                            id="llm-model-input"
                            type="text"
                            className="sl-input"
                            placeholder={t('llm.modelPlaceholder')}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                        />
                        <button
                            type="button"
                            className="sl-btn sl-btn-ghost"
                            onClick={() => void loadModels(true)}
                            disabled={status === 'loading' || !endpoint.trim()}
                        >
                            {status === 'loading' ? t('llm.loading') : t('llm.refresh')}
                        </button>
                    </div>
                </>
            )}
            {statusMessage ? (
                <p className={`sl-form-hint${status === 'error' ? ' is-error' : ''}`}>{statusMessage}</p>
            ) : null}
        </div>
    );
}
