import type { Plugin } from 'vite';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

export type ModBuildProfile = 'core' | 'full';

export function resolveModBuildProfile(env: Record<string, string>): ModBuildProfile {
    return env.VITE_BUILD_PROFILE === 'full' ? 'full' : 'core';
}

type ManifestWebAccessibleMv3 = readonly {
    readonly resources: readonly string[];
    readonly matches: readonly string[];
}[];

type ManifestCsp = string | { readonly extension_pages?: string; readonly [key: string]: unknown };

type ManifestJson = {
    permissions?: string[];
    web_accessible_resources?: ManifestWebAccessibleMv3 | string[];
    host_permissions?: string[];
    content_security_policy?: ManifestCsp;
    [key: string]: unknown;
};

function isModelPackHostPermission(permission: string): boolean {
    return permission.includes('huggingface') || permission.includes('hf.co');
}

function stripModelPackResources(
    webAccessible: ManifestJson['web_accessible_resources']
): ManifestJson['web_accessible_resources'] {
    if (!webAccessible || webAccessible.length === 0) return webAccessible;

    const first = webAccessible[0];
    if (typeof first === 'string') {
        return (webAccessible as readonly string[]).filter(
            (resource) => !resource.includes('model-packs') && !resource.includes('ort')
        );
    }

    return (webAccessible as ManifestWebAccessibleMv3).map((entry) => ({
        ...entry,
        resources: entry.resources.filter(
            (resource) => !resource.includes('model-packs') && !resource.includes('ort')
        ),
    }));
}

function stripModelHostsFromCsp(csp: string): string {
    return csp
        .replace(/\s*https:\/\/\*\.huggingface\.co/g, '')
        .replace(/\s*https:\/\/huggingface\.co/g, '')
        .replace(/\s*https:\/\/\*\.hf\.co/g, '')
        .replace(/\s*https:\/\/hf\.co/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function stripModelHostsFromManifestCsp(csp: ManifestCsp): ManifestCsp {
    if (typeof csp === 'string') {
        return stripModelHostsFromCsp(csp);
    }
    if (typeof csp.extension_pages === 'string') {
        return {
            ...csp,
            extension_pages: stripModelHostsFromCsp(csp.extension_pages),
        };
    }
    return csp;
}

export function applyModProfileToManifest<T extends ManifestJson>(manifest: T, profile: ModBuildProfile): T {
    if (profile === 'full') return manifest;

    const next: ManifestJson = {
        ...manifest,
        web_accessible_resources: stripModelPackResources(manifest.web_accessible_resources),
    };

    if (Array.isArray(manifest.permissions)) {
        next.permissions = manifest.permissions.filter(
            (permission) => typeof permission === 'string' && !isModelPackHostPermission(permission)
        );
    }

    if (manifest.host_permissions !== undefined) {
        next.host_permissions = manifest.host_permissions.filter(
            (permission) => !isModelPackHostPermission(permission)
        );
    }

    if (manifest.content_security_policy !== undefined) {
        next.content_security_policy = stripModelHostsFromManifestCsp(manifest.content_security_policy);
    }

    return next as T;
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
