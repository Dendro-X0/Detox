#!/usr/bin/env node
/**
 * Run Focus-mode false-positive audit against the dogfood corpus.
 *
 * Usage: pnpm test:filter-audit
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['exec', 'vitest', 'run', 'tests/core/false-positive-audit.spec.ts'],
    { cwd: root, stdio: 'inherit' }
);
process.exit(result.status ?? 1);
