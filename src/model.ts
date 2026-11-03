import { refreshTarget } from './refresh';

export type Header = { name: string; value: string };
export type Hop = {
  url: string;
  status: number | null;
  kind: 'http' | 'hsts' | 'javascript' | 'meta' | 'refresh' | 'form' | 'final' | 'error';
  durationMs: number | null;
  ip: string | null;
  fromCache?: boolean;
  headers: Header[];
  error?: string;
  requestId?: string;
  documentId?: string;
  startedAt?: number;
  method?: string;
  redirectUrl?: string;
  headersTruncated?: boolean;
  note?: string;
  metaDelaySeconds?: number;
  refreshDelaySeconds?: number;
};
export type Capture = { id: string; label: string; hops: Hop[]; complete: boolean; sample?: boolean; startedAt?: number; truncated?: boolean };

export function header(hop: Hop, name: string): string | null {
  return hop.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;
}

export function hopLabel(hop: Hop): string {
  if (hop.note) return hop.note;
  if (hop.kind === 'hsts') return 'Browser HTTPS upgrade';
  if (hop.kind === 'javascript') return 'JavaScript redirect · inferred';
  if (hop.kind === 'form') return 'Form submission';
  if (hop.kind === 'meta') return hop.metaDelaySeconds === undefined ? 'Meta refresh' : `Meta refresh · ${hop.metaDelaySeconds}s delay`;
  if (hop.kind === 'refresh') return hop.refreshDelaySeconds === undefined ? 'HTTP Refresh' : `HTTP Refresh · ${hop.refreshDelaySeconds}s delay`;
  if (hop.kind === 'error') return hop.error ?? 'Network error';
  if (hop.status !== null && hop.status >= 400) return 'HTTP error';
  if (hop.kind === 'final') return 'Final response';
  return hop.status === 301 || hop.status === 308 ? 'Permanent redirect' : 'Temporary redirect';
}

export function hopBadge(hop: Hop): string {
  if (hop.kind === 'javascript') return 'JS';
  if (hop.kind === 'form') return 'FORM';
  if (hop.kind === 'meta') return 'META';
  if (hop.kind === 'refresh') return 'REF';
  if (hop.kind === 'hsts') return 'HSTS';
  return String(hop.status ?? (hop.kind === 'error' ? 'ERR' : 'N/A'));
}

export function hopDescription(hop: Hop): string {
  return `${hopLabel(hop)} · ${hop.status === null ? 'No HTTP response' : `HTTP ${hop.status}`}`;
}

export function tone(hop: Hop): 'success' | 'warning' | 'info' | 'error' {
  if (hop.kind === 'error' || (hop.status !== null && hop.status >= 400)) return 'error';
  if (hop.kind === 'final') return hop.status === null ? 'info' : 'success';
  if (hop.status === 302 || hop.status === 307 || hop.kind === 'javascript' || hop.kind === 'meta' || hop.kind === 'refresh' || hop.kind === 'form') return 'warning';
  return 'info';
}

export function summarize(capture: Capture) {
  const last = capture.hops.at(-1);
  const durations = capture.hops.map(h => h.durationMs);
  return {
    last,
    redirects: capture.hops.filter(h => !['final', 'error'].includes(h.kind)).length,
    totalMs: durations.length > 0 && durations.every(n => n !== null) ? durations.reduce<number>((a, b) => a + (b ?? 0), 0) : null,
    hasError: capture.hops.some(h => h.kind === 'error' || (h.status !== null && h.status >= 400)),
  };
}

export function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.username) url.username = 'REDACTED';
    if (url.password) url.password = 'REDACTED';
    const query = new URLSearchParams();
    for (const [key] of url.searchParams) query.append(key, 'REDACTED');
    url.search = query.toString();
    if (url.hash) url.hash = '#REDACTED';
    return url.href;
  } catch { return '[unavailable URL]'; }
}

export function exportCapture(capture: Capture, full = false): string {
  const data = structuredClone(capture);
  if (!full) {
    if (!capture.sample) data.label = redactUrl(data.label);
    for (const hop of data.hops) {
      hop.url = redactUrl(hop.url);
      if (hop.redirectUrl) hop.redirectUrl = redactUrl(hop.redirectUrl);
      hop.headers = hop.headers.map(h => {
        let value = h.value;
        if (/^(location|content-location)$/i.test(h.name)) {
          try { value = redactUrl(new URL(value, hop.url).href); } catch { value = '[invalid location]'; }
        } else if (/^refresh$/i.test(h.name)) {
          const target = refreshTarget(value, hop.url);
          value = target ? `${target.delay}; url=${redactUrl(target.url)}` : '[invalid refresh]';
        } else if (/cookie|auth|token|secret|session|api[-_]?key/i.test(h.name)) value = '[REDACTED]';
        return { name: h.name, value };
      });
    }
  }
  return JSON.stringify({ schemaVersion: 1, sample: capture.sample ?? false, redacted: !full, ...data }, null, 2);
}

export function copySummary(capture: Capture, full = false): string {
  return [capture.sample ? 'Sample capture' : `Redirect capture (${full ? 'full values' : 'query values redacted'})`, ...capture.hops.map((hop, i) => `${i + 1}. ${hop.status ?? 'N/A'} ${full ? hop.url : redactUrl(hop.url)}\n   ${hopLabel(hop)}`)].join('\n');
}
