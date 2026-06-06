#!/usr/bin/env node
/**
 * Manual feasibility check for authenticity Wikipedia gather (T2 script-first).
 *
 * Usage: node scripts/authenticity-spike.mjs "Your claim text here"
 */
import {
    fetchWikipediaExtracts,
    searchWikipedia,
} from '../src/mods/analyzers/authenticity/wikipedia-retrieval.ts';

const claim = process.argv[2] ?? 'Coffee may reduce the risk of type 2 diabetes according to recent studies.';
const started = Date.now();

const hits = await searchWikipedia(claim.slice(0, 120), 3);
const searchMs = Date.now() - started;

console.log('Claim:', claim);
console.log(`Wikipedia opensearch: ${searchMs}ms, ${hits.length} hits`);
for (const hit of hits) {
    console.log(`  - ${hit.title} → ${hit.url}`);
    if (hit.description) console.log(`    ${hit.description}`);
}

if (hits.length > 0) {
    const extractStarted = Date.now();
    const titles = hits.map((h) => h.title);
    const extracts = await fetchWikipediaExtracts(titles, 400);
    console.log(`\nExtract API: ${Date.now() - extractStarted}ms`);
    for (const title of titles) {
        const text = extracts.get(title);
        console.log(`  - ${title}: ${text ? `${text.slice(0, 120)}…` : '(no extract)'}`);
    }
}

console.log('\nNotes: zero LLM tokens in search-only mode; snippets come from public MediaWiki API.');
