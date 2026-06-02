export type BuildProfile = 'core' | 'full';

export function getBuildProfile(): BuildProfile {
    const value = import.meta.env.VITE_BUILD_PROFILE;
    return value === 'full' ? 'full' : 'core';
}

export function isFullBuild(): boolean {
    return getBuildProfile() === 'full';
}
