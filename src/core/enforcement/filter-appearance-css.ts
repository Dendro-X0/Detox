import type { ResolvedFilterAppearance } from '../types/filter-appearance';

export const FILTER_APPEARANCE_STYLE_ID = 'sl-filter-affordance-styles';

/** CSS custom properties consumed by filtered-affordance frame/label styles. */
export function filterAppearanceCssVariables(
    appearance: ResolvedFilterAppearance
): string {
    const borderAlpha = appearance.frameBorderOpacity.toFixed(2);
    const fillAlpha = appearance.frameFillOpacity.toFixed(2);
    const borderWidth = `${appearance.frameBorderWidthPx}px`;

    return `
        --sl-filter-frame-border: rgba(74, 222, 128, ${borderAlpha});
        --sl-filter-frame-border-hover: rgba(74, 222, 128, ${Math.min(1, appearance.frameBorderOpacity + 0.2).toFixed(2)});
        --sl-filter-frame-fill: rgba(15, 23, 20, ${fillAlpha});
        --sl-filter-frame-fill-hover: rgba(15, 23, 20, ${Math.min(0.45, appearance.frameFillOpacity + 0.06).toFixed(2)});
        --sl-filter-frame-border-width: ${borderWidth};
        --sl-filter-label-display: ${appearance.showRevealHint ? 'flex' : 'block'};
        --sl-filter-hint-display: ${appearance.showRevealHint ? 'block' : 'none'};
    `.trim();
}

export function filterAppearanceStyleBlock(appearance: ResolvedFilterAppearance): string {
    const vars = filterAppearanceCssVariables(appearance);
    return `:root { ${vars} }`;
}
