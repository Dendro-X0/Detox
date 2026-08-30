import { test, expect } from '../extension-fixtures';
import {
    assertExtensionBuilt,
    completeWizardPresetStartBrowsing,
    completeWizardQuickStart,
    openFilteringFixtureAfterWizard,
    openWizardOptionsPage,
    readExtensionStorage,
    waitForBlockedCount,
    waitForClassifications,
    waitForWizardApplied,
} from '../helpers/extension-test-utils';

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
    assertExtensionBuilt();
});

test.describe('install wizard → filtering', () => {
    test('quick start applies Focus preset and filters fixture content', async ({ context, extensionId }) => {
        const wizardPage = await openWizardOptionsPage(context, extensionId);
        await completeWizardQuickStart(wizardPage);
        await wizardPage.close().catch(() => undefined);
        await waitForWizardApplied(context);

        const stored = await readExtensionStorage(context, [
            'enabled',
            'onboardingComplete',
            'activeBrowsingModeId',
        ]);
        expect(stored.enabled).toBe(true);
        expect(stored.onboardingComplete).toBe(true);
        expect(stored.activeBrowsingModeId).toBe('focus');

        const page = await openFilteringFixtureAfterWizard(context);
        await waitForClassifications(page, 1);
        await waitForBlockedCount(page, 1);
        await expect(page.locator('#signallens-blocked-target')).toHaveAttribute('data-sl-blocked', 'true');
        await page.close();
    });

    test('preset path Start browsing applies settings and filters fixture content', async ({
        context,
        extensionId,
    }) => {
        const wizardPage = await openWizardOptionsPage(context, extensionId);
        await completeWizardPresetStartBrowsing(wizardPage);
        await wizardPage.close().catch(() => undefined);
        await waitForWizardApplied(context);

        const stored = await readExtensionStorage(context, ['enabled', 'onboardingComplete']);
        expect(stored.enabled).toBe(true);
        expect(stored.onboardingComplete).toBe(true);

        const page = await openFilteringFixtureAfterWizard(context);
        await waitForBlockedCount(page, 1);
        await expect(page.locator('#signallens-neutral-target')).not.toHaveAttribute('data-sl-blocked', 'true');
        await page.close();
    });
});
