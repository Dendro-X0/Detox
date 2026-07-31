import type { CoreIpcMessage, RuntimeState } from '../ipc/messages';
import type { InferenceProvider, ProviderRuntimeInfo } from '../types/detector';
import { getFallbackProvider, getProvider, resolveActiveProviderId } from '../registry/provider-registry';
import { providerRouter } from './provider-router';
import { getRoutingSettings, loadRoutingSettings } from './routing-settings';
import { isRemoteApiConfigured } from '../types/routing';
import { ensureLocalPackProviders } from './provider-loader';
import {
    DEFAULT_CLASSIFY_THRESHOLD,
    HEURISTIC_DETECTOR_ID,
    REMOTE_API_DETECTOR_ID,
} from './constants';

export class InferenceRuntimeHost {
    private hostState: RuntimeState = 'uninitialized';
    private lastError: string | null = null;
    private activeProvider: InferenceProvider | null = null;
    private initPromise: Promise<void> | null = null;

    async ensureInitialized(): Promise<void> {
        if (this.hostState === 'ready') return;
        if (this.initPromise !== null) return this.initPromise;

        this.hostState = 'loading';
        this.initPromise = this.doInitialize();
        try {
            await this.initPromise;
        } finally {
            this.initPromise = null;
        }
    }

    private async doInitialize(): Promise<void> {
        try {
            const routing = await loadRoutingSettings();

            if (routing.primaryMode === 'local-pack') {
                await ensureLocalPackProviders();
            }

            const providerId = await resolveActiveProviderId();
            this.activeProvider = getProvider(providerId) ?? getFallbackProvider();

            // Heuristic mode: no model init. Local pack: load ONNX session. Remote: cache config only.
            if (this.activeProvider.id === HEURISTIC_DETECTOR_ID) {
                this.hostState = 'ready';
                this.lastError = null;
                return;
            }

            await this.activeProvider.initialize?.();

            if (routing.escalationEnabled && routing.remoteApi.enabled) {
                const remote = getProvider(REMOTE_API_DETECTOR_ID);
                await remote?.initialize?.();
            }

            const info = this.activeProvider.getRuntimeInfo?.();
            if (info?.state === 'error') {
                this.hostState = 'error';
                this.lastError = info.lastError;
                return;
            }

            this.hostState = 'ready';
            this.lastError = info?.lastError ?? null;
        } catch (error: unknown) {
            this.hostState = 'error';
            this.lastError = error instanceof Error ? error.message : String(error);
        }
    }

    async handleMessage(message: CoreIpcMessage): Promise<CoreIpcMessage> {
        if (message.type === 'runtimeStatus') {
            if (this.hostState === 'uninitialized') {
                void this.ensureInitialized();
            }
            return this.buildStatusResponse();
        }

        if (message.type !== 'classifyBatch') {
            return { type: 'error', error: 'Unsupported message type' };
        }

        if (this.hostState === 'uninitialized') {
            void this.ensureInitialized();
        }

        const threshold = message.threshold ?? DEFAULT_CLASSIFY_THRESHOLD;

        try {
            const results = await providerRouter.classifyBatch(message.items, {
                threshold,
                detectorId: message.detectorId,
                applySupplementaryDetectors: message.applySupplementaryDetectors,
            });
            return { type: 'classifyBatchResult', results };
        } catch (error: unknown) {
            const errorString = error instanceof Error ? error.message : String(error);
            this.lastError = errorString;
            const fallback = getFallbackProvider();
            const results = await fallback.classifyBatch(message.items, { threshold });
            return { type: 'classifyBatchResult', results };
        }
    }

    buildStatusResponse(): CoreIpcMessage {
        const routing = getRoutingSettings();
        const provider = this.activeProvider ?? getFallbackProvider();
        const info = provider.getRuntimeInfo?.();
        const effectiveInfo = this.mergeRuntimeInfo(info);
        const remoteReady = isRemoteApiConfigured(routing.remoteApi);

        const activeDetectorId =
            routing.primaryMode === 'heuristic'
                ? HEURISTIC_DETECTOR_ID
                : effectiveInfo.state === 'ready'
                    ? provider.detectorId
                    : HEURISTIC_DETECTOR_ID;

        return {
            type: 'runtimeStatusResult',
            state: this.mapHostState(effectiveInfo, routing.primaryMode),
            lastError: effectiveInfo.lastError ?? this.lastError,
            activePackId: effectiveInfo.activePackId,
            activeDetectorId,
            hasSession: effectiveInfo.hasSession,
            primaryMode: routing.primaryMode,
            escalationEnabled: routing.escalationEnabled,
            remoteApiReady: remoteReady,
        };
    }

    private mergeRuntimeInfo(info: ProviderRuntimeInfo | undefined): ProviderRuntimeInfo {
        if (this.hostState === 'loading') {
            return {
                state: 'loading',
                activePackId: info?.activePackId ?? null,
                lastError: info?.lastError ?? this.lastError,
                hasSession: info?.hasSession ?? false,
            };
        }
        if (this.hostState === 'error') {
            return {
                state: 'error',
                activePackId: info?.activePackId ?? null,
                lastError: info?.lastError ?? this.lastError,
                hasSession: info?.hasSession ?? false,
            };
        }
        return info ?? {
            state: 'ready',
            activePackId: null,
            lastError: null,
            hasSession: false,
        };
    }

    private mapHostState(info: ProviderRuntimeInfo, primaryMode: 'heuristic' | 'local-pack'): RuntimeState {
        if (primaryMode === 'heuristic' && this.hostState !== 'error') {
            return this.hostState === 'uninitialized' ? 'uninitialized' : 'ready';
        }
        if (this.hostState === 'uninitialized') return 'uninitialized';
        if (this.hostState === 'loading' || info.state === 'loading') return 'loading';
        if (this.hostState === 'error' || info.state === 'error') return 'error';
        return 'ready';
    }
}
