import type { ClassifyItemInput, ClassifyItemResult } from '../types/verdict';
import type { InferenceRoutingSettings } from '../types/routing';
import type { InferenceProvider } from '../types/detector';
import {
    getFallbackProvider,
    getProvider,
} from '../registry/provider-registry';
import { getRoutingSettings, loadRoutingSettings } from './routing-settings';
import { isUncertainScore } from './uncertainty';
import {
    HEURISTIC_DETECTOR_ID,
    LOCAL_PACK_DETECTOR_ID,
    ONNX_DETECTOR_ID,
    PRIMARY_PROVIDER_IDS,
    REMOTE_API_DETECTOR_ID,
    SUPPLEMENTARY_DETECTOR_IDS,
} from './constants';
import { ensureLocalPackProviders } from './provider-loader';
import { mergeClassifyResults } from './merge-classify-results';
import { isDetectorModEnabled } from '../../mods/mod-manifest';

export type ClassifyBatchOptions = {
    readonly threshold: number;
    readonly detectorId?: string;
    readonly applySupplementaryDetectors?: boolean;
};

/**
 * Routes batch classification across primary, fallback, and optional remote escalation providers.
 */
export class ProviderRouter {
    async resolvePrimaryProviderId(routing?: InferenceRoutingSettings): Promise<string> {
        const settings = routing ?? getRoutingSettings();

        const legacy = await chrome.storage.local.get(['preferredDetectorId']);
        const preferredDetectorId = (legacy as { readonly preferredDetectorId?: unknown }).preferredDetectorId;
        if (typeof preferredDetectorId === 'string' && getProvider(preferredDetectorId)) {
            return preferredDetectorId;
        }

        return PRIMARY_PROVIDER_IDS[settings.primaryMode];
    }

    async getPrimaryProvider(routing?: InferenceRoutingSettings): Promise<InferenceProvider> {
        const settings = routing ?? getRoutingSettings();

        if (settings.primaryMode === 'local-pack') {
            await ensureLocalPackProviders();
        }

        const id = await this.resolvePrimaryProviderId(settings);
        const provider =
            getProvider(id) ??
            getProvider(LOCAL_PACK_DETECTOR_ID) ??
            getProvider(ONNX_DETECTOR_ID) ??
            getFallbackProvider();
        return provider;
    }

    /**
     * Classify a batch using the configured primary provider.
     * When escalation is enabled and remote API is configured, re-classifies uncertain items remotely.
     */
    async classifyBatch(
        items: readonly ClassifyItemInput[],
        options: ClassifyBatchOptions
    ): Promise<readonly ClassifyItemResult[]> {
        const routing = await loadRoutingSettings();
        const primary = await this.getPrimaryProvider(routing);
        const primaryInfo = primary.getRuntimeInfo?.();

        const useHeuristicFallback =
            primary.id !== HEURISTIC_DETECTOR_ID &&
            primaryInfo !== undefined &&
            primaryInfo.state !== 'ready';

        const activePrimary = useHeuristicFallback ? getFallbackProvider() : primary;

        const primaryResults = await activePrimary.classifyBatch(items, {
            threshold: options.threshold,
            detectorId: options.detectorId ?? activePrimary.detectorId,
        });

        const mergedWithSupplements = await this.applySupplementaryDetectors(
            items,
            primaryResults,
            options.threshold,
            options.applySupplementaryDetectors
        );

        if (!routing.escalationEnabled || !routing.remoteApi.enabled) {
            return mergedWithSupplements;
        }

        return this.escalateUncertainItems(items, mergedWithSupplements, options.threshold, routing);
    }

    private async applySupplementaryDetectors(
        items: readonly ClassifyItemInput[],
        primaryResults: readonly ClassifyItemResult[],
        threshold: number,
        applySupplementaryDetectors = true
    ): Promise<readonly ClassifyItemResult[]> {
        if (!applySupplementaryDetectors) return primaryResults;

        let merged = primaryResults;

        for (const detectorId of SUPPLEMENTARY_DETECTOR_IDS) {
            if (!isDetectorModEnabled(detectorId)) continue;
            const provider = getProvider(detectorId);
            if (!provider) continue;

            const supplemental = await provider.classifyBatch(items, { threshold, detectorId });
            merged = mergeClassifyResults(merged, supplemental);
        }

        return merged;
    }

    private async escalateUncertainItems(
        items: readonly ClassifyItemInput[],
        primaryResults: readonly ClassifyItemResult[],
        threshold: number,
        routing: InferenceRoutingSettings
    ): Promise<readonly ClassifyItemResult[]> {
        const remote = getProvider(REMOTE_API_DETECTOR_ID);
        if (!remote) return primaryResults;

        const remoteInfo = remote.getRuntimeInfo?.();
        if (remoteInfo?.state !== 'ready') return primaryResults;

        const resultById = new Map(primaryResults.map((r) => [r.id, r]));
        const uncertainItems: ClassifyItemInput[] = [];

        for (const item of items) {
            const result = resultById.get(item.id);
            if (!result) continue;
            if (isUncertainScore(result.score, threshold, routing.uncertaintyMargin)) {
                uncertainItems.push(item);
            }
        }

        if (uncertainItems.length === 0) return primaryResults;

        try {
            const escalated = await remote.classifyBatch(uncertainItems, { threshold });
            const escalatedById = new Map(escalated.map((r) => [r.id, r]));
            return primaryResults.map((r) => escalatedById.get(r.id) ?? r);
        } catch {
            return primaryResults;
        }
    }
}

export const providerRouter = new ProviderRouter();
