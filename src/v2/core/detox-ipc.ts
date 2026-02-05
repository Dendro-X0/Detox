type ScanItem = {
    readonly id: string;
    readonly text: string;
};

type ClassifyBatchRequest = {
    readonly type: 'classifyBatch';
    readonly items: readonly ScanItem[];
    readonly threshold?: number;
};

type ClassifyItemResult = {
    readonly id: string;
    readonly isToxic: boolean;
    readonly score: number;
    readonly label: string;
};

type ClassifyBatchResponse = {
    readonly type: 'classifyBatchResult';
    readonly results: readonly ClassifyItemResult[];
};

type ErrorResponse = {
    readonly type: 'error';
    readonly error: string;
};

type RuntimeState = 'uninitialized' | 'loading' | 'ready' | 'error';

type RuntimeStatusRequest = {
    readonly type: 'runtimeStatus';
};

type RuntimeStatusResponse = {
    readonly type: 'runtimeStatusResult';
    readonly state: RuntimeState;
    readonly lastError: string | null;
    readonly activePackId: string | null;
    readonly hasSession: boolean;
};

export type DetoxIpcMessage = ClassifyBatchRequest | ClassifyBatchResponse | RuntimeStatusRequest | RuntimeStatusResponse | ErrorResponse;
