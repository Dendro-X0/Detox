/// <reference types="chrome" />
import { useEffect, useMemo, useState } from 'react';
import { classifyUnifiedFilter } from '../core/filtering/unified-filter';
import {
    activateAdaptationPack,
    clearAdaptationPacks,
    setAdaptationPageContext,
} from '../core/adaptation/adaptation-pack-registry';
import { isAdaptationPackId } from '../mods/adaptation-packs/catalog';
import { buildBrowsingModePatch } from '../core/modes/browsing-modes';
import { useLocale } from '../i18n/LocaleContext';
import { BlockReasonChip } from './BlockReasonChips';

const SAMPLE_SNIPPETS = [
    'FLASH SALE!!! 70% OFF — LIMITED TIME ONLY click here now!!!',
    'Scientists discovered a simple method. You won\'t believe what happened next.',
    'Quarterly revenue grew 12% year over year according to the filing.',
] as const;

type FilterPreviewPanelProps = {
    readonly threshold: number;
    readonly enabledModIds: readonly string[];
};

export default function FilterPreviewPanel({ threshold, enabledModIds }: FilterPreviewPanelProps) {
    const { t } = useLocale();
    const [text, setText] = useState('');

    const keywords = useMemo(() => buildBrowsingModePatch('focus').userRules.blockKeywords, []);

    useEffect(() => {
        const adaptationIds = enabledModIds.filter(isAdaptationPackId);
        setAdaptationPageContext(['social-feed']);
        void (async () => {
            clearAdaptationPacks();
            for (const id of adaptationIds) {
                await activateAdaptationPack(id);
            }
        })();
        return () => {
            setAdaptationPageContext(null);
        };
    }, [enabledModIds]);

    const result = useMemo(() => {
        const trimmed = text.trim();
        if (!trimmed) return null;
        return classifyUnifiedFilter(trimmed, {
            threshold,
            keywords,
            enableNoisePatterns: enabledModIds.includes('detector-noise-patterns'),
            enableBehaviorSignals: enabledModIds.includes('detector-behavior-signals'),
        });
    }, [text, threshold, keywords, enabledModIds]);

    return (
        <div className="card policy-card sl-span-full">
            <h3>{t('settings.filtering.previewHeading')}</h3>
            <p className="muted sl-section-desc">{t('settings.filtering.previewDescription')}</p>

            <label className="sl-form-label" htmlFor="sl-filter-preview-input">
                {t('settings.filtering.previewInputLabel')}
            </label>
            <textarea
                id="sl-filter-preview-input"
                className="sl-input sl-filter-preview-input"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('settings.filtering.previewPlaceholder')}
            />

            <div className="sl-filter-preview-samples">
                <span className="sl-form-hint">{t('settings.filtering.previewSamplesLabel')}</span>
                <div className="sl-filter-preview-sample-row">
                    {SAMPLE_SNIPPETS.map((sample) => (
                        <button
                            key={sample.slice(0, 24)}
                            type="button"
                            className="sl-btn sl-btn-ghost sl-filter-preview-sample-btn"
                            onClick={() => setText(sample)}
                        >
                            {sample.slice(0, 42)}
                            {sample.length > 42 ? '…' : ''}
                        </button>
                    ))}
                </div>
            </div>

            {result ? (
                <div
                    className={`sl-filter-preview-result${result.blocked ? ' is-blocked' : ' is-pass'}`}
                    role="status"
                >
                    <p className="sl-filter-preview-verdict">
                        {result.gated
                            ? t('settings.filtering.previewGated')
                            : result.blocked
                              ? t('settings.filtering.previewWouldFilter')
                              : t('settings.filtering.previewWouldPass')}
                    </p>
                    {result.winner ? (
                        <BlockReasonChip
                            detectorId={result.winner.detectorId}
                            labelId={result.winner.labelId}
                            score={result.winner.score}
                        />
                    ) : null}
                    {result.contributions.length > 0 ? (
                        <ul className="sl-filter-preview-contributions">
                            {result.contributions.map((c) => (
                                <li key={c.detectorId}>
                                    <BlockReasonChip
                                        detectorId={c.detectorId}
                                        labelId={c.labelId}
                                        score={c.score}
                                        compact
                                    />
                                    <span className="sl-filter-preview-match">
                                        {c.matched
                                            ? t('settings.filtering.previewMatched')
                                            : t('settings.filtering.previewBelowThreshold')}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            ) : null}

            <p className="muted sl-filter-preview-note">{t('settings.filtering.previewBehaviorNote')}</p>
        </div>
    );
}
