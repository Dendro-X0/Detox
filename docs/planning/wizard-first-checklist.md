# Wizard-first configuration checklist

> **Goal:** A new user completes **wizard only** and gets working filtering without opening dashboard tabs.  
> **Target versions:** v2.1.x (implement) · v2.2.x (dogfood ≥80% wizard-only) · v3.0.0 (public release)  
> **Code reference:** [`src/onboarding/wizard-coverage.ts`](../../src/onboarding/wizard-coverage.ts)  
> **Roadmap:** [`version-roadmap.md`](./version-roadmap.md)

---

## Wizard paths

| Path | Steps | Best for |
|------|-------|----------|
| **Quick start** | Welcome → apply Focus | Fastest; skips whitelist |
| **Preset mode** | Welcome → Language → Mode → Whitelist → Done | Most users (Focus / Research / Unwind) |
| **Custom** | Welcome → Language → Mode → Topics → Style → Sensitivity → Whitelist → Done | Power users tuning each knob |

---

## Step → storage mapping

| Wizard step | Storage keys / fields | Preset path | Custom path |
|-------------|----------------------|-------------|-------------|
| **Welcome (quick start)** | Full Focus preset patch | ✅ | — |
| **Language** | `preferredLocale` | ✅ | ✅ |
| **Mode** | `activeBrowsingModeId`, `policy`, `userRules.blockKeywords`, `userKeywords`, `enforcementAction`, `enabledModIds` | ✅ bundled | ✅ defers to later steps |
| **Topics** | `userRules.blockKeywords`, `userKeywords` | — | ✅ |
| **Style** | `enforcementAction.activeActionId` | — | ✅ |
| **Sensitivity** | `policy.preset`, `policy.threshold` | — | ✅ |
| **Whitelist** | `userRules.allowDomains` (from preset IDs) | ✅ optional | ✅ optional |
| **Done** | `onboardingComplete`, `enabled`, `inferenceRouting` | ✅ | ✅ |

### Always set on complete

| Key | Default / intent |
|-----|------------------|
| `enabled` | `true` — focus mode on |
| `onboardingComplete` | `true` |
| `inferenceRouting.primaryMode` | `heuristic` |
| `preferredDetectorId` | `heuristic-keywords` |
| `inferenceRouting.escalationEnabled` | `false` |

### Preset mode (e.g. Focus) also sets

| Key | Focus example |
|-----|---------------|
| `activeBrowsingModeId` | `focus` |
| `policy` | `{ preset: 'balanced', threshold: 0.5, perSite: {} }` |
| `userRules.blockKeywords` | outrage + spam + engagement-bait keywords |
| `enforcementAction.activeActionId` | `dim` |
| `enabledModIds` | heuristic, dim, noise-patterns (profile permitting) |

---

## Dashboard: essential vs advanced

Users **should not need** these for day-one value (wizard or Overview suffices):

| Surface | Tab | Why advanced |
|---------|-----|--------------|
| Remote API / escalation | Filtering | Self-hosted; off by default |
| Language / ONNX pack picker | Filtering | Full build only |
| Per-site sensitivity overrides | Rules | Niche tuning |
| Custom keyword list editor | Rules | Wizard topics cover typical case |
| Signed mod package install | Plugins | Collapsed under Advanced |
| Authenticity assist settings | Plugins | Experimental opt-in |
| Export / import JSON | Privacy | Power user |
| Debug / perf diagnostics | Privacy | Developer |

### Essential dashboard entry points (after wizard)

| Tab | Purpose |
|-----|---------|
| **Overview** | Focus toggle, mode switch, activity, status strip |
| **Filtering** | Sensitivity + filter style (mirrors wizard custom steps) |
| **Rules** | Site whitelist + allow keywords (extends wizard whitelist step) |

Overview quick links surface **Filtering** and **Rules** first; **Plugins** and **Privacy** under Advanced.

---

## Wizard done handoff

| Action | Behavior |
|--------|----------|
| **Start browsing** (primary) | Apply settings; close wizard; try closing options tab if opened from install (`?wizard=1`) |
| **Fine-tune in dashboard** | Apply settings; open Overview tab |
| **Try on Reddit** | Apply settings; open sample fixture page |

Copy stresses that dashboard fine-tuning is **optional**.

---

## Exit criteria (v2.1.x)

- [x] Preset wizard writes all keys in `WIZARD_PRESET_MODE_STORAGE_KEYS` + base keys
- [x] Custom wizard writes topics, style, sensitivity, whitelist
- [x] `tests/onboarding/wizard-first-coverage.spec.ts` + `wizard-quick-start.spec.ts` green
- [x] Per-site rules, authenticity, mod install collapsed by default in dashboard
- [x] `pnpm release:verify` + `pnpm test:firefox` + `pnpm test:e2e:core` green (dev signing key warning expected)
- [x] README reflects core-first pre-release status
- [x] Chrome install smoke: `tests/onboarding/wizard-install-e2e.spec.ts` (quick start + Start browsing → fixture dims)
- [ ] Firefox manual rows **1–8** and **14** signed off ([`firefox-qa.md`](../guides/firefox-qa.md))
- [x] Tag **`v2.1.2`** (Firefox manual still required before AMO submit)

## Exit criteria (v2.2.x dogfood)

- [ ] ≥80% testers complete setup without opening Filtering/Rules/Plugins tabs
- [ ] Wizard-only path documented in store listing screenshots

## Exit criteria (v3.0.0)

- [ ] Wizard covers mode, sensitivity, style, topics, whitelist, locale
- [x] Authenticity opt-in via wizard step (optional; off by default) or Plugins advanced
- [ ] No required dashboard visit documented in user-facing FAQ

---

## Future wizard step (v2.3.x — optional)

| Step | When | Sets |
|------|------|------|
| **Authenticity opt-in** | User enables assist | `authenticitySettings.*`, quota caps, search-only default |

Do not block v2.2 on this step; authenticity stays off by default until user opts in from Plugins.
