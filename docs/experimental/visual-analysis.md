# Experimental concept: Visual analysis (Track 3)

> **Status:** Concept only · **Not in v2.x–v3.0 roadmap**  
> **Category:** Optional analyzer mod (distinct from scroll-path text filtering)  
> **Parent plan:** [`../planning/ux-capability-roadmap.md`](../planning/ux-capability-roadmap.md)

---

## Why this is separate from core filtering

Core filtering runs on **every scroll** — it must be **fast**, **local**, **reversible**, and **low false-positive**. Visual moderation fails those constraints:

- Vision models are heavier (latency, memory, GPU).
- Image classification has high cultural/context sensitivity (“censorship”).
- Image-only toxic posts are common; text pipeline cannot see them.
- Auto-hiding media from vision scores is a different trust contract than dimming bait **text**.

Track 3 is therefore **user-initiated research**, like authenticity assist — not silent feed filtering.

---

## Problem statement

On social networks and comment sections, low-quality or harmful content often appears as:

- Image-only insults or shock content
- Memes where the message is entirely visual
- Screenshots of text (not readable by text scanner)
- Avatar / reaction spam with no caption

The **text-only** product (through v3.0) explicitly does not address these cases. Track 3 explores **optional** assist for users who opt in and supply compute or API budget.

---

## Conceptual model

| Dimension | Text filtering (Track 1) | Visual analysis (Track 3) |
|-----------|--------------------------|----------------------------|
| Trigger | Automatic on scroll | **Explicit** — user selects region / element |
| Input | DOM text units | Image crop, screenshot, or page region |
| Output | Dim / blur / collapse | **Advisory** label + explanation |
| Default | On (Focus) | Off |
| Compute | Local heuristics | User-deployed VLM or paid API |
| Wrong answer | User reveals block | User dismisses advisory |
| v3.0 | In scope | **Out of scope** |

---

## Possible interaction patterns (future)

### 1. Region select

User draws a rectangle over an image or post → extension captures **that region** → sends to analyzer → shows advisory panel (e.g. “may contain graphic content”, “appears to be engagement bait layout”, “text in image: …” if OCR sub-step enabled).

### 2. Co-browse assist

User asks “what’s in this post?” while viewing a thread → model receives **user-approved** snapshot + optional surrounding **text** context → structured response. Higher token cost; clearly labeled as experimental.

### 3. Local large model

Advanced users run a local vision-language model (Ollama, LM Studio, custom endpoint) configured in settings — similar to authenticity LLM tier today. No default bundled weights (size, GPU, legal review).

---

## Constraints (non-negotiable if built)

1. **Never auto-hide** feed content from vision scores alone in v1 of Track 3.
2. **User must trigger** each analysis (or explicit per-site opt-in with scary confirmation).
3. **No covert upload** — policy + UI must state what leaves the device.
4. **No “truth” or “misinformation”** labels on images — descriptive / safety-adjacent framing only.
5. **Core build stays text-only** — Track 3 ships as optional signed mod or full-build analyzer.

---

## Cost & audience

| Factor | Implication |
|--------|-------------|
| API vision calls | Per-region cost; quota UI required |
| Local VLMs | GPU RAM, model download, advanced setup |
| Latency | Unsuitable for scroll hot path |
| False positives | Art, news photos, medical/educational images |

**Target user:** Power users and researchers who accept cost and configuration — not default wizard path.

---

## Dependencies before a spike

- [ ] Track 1 + v3.0 launch complete (text promise stable)
- [ ] Authenticity gather/analyze split proven (reuse quota + audit patterns)
- [ ] Privacy policy section for optional image upload
- [ ] Legal review of “visual advisory” framing in store jurisdictions

---

## Suggested spike sequence (post–v3.0)

1. **Spike A:** Region capture → base64 crop → user Ollama endpoint → JSON advisory (side panel only).
2. **Spike B:** Optional OCR sub-step for screenshot text → feed into **text** authenticity pipeline (bridges Track 3 → Track 2 without classifying pixels as “toxic”).
3. **Spike C:** Evaluate on-device small model feasibility vs API-only.

Do **not** start Spike A until v3.0.0 exit criteria for Track 1 are met.

---

## Relationship to structural layout mods

A lighter-weight v3.1 alternative that is **not** visual ML:

- **Collapse comment section** on `news.example.com` (DOM/layout mod)
- **Hide Shorts shelf** on YouTube (structural)

These reduce exposure to image-heavy regions without classifying images. Prefer layout mods for Persona B before vision spikes.

---

## See also

- [`authenticity-analysis.md`](./authenticity-analysis.md) — text claim assist (Track 2)
- [`../planning/ux-capability-roadmap.md`](../planning/ux-capability-roadmap.md) — persona priorities through v3.0
