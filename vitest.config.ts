import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        include: [
            'tests/adaptation/**/*.spec.ts',
            'tests/core/**/*.spec.ts',
            'tests/scanner/**/*.spec.ts',
            'tests/modes/**/*.spec.ts',
            'tests/detectors/**/*.spec.ts',
            'tests/authenticity/**/*.spec.ts',
            'tests/firefox/**/*.spec.ts',
            'tests/i18n/**/*.spec.ts',
            'tests/onboarding/**/*.spec.ts',
            'tests/scripts/**/*.spec.ts',
            'tests/store/**/*.spec.ts',
            'tests/settings/**/*.spec.ts',
            'tests/rules/**/*.spec.ts',
            'tests/popup/**/*.spec.ts',
        ],
        exclude: [
            'tests/core-filtering.spec.ts',
            'tests/scanner-acceptance-e2e.spec.ts',
            'tests/onboarding/wizard-install-e2e.spec.ts',
            'tests/perf-regression.spec.ts',
            // Network / model-download gates — run via dedicated scripts:
            // pnpm test:topic-embedding-audit | test:topic-classifier | precompute:topic-centroids
            'tests/core/topic-embedding-audit.spec.ts',
            'tests/core/topic-classifier-latency.spec.ts',
            'tests/scripts/precompute-topic-centroids.spec.ts',
        ],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
