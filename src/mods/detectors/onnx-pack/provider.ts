import type { InferenceProvider } from '../../../core/types/detector';
import { classifyResultFromVerdict } from '../../../core/types/verdict';
import { getFallbackProvider } from '../../../core/registry/provider-registry';
import {
    DEFAULT_CLASSIFY_THRESHOLD,
    ONNX_DETECTOR_ID,
} from '../constants';
import { OnnxSessionManager } from './session-manager';

const sessionManager = new OnnxSessionManager();

export const onnxPackProvider: InferenceProvider = {
    id: ONNX_DETECTOR_ID,
    detectorId: ONNX_DETECTOR_ID,
    kind: 'local',
    supports: (detectorId) => detectorId === ONNX_DETECTOR_ID || detectorId === 'onnx' || detectorId === '',
    initialize: () => sessionManager.initialize(),
    getRuntimeInfo: () => sessionManager.getRuntimeInfo(),
    classifyBatch: async (items, options) => {
        const threshold = options.threshold ?? DEFAULT_CLASSIFY_THRESHOLD;
        const fallback = getFallbackProvider();

        if (!sessionManager.isReady()) {
            return fallback.classifyBatch(items, { threshold, detectorId: fallback.detectorId });
        }

        const results = await Promise.all(items.map(async (item) => {
            try {
                const verdict = await sessionManager.classify(item.text, threshold);
                return classifyResultFromVerdict(item.id, verdict);
            } catch {
                const [fallbackResult] = await fallback.classifyBatch([item], { threshold });
                return fallbackResult ?? classifyResultFromVerdict(item.id, {
                    matched: false,
                    score: 0,
                    labelId: 'noise',
                    detectorId: fallback.detectorId,
                });
            }
        }));

        return results;
    },
};

export { sessionManager };
