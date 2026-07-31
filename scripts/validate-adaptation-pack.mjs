#!/usr/bin/env node
/**
 * Validate pack.json (+ mod.meta.json) in an adaptation pack directory.
 *
 * Usage:
 *   node scripts/validate-adaptation-pack.mjs <pack-directory>
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateModMeta, validatePackJson } from './adaptation-pack-utils.mjs';

const dir = process.argv[2];
if (!dir) {
    console.error('Usage: node scripts/validate-adaptation-pack.mjs <pack-directory>');
    process.exit(1);
}

const packPath = join(dir, 'pack.json');
const metaPath = join(dir, 'mod.meta.json');

if (!existsSync(packPath)) {
    console.error(`Missing ${packPath}`);
    process.exit(1);
}
if (!existsSync(metaPath)) {
    console.error(`Missing ${metaPath}`);
    process.exit(1);
}

const pack = JSON.parse(readFileSync(packPath, 'utf8'));
const meta = JSON.parse(readFileSync(metaPath, 'utf8'));

const metaErrors = validateModMeta(meta);
const packErrors = validatePackJson(pack, { modId: meta.modId });

if (meta.version !== pack.version) {
    metaErrors.push(`version mismatch: mod.meta.json (${meta.version}) vs pack.json (${pack.version})`);
}

const allErrors = [...metaErrors, ...packErrors];
if (allErrors.length > 0) {
    console.error('Validation failed:');
    for (const err of allErrors) {
        console.error(`  - ${err}`);
    }
    process.exit(1);
}

console.log(`Valid adaptation pack: ${meta.modId} (${meta.name})`);
console.log(`  Languages: ${meta.languages.join(', ')}`);
console.log(`  Contexts: ${meta.contexts.join(', ')}`);
console.log(`  Keywords: ${pack.supplementalKeywords?.length ?? 0}`);
console.log(`  Noise pattern categories: ${Object.keys(pack.noisePatterns ?? {}).length}`);
