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
    /** Noise (etc.) kept when topic is the primary badge (P1-L2). */
    readonly secondaryReasons?: readonly {
        readonly labelId: string;
        readonly detectorId: string;
        readonly score: number;
    }[];
    readonly preview: string;
    readonly hostname: string;
    readonly pageKey?: string;
    readonly timestamp: number;
    readonly revealed?: boolean;
    readonly feedback?: BlockFeedback;
};
