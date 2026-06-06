import type { ClassifyItemInput, ClassifyItemResult } from '../types/verdict';
import type { PrimaryProviderMode } from '../types/routing';

export type ClassifyBatchRequest = {
    readonly type: 'classifyBatch';
    readonly items: readonly ClassifyItemInput[];
    readonly threshold?: number;
    readonly detectorId?: string;
};

export type ClassifyBatchResponse = {
    readonly type: 'classifyBatchResult';
    readonly results: readonly ClassifyItemResult[];
};

export type ErrorResponse = {
    readonly type: 'error';
    readonly error: string;
};

export type RuntimeState = 'uninitialized' | 'loading' | 'ready' | 'error';

export type RuntimeStatusRequest = {
    readonly type: 'runtimeStatus';
};

export type RuntimeStatusResponse = {
    readonly type: 'runtimeStatusResult';
    readonly state: RuntimeState;
    readonly lastError: string | null;
    readonly activePackId: string | null;
    readonly activeDetectorId: string | null;
    readonly hasSession: boolean;
    readonly primaryMode?: PrimaryProviderMode;
    readonly escalationEnabled?: boolean;
    readonly remoteApiReady?: boolean;
};

export type CoreIpcMessage =
    | ClassifyBatchRequest
    | ClassifyBatchResponse
    | RuntimeStatusRequest
    | RuntimeStatusResponse
    | ErrorResponse;

/** @deprecated Use {@link CoreIpcMessage} */
export type DetoxIpcMessage = CoreIpcMessage;

/** @deprecated Use {@link CoreIpcMessage} */
export type SignalLensIpcMessage = CoreIpcMessage;
