import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ExtensionFixtures {
    readonly context: BrowserContext;
    readonly extensionId: string;
}

const currentFilePath: string = fileURLToPath(import.meta.url);
const currentDirPath: string = path.dirname(currentFilePath);
const repoRootPath: string = path.resolve(currentDirPath, '..');
const extensionPath: string = path.resolve(repoRootPath, 'dist');

const test = base.extend<ExtensionFixtures>({
    context: async (_args: Record<string, never>, useFixture: (value: BrowserContext) => Promise<void>) => {
        const context = await chromium.launchPersistentContext('', {
            channel: 'chromium',
            headless: false,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
            ],
        });
        await useFixture(context);
        await context.close();
    },
    extensionId: async ({ context }: { readonly context: BrowserContext }, useFixture: (value: string) => Promise<void>) => {
        let [serviceWorker] = context.serviceWorkers();
        if (!serviceWorker) {
            serviceWorker = await context.waitForEvent('serviceworker');
        }
        const extensionId: string = serviceWorker.url().split('/')[2] ?? '';
        await useFixture(extensionId);
    },
});

export const expect = test.expect;
export { test };
