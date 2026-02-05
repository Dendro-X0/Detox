import { defineConfig, devices } from '@playwright/test';

const TEST_TIMEOUT_MS: number = 120_000;

export default defineConfig({
    testDir: './tests',
    timeout: TEST_TIMEOUT_MS,
    retries: 0,
    use: {
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium-extension',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    reporter: [['list']],
});
