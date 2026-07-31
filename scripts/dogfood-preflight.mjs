#!/usr/bin/env node
/**
 * Automated preflight before v3.0 structured dogfood (A-R5).
 * Runs filter audit + context-gating unit tests; prints pass/fail summary.
 *
 * Usage: pnpm dogfood:preflight
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function run(label, args) {
    console.log(`\n▶ ${label}\n`);
    const result = spawnSync(pnpm, args, {
        cwd: root,
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });
    const ok = result.status === 0;
    console.log(ok ? `✓ ${label}` : `✗ ${label}`);
    return ok;
}

console.log('SignalLens dogfood preflight (A-R5)\n');

const steps = [
    {
        label: 'Filter audit (Focus + Research FP gate)',
        args: ['test:filter-audit'],
    },
    {
        label: 'Page context + pack registry (B3/B4 unit gates)',
        args: [
            'exec',
            'vitest',
            'run',
            '--config',
            'vitest.config.ts',
            'tests/adaptation/page-context.spec.ts',
            'tests/adaptation/adaptation-pack-registry.spec.ts',
        ],
    },
];

const results = steps.map((step) => ({ label: step.label, ok: run(step.label, step.args) }));

const auditPath = join(root, 'artifacts/filter-audit-report.txt');
if (existsSync(auditPath)) {
    console.log('\n--- Latest filter audit ---\n');
    console.log(readFileSync(auditPath, 'utf8'));
}

console.log('\n--- Preflight summary ---\n');
for (const { label, ok } of results) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
}

const allOk = results.every((r) => r.ok);
if (allOk) {
    console.log('\nReady for manual dogfood: docs/qa/dogfood-signoff.md\n');
} else {
    console.error('\nFix failing gates before manual dogfood.\n');
}

process.exit(allOk ? 0 : 1);
