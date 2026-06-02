import { DEFAULT_POLICY, type PolicySettings } from '../types/policy';

type PolicyStorageRecord = {
    readonly policy?: PolicySettings;
};

let currentPolicy: PolicySettings = DEFAULT_POLICY;

export function getPolicy(): PolicySettings {
    return currentPolicy;
}

export function getThreshold(): number {
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
