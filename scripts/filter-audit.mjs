#!/usr/bin/env node
/**
 * Run Focus + Research false-positive audit against the dogfood corpus.
 * Writes artifacts/filter-audit-report.{json,txt} on success.
 *
 * Usage: pnpm test:filter-audit
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const result = spawnSync(
    pnpm,
    ['exec', 'vitest', 'run', 'tests/core/false-positive-audit.spec.ts'],
    { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }
);

const textReport = join(root, 'artifacts/filter-audit-report.txt');
if (result.status === 0 && existsSync(textReport)) {
    console.log('\n--- Filter audit summary ---\n');
    console.log(readFileSync(textReport, 'utf8'));
}

process.exit(result.status ?? 1);
