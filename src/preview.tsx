import { useEffect, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Button as BaseButton } from '@base-ui/react/button';
import { Tabs } from '@base-ui/react/tabs';
import { ArrowDown, ArrowDownToLine, Check, ChevronRight, Clipboard, FileSearch, Globe2, Moon, Search, ShieldCheck, Sun, Pause, Play, Trash2 } from 'lucide-react';
import { captures } from './fixtures';
import { copySummary, exportCapture, header, hopBadge, hopDescription, hopLabel, summarize, tone, type Hop, type Capture } from './model';

function Button({ children, onClick, title, disabled, primary = false }: { children: ReactNode; onClick?: () => void; title?: string; disabled?: boolean; primary?: boolean }) {
  return <BaseButton className={`button ${primary ? 'tonal' : ''}`} onClick={onClick} title={title} aria-label={title} disabled={disabled}>{children}</BaseButton>;
}

function Badge({ hop, response = false }: { hop: Hop; response?: boolean }) {
  return <span className={`status-badge ${tone(hop)}`} title={hopDescription(hop)}>{response ? hop.status ?? (hop.kind === 'error' ? 'ERR' : 'N/A') : hopBadge(hop)}</span>;
}

function App({ live = false }: { live?: boolean }) {
  const [captureId, setCaptureId] = useState('redirects');
  const [liveCapture, setLiveCapture] = useState<Capture | null>(null);
  const capture = live ? liveCapture ?? { id: 'empty', label: '', hops: [], complete: false } : captures.find(c => c.id === captureId)!;
  const [selectedIndex, setSelectedIndex] = useState(2);
  const [selectedKey, setSelectedKey] = useState('');
  const [light, setLight] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fullExport, setFullExport] = useState(false);
  const [tabId, setTabId] = useState<number | null>(null);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  const [filter, setFilter] = useState('');
  const [feedback, setFeedback] = useState('');
  const [detailsTab, setDetailsTab] = useState('overview');
  const summary = summarize(capture);
  const matchedIndex = selectedKey ? capture.hops.findIndex(h => `${h.requestId}-${h.url}` === selectedKey) : -1;
  const actualIndex = live ? matchedIndex >= 0 ? matchedIndex : capture.hops.length - 1 : selectedIndex;
  const selected = capture.hops[actualIndex] ?? summary.last;
  const finalUrl = summary.last ? new URL(summary.last.url) : null;
  const filtered = selected?.headers.filter(h => `${h.name} ${h.value}`.toLowerCase().includes(filter.toLowerCase())) ?? [];

  useEffect(() => {
    if (!live) return;
    let disposed = false;
    let targetId: number | undefined;
    async function refresh() {
      try {
        if (targetId === undefined) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (!tab?.id) throw new Error('No active tab available.');
          targetId = tab.id;
          if (!disposed) { setTabId(tab.id); setSupported(/^https?:\/\//.test(tab.url ?? '')); }
        }
        const result = await chrome.runtime.sendMessage({ type: 'snapshot', tabId: targetId });
        if (result.error) throw new Error(result.error);
        if (!disposed) { setLiveCapture(result.capture); setPaused(result.paused); setError(result.storageError ? 'Capture storage is unavailable. Clear the capture or reload the extension.' : ''); setLoading(false); }
      } catch (err) { if (!disposed) { setError(String(err)); setLoading(false); } }
    }
    void chrome.storage.local.get('theme').then(value => { if (!disposed) setLight(value.theme === 'light'); });
    void refresh();
    const changed = () => { void refresh(); };
    chrome.storage.onChanged.addListener(changed);
    return () => { disposed = true; chrome.storage.onChanged.removeListener(changed); };
  }, [live]);

  async function control(type: 'clear' | 'pause') {
    try {
      const result = await chrome.runtime.sendMessage({ type, tabId, paused: !paused });
      if (result.error) throw new Error(result.error);
      setLiveCapture(result.capture); setPaused(result.paused); setSelectedKey('');
      setFeedback(type === 'clear' ? 'Capture cleared' : result.paused ? 'Recording paused' : 'Recording resumed for new navigations');
    } catch { setFeedback('Action failed. Reopen the popup and try again.'); }
  }

  function changeCapture(id: string) {
    setCaptureId(id);
    setSelectedIndex(captures.find(c => c.id === id)!.hops.length - 1);
    setFilter('');
    setFeedback('');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(copySummary(capture, fullExport));
      setFeedback('Chain copied');
    } catch {
      setFeedback('Clipboard unavailable. Use Export JSON to save the capture.');
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([exportCapture(capture, fullExport)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${live ? 'redirect' : 'sample'}-capture-${capture.id.replace(/[^\w-]/g, '')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback(`${fullExport ? 'Full' : 'Redacted'} capture exported`);
  }

  return <main className={`preview-root ${light ? 'light' : ''}`}>
    <section className="inspector" aria-label={live ? 'Redirect inspector' : 'Redirect inspector prototype'}>
      <header className="toolbar">
        <span className="tool-name"><ArrowDown size={16} /> Redirect inspector</span>
        <div className="toolbar-actions">
          {live && <><Button title={paused ? 'Resume recording' : 'Pause recording'} onClick={() => { void control('pause'); }}>{paused ? <Play size={15} /> : <Pause size={15} />}</Button><Button title="Clear capture" disabled={!selected} onClick={() => { void control('clear'); }}><Trash2 size={15} /></Button></>}
          <Button title={light ? 'Use dark theme' : 'Use light theme'} onClick={() => { setLight(!light); if (live) void chrome.storage.local.set({ theme: light ? 'dark' : 'light' }); }}>{light ? <Moon size={15} /> : <Sun size={15} />}</Button>
          <Button title="Export JSON" onClick={download} disabled={!selected}><ArrowDownToLine size={15} /></Button>
          <Button onClick={copy} disabled={!selected} primary><Clipboard size={14} /> Copy chain</Button>
        </div>
      </header>

      <div className="result">
        <div className="destination">
          <h1>{finalUrl?.hostname ?? (loading ? 'Loading capture' : 'Waiting for a page')}</h1>
          <div className="destination-path" title={summary.last?.url}>{finalUrl ? finalUrl.pathname + finalUrl.search : 'The next page load starts a capture.'}</div>
        </div>
        {summary.last && <div className="final-result"><Badge hop={summary.last} response /><span>{summary.hasError ? 'Failed' : 'Final response'}</span></div>}
      </div>

      {selected ? <>
        <div className="summary" aria-label="Capture summary">
          <div><span className="metric-value">{summary.redirects}</span><span>{summary.redirects === 1 ? 'redirect' : 'redirects'}</span></div>
          <div><span className="metric-value">{summary.totalMs === null ? 'Unavailable' : `${summary.totalMs} ms`}</span><span>request time</span></div>
          <span className={`outcome ${summary.hasError ? 'error-text' : ''}`}>{paused ? 'Recording paused' : summary.hasError ? <><FileSearch size={14} /> Response failed</> : capture.complete ? <><Check size={14} /> Capture complete</> : 'Recording…'}</span>
        </div>

        <div className="evidence">
          <section className="chain-section" aria-labelledby="chain-heading">
            <div className="section-heading"><h2 id="chain-heading">Redirect chain</h2><span>Select a step to inspect</span></div>
            <div className="chain" role="group" aria-label="Redirect steps">
              {capture.hops.map((hop, index) => <button key={`${index}-${hop.url}`} type="button" className={`hop ${index === actualIndex ? 'selected' : ''}`} aria-pressed={index === actualIndex} aria-label={`Step ${index + 1}: ${hopDescription(hop)} ${hop.url}`} onClick={() => { setSelectedIndex(index); setSelectedKey(`${hop.requestId}-${hop.url}`); setFilter(''); }}>
                <span className="step-number">{index + 1}</span>
                <Badge hop={hop} />
                <span className="hop-content"><span className="hop-url" title={hop.url}>{hop.url}</span></span>
                <span className="hop-time">{hop.durationMs === null ? 'N/A' : `${hop.durationMs} ms`}</span>
                <ChevronRight size={14} className="row-chevron" />
              </button>)}
            </div>
          </section>

          <section className="details" aria-label="Selected response">
            <Tabs.Root value={detailsTab} onValueChange={value => setDetailsTab(String(value))}>
              <div className="details-toolbar">
                <span className="response-label">Step {actualIndex + 1} <span className="muted">/ {selected.status === null ? 'No HTTP response' : `HTTP ${selected.status}`}</span><span className="response-kind">{hopLabel(selected)}</span></span>
                <Tabs.List className="tabs" aria-label="Response details">
                  <Tabs.Tab className="tab" value="overview">Overview</Tabs.Tab>
                  <Tabs.Tab className="tab" value="headers">Headers <span>{selected.headers.length}</span></Tabs.Tab>
                </Tabs.List>
              </div>
              <Tabs.Panel value="overview" className="detail-panel">
                <dl className="properties">
                  <div><dt>Server IP</dt><dd>{selected.ip ?? 'Not available'}</dd></div>
                  <div><dt>Server</dt><dd>{header(selected, 'server') ?? 'Not reported'}</dd></div>
                  <div><dt>Cache</dt><dd>{selected.fromCache ? 'Served from browser cache' : header(selected, 'cache-control') ?? 'Not reported'}</dd></div>
                  <div><dt>{header(selected, 'location') ? 'Location' : 'Content type'}</dt><dd>{header(selected, 'location') ?? header(selected, 'content-type') ?? 'Not reported'}</dd></div>
                </dl>
                {selected.kind === 'javascript' && <p className="detail-note">Inferred from browser navigation signals. Script source is not identified.</p>}
                {selected.kind === 'hsts' && <p className="detail-note">Chrome upgraded this URL locally. No server connection for this step.</p>}
                {selected.kind === 'error' && <p className="detail-note error-text">{selected.error}. No HTTP response received.</p>}
                {(selected.headersTruncated || capture.truncated) && <p className="detail-note">Capture limit reached. Some earlier steps or headers were omitted.</p>}
              </Tabs.Panel>
              <Tabs.Panel value="headers" className="detail-panel header-panel">
                <label className="header-search"><Search size={13} /><input aria-label="Filter response headers" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Filter headers" /></label>
                <dl className="properties headers-list">{filtered.map((item, index) => <div key={`${index}-${item.name}`}><dt>{item.name}</dt><dd>{item.value}</dd></div>)}</dl>
                {!filtered.length && <p className="detail-note">{selected.headers.length ? 'No matching headers.' : 'No response headers available.'}</p>}
              </Tabs.Panel>
            </Tabs.Root>
          </section>
        </div>
      </> : <div className="empty"><Globe2 size={26} /><h2>{paused ? 'Recording paused' : !supported ? 'Capture unavailable' : 'No capture yet'}</h2><p>{paused ? 'Resume recording, then reload the webpage.' : !supported ? 'Open a webpage to inspect its redirects. Browser settings pages cannot be captured.' : 'Reload a webpage to record its redirects and response headers.'}</p>{!live && <p className="muted">Browser settings pages cannot be captured.</p>}</div>}

      {live && <label className="export-option"><input type="checkbox" checked={fullExport} onChange={e => setFullExport(e.target.checked)} /> Include full values in copy and export <span>{fullExport ? 'May include private data' : 'Query values and sensitive headers redacted'}</span></label>}
      <footer className="capture-footer"><span><ShieldCheck size={13} /> Local capture</span><span className="feedback" role="status">{error || feedback || (live ? paused ? 'Paused' : 'Session only' : 'Sample data')}</span></footer>
    </section>
    {!live && <div className="demo-controls"><label htmlFor="sample">Design preview</label><select id="sample" value={captureId} onChange={event => changeCapture(event.target.value)}>{captures.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select><span>Interactive sample, no browser recording</span></div>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<App live={typeof chrome !== 'undefined' && !!chrome.runtime?.id} />);
