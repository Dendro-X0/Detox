# Detox AI (Experimental)

**Status: ⚠️ UNSTABLE / PROTOTYPE**

Detox AI is a browser extension designed to filter toxic content on the web (initially Reddit) completely client-side.

## 🎯 Goal
To help users browse the web with more focus and on their terms — filtering noise they define, with optional assistive tools for critical reading. Initial site support includes Reddit; inference runs client-side by default.

> **Note:** Product positioning has moved from “toxicity filter” to a modular browsing layer. See [`docs/product-roadmap.md`](docs/product-roadmap.md).

## 🚧 Current Status
This project is currently **not stable** and is undergoing a v2 redesign focused on reliability and OSS extensibility.

### v2 Direction (in progress)
- **Bundled model packs only (Decision A)**: no runtime downloads from Hugging Face.
- **ONNX Runtime Web** as the default inference backend.
- **Chrome MV3 offscreen document** as the inference runtime host (persistent context), with background service worker as control plane.
- **Batch IPC** (`classifyBatch`) between content script and the runtime.
- **Firefox MV2 build**: background page runtime host (no offscreen documents).

## 🧩 Architecture (v2)
- **Content script**
  - Scans and batches content blocks.
  - Sends `classifyBatch` messages.
  - Applies enforcement (blur/reveal).
- **Background service worker (control plane)**
  - Creates and routes requests to the offscreen runtime.
- **Offscreen document (runtime host)**
  - Loads bundled model packs.
  - Runs inference via ONNX Runtime Web.
  - Reports deterministic `runtimeStatus`.

## 🌍 Language Packs (Milestone 3)

The popup includes a **Language Pack** section:
- It shows detected language for the active tab.
- It auto-selects an installed pack (language-specific if present; otherwise multilingual fallback).
- You can manually select an installed pack; selection is persisted in `chrome.storage.local` as `preferredPackId`.

Notes:
- The current “install” UI is a placeholder (it does not download packs yet).
- If you change `preferredPackId` after a model session is already loaded, the runtime may require a reload to swap models (future improvement).

## 📦 Model Packs
Model pack assets live under:
- `public/model-packs/<pack>/...`

Tracked metadata:
- `public/model-packs/toxicity-multi-xlm-r/modelpack.json`

If the popup shows:
- **Runtime**: `error`
- **Pack**: `toxicity-multi-xlm-r`
- **Session**: `no`
- **Last error**: `Failed to fetch ...model.onnx...`

it means the pack metadata loaded but the ONNX model artifact is missing/unreadable.

### Release-asset workflow (recommended)
Large model artifacts are **not committed to git**. Instead, contributors download them locally (gitignored) before building.

Current first pack:
- **Pack ID**: `toxicity-multi-xlm-r`
- **Source**: `hoan/multilingual-toxic-xlm-roberta-dynamic-quantized` (Apache-2.0)

Note: the ONNX artifact is large. This is acceptable for a first working prototype, but we may replace it with a smaller pack later.

## 🧪 Development

### Build
1. Install dependencies:
   - `pnpm install`
2. Build the extension (core profile — no model weights required):
   - `pnpm build`
3. Optional — full profile with ONNX and site adapters:
   - `pnpm fetch:modelpack` (if using local pack)
   - `pnpm build:full`

### Build (Firefox MV2)
Firefox uses a separate MV2 manifest and a Vite build config (CRXJS is MV3-only).

1. Build the Firefox extension:
   - `pnpm build:firefox`
2. Load in Firefox:
   - `about:debugging` -> "This Firefox" -> "Load Temporary Add-on" -> `dist-firefox/manifest.json`

If `pnpm fetch:modelpack` fails, download these files manually into:
- `public/model-packs/toxicity-multi-xlm-r/`

Files:
- `model.onnx` (download `model_quantized.onnx` and rename to `model.onnx`)
- `tokenizer.json`
- `sentencepiece.bpe.model`
- `config.json`
- `special_tokens_map.json`
- `tokenizer_config.json`

Direct URLs:
- https://huggingface.co/hoan/multilingual-toxic-xlm-roberta-dynamic-quantized/resolve/main/model_quantized.onnx?download=true
- https://huggingface.co/hoan/multilingual-toxic-xlm-roberta-dynamic-quantized/resolve/main/tokenizer.json?download=true
- https://huggingface.co/hoan/multilingual-toxic-xlm-roberta-dynamic-quantized/resolve/main/sentencepiece.bpe.model?download=true
- https://huggingface.co/hoan/multilingual-toxic-xlm-roberta-dynamic-quantized/resolve/main/config.json?download=true
- https://huggingface.co/hoan/multilingual-toxic-xlm-roberta-dynamic-quantized/resolve/main/special_tokens_map.json?download=true
- https://huggingface.co/hoan/multilingual-toxic-xlm-roberta-dynamic-quantized/resolve/main/tokenizer_config.json?download=true

### Load in Chrome
Load the unpacked extension from:
- `./dist`

### Load in Firefox
Load the unpacked extension from:
- `./dist-firefox`

## 🛠 Tech Stack
- **TypeScript**
- **React + Vite**
- **Manifest V3**
- **ONNX Runtime Web**
- **Chrome offscreen document runtime**

## 📄 Docs

| Document | Description |
|----------|-------------|
| [`docs/README.md`](docs/README.md) | Documentation index |
| [`docs/product-roadmap.md`](docs/product-roadmap.md) | **Product phases A–G** (current planning) |
| [`docs/experimental/authenticity-analysis.md`](docs/experimental/authenticity-analysis.md) | Selection-first claim assist (experimental) |
| [`CORE-ROADMAP.md`](CORE-ROADMAP.md) | Technical core refactor (complete) |
| [`docs/firefox-build.md`](docs/firefox-build.md) | Firefox MV2 build |

## 🛑 Roadmap

See [`ROADMAP.md`](ROADMAP.md) → [`docs/product-roadmap.md`](docs/product-roadmap.md).
