/// <reference types="chrome" />
import { useEffect, useState } from 'react';
import './App.css';
import type { CoreIpcMessage } from './core/ipc/messages';

type Stats = {
  readonly scanned: number;
  readonly toxic: number;
};

type RuntimeStatus = {
  readonly state: string;
  readonly lastError: string | null;
  readonly activeDetectorId: string | null;
};

function PopupApp() {
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState<Stats>({ scanned: 0, toxic: 0 });
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({
    state: 'unknown',
    lastError: null,
    activeDetectorId: null,
  });

  useEffect(() => {
    chrome.storage.local.get(['enabled', 'stats'], (res: unknown) => {
      const record = res as { readonly enabled?: boolean; readonly stats?: Stats };
      setEnabled(record.enabled ?? true);
      setStats(record.stats ?? { scanned: 0, toxic: 0 });
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.stats) {
        setStats(changes.stats.newValue as Stats);
      }
      if (changes.enabled) {
        setEnabled(Boolean(changes.enabled.newValue));
      }
    });

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
    const intervalId = window.setInterval(pollStatus, 2000);
    return () => window.clearInterval(intervalId);
  }, []);

  const toggle = (): void => {
    const next = !enabled;
    setEnabled(next);
    chrome.storage.local.set({ enabled: next });
  };

  const openDashboard = (): void => {
    if (chrome.runtime.openOptionsPage) {
      void chrome.runtime.openOptionsPage();
      return;
    }
    window.open(chrome.runtime.getURL('options.html'), '_blank');
  };

  return (
    <div className="container">
      <h1>SignalLens</h1>
      <div className="card">
        <label className="switch">
          <input type="checkbox" checked={enabled} onChange={toggle} />
          <span className="slider round"></span>
        </label>
        <p>{enabled ? 'Focus Mode Enabled' : 'Focus Mode Disabled'}</p>
      </div>

      <div className="stats">
        <div className="stat-item">
          <span className="value">{stats.scanned}</span>
          <span className="label">Scanned</span>
        </div>
        <div className="stat-item">
          <span className="value">{stats.toxic}</span>
          <span className="label">Filtered</span>
        </div>
      </div>

      <div className="card">
        <div className="stat-row">
          <span className="label">Runtime</span>
          <span className="value">{runtimeStatus.state}</span>
        </div>
        <div className="stat-row">
          <span className="label">Detector</span>
          <span className="value">{runtimeStatus.activeDetectorId ?? 'heuristic-keywords'}</span>
        </div>
        {runtimeStatus.lastError ? (
          <div className="stat-row">
            <span className="label">Last error</span>
            <span className="value">{runtimeStatus.lastError}</span>
          </div>
        ) : null}
      </div>

      <button className="preset-btn" style={{ width: '100%', textAlign: 'center' }} onClick={openDashboard}>
        Open Dashboard
      </button>
    </div>
  );
}

export default PopupApp;
