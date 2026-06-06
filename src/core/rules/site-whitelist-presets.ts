export type SiteWhitelistPresetId = 'google-workspace' | 'online-spreadsheets' | 'music-lyrics';

export type SiteWhitelistPreset = {
    readonly id: SiteWhitelistPresetId;
    readonly domains: readonly string[];
};

export const SITE_WHITELIST_PRESETS: readonly SiteWhitelistPreset[] = [
    {
        id: 'google-workspace',
        domains: [
            'docs.google.com',
            'sheets.google.com',
            'drive.google.com',
            'mail.google.com',
            'calendar.google.com',
            'slides.google.com',
            'meet.google.com',
            'classroom.google.com',
        ],
    },
    {
        id: 'online-spreadsheets',
        domains: [
            'excel.office.com',
            'onedrive.live.com',
            'airtable.com',
            'coda.io',
        ],
    },
    {
        id: 'music-lyrics',
        domains: [
            'open.spotify.com',
            'music.apple.com',
            'music.youtube.com',
            'listen.tidal.com',
            'deezer.com',
        ],
    },
] as const;

export function getPresetById(id: SiteWhitelistPresetId): SiteWhitelistPreset {
    const preset = SITE_WHITELIST_PRESETS.find((entry) => entry.id === id);
    if (!preset) {
        throw new Error(`Unknown whitelist preset: ${id}`);
    }
    return preset;
}

export function isPresetEnabled(
    preset: SiteWhitelistPreset,
    allowDomains: readonly string[]
): boolean {
    const allowed = new Set(allowDomains.map((domain) => domain.toLowerCase()));
    return preset.domains.every((domain) => allowed.has(domain.toLowerCase()));
}

export function setPresetEnabled(
    preset: SiteWhitelistPreset,
    allowDomains: readonly string[],
    enabled: boolean
): readonly string[] {
    const presetDomains = new Set(preset.domains.map((domain) => domain.toLowerCase()));
    if (enabled) {
        return [...new Set([...allowDomains, ...preset.domains])];
    }
    return allowDomains.filter((domain) => !presetDomains.has(domain.toLowerCase()));
}

export function domainsFromPresetIds(presetIds: readonly SiteWhitelistPresetId[]): readonly string[] {
    const domains = new Set<string>();
    for (const presetId of presetIds) {
        for (const domain of getPresetById(presetId).domains) {
            domains.add(domain);
        }
    }
    return [...domains];
}

export function enabledPresetIdsFromDomains(allowDomains: readonly string[]): readonly SiteWhitelistPresetId[] {
    return SITE_WHITELIST_PRESETS.filter((preset) => isPresetEnabled(preset, allowDomains)).map(
        (preset) => preset.id
    );
}
