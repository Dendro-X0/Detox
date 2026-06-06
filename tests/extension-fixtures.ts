import fs from 'node:fs';
import os from 'node:os';
import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { E2E_FIXTURE_URL } from './helpers/extension-test-utils';

interface ExtensionFixtures {
    readonly context: BrowserContext;
    readonly extensionId: string;
}

const currentFilePath: string = fileURLToPath(import.meta.url);
const currentDirPath: string = path.dirname(currentFilePath);
const repoRootPath: string = path.resolve(currentDirPath, '..');
const extensionPath: string = path.resolve(repoRootPath, 'dist');

async function warmUpExtensionContext(context: BrowserContext): Promise<void> {
    if (context.serviceWorkers().length > 0) return;

    const serviceWorkerPromise = context.waitForEvent('serviceworker', { timeout: 60_000 });
    const page = await context.newPage();
    await page.goto(E2E_FIXTURE_URL, { waitUntil: 'domcontentloaded' });
    await serviceWorkerPromise;
    await page.close();
}

const test = base.extend<ExtensionFixtures>({
    context: async ({}, useFixture) => {
        const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'signallens-pw-'));
        const context = await chromium.launchPersistentContext(userDataDir, {
            headless: false,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
            ],
        });

        try {
            await warmUpExtensionContext(context);
            await useFixture(context);
        } finally {
            await context.close();
            fs.rmSync(userDataDir, { recursive: true, force: true });
        }
    },
    extensionId: async ({ context }, useFixture) => {
        const [serviceWorker] = context.serviceWorkers();
        if (!serviceWorker) {
            throw new Error('Extension service worker did not register.');
        }
        const extensionId: string = serviceWorker.url().split('/')[2] ?? '';
        await useFixture(extensionId);
    },
});

export const expect = test.expect;
export { test };
