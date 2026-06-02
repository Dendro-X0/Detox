import { DEFAULT_POLICY, type PolicySettings } from '../types/policy';

type PolicyStorageRecord = {
    readonly policy?: PolicySettings;
};

let currentPolicy: PolicySettings = DEFAULT_POLICY;

export function getPolicy(): PolicySettings {
    return currentPolicy;
}

function normalizeHost(hostname: string): string {
    return hostname.trim().toLowerCase().replace(/^www\./, '');
}

export function getThreshold(): number {
    return currentPolicy.threshold;
}

export function getThresholdForHost(hostname: string): number {
    const host = normalizeHost(hostname);
    const direct = currentPolicy.perSite[host];
    if (direct !== undefined) return direct;

    for (const [siteHost, threshold] of Object.entries(currentPolicy.perSite)) {
        if (host === siteHost || host.endsWith(`.${siteHost}`)) {
            return threshold;
        }
    }

    return currentPolicy.threshold;
}

export function loadPolicy(): void {
    chrome.storage.local.get('policy', (res: unknown) => {
        const record = res as PolicyStorageRecord;
        if (record.policy) {
            currentPolicy = record.policy;
        }
    });
}

export function subscribeToPolicyChanges(onChange: (policy: PolicySettings) => void): void {
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.policy) {
            const newPolicy = changes.policy.newValue as PolicySettings | undefined;
            if (newPolicy) {
                currentPolicy = newPolicy;
                onChange(newPolicy);
            }
        }
    });
}

export function installPolicyLoader(): void {
    loadPolicy();
    subscribeToPolicyChanges(() => {
        // Threshold reads are always fresh via getThreshold()
    });
}
