export function runtimeStateLabel(state: string, t: (key: string) => string): string {
    const key = `settings.systemStatus.states.${state}`;
    const translated = t(key);
    return translated !== key ? translated : state;
}

export function detectorLabel(detectorId: string | null, t: (key: string) => string): string {
    if (!detectorId) return t('settings.systemStatus.detectorHeuristic');
    const modKey = `mods.${detectorId}.name`;
    const translated = t(modKey);
    return translated !== modKey ? translated : detectorId;
}
