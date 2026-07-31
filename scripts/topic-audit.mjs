#!/usr/bin/env node
/**
 * Topic corpus validation + D0 keyword baseline report (Track D research).
 *
 * Usage: pnpm test:topic-audit
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const result = spawnSync(
    pnpm,
    ['exec', 'vitest', 'run', 'tests/core/topic-audit.spec.ts'],
    { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }
);

const textReport = join(root, 'artifacts/topic-audit-report.txt');
if (result.status === 0 && existsSync(textReport)) {
    console.log('\n--- Topic audit summary (D0 baseline) ---\n');
    console.log(readFileSync(textReport, 'utf8'));
    console.log('Expand corpus per docs/planning/topic-corpus-labeling-guide.md');
}

process.exit(result.status ?? 1);
