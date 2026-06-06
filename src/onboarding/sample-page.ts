/** Suggested pages for post-wizard “try filtering” handoff (feeds / comments). */
export const WIZARD_SAMPLE_PAGE_URL = 'https://www.reddit.com/';

export function openWizardSamplePage(): void {
    void chrome.tabs.create({ url: WIZARD_SAMPLE_PAGE_URL, active: true });
}
