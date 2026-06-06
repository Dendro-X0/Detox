/** A discovered text unit suitable for classification. */
export type ContentUnit = {
    readonly id: string;
    readonly text: string;
    readonly element: HTMLElement;
};

export type ScanRoot = Document | HTMLElement;
