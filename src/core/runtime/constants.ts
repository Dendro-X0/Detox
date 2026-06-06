export const DEFAULT_LABEL_ID = 'noise';
export const HEURISTIC_DETECTOR_ID = 'heuristic-keywords';
export const LOCAL_PACK_DETECTOR_ID = 'local-pack';
/** @deprecated Use LOCAL_PACK_DETECTOR_ID */
export const ONNX_DETECTOR_ID = 'onnx-pack';
export const REMOTE_API_DETECTOR_ID = 'remote-api';
/** Optional pattern detector (promo, outrage bait, engagement bait). */
export const NOISE_PATTERNS_DETECTOR_ID = 'noise-patterns';
export const DEFAULT_CLASSIFY_THRESHOLD = 0.9;

/** Supplementary detectors merged with primary when their mod is enabled. */
export const SUPPLEMENTARY_DETECTOR_IDS: readonly string[] = [NOISE_PATTERNS_DETECTOR_ID];

/** Chrome offscreen document messaging port (background ↔ offscreen). */
export const OFFSCREEN_PORT_NAME = 'signallens-offscreen';

/** Prefix for correlate offscreen request/response pairs. */
export const OFFSCREEN_REQUEST_ID_PREFIX = 'signallens-req-';

export const PRIMARY_PROVIDER_IDS: Record<'heuristic' | 'local-pack', string> = {
    heuristic: HEURISTIC_DETECTOR_ID,
    'local-pack': LOCAL_PACK_DETECTOR_ID,
};
