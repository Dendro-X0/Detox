import type { EnforcementActionId } from '../core/types/enforcement';

type FilterStylePreviewProps = {
    readonly styleId: EnforcementActionId;
};

export default function FilterStylePreview({ styleId }: FilterStylePreviewProps) {
    return (
        <div className={`sl-filter-preview sl-filter-preview--${styleId}`} aria-hidden="true">
            <span className="sl-filter-preview-line" />
            <span className="sl-filter-preview-line short" />
        </div>
    );
}
