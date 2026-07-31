#!/usr/bin/env node
/**
 * D1 embedding topic audit (Track D Spike 2).
 *
 * Downloads Xenova/all-MiniLM-L6-v2 on first run (~30MB).
 * Usage: pnpm test:topic-embedding-audit
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const result = spawnSync(
    pnpm,
    ['exec', 'vitest', 'run', 'tests/core/topic-embedding-audit.spec.ts'],
    { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' }
);

const textReport = join(root, 'artifacts/topic-embedding-audit-report.txt');
if (result.status === 0 && existsSync(textReport)) {
    console.log('\n--- Topic embedding audit (D1) ---\n');
    console.log(readFileSync(textReport, 'utf8'));
}

process.exit(result.status ?? 1);
