export function runtimeStateLabel(state: string, t: (key: string) => string): string {
    const key = `settings.systemStatus.states.${state}`;
    const translated = t(key);
    return translated !== key ? translated : state;
}

export function detectorLabel(detectorId: string | null, t: (key: string) => string): string {
    if (!detectorId) return t('settings.systemStatus.detectorHeuristic');
    const modIdByRuntime: Record<string, string> = {
        'heuristic-keywords': 'detector-heuristic-keywords',
        'noise-patterns': 'detector-noise-patterns',
        'behavior-signals': 'detector-behavior-signals',
        'topic-classifier': 'detector-topic-classifier',
        'local-pack': 'detector-local-pack',
        'onnx-pack': 'detector-onnx-pack',
        'remote-api': 'detector-remote-api',
    };
    const modKey = `mods.${modIdByRuntime[detectorId] ?? detectorId}.name`;
    const translated = t(modKey);
    return translated !== modKey ? translated : detectorId;
}
