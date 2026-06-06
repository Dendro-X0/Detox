/** Window postMessage types used by the content script test/diagnostics bridge. */
export const CONTENT_PERF_REQUEST = 'slGetPerfMetrics';
export const CONTENT_PERF_RESPONSE = 'slPerfResponse';

export type ContentPerfRequestMessage = {
    readonly type: typeof CONTENT_PERF_REQUEST;
};

export type ContentPerfResponseMessage = {
    readonly type: typeof CONTENT_PERF_RESPONSE;
    readonly payload: unknown;
};
