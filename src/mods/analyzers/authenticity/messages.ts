import type { AnalysisScope, AuthenticityJobState, AuthenticityReport } from './types';
import type { ScopeRequest } from './scope-resolver';

export type AuthenticityAnalyzeRequest = {
    readonly type: 'authenticity:analyze';
    readonly tabId: number;
    readonly scopeRequest: ScopeRequest;
    readonly selectionText: string;
    readonly pageTitle: string;
    readonly url: string;
    readonly hostname: string;
    readonly searchOnly?: boolean;
};

export type AuthenticityAnalyzeResponse = {
    readonly type: 'authenticity:analyzeResult';
    readonly ok: boolean;
    readonly error?: string;
    readonly report?: AuthenticityReport;
};

export type AuthenticityGetJobRequest = {
    readonly type: 'authenticity:getJob';
};

export type AuthenticityGetJobResponse = {
    readonly type: 'authenticity:jobState';
    readonly job: AuthenticityJobState | null;
};

export type AuthenticityCancelRequest = {
    readonly type: 'authenticity:cancel';
};

export type AuthenticityOpenPanelRequest = {
    readonly type: 'authenticity:openPanel';
};

export type AuthenticityApplyFlagRequest = {
    readonly type: 'authenticity:applyFlag';
    readonly tabId: number;
    readonly blockId?: string;
    readonly status: string;
};

export type AuthenticityMessage =
    | AuthenticityAnalyzeRequest
    | AuthenticityAnalyzeResponse
    | AuthenticityGetJobRequest
    | AuthenticityGetJobResponse
    | AuthenticityCancelRequest
    | AuthenticityOpenPanelRequest
    | AuthenticityApplyFlagRequest;

export function isAuthenticityMessage(value: unknown): value is AuthenticityMessage {
    return typeof value === 'object' && value !== null && 'type' in value;
}

export type ResolvedAnalyzeInput = {
    readonly scope: AnalysisScope;
    readonly url: string;
    readonly siteId: string;
    readonly title: string;
    readonly searchOnly?: boolean;
};
