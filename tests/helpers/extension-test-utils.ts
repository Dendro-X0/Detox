import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { CONTENT_PERF_REQUEST, CONTENT_PERF_RESPONSE } from '../../src/core/ipc/content-messages';
import { enforcementAttrSelector } from '../../src/core/enforcement/element-state';

const currentFilePath = fileURLToPath(import.meta.url);
const repoRootPath = path.resolve(path.dirname(currentFilePath), '../..');
export const extensionDistPath = path.resolve(repoRootPath, 'dist');

export const E2E_FIXTURE_PORT = Number(process.env.E2E_PORT ?? 4173);
export const E2E_FIXTURE_ORIGIN = `http://127.0.0.1:${E2E_FIXTURE_PORT}`;
export const E2E_FIXTURE_URL = `${E2E_FIXTURE_ORIGIN}/blank.html`;

const OUTRAGE_KEYWORDS = ['outrageous', 'furious', 'outraged'] as const;

export type ExtensionStorageSeed = Record<string, unknown>;

export function assertExtensionBuilt(): void {
    const manifestPath = path.join(extensionDistPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
        throw new Error('Extension build missing. Run `pnpm build` before Playwright E2E tests.');
    }
}

export async function getExtensionServiceWorker(context: BrowserContext): Promise<import('@playwright/test').Worker> {
    const workers = context.serviceWorkers();
    if (workers.length > 0) return workers[0]!;

    await context.waitForEvent('serviceworker', { timeout: 60_000 });
    const [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
        throw new Error('Extension service worker did not register.');
    }
    return serviceWorker;
}

export async function clearExtensionStorage(context: BrowserContext): Promise<void> {
    const serviceWorker = await getExtensionServiceWorker(context);
    await serviceWorker.evaluate(async () => {
        await chrome.storage.local.clear();
        if (chrome.storage.session) {
            await chrome.storage.session.clear();
        }
    });
}

export async function seedExtensionStorage(
    context: BrowserContext,
    seed: ExtensionStorageSeed
): Promise<void> {
    const serviceWorker = await getExtensionServiceWorker(context);
    await serviceWorker.evaluate(async (values) => {
        await chrome.storage.local.set(values);
    }, seed);

    const stored = await serviceWorker.evaluate(async () => {
        const record = await chrome.storage.local.get(['enabled', 'userRules']);
        return record;
    });
    const rules = stored.userRules as { blockKeywords?: string[] } | undefined;
    if (!rules?.blockKeywords?.length) {
        throw new Error('Failed to seed extension storage (userRules.blockKeywords missing).');
    }
}

export function defaultOutrageKeywords(): readonly string[] {
    return OUTRAGE_KEYWORDS;
}

export function createFilteringStorageSeed(overrides: ExtensionStorageSeed = {}): ExtensionStorageSeed {
    const blockKeywords = (overrides.userRules as { blockKeywords?: string[] } | undefined)?.blockKeywords
        ?? [...OUTRAGE_KEYWORDS];
    const userRules = {
        blockKeywords,
        allowKeywords: [],
        allowDomains: [],
        ...(overrides.userRules as object | undefined),
    };

    return {
        enabled: true,
        onboardingComplete: true,
        policy: { preset: 'balanced', threshold: 0.5, perSite: {} },
        enforcementAction: { activeActionId: 'dim' },
        inferenceRouting: {
            primaryMode: 'heuristic',
            escalationEnabled: false,
            uncertaintyMargin: 0.1,
            remoteApi: { enabled: false, endpointUrl: '', apiKey: '' },
        },
        userKeywords: blockKeywords,
        activeBrowsingModeId: 'focus',
        enabledModIds: [
            'detector-heuristic-keywords',
            'action-dim',
            'detector-noise-patterns',
            'detector-behavior-signals',
            'adaptation-universal-social',
            'adaptation-en-clickbait',
            'adaptation-de-clickbait',
        ],
        stats: { scanned: 0, toxic: 0 },
        ...overrides,
        userRules,
    };
}

