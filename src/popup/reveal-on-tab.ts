/// <reference types="chrome" />

/** Ask the active tab's content script to reveal a filtered unit by block id. */
export function revealBlockedUnitOnActiveTab(unitId: string): Promise<boolean> {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id;
            if (!tabId) {
                resolve(false);
                return;
            }
            chrome.tabs.sendMessage(
                tabId,
                { type: 'revealBlockedUnit', unitId },
                (response: { readonly ok?: boolean } | undefined) => {
                    resolve(Boolean(response?.ok) && !chrome.runtime.lastError);
                }
            );
        });
    });
}
