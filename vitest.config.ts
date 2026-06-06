import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        include: [
            'tests/core/**/*.spec.ts',
            'tests/scanner/**/*.spec.ts',
            'tests/modes/**/*.spec.ts',
            'tests/detectors/**/*.spec.ts',
            'tests/authenticity/**/*.spec.ts',
            'tests/firefox/**/*.spec.ts',
            'tests/i18n/**/*.spec.ts',
            'tests/onboarding/**/*.spec.ts',
            'tests/scripts/**/*.spec.ts',
            'tests/rules/**/*.spec.ts',
            'tests/popup/**/*.spec.ts',
        ],
        // S0 catalog + S1 scanner + S2 diff/coordinator
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