/** Long enough for generic adapter extraction (50+ chars, 8+ words). */
export const FILTER_FIXTURE_COPY = {
    blocked:
        'This is an outrageous scandal that has everyone furious online today. People are sharing angry rants about the decision and demanding immediate change from leadership teams worldwide.',
    neutral:
        'This paragraph describes calm gardening techniques and seasonal planting schedules for backyard vegetables and herbs that grow well in temperate climates during the spring months each year.',
    allowBypass:
        'According to this trustworthy source, the committee reviewed an outrageous claim but found insufficient evidence to support the viral accusations circulating on social media platforms this week.',
} as const;

export async function mountFilteringFixture(page: Page, copy: {
    readonly blocked?: string;
    readonly neutral?: string;
    readonly allowBypass?: string;
} = FILTER_FIXTURE_COPY): Promise<void> {
    await page.evaluate((paragraphs) => {
        const existing = document.getElementById('signallens-e2e-root');
        existing?.remove();

        const root = document.createElement('main');
        root.id = 'signallens-e2e-root';

        const appendParagraph = (id: string, text: string): void => {
            const paragraph = document.createElement('p');
            paragraph.id = id;
            paragraph.textContent = text;
            root.appendChild(paragraph);
        };

        if (paragraphs.blocked) appendParagraph('signallens-blocked-target', paragraphs.blocked);
        if (paragraphs.neutral) appendParagraph('signallens-neutral-target', paragraphs.neutral);
        if (paragraphs.allowBypass) appendParagraph('signallens-allow-target', paragraphs.allowBypass);

        document.body.appendChild(root);
    }, copy);
}

export async function openAcceptanceFixturePage(
    context: BrowserContext,
    fixturePath: string,
    seed: ExtensionStorageSeed = createFilteringStorageSeed()
): Promise<Page> {
    await clearExtensionStorage(context);
    await seedExtensionStorage(context, seed);
    const page = await context.newPage();
    const normalized = fixturePath.startsWith('/') ? fixturePath : `/${fixturePath}`;
    await page.goto(`${E2E_FIXTURE_ORIGIN}${normalized}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);
    return page;
}

export async function openFilteringFixturePage(
    context: BrowserContext,
    seed: ExtensionStorageSeed = createFilteringStorageSeed(),
    copy: {
        readonly blocked?: string;
        readonly neutral?: string;
        readonly allowBypass?: string;
    } = FILTER_FIXTURE_COPY
): Promise<Page> {
    await clearExtensionStorage(context);
    await seedExtensionStorage(context, seed);
    const page = await context.newPage();
    const usesDefaultCopy =
        copy.blocked === FILTER_FIXTURE_COPY.blocked &&
        copy.neutral === FILTER_FIXTURE_COPY.neutral &&
        (copy.allowBypass === undefined || copy.allowBypass === FILTER_FIXTURE_COPY.allowBypass);

    if (usesDefaultCopy) {
        await page.goto(`${E2E_FIXTURE_ORIGIN}/filtering/core-targets.html`, { waitUntil: 'domcontentloaded' });
    } else {
        await page.goto(`${E2E_FIXTURE_URL}?signallens-e2e=1`, { waitUntil: 'domcontentloaded' });
        await mountFilteringFixture(page, copy);
    }
    await page.waitForTimeout(2_000);
    return page;
}

export async function waitForClassifications(page: Page, minimum: number): Promise<void> {
    await expect.poll(async () => {
        return page.evaluate(
            async ({ requestType, responseType }) => {
                return new Promise<number>((resolve) => {
                    const timeout = window.setTimeout(() => resolve(0), 4_000);
                    const listener = (event: MessageEvent): void => {
                        if (event.data?.type !== responseType) return;
                        window.clearTimeout(timeout);
                        window.removeEventListener('message', listener);
                        const metrics = event.data.payload?.metrics as { totalClassified?: number } | undefined;
                        resolve(metrics?.totalClassified ?? 0);
                    };
                    window.addEventListener('message', listener);
                    window.postMessage({ type: requestType }, '*');
                });
            },
            { requestType: CONTENT_PERF_REQUEST, responseType: CONTENT_PERF_RESPONSE }
        );
    }, { timeout: 45_000, intervals: [500, 1000, 2000] }).toBeGreaterThanOrEqual(minimum);
}

export async function waitForBlockedCount(page: Page, expected: number): Promise<void> {
    await expect.poll(async () => page.locator(enforcementAttrSelector('blocked', 'true')).count(), {
        timeout: 45_000,
        intervals: [500, 1000, 2000],
    }).toBe(expected);
}

export async function readExtensionStorage(
    context: BrowserContext,
    keys?: readonly string[]
): Promise<Record<string, unknown>> {
    const serviceWorker = await getExtensionServiceWorker(context);
    return serviceWorker.evaluate(async (storageKeys) => {
        if (storageKeys && storageKeys.length > 0) {
            return chrome.storage.local.get([...storageKeys]);
        }
        return chrome.storage.local.get(null);
    }, keys ?? null);
}

export async function openWizardOptionsPage(
    context: BrowserContext,
    extensionId: string
): Promise<Page> {
    await clearExtensionStorage(context);
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html?wizard=1`, {
        waitUntil: 'domcontentloaded',
    });
    await page.getByRole('button', { name: 'Quick start (Focus)' }).waitFor({ state: 'visible', timeout: 30_000 });
    return page;
}

