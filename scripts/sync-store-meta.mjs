#!/usr/bin/env node
/**
 * Sync store listing docs from store/store-meta.json (privacy URL, repo links).
 *
 * Usage: node scripts/sync-store-meta.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const meta = JSON.parse(readFileSync(join(repoRoot, 'store/store-meta.json'), 'utf8'));

function replacePrivacyUrl(content) {
    return content.replace(
        /https:\/\/github\.com\/[^\s)]+(?:\/blob\/main\/store\/PRIVACY\.md|\/store\/PRIVACY\.md)/g,
        meta.privacyPolicyUrl
    ).replace(
        /https:\/\/github\.com\/YOUR_ORG\/YOUR_REPO\/blob\/main\/store\/PRIVACY\.md/g,
        meta.privacyPolicyUrl
    );
}

const releaseNotesPath = join(repoRoot, 'store/RELEASE-NOTES-TEMPLATE.md');
let releaseNotes = readFileSync(releaseNotesPath, 'utf8');
releaseNotes = replacePrivacyUrl(releaseNotes);
if (!releaseNotes.includes(meta.privacyPolicyUrl)) {
    releaseNotes = releaseNotes.replace(
        /### Privacy\n\n[^\n]+/,
        `### Privacy\n\n${meta.privacyPolicyUrl}`
    );
}
writeFileSync(releaseNotesPath, releaseNotes);

for (const name of ['listing-chrome.md', 'listing-firefox.md']) {
    const path = join(repoRoot, 'store', name);
    let content = readFileSync(path, 'utf8');
    content = content.replace(
        /host `store\/PRIVACY\.md` on GitHub or your project site/g,
        `privacy policy at ${meta.privacyPolicyUrl}`
    );
    writeFileSync(path, content);
}

console.log(`Synced store docs with privacy URL: ${meta.privacyPolicyUrl}`);
