import type { Capture, Header } from './model';
const headers = (values: Record<string, string>): Header[] => Object.entries(values).map(([name, value]) => ({ name, value }));
const finalHeaders = headers({
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'public, max-age=3600',
  server: 'cloudflare',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'content-encoding': 'br',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
});
export const captures: Capture[] = [
  {
    id: 'redirects', label: 'HTTP redirects', complete: true,
    hops: [
      { url: 'http://example.com/docs', status: 301, kind: 'http', durationMs: 42, ip: '192.0.2.10', headers: headers({ location: 'https://example.com/docs', server: 'nginx', 'cache-control': 'max-age=86400' }) },
      { url: 'https://example.com/docs', status: 302, kind: 'http', durationMs: 86, ip: '192.0.2.10', headers: headers({ location: 'https://example.com/docs/getting-started', server: 'nginx', 'cache-control': 'no-store' }) },
      { url: 'https://example.com/docs/getting-started', status: 200, kind: 'final', durationMs: 300, ip: '192.0.2.20', headers: finalHeaders },
    ],
  },
  { id: 'direct', label: 'Direct response', complete: true, hops: [
    { url: 'https://example.com/', status: 200, kind: 'final', durationMs: 124, ip: '192.0.2.20', fromCache: true, headers: finalHeaders },
  ] },
  { id: 'client', label: 'HSTS + client redirects', complete: true, hops: [
    { url: 'http://example.com/account', status: 307, kind: 'hsts', durationMs: 0, ip: null, headers: headers({ location: 'https://example.com/account', 'non-authoritative-reason': 'HSTS' }) },
    { url: 'https://example.com/account', status: 200, kind: 'javascript', durationMs: 116, ip: '192.0.2.10', headers: headers({ 'content-type': 'text/html', server: 'nginx' }) },
    { url: 'https://example.com/login', status: 200, kind: 'meta', durationMs: 42, ip: '192.0.2.10', headers: headers({ 'content-type': 'text/html', server: 'nginx' }) },
    { url: 'https://example.com/sign-in', status: 200, kind: 'final', durationMs: 148, ip: '192.0.2.20', headers: finalHeaders },
  ] },
  { id: 'error', label: 'HTTP error', complete: true, hops: [
    { url: 'https://example.com/old-page', status: 301, kind: 'http', durationMs: 32, ip: '192.0.2.10', headers: headers({ location: 'https://example.com/missing' }) },
    { url: 'https://example.com/missing', status: 404, kind: 'final', durationMs: 84, ip: '192.0.2.20', headers: headers({ 'content-type': 'text/html', server: 'nginx' }) },
  ] },
  { id: 'network', label: 'Network error', complete: true, hops: [
    { url: 'https://unreachable.example.com/', status: null, kind: 'error', durationMs: null, ip: null, error: 'net::ERR_NAME_NOT_RESOLVED', headers: [] },
  ] },
  { id: 'long', label: 'Long URL + headers', complete: true, hops: [
    { url: 'https://example.com/documentation/a-very-long-path/with-many-segments/redirect-debugging?campaign=autumn&return_to=%2Faccount%2Fsettings&reference=abcdefghijklmnopqrstuvwxyz0123456789', status: 200, kind: 'final', durationMs: 90, ip: '2001:db8:1234:5678:abcd:ef01:2345:6789', headers: [...finalHeaders, ...Array.from({length: 30}, (_, i) => ({ name: `x-debug-${i + 1}`, value: `audit-${i}-${'response-detail-'.repeat(6)}` }))] },
  ] },
  { id: 'empty', label: 'No capture yet', complete: false, hops: [] },
].map(capture => ({ ...capture, sample: true })) as Capture[];
