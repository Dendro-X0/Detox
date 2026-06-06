export type LlmModelsFetchResult =
    | { readonly ok: true; readonly models: readonly string[]; readonly modelsEndpoint: string }
    | { readonly ok: false; readonly error: string; readonly modelsEndpoint?: string };

const CHAT_COMPLETION_SUFFIXES = [
    '/v1/chat/completions',
    '/chat/completions',
    '/v1/completions',
    '/completions',
] as const;

const NON_CHAT_HINTS = [
    'embed',
    'whisper',
    'tts',
    'dall-e',
    'davinci',
    'babbage',
    'moderation',
    'realtime',
    'transcribe',
    'audio',
    'sora',
] as const;

/** Derive an OpenAI-compatible GET /models URL from a chat completions endpoint. */
export function resolveModelsEndpoint(chatCompletionsUrl: string): string | null {
    const trimmed = chatCompletionsUrl.trim();
    if (!trimmed) return null;

    try {
        const url = new URL(trimmed);

        for (const suffix of CHAT_COMPLETION_SUFFIXES) {
            if (url.pathname.endsWith(suffix)) {
                const basePath = url.pathname.slice(0, -suffix.length);
                const modelsPath = suffix.startsWith('/v1/') ? '/v1/models' : '/models';
                url.pathname = `${basePath}${modelsPath}`.replace(/\/{2,}/g, '/');
                return url.toString();
            }
        }

        if (/\/v1\/?$/.test(url.pathname)) {
            url.pathname = url.pathname.replace(/\/?$/, '/models');
            return url.toString();
        }

        const trimmedPath = url.pathname.replace(/\/$/, '');
        url.pathname = `${trimmedPath}/models`;
        return url.toString();
    } catch {
        return null;
    }
}

export function isLikelyChatModel(modelId: string): boolean {
    const lower = modelId.toLowerCase();
    return !NON_CHAT_HINTS.some((hint) => lower.includes(hint));
}

export function parseModelsResponse(body: unknown): readonly string[] {
    if (!body || typeof body !== 'object') return [];

    const record = body as {
        readonly data?: readonly { readonly id?: string }[];
        readonly models?: readonly { readonly id?: string; readonly name?: string }[];
    };

    const fromData = (record.data ?? [])
        .map((entry) => entry.id?.trim())
        .filter((id): id is string => Boolean(id));

    if (fromData.length > 0) {
        return dedupeSorted(fromData.filter(isLikelyChatModel));
    }

    const fromModels = (record.models ?? [])
        .map((entry) => (entry.id ?? entry.name)?.trim())
        .filter((id): id is string => Boolean(id));

    return dedupeSorted(fromModels.filter(isLikelyChatModel));
}

function dedupeSorted(models: readonly string[]): readonly string[] {
    return [...new Set(models)].sort((a, b) => a.localeCompare(b));
}

export async function fetchAvailableLlmModels(
    chatCompletionsUrl: string,
    apiKey: string
): Promise<LlmModelsFetchResult> {
    const modelsEndpoint = resolveModelsEndpoint(chatCompletionsUrl);
    if (!modelsEndpoint) {
        return { ok: false, error: 'Enter a valid chat completions URL first.' };
    }

    try {
        const response = await fetch(modelsEndpoint, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                ...(apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
            },
        });

        if (!response.ok) {
            return {
                ok: false,
                error: `Models request failed (${response.status})`,
                modelsEndpoint,
            };
        }

        const body = (await response.json()) as unknown;
        const models = parseModelsResponse(body);

        if (models.length === 0) {
            return {
                ok: false,
                error: 'No chat models returned — check endpoint or enter a model id manually.',
                modelsEndpoint,
            };
        }

        return { ok: true, models, modelsEndpoint };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Could not reach models endpoint',
            modelsEndpoint,
        };
    }
}
