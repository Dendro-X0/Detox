import {
    getAuthenticityJob,
    requestCancelAuthenticityJob,
} from '../mods/analyzers/authenticity/pipeline';

export type AssistNetworkJobKind = 'define' | 'compare' | 'verify';

export type AssistNetworkJobState = {
    readonly jobId: string;
    readonly kind: AssistNetworkJobKind;
    readonly phase: 'running' | 'done' | 'error' | 'cancelled';
    readonly message?: string;
};

let activeAbort: AbortController | null = null;
let activeKind: AssistNetworkJobKind | null = null;
let activeJobId: string | null = null;

function newJobId(): string {
    return `assist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function beginAssistNetworkJob(kind: AssistNetworkJobKind): AbortSignal {
    cancelAssistNetworkJob();
    activeAbort = new AbortController();
    activeKind = kind;
    activeJobId = newJobId();
    return activeAbort.signal;
}

export function cancelAssistNetworkJob(): void {
    activeAbort?.abort();
    activeAbort = null;
    activeKind = null;
    activeJobId = null;
    requestCancelAuthenticityJob();
}

export function getActiveAssistNetworkJob(): AssistNetworkJobState | null {
    if (activeKind && activeJobId && activeAbort) {
        return {
            jobId: activeJobId,
            kind: activeKind,
            phase: 'running',
        };
    }
    return null;
}

export async function getAssistNetworkJobState(): Promise<AssistNetworkJobState | null> {
    const active = getActiveAssistNetworkJob();
    if (active) return active;

    const verifyJob = await getAuthenticityJob();
    if (!verifyJob) return null;

    const runningPhases = new Set(['extracting', 'searching', 'fetching', 'synthesizing']);
    if (runningPhases.has(verifyJob.phase)) {
        return {
            jobId: verifyJob.jobId,
            kind: 'verify',
            phase: 'running',
            message: verifyJob.message,
        };
    }
    if (verifyJob.phase === 'cancelled') {
        return {
            jobId: verifyJob.jobId,
            kind: 'verify',
            phase: 'cancelled',
            message: verifyJob.message,
        };
    }
    if (verifyJob.phase === 'complete') {
        return {
            jobId: verifyJob.jobId,
            kind: 'verify',
            phase: 'done',
            message: verifyJob.message,
        };
    }
    if (verifyJob.phase === 'error') {
        return {
            jobId: verifyJob.jobId,
            kind: 'verify',
            phase: verifyJob.error === 'cancelled' ? 'cancelled' : 'error',
            message: verifyJob.error ?? verifyJob.message,
        };
    }
    return null;
}

export function finishAssistNetworkJob(): void {
    activeAbort = null;
    activeKind = null;
    activeJobId = null;
}
