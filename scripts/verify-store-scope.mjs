#!/usr/bin/env node
/**
 * Verify store listing copy matches Option A scope honesty (§F3).
 *
 * Usage: pnpm store:verify:scope
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const listingFiles = ['store/listing-chrome.md', 'store/listing-firefox.md'];
const scopeFaqPath = 'docs/scope-faq.md';

const forbiddenPatterns = [
    { pattern: /block(s)? misinformation/i, label: 'blocks misinformation' },
    { pattern: /fight(s)? misinformation/i, label: 'fight misinformation' },
    { pattern: /fact[- ]check your feed/i, label: 'fact-check your feed' },
    { pattern: /analyz(e|es) images/i, label: 'analyzes images' },
    { pattern: /block(s)? false/i, label: 'blocks false information' },
];

const requiredPatterns = [
    { pattern: /\btext(ual)?\b/i, label: 'text/textual scope' },
    { pattern: /reveal|reversible/i, label: 'reveal-first / reversible' },
    { pattern: /image-only/i, label: 'image-only limitation' },
];

const warnings = [];
const errors = [];

if (!existsSync(join(repoRoot, scopeFaqPath))) {
    errors.push(`Missing ${scopeFaqPath}`);
}

for (const relPath of listingFiles) {
    const absPath = join(repoRoot, relPath);
    if (!existsSync(absPath)) {
        errors.push(`Missing ${relPath}`);
        continue;
    }
    const content = readFileSync(absPath, 'utf8');

    for (const { pattern, label } of forbiddenPatterns) {
        if (pattern.test(content)) {
            errors.push(`${relPath}: forbidden phrase — ${label}`);
        }
    }

    for (const { pattern, label } of requiredPatterns) {
        if (!pattern.test(content)) {
            errors.push(`${relPath}: missing required messaging — ${label}`);
        }
    }

    const shortSection = content.slice(0, 600);
    if (/research assist/i.test(shortSection) && !/optional|experimental|off by default/i.test(shortSection)) {
        warnings.push(
            `${relPath}: short description mentions research assist without optional/experimental qualifier`
        );
    }
}

if (warnings.length > 0) {
    console.warn('Store scope warnings:');
    for (const warning of warnings) console.warn(`  ⚠ ${warning}`);
}

if (errors.length > 0) {
    console.error('Store scope verification failed:');
    for (const error of errors) console.error(`  ✗ ${error}`);
    process.exit(1);
}

console.log('Store scope OK — listings and scope FAQ align with Option A boundaries.');
