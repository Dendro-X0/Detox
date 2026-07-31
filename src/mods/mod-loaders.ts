import { registerEnforcementAction, unregisterEnforcementAction } from '../core/registry/action-registry';
import { registerProvider, unregisterProvider } from '../core/registry/provider-registry';
import { DEFAULT_ROUTING_SETTINGS } from '../core/types/routing';
import {
    HEURISTIC_DETECTOR_ID,
    LOCAL_PACK_DETECTOR_ID,
    REMOTE_API_DETECTOR_ID,
} from '../core/runtime/constants';
import { ONNX_DETECTOR_ID } from '../core/runtime/constants';
import { dimAction } from './actions/dim/action';
import { heuristicKeywordsProvider } from './detectors/heuristic-keywords/provider';
import { ADAPTATION_PACK_CATALOG } from './adaptation-packs/catalog';
import { activateAdaptationPack, deactivateAdaptationPack } from '../core/adaptation/adaptation-pack-registry';
import { behaviorSignalsProvider } from './detectors/behavior-signals/provider';
import { noisePatternsProvider } from './detectors/noise-patterns/provider';
import { resetOnnxProviderLoader } from './detectors/ensure-onnx-providers';
import { NOISE_PATTERNS_DETECTOR_ID, BEHAVIOR_SIGNALS_DETECTOR_ID } from './detectors/constants';
import { TOPIC_CLASSIFIER_DETECTOR_ID } from '../core/runtime/constants';

type ModLoader = () => Promise<void>;
type ModUnloader = () => void;

const MOD_LOADERS: Partial<Record<string, ModLoader>> = {
    'action-dim': async () => {
        registerEnforcementAction(dimAction);
    },
    'action-blur': async () => {
        const { blurAction } = await import('./actions/blur/action');
        registerEnforcementAction(blurAction);
    },
    'action-collapse': async () => {
        const { collapseAction } = await import('./actions/collapse/action');
        registerEnforcementAction(collapseAction);
    },
    'detector-heuristic-keywords': async () => {
        registerProvider(heuristicKeywordsProvider);
    },
    'detector-noise-patterns': async () => {
        registerProvider(noisePatternsProvider);
    },
    'detector-behavior-signals': async () => {
        registerProvider(behaviorSignalsProvider);
    },
    'detector-remote-api': async () => {
        const remoteApi = await import('./detectors/remote-api/provider');
        const remoteConfig = await import('./detectors/remote-api/config');
        registerProvider(remoteApi.remoteApiProvider);
        remoteConfig.refreshRemoteApiCache(DEFAULT_ROUTING_SETTINGS.remoteApi);
    },
    'detector-local-pack': async () => {
        const fullDetectors = await import('./detectors/register-full-detectors');
        registerProvider(fullDetectors.localPackProvider);
    },
    'detector-onnx-pack': async () => {
        const fullDetectors = await import('./detectors/register-full-detectors');
        registerProvider(fullDetectors.onnxPackProvider);
    },
    'detector-topic-classifier': async () => {
        const fullDetectors = await import('./detectors/register-full-detectors');
        registerProvider(fullDetectors.topicClassifierProvider);
    },
};

const MOD_UNLOADERS: Partial<Record<string, ModUnloader>> = {
    'action-blur': () => unregisterEnforcementAction('blur'),
    'action-collapse': () => unregisterEnforcementAction('collapse'),
    'detector-noise-patterns': () => unregisterProvider(NOISE_PATTERNS_DETECTOR_ID),
    'detector-behavior-signals': () => unregisterProvider(BEHAVIOR_SIGNALS_DETECTOR_ID),
    'detector-remote-api': () => unregisterProvider(REMOTE_API_DETECTOR_ID),
    'detector-local-pack': () => {
        unregisterProvider(LOCAL_PACK_DETECTOR_ID);
        resetOnnxProviderLoader();
    },
    'detector-onnx-pack': () => {
        unregisterProvider(ONNX_DETECTOR_ID);
        resetOnnxProviderLoader();
    },
    'detector-topic-classifier': () => unregisterProvider(TOPIC_CLASSIFIER_DETECTOR_ID),
};

export async function loadMod(modId: string): Promise<void> {
    const loader =
        MOD_LOADERS[modId] ??
        (modId.startsWith('adaptation-')
            ? async () => {
                  const ok = await activateAdaptationPack(modId);
                  if (!ok) throw new Error(`Failed to load adaptation pack: ${modId}`);
              }
            : undefined);
    if (loader) await loader();
}

export function unloadMod(modId: string): void {
    const unloader =
        MOD_UNLOADERS[modId] ??
        (modId.startsWith('adaptation-') ? () => deactivateAdaptationPack(modId) : undefined);
    if (unloader) unloader();
}

export function canLoadMod(modId: string): boolean {
    return modId in MOD_LOADERS || modId.startsWith('adaptation-');
}

export function canUnloadMod(modId: string): boolean {
    return modId in MOD_UNLOADERS || modId.startsWith('adaptation-');
}

export const DETECTOR_MOD_IDS = [
    'detector-heuristic-keywords',
    'detector-noise-patterns',
    'detector-behavior-signals',
    'detector-remote-api',
    'detector-local-pack',
    'detector-onnx-pack',
    'detector-topic-classifier',
] as const;

for (const pack of ADAPTATION_PACK_CATALOG) {
    MOD_LOADERS[pack.id] = async () => {
        const ok = await activateAdaptationPack(pack.id);
        if (!ok) throw new Error(`Failed to load adaptation pack: ${pack.id}`);
    };
    MOD_UNLOADERS[pack.id] = () => deactivateAdaptationPack(pack.id);
}

export { HEURISTIC_DETECTOR_ID };
