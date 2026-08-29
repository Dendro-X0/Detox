import type { AssistNetworkJobState } from './network-job';

export const ASSIST_MENU = {
    root: 'signallens-assist-root',
    search: 'signallens-assist-search',
    define: 'signallens-assist-define',
    saveClip: 'signallens-assist-save-clip',
    compare: 'signallens-assist-compare',
    verify: 'signallens-assist-verify',
} as const;

export type AssistSearchEngineId = 'duckduckgo' | 'google' | 'bing' | 'custom';

export type AssistSettings = {
    readonly selectionToolbarEnabled: boolean;
    readonly searchEngineId: AssistSearchEngineId;
    /** Used when searchEngineId is custom. Must include `%s` for the query. */
    readonly customSearchUrlTemplate: string;
    /** Daily cap for search / define / compare handoffs (Verify uses authenticity quota). */
    readonly dailyActionQuota: number;
};

export const DEFAULT_ASSIST_SETTINGS: AssistSettings = {
    selectionToolbarEnabled: true,
    searchEngineId: 'duckduckgo',
    customSearchUrlTemplate: 'https://duckduckgo.com/?q=%s',
    dailyActionQuota: 100,
};

export type AssistActionResponse = {
    readonly ok: boolean;
    readonly error?: string;
    readonly cached?: boolean;
    readonly excerpt?: string;
};

export type AssistRuntimeMessage =
    | { readonly type: 'assist:search'; readonly text: string }
    | { readonly type: 'assist:define'; readonly text: string }
    | { readonly type: 'assist:saveClip'; readonly text: string }
    | { readonly type: 'assist:compare'; readonly text: string }
    | { readonly type: 'assist:verify'; readonly text: string }
    | { readonly type: 'assist:getClip' }
    | { readonly type: 'assist:clearClip' }
    | { readonly type: 'assist:cancel' }
    | { readonly type: 'assist:getJob' }
    | {
          readonly type: 'assist:clipState';
          readonly clip: string | null;
      }
    | {
          readonly type: 'assist:jobState';
          readonly job: AssistNetworkJobState | null;
      };
