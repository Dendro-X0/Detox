/// <reference types="chrome" />
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import type { CoreIpcMessage } from './core/ipc/messages';
import type { InferenceRoutingSettings, PrimaryProviderMode } from './core/types/routing';
import { DEFAULT_ROUTING_SETTINGS } from './core/types/routing';
import type { EnforcementActionId, EnforcementActionSettings } from './core/types/enforcement';
import { DEFAULT_ENFORCEMENT_ACTION_SETTINGS } from './core/types/enforcement';
import {
    DEFAULT_FILTER_APPEARANCE,
    normalizeFilterAppearance,
    type FilterAppearanceSettings,
} from './core/types/filter-appearance';
import { isFullBuild } from './build-profile';
import { getBuildProfile } from './build-profile';
import { PRIVACY_POLICY_URL } from './config/store-links';
import { restoreWizardDefaults } from './core/settings/restore-wizard-defaults';
import { BlockedItemRow } from './dashboard/BlockReasonChips';
import DashboardShell from './dashboard/DashboardShell';
import BrowsingModesPanel from './dashboard/BrowsingModesPanel';
import DashboardQuickLinks from './dashboard/DashboardQuickLinks';
import DashboardTabIntro from './dashboard/DashboardTabIntro';
import GettingStartedPanel from './dashboard/GettingStartedPanel';
import LanguageSettingsPanel from './dashboard/LanguageSettingsPanel';
import FilteringSettingsPanel from './dashboard/FilteringSettingsPanel';
import OverviewActivityPanel from './dashboard/OverviewActivityPanel';
import OverviewControlStrip from './dashboard/OverviewControlStrip';
import FilterInsightsPanel from './dashboard/FilterInsightsPanel';
import RecentBlockedPanel from './dashboard/RecentBlockedPanel';
import OverviewStatusStrip from './dashboard/OverviewStatusStrip';
import { detectorLabel, runtimeStateLabel } from './dashboard/runtime-labels';
import { loadActiveBrowsingModeId, type BrowsingModeId } from './core/modes/browsing-modes';
import { markSettingsCustomized } from './core/modes/browsing-modes';
import { useSettingsTab } from './dashboard/useSettingsTab';
import { getSettingsTabLabels } from './i18n/settings-tabs';
import { useLocale } from './i18n/LocaleContext';
import AuthenticitySettingsPanel from './dashboard/AuthenticitySettingsPanel';
import AssistSettingsPanel from './dashboard/AssistSettingsPanel';
import PluginLibraryPanel from './dashboard/PluginLibraryPanel';
import FilterModelsPanel from './dashboard/FilterModelsPanel';
import AdaptationPacksPanel from './dashboard/AdaptationPacksPanel';
import SetupCompleteBanner from './dashboard/SetupCompleteBanner';
import ThemeToggle from './dashboard/ThemeToggle';
import UserRulesPanel from './dashboard/UserRulesPanel';
import SiteWhitelistPanel from './dashboard/SiteWhitelistPanel';
import SensitivitySettingsCard from './dashboard/SensitivitySettingsCard';
import FilterStyleSettingsCard from './dashboard/FilterStyleSettingsCard';
import TopicDietPanel from './dashboard/TopicDietPanel';
import type { AuthenticitySettings } from './mods/analyzers/authenticity/settings';
import { loadInstalledMods, type InstalledModRecord } from './core/mods/installed-mod-store';
import { loadEnabledModIds, saveEnabledModIds } from './core/mods/mod-enablement-store';
import { loadUserRules, saveUserRules } from './core/rules/user-rules-store';
import type { UserRulesSettings } from './core/types/user-rules';
import type { ModelPack } from './types/model-pack';
import { scanModelPacks, selectModelPack } from './v2/core/language-pack-manager';
import { sessionGet, subscribeSessionChanges } from './core/storage/extension-session';
import { getRollupSnapshot, type PeriodScanStats } from './core/storage/scan-stats-store';

type Stats = {
  readonly scanned: number;
  readonly toxic: number;
};

type RollupStats = {
  readonly today: PeriodScanStats;
  readonly last7Days: PeriodScanStats;
};

type BlockedItem = {
  readonly id: string;
  readonly score: number;
  readonly labelId: string;
  readonly detectorId?: string;
  readonly secondaryReasons?: readonly {
    readonly labelId: string;
    readonly detectorId: string;
    readonly score: number;
  }[];
  readonly preview: string;
  readonly hostname: string;
  readonly timestamp: number;
  /** @deprecated Legacy field from older builds */
  readonly label?: string;
};

