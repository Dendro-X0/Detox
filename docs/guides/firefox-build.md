# Firefox Build & Deployment Guide

## Strategy Decision: Firefox MV2 (Background Page)

After evaluating Firefox's extension support, we use **MV2 with non-persistent background pages** for Firefox builds.

### Why MV2 instead of MV3 for Firefox?

| Feature | Firefox MV3 | Firefox MV2 | Our Needs |
|---------|-------------|-------------|-----------|
| Offscreen Documents | ❌ Not supported | ✅ Not needed | Required for ONNX in Chrome |
| Service Worker DOM | ❌ Limited | ✅ Full DOM in background page | ONNX needs WebGL/WASM |
| Background Persistence | ❌ Event-based | ✅ Event page (persistent: false) | Model caching between requests |
| Extension Lifespan | ⏳ Limited support | ✅ Fully supported | Long-term maintenance |

### Key Differences from Chrome MV3

1. **No Offscreen Documents**: Firefox MV2 runs ONNX Runtime Web directly in the background page
2. **Background Page vs Service Worker**: Full DOM access including WebGL/WebGPU
3. **browser_action vs action**: Different manifest key for popup UI
4. **Permissions**: Host permissions combined in `permissions` array (no separate `host_permissions`)

## Build Commands

```bash
# Development (Firefox MV2)
pnpm dev:firefox

# Production build (Firefox MV2)
pnpm build:firefox
```

## Output Structure

```
dist-firefox/
├── manifest.json          # Firefox MV2 manifest
├── index.html             # Popup UI
├── src/
│   ├── background-firefox.ts    # Firefox background page
│   ├── content.ts               # Content script (shared)
│   └── ...
├── model-packs/           # Bundled model packs
└── ort/                   # ONNX Runtime WASM files
```

## Testing in Firefox

### Local Testing

1. Build the extension:
   ```bash
   pnpm build:firefox
   ```

2. Open Firefox and navigate to `about:debugging`

3. Click "This Firefox" → "Load Temporary Add-on"

4. Select `dist-firefox/manifest.json`

### Extension Behavior

The Firefox build uses the same content script and popup UI as Chrome, but:
- Inference runs directly in `background-firefox.ts` (no offscreen document)
- ONNX Runtime Web has full access to WebGL/WebGPU in the background page context
- Model state persists for the lifetime of the background page

## Deployment

### Firefox Add-ons (AMO)

1. Build production version:
   ```bash
   pnpm build:firefox
   ```

2. Create ZIP for submission:
   ```bash
   cd dist-firefox && zip -r ../detox-firefox.zip .
   ```

3. Submit to [Firefox Add-ons](https://addons.mozilla.org/developers/)

### Review Considerations

- **Remote Code**: We bundle all ML models; no remote code execution
- **Permissions**: Justify `<all_urls>` for content moderation across websites
- **Privacy**: All inference is local; no data leaves the browser

## Manifest Comparison

### Chrome MV3 (`src/manifest.json`)
```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "offscreen", "scripting", "storage"],
  "host_permissions": ["https://huggingface.co/*"],
  "background": { "service_worker": "src/background.ts" },
  "action": { "default_popup": "index.html" }
}
```

### Firefox MV2 (`manifest-firefox.json`)
```json
{
  "manifest_version": 2,
  "permissions": ["activeTab", "storage", "https://huggingface.co/*"],
  "background": { 
    "scripts": ["src/background-firefox.ts"],
    "persistent": false 
  },
  "browser_action": { "default_popup": "index.html" }
}
```

## Authenticity assist (Firefox)

- Report UI uses **`sidebar_action`** (`sidepanel.html`) — View → Sidebar → SignalLens — Authenticity, or open via context menu after analyzing a selection.
- If `sidebar_action` is unavailable, the extension reuses a single **report tab** (`sidepanel.html`).
- Job/report state uses `chrome.storage.session` when supported, otherwise falls back to `chrome.storage.local`.

## QA before AMO submit

Run automated checks and the manual matrix in [`firefox-qa.md`](./firefox-qa.md):

```bash
pnpm test:firefox
pnpm release:firefox
```

## Known Limitations

- **Content Security Policy**: Stricter in Firefox MV2 for WASM execution
- **Storage**: `chrome.storage` vs `browser.storage` - we use WebExtension polyfill patterns
- **Performance**: Background pages may be terminated by Firefox after inactivity; models reload on wake

## Future: Firefox MV3?

Firefox MV3 support is evolving. When Firefox adds:
- Offscreen document API, OR
- Full WASM/WebGL support in service workers

We can migrate to MV3 using the same architecture as Chrome. Until then, MV2 provides the best user experience.

## References

- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [MDN: Browser Extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Firefox MV3 Status](https://blog.mozilla.org/addons/2024/03/13/manifest-v3-firefox-developers/)
