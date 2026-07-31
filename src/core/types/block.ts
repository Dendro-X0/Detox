/**
 * A unit of page content sent through the classification pipeline.
 */
export type ScanItem = {
    readonly id: string;
    readonly text: string;
};

export type BlockFeedback = 'wrong' | 'ok';

export type FilteredItemRecord = {
    readonly id: string;
    readonly score: number;
    readonly labelId: string;
    readonly detectorId: string;
    readonly preview: string;
    readonly hostname: string;
    readonly pageKey?: string;
    readonly timestamp: number;
    readonly revealed?: boolean;
    readonly feedback?: BlockFeedback;
};
