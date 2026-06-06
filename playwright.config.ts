import { defineConfig, devices } from '@playwright/test';

const TEST_TIMEOUT_MS: number = 180_000;

export default defineConfig({
    testDir: './tests',
    timeout: TEST_TIMEOUT_MS,
    retries: 0,
    webServer: {
        command: 'node tests/fixtures/e2e-server.mjs',
        url: 'http://127.0.0.1:4173/blank.html',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
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
