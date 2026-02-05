/**
 * Model Pack type definitions
 */

/** Model pack artifact paths */
export interface ModelPackArtifacts {
    readonly modelPath: string;
    readonly tokenizerJsonPath?: string;
    readonly sentencePieceModelPath?: string;
    readonly configPath?: string;
}

/** Label definition for a model pack */
export interface ModelLabel {
    readonly id: string;
    readonly displayName: string;
}

/** Model pack metadata */
export interface ModelPack {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly license: string;
    readonly task: string;
    readonly languages: readonly string[];
    readonly backend: 'onnx-runtime-web' | 'transformers-js';
    readonly labels: readonly ModelLabel[];
    readonly artifacts: ModelPackArtifacts;
}
