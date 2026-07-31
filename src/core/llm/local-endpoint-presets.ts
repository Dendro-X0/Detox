export type LocalLlmPresetId = 'custom' | 'ollama' | 'lmstudio' | 'localai' | 'openai';

export type LocalLlmPreset = {
    readonly id: LocalLlmPresetId;
    readonly endpoint: string;
    readonly requiresApiKey: boolean;
};

export const LOCAL_LLM_PRESETS: readonly LocalLlmPreset[] = [
    { id: 'custom', endpoint: '', requiresApiKey: false },
    { id: 'ollama', endpoint: 'http://127.0.0.1:11434/v1/chat/completions', requiresApiKey: false },
    { id: 'lmstudio', endpoint: 'http://127.0.0.1:1234/v1/chat/completions', requiresApiKey: false },
    { id: 'localai', endpoint: 'http://127.0.0.1:8080/v1/chat/completions', requiresApiKey: false },
    { id: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', requiresApiKey: true },
] as const;

export function detectLocalLlmPreset(endpoint: string): LocalLlmPresetId {
    const trimmed = endpoint.trim().toLowerCase();
    if (!trimmed) return 'custom';
    if (trimmed.includes('11434')) return 'ollama';
    if (trimmed.includes('1234')) return 'lmstudio';
    if (trimmed.includes('8080') && trimmed.includes('localhost')) return 'localai';
    if (trimmed.includes('api.openai.com')) return 'openai';
    return 'custom';
}

export function isLocalhostEndpoint(endpoint: string): boolean {
    try {
        const host = new URL(endpoint.trim()).hostname;
        return host === 'localhost' || host === '127.0.0.1' || host === '::1';
    } catch {
        return false;
    }
}
