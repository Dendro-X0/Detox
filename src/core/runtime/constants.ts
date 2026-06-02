export const DEFAULT_LABEL_ID = 'noise';
export const HEURISTIC_DETECTOR_ID = 'heuristic-keywords';
export const LOCAL_PACK_DETECTOR_ID = 'local-pack';
/** @deprecated Use LOCAL_PACK_DETECTOR_ID */
export const ONNX_DETECTOR_ID = 'onnx-pack';
export const REMOTE_API_DETECTOR_ID = 'remote-api';
export const DEFAULT_CLASSIFY_THRESHOLD = 0.9;

export const PRIMARY_PROVIDER_IDS: Record<'heuristic' | 'local-pack', string> = {
    heuristic: HEURISTIC_DETECTOR_ID,
    'local-pack': LOCAL_PACK_DETECTOR_ID,
};
