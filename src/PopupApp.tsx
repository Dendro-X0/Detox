/// <reference types="chrome" />
import { useCallback, useEffect, useState } from 'react';
import './App.css';
import type { CoreIpcMessage } from './core/ipc/messages';
import type { ScanDiagnosticsSnapshot } from './core/scanner/scan-diagnostics';
import {
    formatRelativeTimeLocalized,
    formatScanStatusLabelLocalized,
} from './i18n/formatters';
import {
    applyBrowsingMode,
    BUILTIN_BROWSING_MODES,
    loadActiveBrowsingModeId,
    type BrowsingModeId,
} from './core/modes/browsing-modes';
import type { PageScanStats, PeriodScanStats } from './core/storage/scan-stats-store';
import { loadUserRules, saveUserRules, isHostnameAllowlisted } from './core/rules/user-rules-store';
import { markSettingsCustomized } from './core/modes/browsing-modes';
import type { SettingsTabId } from './dashboard/settings-tabs';
import { detectPageContexts } from './core/adaptation/page-context';
import { hostnameFromTabUrl, resolvePopupPageStatus } from './popup/page-status';
import { useLocale } from './i18n/LocaleContext';
import ThemeToggle from './dashboard/ThemeToggle';
import RecentBlockedPanel from './dashboard/RecentBlockedPanel';
import { revealBlockedUnitOnActiveTab } from './popup/reveal-on-tab';

type RuntimeStatus = {
  readonly state: string;
  readonly lastError: string | null;
  readonly activeDetectorId: string | null;
};

type PageStatsRecord = {
  readonly pageKey?: string;
  readonly discovered?: number;
  readonly scanned?: number;
  readonly filtered?: number;
};

type RollupRecord = {
  readonly days?: Record<string, { readonly scanned: number; readonly filtered: number }>;
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readRollupTotals(days: RollupRecord['days']): { readonly today: PeriodScanStats; readonly last7Days: PeriodScanStats } {
  const map = days ?? {};
  const today = map[todayKey()] ?? { scanned: 0, filtered: 0 };
  let last7Scanned = 0;
  let last7Filtered = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - offset);
    const key = day.toISOString().slice(0, 10);
    const bucket = map[key];
    if (!bucket) continue;
    last7Scanned += bucket.scanned;
    last7Filtered += bucket.filtered;
  }
  return { today, last7Days: { scanned: last7Scanned, filtered: last7Filtered } };
}

function discoveryModeLabel(
    mode: ScanDiagnosticsSnapshot['discoveryMode'],
    t: (key: string) => string
): string {
  if (mode === 'universal') return t('popup.discoveryUniversal');
  if (mode === 'none') return t('popup.discoveryInactive');
  return t('popup.discoveryUniversal');
}

function statusClassName(status: ScanDiagnosticsSnapshot['status']): string {
  switch (status) {
    case 'scanning':
      return 'is-scanning';
    case 'plateau':
      return 'is-plateau';
    case 'idle':
      return 'is-idle';
    case 'disabled':
      return 'is-disabled';
  }
}

