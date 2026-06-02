/**
 * Registers site adapter mods. Core build loads generic only; full build adds site-specific adapters.
 */
export async function loadSiteAdapterMods(): Promise<void> {
    if (import.meta.env.VITE_BUILD_PROFILE === 'full') {
        await import('../../site-adapters/reddit-adapter');
        await import('../../site-adapters/youtube-adapter');
        await import('../../site-adapters/quora-adapter');
    }

    await import('../../site-adapters/generic-adapter');
}
