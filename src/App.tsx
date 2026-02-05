/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import './App.css';
import type { DetoxIpcMessage } from './v2/core/detox-ipc';
import type { ModelPack } from './types/model-pack';
import { scanModelPacks, selectModelPack } from './v2/core/language-pack-manager';

type Stats = {
  readonly scanned: number;
  readonly toxic: number;
};

type BlockedItem = {
  readonly id: string;
  readonly score: number;
  readonly label: string;
  readonly preview: string;
  readonly hostname: string;
  readonly timestamp: number;
};

type LanguagePackState = {
  readonly availablePacks: readonly ModelPack[];
  readonly detectedLanguage: string;
  readonly detectedConfidence: number;
  readonly selectedPackId: string | null;
  readonly autoSelected: boolean;
};

type InstallablePack = {
  readonly id: string;
  readonly name: string;
  readonly languages: readonly string[];
  readonly sizeMb: number;
  readonly installed: boolean;
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
  readonly hasSession: boolean;
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

const INSTALLABLE_PACKS: readonly InstallablePack[] = [
  { id: 'toxicity-multi-xlm-r', name: 'Multilingual XLM-R', languages: ['*'], sizeMb: 85, installed: true },
  { id: 'toxicity-en', name: 'English BERT', languages: ['en'], sizeMb: 45, installed: false },
  { id: 'toxicity-de', name: 'German BERT', languages: ['de'], sizeMb: 45, installed: false },
];

function getPresetLabel(preset: PolicyPreset): string {
  const labels: Record<PolicyPreset, string> = {
    conservative: 'Conservative (fewer blocks)',
    balanced: 'Balanced',
    strict: 'Strict (more blocks)',
  };
  return labels[preset];
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function App() {
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState<Stats>({ scanned: 0, toxic: 0 });
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({ state: 'unknown', lastError: null, activePackId: null, hasSession: false });
  const [blockedItems, setBlockedItems] = useState<readonly BlockedItem[]>([]);
  const [policy, setPolicy] = useState<PolicySettings>({ preset: 'balanced', threshold: 0.5, perSite: {} });
  const [debugMode, setDebugMode] = useState(false);
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics | null>(null);
  const [packState, setPackState] = useState<LanguagePackState>({
    availablePacks: [],
    detectedLanguage: 'en',
    detectedConfidence: 0.3,
    selectedPackId: null,
    autoSelected: true,
  });
  const [showPackSelector, setShowPackSelector] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(['enabled', 'stats', 'policy'], (res: unknown) => {
      const record = res as { readonly enabled?: boolean; readonly stats?: Stats; readonly policy?: PolicySettings };
      setEnabled(record.enabled ?? true);
      setStats(record.stats ?? { scanned: 0, toxic: 0 });
      setPolicy(record.policy ?? { preset: 'balanced', threshold: 0.5, perSite: {} });
    });

    chrome.storage.session.get('blockedItems', (res: unknown) => {
      const record = res as { blockedItems?: readonly BlockedItem[] };
      setBlockedItems(record.blockedItems ?? []);
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.stats) {
        setStats(changes.stats.newValue as Stats);
      }
      if (changes.policy) {
        setPolicy(changes.policy.newValue as PolicySettings);
      }
    });

    chrome.storage.session.onChanged.addListener((changes) => {
      if (changes.blockedItems) {
        setBlockedItems(changes.blockedItems.newValue as readonly BlockedItem[]);
      }
    });

    const pollStatus = (): void => {
      const request: DetoxIpcMessage = { type: 'runtimeStatus' };
      chrome.runtime.sendMessage(request, (response: DetoxIpcMessage | undefined) => {
        if (chrome.runtime.lastError) {
          setRuntimeStatus({ state: 'error', lastError: chrome.runtime.lastError.message ?? 'Unknown runtime error', activePackId: null, hasSession: false });
          return;
        }
        if (!response) return;
        if (response.type === 'error') {
          setRuntimeStatus({ state: 'error', lastError: response.error, activePackId: null, hasSession: false });
          return;
        }
        if (response.type !== 'runtimeStatusResult') return;
        setRuntimeStatus({ state: response.state, lastError: response.lastError, activePackId: response.activePackId, hasSession: response.hasSession });
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

    // Load available packs and detect language
    const loadPackInfo = async (): Promise<void> => {
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
      window.clearInterval(intervalId);
      window.clearInterval(perfIntervalId);
    };
  }, []);

  const toggle = () => {
    const newState = !enabled;
    setEnabled(newState);
    chrome.storage.local.set({ enabled: newState });
  };

  const setPreset = (preset: PolicyPreset) => {
    const newPolicy: PolicySettings = { ...policy, preset, threshold: PRESET_THRESHOLDS[preset] };
    setPolicy(newPolicy);
    chrome.storage.local.set({ policy: newPolicy });
  };

  const isLoadingView = new URLSearchParams(window.location.search).has('loading');

  if (isLoadingView) {
    return (
      <div className="container loading-container">
        <div className="loading-spinner"></div>
        <h2>Detox AI</h2>
        <p className="loading-text">Initializing and scanning content...</p>
        <p className="loading-subtext">This may take a moment on large pages</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Detox AI</h1>
      <div className="card">
        <label className="switch">
          <input type="checkbox" checked={enabled} onChange={toggle} />
          <span className="slider round"></span>
        </label>
        <p>{enabled ? "Protection Enabled" : "Protection Disabled"}</p>
      </div>

      <div className="stats">
        <div className="stat-item">
          <span className="value">{stats.scanned}</span>
          <span className="label">Scanned</span>
        </div>
        <div className="stat-item">
          <span className="value">{stats.toxic}</span>
          <span className="label">Blocked</span>
        </div>
      </div>

      <div className="card policy-card">
        <h3>Filter Sensitivity</h3>
        <div className="preset-buttons">
          {(['conservative', 'balanced', 'strict'] as PolicyPreset[]).map((p) => (
            <button
              key={p}
              className={`preset-btn ${policy.preset === p ? 'active' : ''}`}
              onClick={() => setPreset(p)}
            >
              {getPresetLabel(p)}
            </button>
          ))}
        </div>
        <div className="threshold-display">
          <span className="label">Threshold: {(policy.threshold * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="card pack-card">
        <div className="pack-header">
          <h3>Language Pack</h3>
          <button 
            className="pack-toggle-btn"
            onClick={() => setShowPackSelector(!showPackSelector)}
          >
            {showPackSelector ? 'Hide' : 'Change'}
          </button>
        </div>
        
        <div className="pack-info">
          <div className="stat-row">
            <span className="label">Detected:</span>
            <span className="value">{packState.detectedLanguage.toUpperCase()} 
              ({(packState.detectedConfidence * 100).toFixed(0)}% confidence)
            </span>
          </div>
          <div className="stat-row">
            <span className="label">Active:</span>
            <span className="value">
              {packState.availablePacks.find(p => p.id === packState.selectedPackId)?.name ?? 
               packState.selectedPackId ?? 
               'Auto-selecting...'}
              {packState.autoSelected && ' (auto)'}
            </span>
          </div>
        </div>

        {showPackSelector && (
          <div className="pack-selector">
            <h4>Installed Packs</h4>
            <div className="pack-list">
              {packState.availablePacks.map((pack) => (
                <button
                  key={pack.id}
                  className={`pack-option ${packState.selectedPackId === pack.id ? 'active' : ''}`}
                  onClick={() => {
                    setPackState(prev => ({ ...prev, selectedPackId: pack.id, autoSelected: false }));
                    chrome.storage.local.set({ preferredPackId: pack.id });
                  }}
                >
                  <span className="pack-name">{pack.name}</span>
                  <span className="pack-langs">{pack.languages.join(', ')}</span>
                </button>
              ))}
            </div>

            <h4>Available to Install</h4>
            <div className="pack-list installable">
              {INSTALLABLE_PACKS.filter((p: InstallablePack) => !p.installed).map((pack: InstallablePack) => (
                <div key={pack.id} className="pack-option installable">
                  <span className="pack-name">{pack.name}</span>
                  <span className="pack-size">{pack.sizeMb} MB</span>
                  <button 
                    className="install-btn"
                    onClick={() => alert('Pack installation would start here. Not implemented in this demo.')}
                  >
                    Install
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="stat-item">
          <span className="label">Runtime</span>
          <span className="value">{runtimeStatus.state}</span>
        </div>
        <div className="stat-item">
          <span className="label">Pack</span>
          <span className="value">{runtimeStatus.activePackId ?? 'none'}</span>
        </div>
        <div className="stat-item">
          <span className="label">Session</span>
          <span className="value">{runtimeStatus.hasSession ? 'yes' : 'no'}</span>
        </div>
        {runtimeStatus.lastError ? (
          <div className="stat-item">
            <span className="label">Last error</span>
            <span className="label">{runtimeStatus.lastError}</span>
          </div>
        ) : null}
      </div>

      {debugMode ? (
        <div className="card">
          <h3>Performance Metrics</h3>
          {perfMetrics ? (
            <div className="perf-metrics">
              <div className="stat-row">
                <span className="label">Time to first classification:</span>
                <span className="value">
                  {perfMetrics.firstClassificationTime !== null
                    ? `${perfMetrics.firstClassificationTime.toFixed(0)}ms`
                    : 'Pending...'}
                </span>
              </div>
              <div className="stat-row">
                <span className="label">Throughput:</span>
                <span className="value">{perfMetrics.throughput.toFixed(1)} items/sec</span>
              </div>
              <div className="stat-row">
                <span className="label">Avg batch time:</span>
                <span className="value">{perfMetrics.averageBatchTime.toFixed(1)}ms</span>
              </div>
              <div className="stat-row">
                <span className="label">Total classified:</span>
                <span className="value">{perfMetrics.totalClassified}</span>
              </div>
              <div className="stat-row">
                <span className="label">Current queue depth:</span>
                <span className="value">{perfMetrics.currentQueueDepth}</span>
              </div>
              <div className="stat-row">
                <span className="label">Avg queue depth:</span>
                <span className="value">{perfMetrics.averageQueueDepth.toFixed(1)}</span>
              </div>
            </div>
          ) : (
            <p className="muted">No performance data available.</p>
          )}

          <h3>Recent Blocked Items ({blockedItems.length})</h3>
          {blockedItems.length === 0 ? (
            <p className="muted">No items blocked yet.</p>
          ) : (
            <ul className="blocked-list">
              {blockedItems.slice(0, 10).map((item) => (
                <li key={item.id} className="blocked-item">
                  <div className="blocked-header">
                    <span className="badge">{item.label}</span>
                    <span className="score">{(item.score * 100).toFixed(0)}%</span>
                    <span className="time">{formatTime(item.timestamp)}</span>
                  </div>
                  <div className="preview" title={item.preview}>{item.preview}</div>
                  <div className="hostname">{item.hostname}</div>
                </li>
              ))}
            </ul>
          )}
          <button className="debug-toggle" onClick={() => setDebugMode(false)}>Hide Debug</button>
        </div>
      ) : (
        <button className="debug-toggle" onClick={() => setDebugMode(true)}>Show Debug</button>
      )}
    </div>
  );
}

export default App;
