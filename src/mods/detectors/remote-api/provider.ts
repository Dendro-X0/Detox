import type { InferenceProvider } from '../../../core/types/detector';
import type { ClassifyItemResult } from '../../../core/types/verdict';
import { classifyResultFromVerdict } from '../../../core/types/verdict';
import { loadRoutingSettings } from '../../../core/runtime/routing-settings';
import {
    DEFAULT_CLASSIFY_THRESHOLD,
    DEFAULT_LABEL_ID,
    REMOTE_API_DETECTOR_ID,
} from '../../../core/runtime/constants';
import {
    fetchRemoteClassification,
    getCachedRemoteApiSettings,
    refreshRemoteApiCache,
} from './config';
import { isRemoteApiConfigured } from '../../../core/types/routing';

function mapRemoteResults(
    items: readonly { readonly id: string; readonly text: string }[],
    body: Awaited<ReturnType<typeof fetchRemoteClassification>>
): readonly ClassifyItemResult[] {
    const remoteResults = body.results ?? [];
    const byId = new Map(remoteResults.map((r) => [r.id, r]));

    return items.map((item) => {
        const remote = byId.get(item.id);
        if (!remote) {
            return classifyResultFromVerdict(item.id, {
                matched: false,
                score: 0,
                labelId: DEFAULT_LABEL_ID,
                detectorId: REMOTE_API_DETECTOR_ID,
            });
        }
        return classifyResultFromVerdict(item.id, {
            matched: remote.matched,
            score: remote.score,
            labelId: remote.labelId,
            detectorId: remote.detectorId ?? REMOTE_API_DETECTOR_ID,
        });
    });
}

/**
 * Remote API inference provider (stub-compatible).
 * Expects POST { items, threshold? } → { results: ClassifyItemResult[] }.
 * Only used when explicitly enabled in routing settings (opt-in).
 */
export const remoteApiProvider: InferenceProvider = {
    id: REMOTE_API_DETECTOR_ID,
    detectorId: REMOTE_API_DETECTOR_ID,
    kind: 'remote',
    supports: (detectorId) => detectorId === REMOTE_API_DETECTOR_ID || detectorId === 'remote-api',
    initialize: async () => {
        const routing = await loadRoutingSettings();
        refreshRemoteApiCache(routing.remoteApi);
    },
    getRuntimeInfo: () => {
        const settings = getCachedRemoteApiSettings();
        if (isRemoteApiConfigured(settings)) {
            return {
                state: 'ready',
                activePackId: null,
                lastError: null,
                hasSession: false,
            };
        }
        return {
            state: 'idle',
            activePackId: null,
            lastError: null,
            hasSession: false,
        };
    },
    classifyBatch: async (items, options) => {
        const routing = await loadRoutingSettings();
        refreshRemoteApiCache(routing.remoteApi);

        if (!isRemoteApiConfigured(routing.remoteApi)) {
            throw new Error('Remote API is not configured. Enable it in settings and provide an endpoint URL.');
        }

        const threshold = options.threshold ?? DEFAULT_CLASSIFY_THRESHOLD;
        const body = await fetchRemoteClassification(routing.remoteApi, {
            items: items.map((item) => ({ id: item.id, text: item.text })),
            threshold,
        });

        return mapRemoteResults(items, body);
    },
};
