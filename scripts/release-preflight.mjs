#!/usr/bin/env node
/**
 * Track C / §G engineering preflight before v2.3.x tag or store submit.
 *
 * Usage: pnpm release:preflight
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
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

console.log('SignalLens release preflight (Track C / §G)\n');

const steps = [
    { id: 'G1', label: 'Unit + integration (test:scanner)', args: ['test:scanner'] },
    { id: 'G4', label: 'Filter audit (D4)', args: ['test:filter-audit'] },
    { id: 'G2', label: 'Core build (Chrome)', args: ['build:core'] },
    { id: 'G2b', label: 'Core build (Firefox)', args: ['build:core:firefox'] },
    { id: 'G6', label: 'Release verify (Chrome)', args: ['release:verify'] },
    { id: 'G6b', label: 'Release verify (Firefox)', args: ['release:verify:firefox'] },
    { id: 'F3', label: 'Store scope audit', args: ['store:verify:scope'] },
    { id: 'meta', label: 'Store metadata', args: ['store:verify'] },
    { id: 'G5a', label: 'Firefox bundle tests', args: ['exec', 'vitest', 'run', '--config', 'vitest.config.ts', 'tests/firefox'] },
];

const results = steps.map((step) => ({ ...step, ok: run(step.label, step.args) }));

const lines = [
    `Release preflight @ ${new Date().toISOString()}`,
    '',
    ...results.map((r) => `${r.ok ? 'PASS' : 'FAIL'}  [${r.id}] ${r.label}`),
    '',
    `Overall: ${results.every((r) => r.ok) ? 'PASS' : 'FAIL'}`,
    '',
    'Manual gates still required:',
    '  C-R2 / G5 — Firefox manual QA rows 1–8, 14 (docs/guides/firefox-qa.md)',
    '  C-R4 — Store screenshots (store/SCREENSHOTS.md)',
    '  C-R5 — 30-day dogfood issue log (docs/qa/dogfood-issue-log.md)',
    '  C-R6 — Persona sign-off (docs/planning/v3-acceptance-checklist.md)',
    '',
];

mkdirSync(join(root, 'artifacts'), { recursive: true });
const reportPath = join(root, 'artifacts/release-preflight-report.txt');
writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');

console.log('\n--- Preflight summary ---\n');
for (const line of lines.slice(2, 2 + results.length)) console.log(line);
console.log(`\nReport: artifacts/release-preflight-report.txt`);

const allOk = results.every((r) => r.ok);
if (allOk) {
    console.log('\nAutomated §G gates ready. Next: pnpm release:chrome && pnpm release:firefox\n');
} else {
    console.error('\nFix failing gates before tagging v2.3.0.\n');
}

process.exit(allOk ? 0 : 1);
