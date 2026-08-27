import path from 'node:path';
import { defineConfig } from 'vitest/config';

/** Network / model gates — not part of default `pnpm test:scanner`. */
export default defineConfig({
    test: {
        environment: 'node',
        include: [
            'tests/core/topic-embedding-audit.spec.ts',
            'tests/core/topic-classifier-latency.spec.ts',
            'tests/core/spike3-bbc-dogfood.spec.ts',
            'tests/scripts/precompute-topic-centroids.spec.ts',
        ],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
