import { test, expect } from './extension-fixtures';
import {
    assertExtensionBuilt,
    createFilteringStorageSeed,
    E2E_FIXTURE_ORIGIN,
    openAcceptanceFixturePage,
    readExtensionStats,
    waitForExtensionStats,
} from './helpers/extension-test-utils';

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
    assertExtensionBuilt();
});

test.describe('S4 — acceptance (extension + recorded snapshots)', () => {
    test('SPA navigation resets per-page scan stats without bleed', async ({ context }) => {
        const seed = createFilteringStorageSeed();
        const pageA = await openAcceptanceFixturePage(context, 'acceptance/spa-route-a.html', seed);

        await waitForExtensionStats(context, { scanned: 2 });
        const statsAfterA = await readExtensionStats(context);
        expect(statsAfterA.scanned).toBeGreaterThanOrEqual(3);

        await pageA.goto(`${E2E_FIXTURE_ORIGIN}/acceptance/spa-route-b.html`, {
            waitUntil: 'domcontentloaded',
        });

        await expect.poll(async () => (await readExtensionStats(context)).scanned, {
            timeout: 45_000,
            intervals: [500, 1000, 2000],
        }).toBeLessThan(statsAfterA.scanned);

        await waitForExtensionStats(context, { scanned: 2 });
        const statsAfterB = await readExtensionStats(context);
        expect(statsAfterB.scanned).toBeGreaterThanOrEqual(2);
        expect(statsAfterB.scanned).toBeLessThanOrEqual(3);

        await pageA.close();
    });

    test('static article snapshot scans multiple prose blocks via universal scanner', async ({ context }) => {
        const page = await openAcceptanceFixturePage(
            context,
            'acceptance/static-article.html',
            createFilteringStorageSeed()
        );

        await waitForExtensionStats(context, { scanned: 5 });
        const stats = await readExtensionStats(context);
        expect(stats.scanned).toBeGreaterThanOrEqual(6);

        await page.close();
    });
});
