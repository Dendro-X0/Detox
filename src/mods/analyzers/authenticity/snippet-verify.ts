/** Returns true when fetched page text contains the search snippet probe. */
export function snippetOverlapsFetchedText(fetched: string, snippet: string): boolean {
    const normalizedFetched = fetched.toLowerCase();
    const normalizedSnippet = snippet.toLowerCase().trim();
    if (normalizedSnippet.length < 24) return true;
    const probe = normalizedSnippet.slice(0, Math.min(80, normalizedSnippet.length));
    return normalizedFetched.includes(probe);
}
