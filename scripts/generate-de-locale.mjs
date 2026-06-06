/**
 * Regenerates src/i18n/locales/de.json from en.json + flat German overrides.
 * Run: node scripts/generate-de-locale.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const en = JSON.parse(readFileSync(join(root, 'src/i18n/locales/en.json'), 'utf8'));

/** Flat dot-path → Deutsch. Missing paths keep English until translated. */
const deOverrides = JSON.parse(
    readFileSync(join(root, 'src/i18n/locales/de.overrides.json'), 'utf8')
);

function collectPaths(node, prefix = '') {
    const paths = [];
    for (const [key, value] of Object.entries(node)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') paths.push(path);
        else if (value && typeof value === 'object') paths.push(...collectPaths(value, path));
    }
    return paths;
}

function setPath(target, path, value) {
    const parts = path.split('.');
    let cursor = target;
    for (let i = 0; i < parts.length - 1; i += 1) {
        const part = parts[i];
        if (!(part in cursor)) cursor[part] = {};
        cursor = cursor[part];
    }
    cursor[parts[parts.length - 1]] = value;
}

function getPath(node, path) {
    return path.split('.').reduce((current, part) => current?.[part], node);
}

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

const de = deepClone(en);
de.meta = {
    localeId: 'de',
    nativeName: 'Deutsch',
    englishName: 'German',
    direction: 'ltr',
};

for (const [path, text] of Object.entries(deOverrides)) {
    setPath(de, path, text);
}

const enPaths = collectPaths(en);
const dePaths = collectPaths(de);
const missing = enPaths.filter((path) => !dePaths.includes(path));
if (missing.length > 0) {
    console.error('Missing paths in de.json:', missing.slice(0, 5).join(', '), missing.length > 5 ? '…' : '');
    process.exit(1);
}

const untranslated = enPaths.filter((path) => getPath(de, path) === getPath(en, path) && !path.startsWith('meta.'));
writeFileSync(
    join(root, 'src/i18n/locales/de.json'),
    `${JSON.stringify(de, null, 2)}\n`,
    'utf8'
);
console.log(`Wrote de.json (${enPaths.length} keys, ${untranslated.length} still matching English)`);