export async function completeWizardQuickStart(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Quick start (Focus)' }).click();
}

/** Preset path: Welcome → … → Done → Start browsing (no dashboard). */
export async function completeWizardPresetStartBrowsing(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Open dashboard' }).click();
}

export async function waitForWizardApplied(context: BrowserContext): Promise<void> {
    await expect.poll(async () => {
        const stored = await readExtensionStorage(context, ['onboardingComplete', 'enabled']);
        return stored.onboardingComplete === true && stored.enabled === true;
    }, { timeout: 15_000, intervals: [100, 250, 500] }).toBe(true);
}

export async function openFilteringFixtureAfterWizard(
    context: BrowserContext
): Promise<Page> {
    const page = await context.newPage();
    await page.goto(`${E2E_FIXTURE_ORIGIN}/filtering/core-targets.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);
    return page;
}

export async function readExtensionStats(context: BrowserContext): Promise<{ scanned: number; toxic: number }> {
    const serviceWorker = await getExtensionServiceWorker(context);
    return serviceWorker.evaluate(async () => {
        const legacyResult = await chrome.storage.local.get(['stats', 'scanStatsRollup', 'scanStatsPage']);
        const legacy = legacyResult.stats as { scanned?: number; toxic?: number } | undefined;
        const pageLocal = legacyResult.scanStatsPage as { scanned?: number; filtered?: number } | undefined;

        const sessionArea = chrome.storage.session ?? chrome.storage.local;
        const sessionResult = await sessionArea.get('scanStatsPage');
        const pageSession = sessionResult.scanStatsPage as
            | { scanned?: number; filtered?: number }
            | undefined;

        const page = pageLocal ?? pageSession;

        return {
            scanned: page?.scanned ?? legacy?.scanned ?? 0,
            toxic: page?.filtered ?? legacy?.toxic ?? 0,
        };
    });
}

export async function waitForExtensionStats(
    context: BrowserContext,
    minimum: { readonly scanned?: number; readonly toxic?: number; readonly filtered?: number }
): Promise<void> {
    const toxicMinimum = minimum.toxic ?? minimum.filtered;
    if (minimum.scanned !== undefined) {
        await expect.poll(async () => (await readExtensionStats(context)).scanned, {
            timeout: 45_000,
            intervals: [250, 500, 1000],
        }).toBeGreaterThanOrEqual(minimum.scanned);
    }
    if (toxicMinimum !== undefined) {
        await expect.poll(async () => (await readExtensionStats(context)).toxic, {
            timeout: 45_000,
            intervals: [250, 500, 1000],
        }).toBeGreaterThanOrEqual(toxicMinimum);
    }
}
