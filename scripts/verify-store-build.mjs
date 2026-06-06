#!/usr/bin/env node
/**
 * Pre-upload checks for Chrome Web Store / Firefox AMO packages.
 * Usage: node scripts/verify-store-build.mjs [distDir]
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const distDir = process.argv[2] ?? join(repoRoot, 'dist');
const DEV_MOD_PUBLIC_KEY = 'wqs2rsAbevgjB03maJlFjsC26tZD1x5dv0arBy1bDBc=';

const errors = [];
const warnings = [];

function walk(dir) {
    const entries = [];
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        const stat = statSync(path);
        if (stat.isDirectory()) entries.push(...walk(path));
        else entries.push(path);
    }
    return entries;
}

if (!existsSync(distDir)) {
    console.error(`Missing build output: ${distDir}\nRun pnpm build:core or pnpm build:firefox first.`);
    process.exit(1);
}

const manifestPath = join(distDir, 'manifest.json');
let manifest = null;

if (!existsSync(manifestPath)) {
    errors.push('manifest.json not found in build output.');
} else {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.name !== 'SignalLens') {
        warnings.push(`Unexpected extension name: ${manifest.name}`);
    }
    if (!manifest.version) {
        errors.push('manifest.json missing version.');
    }
    if (manifest.manifest_version !== 2 && manifest.manifest_version !== 3) {
        errors.push('Unsupported manifest_version.');
    }
    if (!manifest.permissions?.includes('storage')) {
        warnings.push('Expected permission "storage" in manifest.');
    }
}

for (const file of walk(distDir)) {
    const rel = relative(distDir, file).replace(/\\/g, '/');
    if (rel.endsWith('.pem') || rel.includes('dev-private')) {
        errors.push(`Private key material must not ship in CRX/XPI: ${rel}`);
    }
    if (rel.endsWith('.map') && rel.includes('node_modules')) {
        warnings.push(`Source map in bundle: ${rel}`);
    }
}

const trustAnchorPath = join(repoRoot, 'src/core/mods/trust-anchor.ts');
if (existsSync(trustAnchorPath)) {
    const source = readFileSync(trustAnchorPath, 'utf8');
    if (source.includes(DEV_MOD_PUBLIC_KEY)) {
        warnings.push(
            'Mod package trust anchor still uses the development public key. Rotate before a production store release (see docs/guides/store-release.md).'
        );
    }
}

const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
if (manifest) {
    const manifestVersion = manifest.version.replace(/\./g, '');
    const pkgVersion = packageJson.version.replace(/\./g, '');
    if (manifestVersion !== pkgVersion && !manifest.version.startsWith(packageJson.version)) {
        warnings.push(
            `Version mismatch: package.json ${packageJson.version} vs manifest ${manifest.version}. Align before store upload.`
        );
    }

    if (manifest.manifest_version === 2) {
        if (!manifest.browser_action?.default_popup) {
            warnings.push('Firefox MV2 manifest missing browser_action.default_popup.');
        }
        if (!manifest.sidebar_action?.default_panel) {
            warnings.push('Firefox MV2 manifest missing sidebar_action (authenticity UI).');
        }
        const scripts = manifest.background?.scripts;
        if (!Array.isArray(scripts) || scripts.length === 0) {
            errors.push('Firefox MV2 manifest missing background.scripts.');
        } else {
            for (const script of scripts) {
                if (!existsSync(join(distDir, script))) {
                    errors.push(`Background script missing from bundle: ${script}`);
                }
            }
        }
        if (!manifest.browser_specific_settings?.gecko?.id) {
            warnings.push('Missing browser_specific_settings.gecko.id (required for AMO signed builds).');
        }
        const contentJs = manifest.content_scripts?.[0]?.js?.[0];
        if (contentJs && !existsSync(join(distDir, contentJs))) {
            errors.push(`Content script missing from bundle: ${contentJs}`);
        }
        const permissionList = manifest.permissions ?? [];
        const hasHuggingFace = permissionList.some(
            (p) => typeof p === 'string' && (p.includes('huggingface') || p.includes('hf.co'))
        );
        if (hasHuggingFace) {
            warnings.push('Core Firefox build still lists Hugging Face host permissions.');
        }
    }

    if (manifest.manifest_version === 3) {
        if (!manifest.action?.default_popup && !manifest.browser_action?.default_popup) {
            warnings.push('Chrome MV3 manifest missing action.default_popup.');
        }
    }
}

if (warnings.length > 0) {
    console.warn('Store build warnings:');
    for (const warning of warnings) console.warn(`  ⚠ ${warning}`);
}

if (errors.length > 0) {
    console.error('Store build verification failed:');
    for (const error of errors) console.error(`  ✗ ${error}`);
    process.exit(1);
}

console.log(`Store build OK: ${distDir}`);
