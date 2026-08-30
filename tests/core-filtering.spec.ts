import { test, expect } from './extension-fixtures';
import { enforcementAttrSelector } from '../src/core/enforcement/element-state';
import {
    assertExtensionBuilt,
    createFilteringStorageSeed,
    defaultOutrageKeywords,
    FILTER_FIXTURE_COPY,
    openFilteringFixturePage,
    waitForBlockedCount,
    waitForClassifications,
    waitForExtensionStats,
} from './helpers/extension-test-utils';

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
    assertExtensionBuilt();
});

test.describe('core filtering pipeline', () => {
    test('dims paragraphs that match block keywords', async ({ context }) => {
        const page = await openFilteringFixturePage(context);
        await waitForClassifications(page, 1);
        await waitForBlockedCount(page, 1);

        await expect(page.locator('#signallens-blocked-target')).toHaveAttribute('data-sl-blocked', 'true');
        await expect(page.locator('#signallens-neutral-target')).not.toHaveAttribute('data-sl-blocked', 'true');

        await page.close();
    });

    test('does not dim content when focus mode is disabled', async ({ context }) => {
        const page = await openFilteringFixturePage(
            context,
            createFilteringStorageSeed({ enabled: false })
        );

        await page.waitForTimeout(8_000);
        await expect(page.locator(enforcementAttrSelector('blocked', 'true'))).toHaveCount(0);

        await page.close();
    });

    test('respects allow keywords over block keywords', async ({ context }) => {
        const page = await openFilteringFixturePage(
            context,
            createFilteringStorageSeed({
                userRules: {
                    blockKeywords: [...defaultOutrageKeywords()],
                    allowKeywords: ['trustworthy source'],
                    allowDomains: [],
                },
            }),
            {
                blocked: FILTER_FIXTURE_COPY.blocked,
                allowBypass: FILTER_FIXTURE_COPY.allowBypass,
            }
        );

        await waitForBlockedCount(page, 1);
        await expect(page.locator('#signallens-blocked-target')).toHaveAttribute('data-sl-blocked', 'true');
        await expect(page.locator('#signallens-allow-target')).not.toHaveAttribute('data-sl-blocked', 'true');

        await page.close();
    });

    test('reveals dimmed content when the user clicks the block', async ({ context }) => {
        const page = await openFilteringFixturePage(context, createFilteringStorageSeed(), {
            blocked: FILTER_FIXTURE_COPY.blocked,
        });

        await waitForBlockedCount(page, 1);
        await page.locator('.sl-filter-frame-label').click();
        await expect(page.locator('#signallens-blocked-target')).not.toHaveAttribute('data-sl-blocked', 'true');

        await page.close();
    });

    test('updates scanned and blocked stats in storage', async ({ context }) => {
        const page = await openFilteringFixturePage(context);
        await waitForBlockedCount(page, 1);
        await waitForClassifications(page, 1);
        await waitForExtensionStats(context, { scanned: 1, filtered: 1 });

        await page.close();
    });
});