type LanguagePackState = {
  readonly availablePacks: readonly ModelPack[];
  readonly detectedLanguage: string;
  readonly detectedConfidence: number;
  readonly selectedPackId: string | null;
  readonly autoSelected: boolean;
};

type PolicyPreset = 'conservative' | 'balanced' | 'strict';

type PolicySettings = {
  readonly preset: PolicyPreset;
  readonly threshold: number;
  readonly perSite: Record<string, number>;
};

type RuntimeStatus = {
  readonly state: string;
  readonly lastError: string | null;
  readonly activePackId: string | null;
  readonly activeDetectorId: string | null;
  readonly hasSession: boolean;
  readonly primaryMode?: PrimaryProviderMode;
  readonly escalationEnabled?: boolean;
  readonly remoteApiReady?: boolean;
};

type PerformanceMetrics = {
  readonly firstClassificationTime: number | null;
  readonly totalClassified: number;
  readonly totalBatches: number;
  readonly averageBatchTime: number;
  readonly throughput: number;
  readonly averageQueueDepth: number;
  readonly currentQueueDepth: number;
};

const PRESET_THRESHOLDS: Record<PolicyPreset, number> = {
  conservative: 0.7,
  balanced: 0.5,
  strict: 0.3,
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type AppProps = {
  readonly onRestartWizard?: () => void;
};

function App({ onRestartWizard }: AppProps) {
  const { t } = useLocale();
  const settingsTabs = useMemo(() => getSettingsTabLabels(t), [t]);
  const [settingsTab, setSettingsTab] = useSettingsTab();
  const [activeBrowsingModeId, setActiveBrowsingModeId] = useState<BrowsingModeId | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState<Stats>({ scanned: 0, toxic: 0 });
  const [rollupStats, setRollupStats] = useState<RollupStats>({
    today: { scanned: 0, filtered: 0 },
    last7Days: { scanned: 0, filtered: 0 },
  });
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({
    state: 'unknown',
    lastError: null,
    activePackId: null,
    activeDetectorId: null,
    hasSession: false,
  });
  const [blockedItems, setBlockedItems] = useState<readonly BlockedItem[]>([]);
  const [policy, setPolicy] = useState<PolicySettings>({ preset: 'balanced', threshold: 0.5, perSite: {} });
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics | null>(null);
  const [packState, setPackState] = useState<LanguagePackState>({
    availablePacks: [],
    detectedLanguage: 'en',
    detectedConfidence: 0.3,
    selectedPackId: null,
    autoSelected: true,
  });
  const [showPackSelector, setShowPackSelector] = useState(false);
  const [routing, setRouting] = useState<InferenceRoutingSettings>(DEFAULT_ROUTING_SETTINGS);
  const [enforcementAction, setEnforcementAction] = useState<EnforcementActionSettings>(DEFAULT_ENFORCEMENT_ACTION_SETTINGS);
  const [filterAppearance, setFilterAppearance] = useState<FilterAppearanceSettings>(DEFAULT_FILTER_APPEARANCE);
  const [siteRuleHost, setSiteRuleHost] = useState('');
  const [siteRuleThreshold, setSiteRuleThreshold] = useState(0.5);
  const saveEnforcementAction = (next: EnforcementActionSettings): void => {
    setEnforcementAction(next);
    chrome.storage.local.set({ enforcementAction: next });
  };

  const setActionId = (activeActionId: EnforcementActionId): void => {
    saveEnforcementAction({ activeActionId });
    void markSettingsCustomized();
  };

  const saveFilterAppearance = (next: FilterAppearanceSettings): void => {
    const normalized = normalizeFilterAppearance(next);
    setFilterAppearance(normalized);
    chrome.storage.local.set({ filterAppearance: normalized });
    void markSettingsCustomized();
  };

  const saveRouting = (next: InferenceRoutingSettings): void => {
    setRouting(next);
    chrome.storage.local.set({ inferenceRouting: next });
    if (next.primaryMode === 'heuristic') {
      chrome.storage.local.set({ preferredDetectorId: 'heuristic-keywords' });
    } else {
      chrome.storage.local.set({ preferredDetectorId: 'local-pack' });
    }
  };

  const setPrimaryMode = (mode: PrimaryProviderMode): void => {
    saveRouting({ ...routing, primaryMode: mode });
  };

  useEffect(() => {
    chrome.storage.local.get(['enabled', 'stats', 'policy', 'inferenceRouting', 'enforcementAction', 'filterAppearance'], (res: unknown) => {
      const record = res as {
        readonly enabled?: boolean;
        readonly stats?: Stats;
        readonly policy?: PolicySettings;
        readonly inferenceRouting?: InferenceRoutingSettings;
        readonly enforcementAction?: EnforcementActionSettings;
        readonly filterAppearance?: Partial<FilterAppearanceSettings>;
      };
      setEnabled(record.enabled ?? true);
      setStats(record.stats ?? { scanned: 0, toxic: 0 });
      setPolicy(record.policy ?? { preset: 'balanced', threshold: 0.5, perSite: {} });
      if (record.inferenceRouting) {
        setRouting({ ...DEFAULT_ROUTING_SETTINGS, ...record.inferenceRouting });
      }
      if (record.enforcementAction) {
        setEnforcementAction({ ...DEFAULT_ENFORCEMENT_ACTION_SETTINGS, ...record.enforcementAction });
      }
      if (record.filterAppearance) {
        setFilterAppearance(normalizeFilterAppearance(record.filterAppearance));
      }
    });

    void sessionGet<readonly BlockedItem[]>('blockedItems').then((items) => {
      setBlockedItems(items ?? []);
    });

    const unsubscribeSession = subscribeSessionChanges((changes) => {
      if (changes.blockedItems) {
        setBlockedItems(changes.blockedItems.newValue as readonly BlockedItem[]);
      }
    });

    void getRollupSnapshot().then(setRollupStats);
    void loadActiveBrowsingModeId().then(setActiveBrowsingModeId);

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.stats) {
        setStats(changes.stats.newValue as Stats);
      }
      if (changes.scanStatsRollup) {
        void getRollupSnapshot().then(setRollupStats);
      }
      if (changes.policy) {
        setPolicy(changes.policy.newValue as PolicySettings);
      }
      if (changes.inferenceRouting) {
        setRouting(changes.inferenceRouting.newValue as InferenceRoutingSettings);
      }
      if (changes.enforcementAction) {
        setEnforcementAction(changes.enforcementAction.newValue as EnforcementActionSettings);
      }
      if (changes.filterAppearance) {
        setFilterAppearance(
          normalizeFilterAppearance(changes.filterAppearance.newValue as FilterAppearanceSettings)
        );
      }
      if (changes.activeBrowsingModeId) {
        const next = changes.activeBrowsingModeId.newValue;
        setActiveBrowsingModeId(typeof next === 'string' ? (next as BrowsingModeId) : null);
      }
    });

    const pollStatus = (): void => {
      const request: CoreIpcMessage = { type: 'runtimeStatus' };
      chrome.runtime.sendMessage(request, (response: CoreIpcMessage | undefined) => {
        if (chrome.runtime.lastError) {
          setRuntimeStatus({
            state: 'error',
            lastError: chrome.runtime.lastError.message ?? 'Unknown runtime error',
            activePackId: null,
            activeDetectorId: null,
            hasSession: false,
          });
          return;
        }
        if (!response) return;
        if (response.type === 'error') {
          setRuntimeStatus({
            state: 'error',
            lastError: response.error,
            activePackId: null,
            activeDetectorId: null,
            hasSession: false,
          });
          return;
        }
        if (response.type !== 'runtimeStatusResult') return;
        setRuntimeStatus({
          state: response.state,
          lastError: response.lastError,
          activePackId: response.activePackId,
          activeDetectorId: response.activeDetectorId,
          hasSession: response.hasSession,
          primaryMode: response.primaryMode,
          escalationEnabled: response.escalationEnabled,
          remoteApiReady: response.remoteApiReady,
        });
      });
    };

    pollStatus();
    const intervalId = window.setInterval(pollStatus, 2000);

    // Poll performance metrics from content script
    const pollPerfMetrics = (): void => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) return;
        chrome.tabs.sendMessage(tab.id, { type: 'getPerformanceMetrics' }, (response) => {
          if (chrome.runtime.lastError) return;
          if (response) setPerfMetrics(response as PerformanceMetrics);
        });
      });
    };

    pollPerfMetrics();
    const perfIntervalId = window.setInterval(pollPerfMetrics, 1000);

    // Load available packs and detect language (full build only)
    const loadPackInfo = async (): Promise<void> => {
      if (!isFullBuild()) return;
      try {
        const registry = await scanModelPacks();

        const preferredResult = await chrome.storage.local.get('preferredPackId');
        const preferredPackIdUnknown = (preferredResult as { readonly preferredPackId?: unknown }).preferredPackId;
        const preferredPackId = typeof preferredPackIdUnknown === 'string' ? preferredPackIdUnknown : null;
        
        // Get active tab for language detection
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        
        let detectedLang = 'en';
        let confidence = 0.3;
        
        if (activeTab?.id) {
          try {
            const result = await chrome.tabs.sendMessage(activeTab.id, { type: 'detectLanguage' });
            if (result?.language) {
              detectedLang = result.language;
              confidence = result.confidence ?? 0.6;
            }
          } catch {
            // Content script may not be loaded, use fallback
            detectedLang = navigator.language.split('-')[0] ?? 'en';
            confidence = 0.5;
          }
        }
        
        // Select best pack for detected language
        const preferredPack = preferredPackId ? registry.packs.find((p) => p.id === preferredPackId) ?? null : null;
        const selectedPack = preferredPack ?? selectModelPack(detectedLang, registry);
        
        setPackState({
          availablePacks: registry.packs,
          detectedLanguage: detectedLang,
          detectedConfidence: confidence,
          selectedPackId: selectedPack?.id ?? null,
          autoSelected: preferredPack === null,
        });
      } catch (error) {
        console.warn('[Detox] Failed to load pack info:', error);
      }
    };

    void loadPackInfo();

    return () => {
      unsubscribeSession();
      window.clearInterval(intervalId);
      window.clearInterval(perfIntervalId);
    };
  }, []);

  const toggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    chrome.storage.local.set({ enabled: newState });
  };

  const refreshSettingsFromStorage = (): void => {
    chrome.storage.local.get(['policy', 'enforcementAction'], (res: unknown) => {
      const record = res as {
        readonly policy?: PolicySettings;
        readonly enforcementAction?: EnforcementActionSettings;
      };
      if (record.policy) setPolicy(record.policy);
      if (record.enforcementAction) {
        setEnforcementAction({ ...DEFAULT_ENFORCEMENT_ACTION_SETTINGS, ...record.enforcementAction });
      }
    });
    void loadActiveBrowsingModeId().then(setActiveBrowsingModeId);
  };

  const setPreset = (preset: PolicyPreset) => {
    const newPolicy: PolicySettings = { ...policy, preset, threshold: PRESET_THRESHOLDS[preset] };
    setPolicy(newPolicy);
    chrome.storage.local.set({ policy: newPolicy });
    void markSettingsCustomized();
  };

  const addSiteOverride = (): void => {
    const host = siteRuleHost.trim().toLowerCase();
    if (!host) return;
    const nextPolicy: PolicySettings = {
      ...policy,
      perSite: { ...policy.perSite, [host]: siteRuleThreshold },
    };
    setPolicy(nextPolicy);
    chrome.storage.local.set({ policy: nextPolicy });
    void markSettingsCustomized();
    setSiteRuleHost('');
  };

  const removeSiteOverride = (host: string): void => {
    const nextPerSite = { ...policy.perSite };
    delete nextPerSite[host];
    const nextPolicy: PolicySettings = { ...policy, perSite: nextPerSite };
    setPolicy(nextPolicy);
    chrome.storage.local.set({ policy: nextPolicy });
    void markSettingsCustomized();
  };

  const exportSettings = (): void => {
    void Promise.all([
      loadUserRules(),
      loadEnabledModIds(),
      loadInstalledMods(),
      chrome.storage.local.get('authenticitySettings'),
    ]).then(([userRules, enabledModIds, installedMods, authRes]) => {
      const authenticitySettings = (authRes as { authenticitySettings?: AuthenticitySettings })
        .authenticitySettings;
      const payload = {
        policy,
        inferenceRouting: routing,
        enforcementAction,
        userRules,
        enabledModIds,
        installedMods,
        authenticitySettings,
        generatedAt: new Date().toISOString(),
      };
      const content = JSON.stringify(payload, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'signallens-settings.json';
      anchor.click();
      URL.revokeObjectURL(url);
    });
  };

  const importSettings = (): void => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const raw = await file.text();
        const parsed = JSON.parse(raw) as {
          readonly policy?: PolicySettings;
          readonly inferenceRouting?: InferenceRoutingSettings;
          readonly enforcementAction?: EnforcementActionSettings;
          readonly userRules?: UserRulesSettings;
          readonly enabledModIds?: readonly string[];
          readonly installedMods?: readonly InstalledModRecord[];
          readonly authenticitySettings?: AuthenticitySettings;
        };
        if (parsed.policy) {
          setPolicy(parsed.policy);
          chrome.storage.local.set({ policy: parsed.policy });
        }
        if (parsed.inferenceRouting) {
          saveRouting({ ...DEFAULT_ROUTING_SETTINGS, ...parsed.inferenceRouting });
        }
        if (parsed.enforcementAction) {
          saveEnforcementAction({ ...DEFAULT_ENFORCEMENT_ACTION_SETTINGS, ...parsed.enforcementAction });
        }
        if (parsed.userRules) {
          await saveUserRules(parsed.userRules);
        }
        if (parsed.enabledModIds) {
          await saveEnabledModIds(parsed.enabledModIds);
        }
        if (parsed.installedMods) {
          await chrome.storage.local.set({ installedMods: parsed.installedMods });
        }
        if (parsed.authenticitySettings) {
          await chrome.storage.local.set({ authenticitySettings: parsed.authenticitySettings });
        }
      } catch {
        window.alert(t('settings.advanced.invalidImport'));
      }
    };
    input.click();
  };

  const restoreDefaults = (): void => {
    if (!window.confirm(t('settings.advanced.restoreDefaultsConfirm'))) return;
    void restoreWizardDefaults();
  };

  const isLoadingView = new URLSearchParams(window.location.search).has('loading');
  const isOptionsPage = window.location.pathname.endsWith('options.html');
  const activeProfile = getBuildProfile();

  if (isLoadingView) {
    const loadingBody = (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <h2>{t('common.appName')}</h2>
        <p className="loading-text">{t('options.loadingFocusView')}</p>
        <p className="loading-subtext">{t('options.loadingLargePages')}</p>
      </div>
    );
    if (isOptionsPage) {
      return (
        <DashboardShell title={t('common.appName')} subtitle={t('options.preparingSession')}>
          {loadingBody}
        </DashboardShell>
      );
    }
    return <div className="container loading-container">{loadingBody}</div>;
  }

  const headerActions = isOptionsPage ? (
    <div className="sl-header-controls">
      <label className="sl-header-focus switch">
        <input type="checkbox" checked={enabled} onChange={toggle} />
        <span className="slider round" />
      </label>
      <span className="sl-header-focus-label">{enabled ? t('settings.header.focusOn') : t('settings.header.focusOff')}</span>
      <div className="sl-header-stats">
        <div className="sl-header-stat">
          <span className="value">{rollupStats.today.scanned}</span>
          <span className="label">{t('settings.header.today')}</span>
        </div>
        <div className="sl-header-stat">
          <span className="value">{rollupStats.today.filtered}</span>
          <span className="label">{t('settings.header.blockedToday')}</span>
        </div>
        <div className="sl-header-stat">
          <span className="value">{rollupStats.last7Days.scanned}</span>
          <span className="label">{t('settings.header.scanned7Day')}</span>
        </div>
      </div>
      <ThemeToggle compact />
    </div>
  ) : null;

  const runtimeStatusCard = (
    <div className="card">
      <h3>{t('settings.systemStatus.heading')}</h3>
      <div className="sl-kv-grid">
        <span className="label">{t('settings.systemStatus.runtime')}</span>
        <span className="value">{runtimeStateLabel(runtimeStatus.state, t)}</span>
        <span className="label">{t('settings.systemStatus.scanner')}</span>
        <span className="value">{t('settings.systemStatus.scannerUniversal')}</span>
        {isFullBuild() ? (
          <>
            <span className="label">{t('settings.systemStatus.pack')}</span>
            <span className="value">{runtimeStatus.activePackId ?? t('common.none')}</span>
            <span className="label">{t('settings.systemStatus.mode')}</span>
            <span className="value">{runtimeStatus.primaryMode ?? routing.primaryMode}</span>
            <span className="label">{t('settings.systemStatus.escalation')}</span>
            <span className="value">{runtimeStatus.escalationEnabled ? t('settings.systemStatus.on') : t('settings.systemStatus.off')}</span>
          </>
        ) : (
          <>
            <span className="label">{t('settings.systemStatus.classifier')}</span>
            <span className="value">{detectorLabel(runtimeStatus.activeDetectorId, t)}</span>
          </>
        )}
        {runtimeStatus.lastError ? (
          <>
            <span className="label">{t('settings.systemStatus.lastError')}</span>
            <span className="value">{runtimeStatus.lastError}</span>
          </>
        ) : null}
      </div>
    </div>
  );

  const filteringSettingsPanel = (
    <FilteringSettingsPanel
      policy={policy}
      setPreset={setPreset}
      routing={routing}
      saveRouting={saveRouting}
      setPrimaryMode={setPrimaryMode}
      enforcementAction={enforcementAction}
      setActionId={setActionId}
      filterAppearance={filterAppearance}
      setFilterAppearance={saveFilterAppearance}
      activeBrowsingModeId={activeBrowsingModeId}
      runtimeStatus={runtimeStatus}
      packState={packState}
      showPackSelector={showPackSelector}
      setShowPackSelector={setShowPackSelector}
      setPackState={setPackState}
      onNavigatePreferences={() => setSettingsTab('preferences')}
      hidePersonalizationControls
    />
  );

  const perSiteRulesCard = (
    <div className="card policy-card">
      <h3>{t('settings.filtering.perSiteHeading')}</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
        {t('settings.filtering.perSiteDescription')}
      </p>
      <div className="stat-row" style={{ gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder={t('settings.filtering.hostPlaceholder')}
          value={siteRuleHost}
          onChange={(e) => setSiteRuleHost(e.target.value)}
          style={{ flex: 1, padding: '0.35rem' }}
        />
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={siteRuleThreshold}
          onChange={(e) => setSiteRuleThreshold(Number(e.target.value))}
          style={{ width: '80px', padding: '0.35rem' }}
        />
        <button className="preset-btn" onClick={addSiteOverride}>{t('settings.filtering.add')}</button>
      </div>
      <ul className="blocked-list" style={{ maxHeight: 'unset' }}>
        {Object.entries(policy.perSite).length === 0 ? (
          <li className="muted">{t('settings.filtering.noPerSiteOverrides')}</li>
        ) : (
          Object.entries(policy.perSite).map(([host, threshold]) => (
            <li key={host} className="blocked-item">
              <div className="blocked-header">
                <span className="badge">{host}</span>
                <span className="score">{(threshold * 100).toFixed(0)}%</span>
              </div>
              <button className="debug-toggle" onClick={() => removeSiteOverride(host)}>{t('settings.filtering.remove')}</button>
            </li>
          ))
        )}
      </ul>
    </div>
  );

  const privacyCard = (
    <div className="card policy-card">
      <h3>{t('settings.privacy.heading')}</h3>
      <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
        {t('settings.privacy.description')}
      </p>
      <div className="sl-kv-grid">
        <span className="label">{t('settings.privacy.buildProfile')}</span>
        <span className="value">{activeProfile}</span>
        <span className="label">{t('settings.privacy.remoteApiConfigured')}</span>
        <span className="value">{routing.remoteApi.endpointUrl ? t('common.yes') : t('common.no')}</span>
      </div>
      <p className="muted" style={{ marginBottom: 0, fontSize: '0.85rem' }}>
        <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
          {t('settings.privacy.policyLink')}
        </a>
      </p>
    </div>
  );

  const advancedCard = (
    <div className="card policy-card">
      <h3>{t('settings.advanced.heading')}</h3>
      <div className="preset-buttons">
        <button className="preset-btn" onClick={restoreDefaults}>{t('settings.advanced.restoreDefaults')}</button>
        <button className="preset-btn" onClick={exportSettings}>{t('settings.advanced.exportSettings')}</button>
        <button className="preset-btn" onClick={importSettings}>{t('settings.advanced.importSettings')}</button>
        {onRestartWizard ? (
          <button className="preset-btn" onClick={onRestartWizard}>{t('settings.advanced.setupAgain')}</button>
        ) : null}
      </div>
    </div>
  );

  const debugSection = (
    <details className="card sl-debug-details">
      <summary>{t('settings.debug.toolsHeading')}</summary>
      <div className="sl-debug-body">
      <h3>{t('settings.debug.performanceHeading')}</h3>
      {perfMetrics ? (
        <div className="perf-metrics">
          <div className="stat-row">
            <span className="label">{t('settings.debug.timeToFirstClassification')}</span>
            <span className="value">
              {perfMetrics.firstClassificationTime !== null
                ? `${perfMetrics.firstClassificationTime.toFixed(0)}ms`
                : t('settings.debug.pending')}
            </span>
          </div>
          <div className="stat-row">
            <span className="label">{t('settings.debug.throughput')}</span>
            <span className="value">{t('settings.debug.throughputValue', { value: perfMetrics.throughput.toFixed(1) })}</span>
          </div>
          <div className="stat-row">
            <span className="label">{t('settings.debug.avgBatchTime')}</span>
            <span className="value">{t('settings.debug.avgBatchTimeValue', { value: perfMetrics.averageBatchTime.toFixed(1) })}</span>
          </div>
          <div className="stat-row">
            <span className="label">{t('settings.debug.totalClassified')}</span>
            <span className="value">{perfMetrics.totalClassified}</span>
          </div>
          <div className="stat-row">
            <span className="label">{t('settings.debug.currentQueueDepth')}</span>
            <span className="value">{perfMetrics.currentQueueDepth}</span>
          </div>
          <div className="stat-row">
            <span className="label">{t('settings.debug.avgQueueDepth')}</span>
            <span className="value">{perfMetrics.averageQueueDepth.toFixed(1)}</span>
          </div>
        </div>
      ) : (
        <p className="muted">{t('settings.debug.noPerformanceData')}</p>
      )}

      <h3>{t('settings.debug.recentBlockedHeading', { count: blockedItems.length })}</h3>
      {blockedItems.length === 0 ? (
        <p className="muted">{t('settings.debug.noItemsBlocked')}</p>
      ) : (
        <ul className="blocked-list sl-scroll-region">
          {blockedItems.slice(0, 10).map((item) => (
            <BlockedItemRow key={item.id} item={item} formatTime={formatTime} />
          ))}
        </ul>
      )}
      </div>
    </details>
  );

  const optionsTabPanel = (
    <div className="container options-dashboard">
      <div role="tabpanel" id={`settings-panel-${settingsTab}`} className="sl-tab-panel">
        {settingsTab === 'overview' ? (
          <div className="sl-dashboard-grid">
            <DashboardTabIntro
              title={t('settings.tabs.overview')}
              description={t('settings.overview.tabIntro')}
            />
            <SetupCompleteBanner />
            <OverviewStatusStrip
              enabled={enabled}
              activeBrowsingModeId={activeBrowsingModeId}
              onNavigate={setSettingsTab}
            />
            <div className="sl-span-full">
              <GettingStartedPanel />
            </div>
            <OverviewControlStrip
              enabled={enabled}
              activeBrowsingModeId={activeBrowsingModeId}
              sensitivity={policy.preset}
              filterStyle={enforcementAction.activeActionId}
              appearancePreset={filterAppearance.presetId}
              onNavigate={setSettingsTab}
            />
            <OverviewActivityPanel />
            <FilterInsightsPanel onNavigate={setSettingsTab} />
            <RecentBlockedPanel />
            <div className="sl-span-full">
              <BrowsingModesPanel
                onModeApplied={refreshSettingsFromStorage}
                onCustomized={refreshSettingsFromStorage}
              />
            </div>
            <DashboardQuickLinks onNavigate={setSettingsTab} />
            <LanguageSettingsPanel />
            {runtimeStatusCard}
          </div>
        ) : null}

        {settingsTab === 'filtering' ? (
          <div className="sl-dashboard-grid">
            <DashboardTabIntro
              title={t('settings.tabs.filtering')}
              description={t('settings.filtering.tabIntro')}
            />
            <div className="sl-span-full">{filteringSettingsPanel}</div>
          </div>
        ) : null}

        {settingsTab === 'preferences' ? (
          <div className="sl-dashboard-grid sl-preferences-panel">
            <DashboardTabIntro
              title={t('settings.tabs.preferences')}
              description={t('settings.preferences.tabIntro')}
            />
            <section className="sl-preferences-section sl-span-full">
              <h3 className="sl-preferences-section-heading">{t('settings.preferences.sections.style')}</h3>
              <p className="muted sl-preferences-section-desc">{t('settings.preferences.sections.styleDescription')}</p>
              <div className="sl-preferences-section-grid">
                <SensitivitySettingsCard
                  preset={policy.preset}
                  threshold={policy.threshold}
                  onPresetChange={setPreset}
                />
                <FilterStyleSettingsCard
                  enforcementAction={enforcementAction}
                  onActionChange={setActionId}
                />
              </div>
            </section>
            <section className="sl-preferences-section sl-span-full">
              <h3 className="sl-preferences-section-heading">{t('settings.preferences.sections.interests')}</h3>
              <p className="muted sl-preferences-section-desc">{t('settings.preferences.sections.interestsDescription')}</p>
              {isFullBuild() ? (
                <div className="card policy-card sl-span-full sl-preferences-interests-card">
                  <TopicDietPanel />
                </div>
              ) : (
                <p className="muted sl-preferences-section-footnote">{t('settings.preferences.sections.interestsCoreNote')}</p>
              )}
            </section>
            <section className="sl-preferences-section sl-span-full">
              <h3 className="sl-preferences-section-heading">{t('settings.preferences.sections.noise')}</h3>
              <p className="muted sl-preferences-section-desc">{t('settings.preferences.sections.noiseDescription')}</p>
              <UserRulesPanel embedded hideTopicDiet />
            </section>
            <section className="sl-preferences-section sl-span-full">
              <h3 className="sl-preferences-section-heading">{t('settings.preferences.sections.sites')}</h3>
              <p className="muted sl-preferences-section-desc">{t('settings.preferences.sections.sitesDescription')}</p>
              <SiteWhitelistPanel embedded />
            </section>
            <details className="sl-install-details sl-span-full">
              <summary>{t('rules.advanced.perSiteSummary')}</summary>
              {perSiteRulesCard}
            </details>
          </div>
        ) : null}

        {settingsTab === 'plugins' ? (
          <div className="sl-dashboard-grid">
            <DashboardTabIntro
              title={t('settings.tabs.plugins')}
              description={t('plugins.tabIntro')}
            />
            <div className="sl-span-full"><FilterModelsPanel /></div>
            <div className="sl-span-full"><AdaptationPacksPanel /></div>
            <div className="sl-span-full"><AssistSettingsPanel /></div>
            <div className="sl-span-full"><PluginLibraryPanel /></div>
            <details className="sl-install-details sl-span-full">
              <summary>{t('plugins.advanced.authenticitySummary')}</summary>
              <AuthenticitySettingsPanel />
            </details>
          </div>
        ) : null}

        {settingsTab === 'privacy' ? (
          <div className="sl-dashboard-grid">
            <DashboardTabIntro
              title={t('settings.tabs.privacy')}
              description={t('settings.privacy.tabIntro')}
            />
            {privacyCard}
            <div className="card policy-card">
              <h3>{t('theme.heading')}</h3>
              <p className="muted" style={{ marginTop: 0, fontSize: '0.85rem' }}>
                {t('theme.description')}
              </p>
              <ThemeToggle />
            </div>
            <div className="sl-span-full">{advancedCard}</div>
            <div className="sl-span-full">{debugSection}</div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const popupDashboard = (
    <div className="container">
      <h1>{t('common.appName')}</h1>

      <div className="sl-hero-row">
        <div className="card">
          <label className="switch">
            <input type="checkbox" checked={enabled} onChange={toggle} />
            <span className="slider round"></span>
          </label>
          <p>{enabled ? t('popup.focusEnabled') : t('popup.focusDisabled')}</p>
        </div>

        <div className="card">
          <div className="stats">
            <div className="stat-item">
              <span className="value">{stats.scanned}</span>
              <span className="label">{t('popup.scanned')}</span>
            </div>
            <div className="stat-item">
              <span className="value">{stats.toxic}</span>
              <span className="label">{t('popup.filtered')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sl-dashboard-grid">
      {filteringSettingsPanel}
        {runtimeStatusCard}
      </div>

      {debugSection}
    </div>
  );

  if (isOptionsPage) {
    return (
      <DashboardShell
        title={t('common.appName')}
        subtitle={t('options.subtitle')}
        headerActions={headerActions}
        tabs={settingsTabs}
        activeTab={settingsTab}
        onTabChange={setSettingsTab}
      >
        {optionsTabPanel}
      </DashboardShell>
    );
  }

  return popupDashboard;
}

export default App;
