#!/usr/bin/env node
/**
 * Verify store metadata (local files + optional live URL check).
 *
 * Usage:
 *   node scripts/verify-store-meta.mjs
 *   node scripts/verify-store-meta.mjs --check-url   # also fetch privacyPolicyUrl
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkUrl = process.argv.includes('--check-url');
const meta = JSON.parse(readFileSync(join(repoRoot, 'store/store-meta.json'), 'utf8'));

const errors = [];
const warnings = [];

if (!meta.repoUrl || typeof meta.repoUrl !== 'string') {
    errors.push('store-meta.json missing repoUrl');
}
if (!meta.privacyPolicyUrl || typeof meta.privacyPolicyUrl !== 'string') {
    errors.push('store-meta.json missing privacyPolicyUrl');
} else if (!/^https:\/\//.test(meta.privacyPolicyUrl)) {
    errors.push('privacyPolicyUrl must be an https URL');
}

const localPrivacyPath = join(repoRoot, 'store/PRIVACY.md');
if (!existsSync(localPrivacyPath)) {
    errors.push('Missing local store/PRIVACY.md');
}

if (checkUrl && meta.privacyPolicyUrl) {
    try {
        const response = await fetch(meta.privacyPolicyUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: { 'User-Agent': 'SignalLens-release-verify/1.0' },
        });
        if (!response.ok) {
            errors.push(`Privacy policy URL returned HTTP ${response.status}: ${meta.privacyPolicyUrl}`);
        }
    } catch (error) {
        warnings.push(
            `Could not fetch privacy policy URL (${error instanceof Error ? error.message : String(error)}). ` +
                'Confirm it is public before store submit.'
        );
    }
}

if (warnings.length > 0) {
    console.warn('Store metadata warnings:');
    for (const warning of warnings) console.warn(`  ⚠ ${warning}`);
}

if (errors.length > 0) {
    console.error('Store metadata verification failed:');
    for (const error of errors) console.error(`  ✗ ${error}`);
    process.exit(1);
}

console.log(`Store metadata OK${checkUrl ? ' (with URL check)' : ''}: ${meta.privacyPolicyUrl}`);
