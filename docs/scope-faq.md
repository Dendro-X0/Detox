# SignalLens scope & FAQ

> **Product boundary:** SignalLens reduces **textual** noise — promotional language, clickbait phrasing, toxic comments — using **your** rules. It is not a misinformation blocker or image moderator.

---

## What SignalLens does

- Reads **visible text** on pages you visit (posts, comments, headlines, captions).
- Dims, blurs, or collapses blocks that match your keywords, browsing mode, and optional adaptation packs.
- Keeps every filtered block **revealable** — click the dimmed area or in-page badge to show content again.
- Runs core filtering **locally** in your browser; no account required.

## What SignalLens does not do

| Limitation | What to expect |
|------------|----------------|
| **Image-only posts** | No caption or alt text → nothing to classify → **not filtered**. |
| **Video / audio** | Not analyzed. Spoken or visual content without on-page text is out of scope. |
| **Memes** | Filtered only when readable **caption text** meets your rules. |
| **Permanent removal** | Content is never deleted — only visually de-emphasized until you reveal it. |
| **Automatic fact-checking** | Does not label posts true/false or block “misinformation” in your feed. |
| **Image moderation** | Does not scan pictures, memes, or screenshots for visual toxicity. |

This is intentional for v3.0: honest scope beats over-promising.

---

## Frequently asked questions

### Why wasn't an image post filtered?

SignalLens classifies **text nodes** the universal scanner extracts from the page. A post that is only an image (or video thumbnail with no caption) has no matching text, so filtering does not apply. Add a keyword rule if a site repeats the same promo phrase in adjacent UI text.

### Will short captions on memes be filtered?

Yes, **if** the caption text matches your rules and clears the sensitivity threshold. A meme with no text will not be filtered.

### Does SignalLens upload what I read?

**Core filtering:** no. Keywords, thresholds, and pattern matching run on-device. Stats (scan/filter counts) stay in browser storage.

**Optional features** (remote API detector, authenticity assist with search/LLM) may send data only when you enable them and configure endpoints or API keys. See [`store/PRIVACY.md`](../store/PRIVACY.md).

### What are adaptation packs?

Optional **text pattern** supplements — phrase lists and behavior weights for languages like English or German. They merge with core detectors on matching pages. They do not add image analysis or network calls.

### What is authenticity assist?

An **experimental**, **off-by-default** tool for researching text **you select**. It provides advisory source links — it does **not** auto-hide feed content and is not part of the core filtering promise.

### Why was a technical comment filtered as “Repetition”?

Behavior signals are language-agnostic and used to catch spam patterns (caps bursts, hook phrases, **spammy** repetition). Long tech or medical replies often repeat product or clinical terms — that is normal discourse, not marketing. v2.3.1+ tuning lowers repetition-only blocks on substantive prose and ignores ellipses (`....`) in technical writing. Use **Wrong block** feedback if a substantive comment is still dimmed.

### Why did nothing filter on Spotify / a review site?

Non-feed pages use more conservative thresholds and skip some social-only detectors. For music streaming, enable the **Music & lyrics** whitelist preset under Rules to skip scanning entirely on supported players.

### How do I see why something was filtered?

Open the extension popup — when items are filtered on the current page, you’ll see a list with reason chips and a **Reveal on page** action. The dashboard **Overview** tab shows session-wide history and feedback patterns.

### Is topic / news filtering the same as noise filtering?

**No.** SignalLens v3.0 is a **noise** filter (promo tone, bait phrasing, link spam, toxic language). **Topic diet** (optional, experimental, full build) uses local semantic classification to dim **subjects** such as world affairs — separate badges, separate Rules panel, off by default. It does not ship as the store hero feature until research dogfood passes.

Keywords and topic presets in Rules add **phrase lists** for noise-style matching; they are not a substitute for semantic topic classification on phrase-poor headlines.

---

## Store listing alignment (Option A)

**We say:** textual noise reduction · reveal-first · local rules · image-only gap documented.

**We do not say:** blocks misinformation · analyzes images · fact-checks your feed · authenticity as the primary feature.

Internal audit: [`store/SCOPE-AUDIT.md`](../store/SCOPE-AUDIT.md).

---

## Related

- Launch gates: [`planning/v3-acceptance-checklist.md`](./planning/v3-acceptance-checklist.md) §F  
- Privacy: [`store/PRIVACY.md`](../store/PRIVACY.md)  
- Experimental authenticity: [`experimental/authenticity-analysis.md`](./experimental/authenticity-analysis.md)
