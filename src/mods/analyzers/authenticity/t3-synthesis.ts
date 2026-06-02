import type { AuthenticitySettings } from './settings';
import type { AuthenticityAssessment, Claim, SourceReference } from './types';

type LlmAssessmentRow = {
    readonly claimId?: string;
    readonly summary?: string;
    readonly confidence?: 'low' | 'medium' | 'high';
    readonly epistemicStatus?: AuthenticityAssessment['epistemicStatus'];
    readonly referenceIds?: readonly string[];
    readonly limitations?: string;
    readonly url?: string;
};

export async function synthesizeAssessments(
    claims: readonly Claim[],
    references: readonly SourceReference[],
    allowedReferenceIds: ReadonlySet<string>,
    settings: AuthenticitySettings
): Promise<readonly AuthenticityAssessment[]> {
    if (!settings.llmEndpoint.trim()) {
        return buildSearchOnlyAssessments(claims, references);
    }

    const context = {
        claims: claims.map((c) => ({ id: c.id, text: c.text, type: c.type })),
        sources: references.map((r) => ({
            id: r.id,
            title: r.title,
            snippet: r.snippet,
            snippetVerified: r.snippetVerified,
        })),
    };

    const response = await fetch(settings.llmEndpoint.trim(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(settings.llmApiKey.trim() ? { Authorization: `Bearer ${settings.llmApiKey.trim()}` } : {}),
        },
        body: JSON.stringify({
            model: settings.llmModel,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content:
                        'Compare claims to provided source snippets only. Return JSON: {"assessments":[{"claimId","summary","confidence","epistemicStatus","referenceIds","limitations"}]}. ' +
                        'Never include URLs. Use epistemicStatus: unknown|unsupported|disputed|partially_supported. Be cautious.',
                },
                {
                    role: 'user',
                    content: JSON.stringify(context),
                },
            ],
        }),
    });

    if (!response.ok) {
        return buildSearchOnlyAssessments(claims, references);
    }

    const body = (await response.json()) as {
        readonly choices?: readonly { readonly message?: { readonly content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return buildSearchOnlyAssessments(claims, references);

    try {
        const parsed = JSON.parse(content) as { readonly assessments?: readonly LlmAssessmentRow[] };
        const rows = parsed.assessments ?? [];
        return claims.map((claim) => {
            const row = rows.find((r) => r.claimId === claim.id);
            const refIds = (row?.referenceIds ?? []).filter((id) => allowedReferenceIds.has(id));
            return {
                claimId: claim.id,
                summary: row?.summary ?? 'LLM comparison unavailable — review sources manually.',
                confidence: row?.confidence ?? 'low',
                epistemicStatus: row?.epistemicStatus ?? 'unknown',
                referenceIds: refIds,
                limitations: row?.limitations ?? 'Automated comparison; verify sources yourself.',
                advisoryOnly: true as const,
            };
        });
    } catch {
        return buildSearchOnlyAssessments(claims, references);
    }
}

export function buildSearchOnlyAssessments(
    claims: readonly Claim[],
    references: readonly SourceReference[]
): readonly AuthenticityAssessment[] {
    const refIds = references.map((r) => r.id);
    return claims.map((claim) => ({
        claimId: claim.id,
        summary:
            refIds.length > 0
                ? 'Sources found — open links below to verify this claim yourself.'
                : 'No corroborating sources found in search results.',
        confidence: 'low' as const,
        epistemicStatus: refIds.length > 0 ? ('unknown' as const) : ('unsupported' as const),
        referenceIds: refIds,
        limitations: 'Search-only mode — no automated synthesis.',
        advisoryOnly: true as const,
    }));
}
