import type { AssistCompareReport } from './compare-overlap';
import type { AssistPageUnderstandReport } from './page-outline';
import type { AssistNetworkJobState } from './network-job';

export const ASSIST_MENU = {
    root: 'signallens-assist-root',
    search: 'signallens-assist-search',
    define: 'signallens-assist-define',
    saveClip: 'signallens-assist-save-clip',
    compare: 'signallens-assist-compare',
    verify: 'signallens-assist-verify',
    outline: 'signallens-assist-outline',
} as const;

export type AssistSearchEngineId = 'duckduckgo' | 'google' | 'bing' | 'custom';

export type AssistSettings = {
    readonly selectionToolbarEnabled: boolean;
    readonly searchEngineId: AssistSearchEngineId;
    /** Used when searchEngineId is custom. Must include `%s` for the query. */
    readonly customSearchUrlTemplate: string;
    /** Daily cap for search / define / compare handoffs (Verify uses authenticity quota). */
    readonly dailyActionQuota: number;
    /** Enables page-level Outline (Understand) in context menu — off by default. */
    readonly pageUnderstandEnabled: boolean;
};

export const DEFAULT_ASSIST_SETTINGS: AssistSettings = {
    selectionToolbarEnabled: true,
    searchEngineId: 'duckduckgo',
    customSearchUrlTemplate: 'https://duckduckgo.com/?q=%s',
    dailyActionQuota: 100,
    pageUnderstandEnabled: false,
};

export type AssistActionResponse = {
    readonly ok: boolean;
    readonly error?: string;
    readonly cached?: boolean;
    readonly excerpt?: string;
    readonly urls?: readonly string[];
    readonly panelOpened?: boolean;
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
    | { readonly type: 'assist:outlinePage' }
    | { readonly type: 'assist:getPageUnderstand' }
    | { readonly type: 'assist:getCompareReport' }
    | {
          readonly type: 'assist:clipState';
          readonly clip: string | null;
      }
    | {
          readonly type: 'assist:jobState';
          readonly job: AssistNetworkJobState | null;
      }
    | {
          readonly type: 'assist:compareReportState';
          readonly report: AssistCompareReport | null;
      }
    | {
          readonly type: 'assist:pageUnderstandState';
          readonly report: AssistPageUnderstandReport | null;
      };
