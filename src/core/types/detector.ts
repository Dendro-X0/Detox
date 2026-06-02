import type { ClassifyItemInput, ClassifyItemResult } from './verdict';

export type DetectorLabel = {
    readonly id: string;
    readonly displayName: string;
};

export type ProviderRuntimeState = 'idle' | 'loading' | 'ready' | 'error';

export type ProviderRuntimeInfo = {
    readonly state: ProviderRuntimeState;
    readonly activePackId: string | null;
    readonly lastError: string | null;
    readonly hasSession: boolean;
};

/**
 * Pluggable classifier. Local ONNX packs and remote APIs implement this contract.
 */
export interface Detector {
    readonly id: string;
    readonly labels: readonly DetectorLabel[];
    classifyBatch(
        items: readonly ClassifyItemInput[],
        options: { readonly threshold?: number }
    ): Promise<readonly ClassifyItemResult[]>;
}

/**
 * Routes classification to local or remote backends.
 * Detector mods register as providers; the runtime host dispatches batch requests.
 */
export interface InferenceProvider {
    readonly id: string;
    readonly detectorId: string;
    readonly kind: 'local' | 'remote';
    supports(detectorId: string): boolean;
    initialize?(): Promise<void>;
    getRuntimeInfo?(): ProviderRuntimeInfo;
    classifyBatch(
        items: readonly ClassifyItemInput[],
        options: { readonly threshold?: number; readonly detectorId?: string }
    ): Promise<readonly ClassifyItemResult[]>;
}
