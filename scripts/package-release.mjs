#!/usr/bin/env node
/**
 * Zip a built extension directory for store upload or GitHub release assets.
 *
 * Usage:
 *   node scripts/package-release.mjs --dir dist --label chrome-core
 *   node scripts/package-release.mjs --dir dist-firefox --label firefox-core
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function readArg(flag, fallback) {
    const index = process.argv.indexOf(flag);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
}

const distDir = join(repoRoot, readArg('--dir', 'dist'));
const label = readArg('--label', 'signallens');
const outDir = join(repoRoot, readArg('--out', 'releases'));

if (!existsSync(join(distDir, 'manifest.json'))) {
    console.error(`No manifest.json in ${distDir}. Build and verify first.`);
    process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(distDir, 'manifest.json'), 'utf8'));
const version = manifest.version ?? '0.0.0';
const zipName = `${label}-v${version}.zip`;
const zipPath = join(outDir, zipName);

mkdirSync(outDir, { recursive: true });

if (platform() === 'win32') {
    const psDist = distDir.replace(/'/g, "''");
    const psZip = zipPath.replace(/'/g, "''");
    execSync(
        `powershell -NoProfile -Command "Compress-Archive -Path '${psDist}\\*' -DestinationPath '${psZip}' -Force"`,
        { stdio: 'inherit' }
    );
} else {
    execSync(`cd "${distDir}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
}

console.log(`Packaged ${zipPath}`);
