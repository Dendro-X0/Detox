/** Returns true when fetched page text contains the search snippet probe. */
export function snippetOverlapsFetchedText(fetched: string, snippet: string): boolean {
    const normalizedFetched = fetched.toLowerCase();
    const normalizedSnippet = snippet.toLowerCase().trim();
    if (!normalizedSnippet) return false;
    if (normalizedSnippet.length < 16) return true;
    const probe = normalizedSnippet.slice(0, Math.min(80, normalizedSnippet.length));
    if (normalizedFetched.includes(probe)) return true;
    const words = probe.split(/\s+/).filter((w) => w.length >= 4);
    if (words.length === 0) return true;
    const matched = words.filter((word) => normalizedFetched.includes(word)).length;
    return matched / words.length >= 0.5;
}
