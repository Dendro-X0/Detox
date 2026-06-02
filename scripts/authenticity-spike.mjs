#!/usr/bin/env node
/**
 * Spike 0 — manual feasibility check for authenticity assist.
 * Fetches a Wikipedia search for a sample claim and prints cost/latency hints.
 *
 * Usage: node scripts/authenticity-spike.mjs "Your claim text here"
 */
const claim = process.argv[2] ?? 'Coffee may reduce the risk of type 2 diabetes according to recent studies.';
const started = Date.now();

const params = new URLSearchParams({
    action: 'opensearch',
    search: claim.slice(0, 120),
    limit: '5',
    namespace: '0',
    format: 'json',
    origin: '*',
});

const url = `https://en.wikipedia.org/w/api.php?${params.toString()}`;
const response = await fetch(url);
const elapsed = Date.now() - started;

if (!response.ok) {
    console.error('Search failed', response.status);
    process.exit(1);
}

const body = await response.json();
const titles = body[1] ?? [];
const urls = body[3] ?? [];

console.log('Claim:', claim);
console.log(`Wikipedia opensearch: ${elapsed}ms, ${titles.length} hits`);
for (let i = 0; i < titles.length; i += 1) {
    console.log(`  - ${titles[i]} → ${urls[i]}`);
}
console.log('\nNotes: zero LLM tokens in search-only mode; measure citation quality manually.');
