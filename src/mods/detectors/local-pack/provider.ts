import type { InferenceProvider } from '../../../core/types/detector';
import { classifyResultFromVerdict } from '../../../core/types/verdict';
import { getFallbackProvider } from '../../../core/registry/provider-registry';
import {
    DEFAULT_CLASSIFY_THRESHOLD,
    LOCAL_PACK_DETECTOR_ID,
} from '../../../core/runtime/constants';
import { sessionManager } from '../onnx-pack/provider';

/**
 * Local ONNX model pack provider (canonical id: local-pack).
 * Shares the ONNX session manager with the legacy onnx-pack alias.
 */
export const localPackProvider: InferenceProvider = {
    id: LOCAL_PACK_DETECTOR_ID,
    detectorId: LOCAL_PACK_DETECTOR_ID,
    kind: 'local',
    supports: (detectorId) =>
        detectorId === LOCAL_PACK_DETECTOR_ID ||
        detectorId === 'local-pack' ||
        detectorId === 'onnx-pack' ||
        detectorId === 'onnx',
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
