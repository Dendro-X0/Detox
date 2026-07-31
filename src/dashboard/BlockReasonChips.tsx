import type { BlockFeedback } from '../core/types/block';
import { formatBlockReasonLabel } from '../core/filtering/format-block-reason';
import { useLocale } from '../i18n/LocaleContext';
import { detectorLabel } from './runtime-labels';

export type BlockReasonProps = {
    readonly detectorId?: string;
    readonly labelId?: string;
    readonly score?: number;
    readonly compact?: boolean;
};

export function BlockReasonChip({
    detectorId,
    labelId,
    score,
    compact = false,
}: BlockReasonProps) {
    const { t } = useLocale();
    const reasonLabel = formatBlockReasonLabel(labelId, t);
    const detector = detectorId ? detectorLabel(detectorId, t) : null;

    return (
        <span className={`sl-block-reason${compact ? ' sl-block-reason--compact' : ''}`}>
            <span className="sl-block-reason-label">{reasonLabel}</span>
            {score !== undefined ? (
                <span className="sl-block-reason-score">{Math.round(score * 100)}%</span>
            ) : null}
            {detector && !compact ? (
                <span className="sl-block-reason-detector">{detector}</span>
            ) : null}
        </span>
    );
}

export type BlockedItemLike = {
    readonly id: string;
    readonly score: number;
    readonly labelId: string;
    readonly detectorId?: string;
    readonly preview: string;
    readonly hostname: string;
    readonly pageKey?: string;
    readonly timestamp: number;
    readonly revealed?: boolean;
    readonly feedback?: BlockFeedback;
};

type BlockedItemRowProps = {
    readonly item: BlockedItemLike;
    readonly formatTime: (ts: number) => string;
    readonly onFeedback?: (item: BlockedItemLike, feedback: BlockFeedback) => void;
    readonly onReveal?: (item: BlockedItemLike) => void;
    readonly compact?: boolean;
};

export function BlockedItemRow({
    item,
    formatTime,
    onFeedback,
    onReveal,
    compact = false,
}: BlockedItemRowProps) {
    const { t } = useLocale();

    return (
        <li className={`blocked-item${item.revealed ? ' is-revealed' : ''}`}>
            <div className="blocked-header">
                <BlockReasonChip
                    detectorId={item.detectorId}
                    labelId={item.labelId}
                    score={item.score}
                    compact
                />
                {item.revealed ? (
                    <span className="sl-block-revealed-tag">{t('filterReasons.revealed')}</span>
                ) : null}
                <span className="time">{formatTime(item.timestamp)}</span>
            </div>
            <div className="preview" title={item.preview}>
                {item.preview}
            </div>
            {!compact ? <div className="hostname">{item.hostname}</div> : null}
            {!item.revealed && onReveal ? (
                <button
                    type="button"
                    className="sl-btn sl-btn-ghost sl-block-reveal-btn"
                    onClick={() => onReveal(item)}
                >
                    {t('popup.revealOnPage')}
                </button>
            ) : null}
            {item.feedback ? (
                <p className="sl-block-feedback-status muted">
                    {item.feedback === 'wrong'
                        ? t('settings.filtering.feedbackMarkedWrong')
                        : t('settings.filtering.feedbackMarkedOk')}
                </p>
            ) : onFeedback ? (
                <div className="sl-block-feedback-actions">
                    <span className="sl-block-feedback-prompt">{t('settings.filtering.feedbackPrompt')}</span>
                    <button
                        type="button"
                        className="sl-btn sl-btn-ghost sl-block-feedback-btn"
                        onClick={() => onFeedback(item, 'wrong')}
                    >
                        {t('settings.filtering.feedbackWrong')}
                    </button>
                    <button
                        type="button"
                        className="sl-btn sl-btn-ghost sl-block-feedback-btn"
                        onClick={() => onFeedback(item, 'ok')}
                    >
                        {t('settings.filtering.feedbackOk')}
                    </button>
                </div>
            ) : null}
        </li>
    );
}
