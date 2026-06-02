import type { Plugin } from 'vite';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

export type ModBuildProfile = 'core' | 'full';

export function resolveModBuildProfile(env: Record<string, string>): ModBuildProfile {
    return env.VITE_BUILD_PROFILE === 'full' ? 'full' : 'core';
}

type ManifestJson = {
    readonly web_accessible_resources?: readonly {
        readonly resources: readonly string[];
        readonly matches: readonly string[];
    }[];
    readonly host_permissions?: readonly string[];
    readonly [key: string]: unknown;
};

export function applyModProfileToManifest(manifest: ManifestJson, profile: ModBuildProfile): ManifestJson {
    if (profile === 'full') return manifest;

    return {
        ...manifest,
        host_permissions: (manifest.host_permissions ?? []).filter(
            (permission) => !permission.includes('huggingface') && !permission.includes('hf.co')
        ),
        web_accessible_resources: (manifest.web_accessible_resources ?? []).map((entry) => ({
            ...entry,
            resources: entry.resources.filter((resource) => !resource.includes('model-packs')),
        })),
    };
}

export function modProfilePlugin(profile: ModBuildProfile, outDir: string): Plugin {
    return {
        name: 'mod-profile',
        config() {
            return {
                define: {
                    'import.meta.env.VITE_BUILD_PROFILE': JSON.stringify(profile),
                },
            };
        },
        closeBundle() {
            if (profile !== 'core') return;

            const outputRoot = resolve(process.cwd(), outDir);
            for (const dirName of ['model-packs', 'ort']) {
                const target = resolve(outputRoot, dirName);
                if (existsSync(target)) {
                    rmSync(target, { recursive: true, force: true });
                }
            }
        },
    };
}
