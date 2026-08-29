# Invisible noise engine

> **Status:** Active (Assist-first pivot)  
> **Related:** [`purposeful-browsing-roadmap.md`](./purposeful-browsing-roadmap.md) · [`assist-capability-spec.md`](./assist-capability-spec.md)

## Purpose

Noise quieting is a **secondary** product job. Users must not edit keyword lists. Scoring still runs via a fixed **invisible engine** so the core/store build can dim bait and toxic language without ONNX.

## Invariants

1. **No dashboard keyword lists** — no block/allow keyword editors, no bother/topic keyword chips that write `userRules.blockKeywords`.
2. **No wizard keyword curation** — Express/Guided/Custom do not ask users to build phrase lists.
3. **Scoring sources (in order of product meaning):**
   - Browsing-mode bother maps (Focus / Unwind / Research) written as internal `blockKeywords` when a mode applies
   - Built-in default categories when mode lists are empty: outrage, spam, engagement-bait
   - Adaptation-pack `supplementalKeywords` / noise patterns
   - Behavior signals (caps, emoji, DOM)
4. **User-authored `blockKeywords` / `allowKeywords` / legacy `userKeywords` are ignored for scoring** after the Assist-first pivot. Storage fields may remain for migration; one-time clear is optional.
5. **Allow-keywords retired from UX** — empty / ignored on the read path.
6. **Subject personalization** stays on topic diet (full build) and site whitelist — not keyword editors.

## Non-goals

- Deleting `detector-heuristic-keywords` or the phrase-match codepath
- Requiring topic classifier or ONNX on the core store build
- Exposing raw keyword lists under Advanced “for power users” in this phase
