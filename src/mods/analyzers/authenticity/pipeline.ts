import { sessionGet, sessionSet } from '../../../core/storage/extension-session';
import { AUTHENTICITY_JOB_STORAGE_KEY, AUTHENTICITY_REPORT_STORAGE_KEY } from './constants';
import { enrichReferenceFromFetch } from './fetch-snippet';
import { getCachedReport, setCachedReport } from './report-cache';
import { getAuthenticitySettings, loadAuthenticitySettings } from './settings-store';
import { buildSearchQueryForClaim, extractClaimsFromText, runT0Heuristics } from './t0-heuristics';
import { hitsToReferences, runSearch } from './t2-search';
import { buildSearchOnlyAssessments, synthesizeAssessments } from './t3-synthesis';
import type { AnalysisScope, AuthenticityJobState, AuthenticityReport, SearchQueryRecord, SourceReference } from './types';
import { filterReferencesToAllowlist } from './url-allowlist';
import { scopeTextForCache } from './scope-resolver';

let cancelRequested = false;

export function requestCancelAuthenticityJob(): void {
    cancelRequested = true;
}

async function updateJob(state: AuthenticityJobState): Promise<void> {
    await sessionSet(AUTHENTICITY_JOB_STORAGE_KEY, state);
}

export async function getAuthenticityJob(): Promise<AuthenticityJobState | null> {
    return (await sessionGet<AuthenticityJobState>(AUTHENTICITY_JOB_STORAGE_KEY)) ?? null;
}

export async function runAuthenticityAnalysis(input: {
    readonly scope: AnalysisScope;
    readonly url: string;
    readonly siteId: string;
    readonly title: string;
    readonly searchOnly?: boolean;
}): Promise<AuthenticityReport> {
    await loadAuthenticitySettings();
    const settings = getAuthenticitySettings();
    const jobId = `job-${Date.now()}`;
    cancelRequested = false;

    const searchOnly = input.searchOnly ?? settings.searchOnlyDefault;

    const cached = await getCachedReport(scopeTextForCache(input.scope), input.url);
    if (cached) {
        await updateJob({
            jobId,
            phase: 'complete',
            progress: 100,
            message: 'Loaded cached report',
            report: cached,
            error: null,
        });
        await sessionSet(AUTHENTICITY_REPORT_STORAGE_KEY, cached);
        return cached;
    }

    await updateJob({
        jobId,
        phase: 'extracting',
        progress: 10,
        message: 'Extracting claims…',
        report: null,
        error: null,
    });

    const claims = settings.tierT0
        ? extractClaimsFromText(input.scope.text, settings.maxClaims)
        : extractClaimsFromText(input.scope.text, settings.maxClaims);

    const t0Notes = settings.tierT0 ? runT0Heuristics(input.scope.text, claims) : [];

    if (cancelRequested) throw new Error('cancelled');

    const queries: SearchQueryRecord[] = [];
    const references: SourceReference[] = [];
    const allowedUrls = new Set<string>();

    if (settings.tierT2 && settings.searchProvider !== 'none') {
        await updateJob({
            jobId,
            phase: 'searching',
            progress: 35,
            message: 'Searching sources…',
            report: null,
            error: null,
        });

        for (const claim of claims) {
            if (cancelRequested) throw new Error('cancelled');
            const query = buildSearchQueryForClaim(claim);
            queries.push({ claimId: claim.id, query });
            const hits = await runSearch(query, settings);
            for (const hit of hits) {
                allowedUrls.add(hit.url);
            }
            const refs = hitsToReferences(hits, claim.id);
            references.push(...refs);
        }
    }

    let vettedReferences = filterReferencesToAllowlist(references, allowedUrls, settings.extraAllowedDomains);

    if (!searchOnly && settings.tierT3 && settings.llmEndpoint.trim()) {
        await updateJob({
            jobId,
            phase: 'fetching',
            progress: 55,
            message: 'Fetching and verifying snippets…',
            report: null,
            error: null,
        });

        const enriched: SourceReference[] = [];
        for (const ref of vettedReferences.slice(0, settings.maxSearchResults * settings.maxClaims)) {
            if (cancelRequested) throw new Error('cancelled');
            enriched.push(await enrichReferenceFromFetch(ref, allowedUrls, settings));
        }
        vettedReferences = enriched;

        await updateJob({
            jobId,
            phase: 'synthesizing',
            progress: 75,
            message: 'Comparing claims to sources…',
            report: null,
            error: null,
        });

        const allowedIds = new Set(vettedReferences.map((r) => r.id));
        const assessments = await synthesizeAssessments(claims, vettedReferences, allowedIds, settings);

        const report: AuthenticityReport = {
            id: jobId,
            scope: input.scope,
            url: input.url,
            siteId: input.siteId,
            title: input.title,
            claims,
            queries,
            references: vettedReferences,
            assessments,
            t0Notes,
            limitations: buildLimitations(input.scope, searchOnly, vettedReferences.length),
            searchOnly: false,
            createdAt: Date.now(),
            advisoryOnly: true,
        };

        await finalizeReport(report, jobId);
        return report;
    }

    const assessments = buildSearchOnlyAssessments(claims, vettedReferences);
    const report: AuthenticityReport = {
        id: jobId,
        scope: input.scope,
        url: input.url,
        siteId: input.siteId,
        title: input.title,
        claims,
        queries,
        references: vettedReferences,
        assessments,
        t0Notes,
        limitations: buildLimitations(input.scope, true, vettedReferences.length),
        searchOnly: true,
        createdAt: Date.now(),
        advisoryOnly: true,
    };

    await finalizeReport(report, jobId);
    return report;
}

function buildLimitations(scope: AnalysisScope, searchOnly: boolean, sourceCount: number): string {
    const parts = [
        'Advisory only — not a fact-check verdict.',
        searchOnly ? 'Search-only mode — no LLM synthesis.' : 'LLM synthesis may be incomplete.',
        sourceCount === 0 ? 'No sources retrieved — do not infer truth from silence.' : `${sourceCount} source(s) listed.`,
    ];
    if (scope.kind === 'full_page' && scope.warnDenseSite) {
        parts.push('Dense site — full-page scope may miss thread context.');
    }
    return parts.join(' ');
}

async function finalizeReport(report: AuthenticityReport, jobId: string): Promise<void> {
    await setCachedReport(scopeTextForCache(report.scope), report.url, report);
    await sessionSet(AUTHENTICITY_REPORT_STORAGE_KEY, report);
    await updateJob({
        jobId,
        phase: 'complete',
        progress: 100,
        message: 'Report ready',
        report,
        error: null,
    });
}

export function isJobCancelled(): boolean {
    return cancelRequested;
}
