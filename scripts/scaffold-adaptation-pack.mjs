#!/usr/bin/env node
/**
 * Scaffold a new adaptation pack directory.
 *
 * Usage:
 *   node scripts/scaffold-adaptation-pack.mjs <slug> [--language en] [--context social-feed] [--content-type promotional]
 *
 * Example:
 *   node scripts/scaffold-adaptation-pack.mjs fr-promo --language fr --context ecommerce
 *   → packages/adaptation-packs/adaptation-fr-promo/
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const slugArg = args.find((a) => !a.startsWith('--'));
if (!slugArg) {
    console.error(
        'Usage: node scripts/scaffold-adaptation-pack.mjs <slug> [--language en] [--context social-feed] [--content-type promotional]'
    );
    process.exit(1);
}

function readFlag(name, fallback) {
    const idx = args.indexOf(name);
    if (idx === -1 || !args[idx + 1]) return fallback;
    return args[idx + 1];
}

const slug = slugArg.replace(/^adaptation-/, '');
const modId = `adaptation-${slug}`;
const language = readFlag('--language', 'en');
const context = readFlag('--context', 'social-feed');
const contentType = readFlag('--content-type', 'promotional');
const languages = language === '*' ? ['*'] : [language];
const title = slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const root = join(process.cwd(), 'packages/adaptation-packs', modId);
if (existsSync(root)) {
    console.error(`Directory already exists: ${root}`);
    process.exit(1);
}

mkdirSync(root, { recursive: true });

const pack = {
    format: 'signallens-adaptation/1',
    packId: modId,
    version: '1.0.0',
    languages,
    contexts: [context],
    contentTypes: [contentType],
    privacy: {
        networkAccess: false,
        persistsPageContent: false,
        telemetry: false,
    },
    supplementalKeywords: ['example phrase — replace me'],
    noisePatterns: {
        promo: ['example pattern'],
    },
};

const meta = {
    modId,
    name: `${title} adaptation pack`,
    version: '1.0.0',
    description: `Local ${language === '*' ? 'language-agnostic' : language} rules for ${context} pages. Edit pack.json before signing.`,
    permissionsSummary: 'Local pattern lists only. No network. No upload. No page content storage.',
    packCategory: language === '*' ? 'context' : 'language',
    languages,
    contexts: [context],
    contentTypes: [contentType],
};

writeFileSync(join(root, 'pack.json'), `${JSON.stringify(pack, null, 2)}\n`);
writeFileSync(join(root, 'mod.meta.json'), `${JSON.stringify(meta, null, 2)}\n`);

console.log(`Created ${root}`);
console.log('');
console.log('Next steps:');
console.log(`  1. Edit ${modId}/pack.json — replace example rules`);
console.log(`  2. node scripts/validate-adaptation-pack.mjs packages/adaptation-packs/${modId}`);
console.log(`  3. node scripts/build-adaptation-mod-package.mjs packages/adaptation-packs/${modId}`);
console.log('  4. Install the .signallens-mod.json via Dashboard → Plugins → Install package');