function PopupApp() {
  const { t } = useLocale();
  const [enabled, setEnabled] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [pageStats, setPageStats] = useState<PageScanStats>({ pageKey: '', discovered: 0, scanned: 0, filtered: 0 });
  const [rollup, setRollup] = useState<{ readonly today: PeriodScanStats; readonly last7Days: PeriodScanStats }>({
    today: { scanned: 0, filtered: 0 },
    last7Days: { scanned: 0, filtered: 0 },
  });
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({
    state: 'unknown',
    lastError: null,
    activeDetectorId: null,
  });
  const [diagnostics, setDiagnostics] = useState<ScanDiagnosticsSnapshot | null>(null);
  const [diagnosticsAvailable, setDiagnosticsAvailable] = useState(true);
  const [activeModeId, setActiveModeId] = useState<BrowsingModeId | null>(null);
  const [modeSaving, setModeSaving] = useState(false);
  const [pageHostname, setPageHostname] = useState<string | null>(null);
  const [allowDomains, setAllowDomains] = useState<readonly string[]>([]);
  const [pauseSaving, setPauseSaving] = useState(false);
  const [pauseNotice, setPauseNotice] = useState<string | null>(null);

  const refreshTabContext = useCallback((): void => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setPageHostname(hostnameFromTabUrl(tabs[0]?.url));
    });
  }, []);

  const refreshStats = useCallback((): void => {
    chrome.storage.local.get(['scanStatsPage', 'scanStatsRollup'], (localResult) => {
      const page = (localResult as { scanStatsPage?: PageStatsRecord }).scanStatsPage;
      if (page?.pageKey) {
        setPageStats({
          pageKey: page.pageKey,
          discovered: page.discovered ?? 0,
          scanned: page.scanned ?? 0,
          filtered: page.filtered ?? 0,
        });
      }
      setRollup(readRollupTotals((localResult as { scanStatsRollup?: RollupRecord }).scanStatsRollup?.days));
    });
  }, []);

  const refreshDiagnostics = useCallback((): void => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        setDiagnosticsAvailable(false);
        setDiagnostics(null);
        return;
      }

      chrome.tabs.sendMessage(tabId, { type: 'getScanDiagnostics' }, (response) => {
        if (chrome.runtime.lastError || !response) {
          setDiagnosticsAvailable(false);
          setDiagnostics(null);
          return;
        }
        setDiagnosticsAvailable(true);
        setDiagnostics(response as ScanDiagnosticsSnapshot);
      });
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.get(['enabled', 'onboardingComplete'], (res: unknown) => {
      const record = res as { readonly enabled?: boolean; readonly onboardingComplete?: boolean };
      setEnabled(record.enabled ?? true);
      setNeedsSetup(!record.onboardingComplete);
    });
    void loadActiveBrowsingModeId().then(setActiveModeId);
    void loadUserRules().then((rules) => { setAllowDomains(rules.allowDomains); });
    refreshStats();
    refreshDiagnostics();
    refreshTabContext();

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, areaName: string): void => {
      if (areaName === 'local' && (changes.scanStatsRollup || changes.scanStatsPage || changes.stats)) {
        if (changes.scanStatsRollup) {
          const record = changes.scanStatsRollup.newValue as RollupRecord | undefined;
          setRollup(readRollupTotals(record?.days));
        }
        if (changes.scanStatsPage || changes.stats) {
          const page = (changes.scanStatsPage?.newValue ?? changes.stats?.newValue) as PageStatsRecord | undefined;
          if (page && 'discovered' in page) {
            setPageStats({
              pageKey: page.pageKey ?? '',
              discovered: page.discovered ?? 0,
              scanned: page.scanned ?? 0,
              filtered: page.filtered ?? 0,
            });
          } else if (changes.stats?.newValue) {
            const legacy = changes.stats.newValue as { scanned?: number; toxic?: number };
            setPageStats((current) => ({
              ...current,
              scanned: legacy.scanned ?? current.scanned,
              filtered: legacy.toxic ?? current.filtered,
            }));
          }
        }
      }
      if (changes.enabled) {
        setEnabled(Boolean(changes.enabled.newValue));
      }
      if (changes.activeBrowsingModeId) {
        const next = changes.activeBrowsingModeId.newValue;
        setActiveModeId(typeof next === 'string' ? (next as BrowsingModeId) : null);
      }
      if (changes.userRules) {
        const next = changes.userRules.newValue as { readonly allowDomains?: readonly string[] } | undefined;
        if (next?.allowDomains) {
          setAllowDomains(next.allowDomains);
        } else {
          void loadUserRules().then((rules) => { setAllowDomains(rules.allowDomains); });
        }
      }
    };

    chrome.storage.onChanged.addListener(onChanged);

    const pollStatus = (): void => {
      const request: CoreIpcMessage = { type: 'runtimeStatus' };
      chrome.runtime.sendMessage(request, (response: CoreIpcMessage | undefined) => {
        if (chrome.runtime.lastError || !response) return;
        if (response.type === 'runtimeStatusResult') {
          setRuntimeStatus({
            state: response.state,
            lastError: response.lastError,
            activeDetectorId: response.activeDetectorId,
          });
        }
      });
    };

    pollStatus();
    const statusInterval = window.setInterval(pollStatus, 2000);
    const statsInterval = window.setInterval(refreshStats, 1500);
    const diagnosticsInterval = window.setInterval(refreshDiagnostics, 1500);
    const tabInterval = window.setInterval(refreshTabContext, 1500);
    return () => {
      chrome.storage.onChanged.removeListener(onChanged);
      window.clearInterval(statusInterval);
      window.clearInterval(statsInterval);
      window.clearInterval(diagnosticsInterval);
      window.clearInterval(tabInterval);
    };
  }, [refreshStats, refreshDiagnostics, refreshTabContext]);

  const selectMode = (modeId: BrowsingModeId): void => {
    setModeSaving(true);
    void applyBrowsingMode(modeId).finally(() => {
      setActiveModeId(modeId);
      setModeSaving(false);
    });
  };

  const toggle = (): void => {
    const next = !enabled;
    setEnabled(next);
    chrome.storage.local.set({ enabled: next });
  };

  const openDashboard = (options?: { readonly wizard?: boolean; readonly tab?: SettingsTabId }): void => {
    if (options?.wizard) {
      window.open(chrome.runtime.getURL('options.html?wizard=1'), '_blank');
      return;
    }
    const hash = options?.tab ? `#${options.tab}` : '';
    if (chrome.runtime.openOptionsPage && !hash) {
      void chrome.runtime.openOptionsPage();
      return;
    }
    chrome.tabs.create({ url: chrome.runtime.getURL(`options.html${hash}`) });
  };

  const pauseThisSite = (): void => {
    if (!pageHostname || pauseSaving) return;
    setPauseSaving(true);
    setPauseNotice(null);
    void loadUserRules()
      .then(async (rules) => {
        if (isHostnameAllowlisted(pageHostname, rules.allowDomains)) {
          return;
        }
        const nextDomains = [...rules.allowDomains, pageHostname];
        await saveUserRules({ ...rules, allowDomains: nextDomains });
        await markSettingsCustomized();
        setAllowDomains(nextDomains);
        setPauseNotice(t('popup.pauseThisSiteDone', { host: pageHostname }));
        window.setTimeout(() => { setPauseNotice(null); }, 2000);
      })
      .finally(() => {
        setPauseSaving(false);
      });
  };

  const pageStatusKind = resolvePopupPageStatus({
    enabled,
    hostname: pageHostname,
    allowDomains,
    pageStats,
  });

  const pageStatusMessage = ((): string => {
    switch (pageStatusKind) {
      case 'unsupported':
        return t('popup.pageStatus.unsupported');
      case 'focusOff':
        return t('popup.pageStatus.focusOff');
      case 'whitelisted':
        return t('popup.pageStatus.whitelisted', { host: pageHostname ?? '' });
      case 'scanning':
        return t('popup.pageStatus.scanning');
      case 'filtered':
        return t('popup.pageStatus.filtered', { count: pageStats.filtered });
      case 'noMatches':
        return t('popup.pageStatus.noMatches');
      case 'idle':
        return t('popup.pageStatus.idle');
    }
  })();

  const showPageStats = pageStatusKind !== 'unsupported'
    && pageStatusKind !== 'whitelisted'
    && pageStatusKind !== 'focusOff';

  const canPauseThisSite = pageHostname !== null
    && !isHostnameAllowlisted(pageHostname, allowDomains);

  const isNewsSite = pageHostname !== null
    && detectPageContexts(`https://${pageHostname}/`).includes('news');

  const nowMs = Date.now();
  const hintLabel = diagnostics?.activeHintPacks.length
    ? diagnostics.activeHintPacks.join(', ')
    : t('common.none');

  return (
    <div className="container">
      <h1>{t('common.appName')}</h1>
      {needsSetup ? (
        <div className="card policy-card">
          <p className="muted" style={{ marginTop: 0 }}>{t('popup.setupPrompt')}</p>
          <button
            className="preset-btn active"
            style={{ width: '100%', textAlign: 'center' }}
            onClick={() => { openDashboard({ wizard: true }); }}
          >
            {t('popup.startWizard')}
          </button>
        </div>
      ) : null}
      <div className="card">
        <label className="switch">
          <input type="checkbox" checked={enabled} onChange={toggle} />
          <span className="slider round"></span>
        </label>
        <p>{enabled ? t('popup.focusEnabled') : t('popup.focusDisabled')}</p>
      </div>

      {!needsSetup ? (
        <div className={`card policy-card sl-popup-page-status sl-popup-page-status--${pageStatusKind}`}>
          <p className="sl-popup-page-status-heading">{t('popup.thisPage')}</p>
          <p className="sl-popup-page-status-message">{pageStatusMessage}</p>
          {showPageStats ? (
            <div className="stats sl-popup-page-stats">
              <div className="stat-item">
                <span className="value">{pageStats.scanned}</span>
                <span className="label">{t('popup.scanned')}</span>
              </div>
              <div className="stat-item">
                <span className="value">{pageStats.filtered}</span>
                <span className="label">{t('popup.filtered')}</span>
              </div>
            </div>
          ) : null}
          {pageStatusKind === 'scanning' && pageStats.discovered > pageStats.scanned ? (
            <p className="muted sl-popup-page-status-hint">
              {t('popup.scanningProgress', { discovered: pageStats.discovered })}
            </p>
          ) : null}
          {pageStatusKind === 'noMatches' && isNewsSite ? (
            <p className="muted sl-popup-page-status-hint">
              {t('popup.pageStatus.newsNoMatchesHint')}
            </p>
          ) : null}
          {canPauseThisSite ? (
            <button
              type="button"
              className="preset-btn sl-popup-pause-site"
              disabled={pauseSaving}
              onClick={pauseThisSite}
            >
              {pauseSaving ? t('popup.pauseThisSiteSaving') : t('popup.pauseThisSite')}
            </button>
          ) : null}
          {pageStatusKind === 'whitelisted' ? (
            <button
              type="button"
              className="sl-btn-text sl-popup-manage-whitelist"
              onClick={() => { openDashboard({ tab: 'rules' }); }}
            >
              {t('popup.manageWhitelist')}
            </button>
          ) : null}
          {pauseNotice ? (
            <p className="sl-popup-pause-notice">{pauseNotice}</p>
          ) : null}
          {pageStatusKind === 'filtered' && pageStats.pageKey ? (
            <RecentBlockedPanel
              limit={6}
              compact
              bare
              pageKey={pageStats.pageKey}
              showFeedback
              heading={t('popup.blockedOnThisPage')}
              onReveal={(item) => {
                void revealBlockedUnitOnActiveTab(item.id);
              }}
            />
          ) : null}
        </div>
      ) : null}

      {!needsSetup ? (
        <div className="card policy-card">
          <p className="muted" style={{ margin: '0 0 0.5rem', fontSize: '0.75rem' }}>{t('popup.browsingMode')}</p>
          <div className="preset-buttons browsing-mode-buttons">
            {BUILTIN_BROWSING_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`preset-btn ${activeModeId === mode.id ? 'active' : ''}`}
                disabled={modeSaving}
                onClick={() => { selectMode(mode.id); }}
              >
                {t(`browsingModes.${mode.id}.label`)}
              </button>
            ))}
          </div>
          {activeModeId === null ? (
            <p className="muted" style={{ fontSize: '0.7rem', margin: '0.35rem 0 0' }}>{t('popup.customSetup')}</p>
          ) : null}
        </div>
      ) : null}

      <details className="diagnostics-details card" style={{ padding: '12px 16px' }}>
        <summary>{t('popup.diagnosticsSummary')}</summary>
        {!diagnosticsAvailable || !diagnostics ? (
          <p className="diagnostics-unavailable">
            {t('popup.diagnosticsUnavailable')}
          </p>
        ) : (
          <div className="diagnostics-panel">
            <span className={`diagnostics-status ${statusClassName(diagnostics.status)}`}>
              {formatScanStatusLabelLocalized(diagnostics.status, t)}
            </span>
            <div className="stat-row">
              <span className="label">{t('popup.discovery')}</span>
              <span className="value">{discoveryModeLabel(diagnostics.discoveryMode, t)}</span>
            </div>
            <div className="stat-row">
              <span className="label">{t('popup.hintPacks')}</span>
              <span className="value">{hintLabel}</span>
            </div>
            <div className="stat-row">
              <span className="label">{t('popup.discovered')}</span>
              <span className="value">{pageStats.discovered || diagnostics.coordinator?.sessionFingerprints || 0}</span>
            </div>
            <div className="stat-row">
              <span className="label">{t('popup.queue')}</span>
              <span className="value">
                {t('popup.queuePendingDone', { pending: diagnostics.queue.pending, done: diagnostics.queue.done })}
              </span>
            </div>
            <div className="stat-row">
              <span className="label">{t('popup.fingerprints')}</span>
              <span className="value">{diagnostics.coordinator?.sessionFingerprints ?? '—'}</span>
            </div>
            <div className="stat-row">
              <span className="label">{t('popup.domSnapshot')}</span>
              <span className="value">
                {diagnostics.coordinator?.snapshotUnits != null
                  ? t('popup.domSnapshotUnits', { count: diagnostics.coordinator.snapshotUnits })
                  : '—'}
              </span>
            </div>
            <div className="stat-row">
              <span className="label">{t('popup.lastRescan')}</span>
              <span className="value">
                {formatRelativeTimeLocalized(diagnostics.coordinator?.lastScanAtMs ?? null, nowMs, t)}
              </span>
            </div>
            <div className="stat-row">
              <span className="label">{t('popup.scanCycles')}</span>
              <span className="value">{diagnostics.coordinator?.scanCycles ?? '—'}</span>
            </div>
            {diagnostics.coordinator && (diagnostics.coordinator.lastAdded > 0 || diagnostics.coordinator.lastUpdated > 0) ? (
              <div className="stat-row">
                <span className="label">{t('popup.lastDiff')}</span>
                <span className="value">
                  {t('popup.lastDiffValues', {
                    added: diagnostics.coordinator.lastAdded,
                    updated: diagnostics.coordinator.lastUpdated,
                  })}
                </span>
              </div>
            ) : null}
            {diagnostics.performance.firstClassificationMs !== null ? (
              <div className="stat-row">
                <span className="label">{t('popup.firstClassify')}</span>
                <span className="value">
                  {t('popup.firstClassifyMs', { ms: Math.round(diagnostics.performance.firstClassificationMs) })}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </details>

      <div className="stats" style={{ marginTop: '0.35rem' }}>
        <div className="stat-item">
          <span className="value" style={{ fontSize: '1.1rem' }}>{rollup.today.scanned}</span>
          <span className="label">{t('popup.today')}</span>
        </div>
        <div className="stat-item">
          <span className="value" style={{ fontSize: '1.1rem' }}>{rollup.last7Days.scanned}</span>
          <span className="label">{t('popup.last7Days')}</span>
        </div>
      </div>

      <div className="card">
        <div className="stat-row">
          <span className="label">{t('popup.runtime')}</span>
          <span className="value">{runtimeStatus.state}</span>
        </div>
        <div className="stat-row">
          <span className="label">{t('popup.scanner')}</span>
          <span className="value">{t('popup.scannerUniversal')}</span>
        </div>
        <div className="stat-row">
          <span className="label">{t('popup.classifier')}</span>
          <span className="value">{runtimeStatus.activeDetectorId ?? 'heuristic-keywords'}</span>
        </div>
        {runtimeStatus.lastError ? (
          <div className="stat-row">
            <span className="label">{t('popup.lastError')}</span>
            <span className="value">{runtimeStatus.lastError}</span>
          </div>
        ) : null}
      </div>

      <button className="preset-btn" style={{ width: '100%', textAlign: 'center' }} onClick={() => { openDashboard(); }}>
        {t('popup.openDashboard')}
      </button>
      <div className="sl-popup-theme-section">
        <span className="sl-popup-theme-label">{t('theme.heading')}</span>
        <ThemeToggle popup />
      </div>
    </div>
  );
}

export default PopupApp;
