import { describe, expect, test } from 'bun:test';
import { captures } from '../src/fixtures';
import { exportCapture, header, hopBadge, hopDescription, hopLabel, summarize, tone } from '../src/model';

describe('capture presentation', () => {
  test('counts redirects separately from the final response and totals measured requests', () => {
    expect(summarize(captures[0])).toMatchObject({ redirects: 2, totalMs: 428, hasError: false });
  });
  test('does not count a failed request as a redirect or invent a duration', () => {
    const capture = captures.find(c => c.id === 'network')!;
    expect(summarize(capture)).toMatchObject({ redirects: 0, totalMs: null, hasError: true });
    expect(tone(capture.hops[0])).toBe('error');
  });
  test('a 404 final response is an error', () => {
    const capture = captures.find(c => c.id === 'error')!;
    expect(summarize(capture).hasError).toBe(true);
    expect(tone(capture.hops.at(-1)!)).toBe('error');
  });
  test('an empty capture has no measured time or final response', () => {
    expect(summarize(captures.find(c => c.id === 'empty')!)).toMatchObject({ redirects: 0, totalMs: null, last: undefined });
  });
  test('retains browser and inferred client redirect distinctions', () => {
    const capture = captures.find(c => c.id === 'client')!;
    expect(summarize(capture).redirects).toBe(3);
    expect(hopLabel(capture.hops[0])).toBe('Browser HTTPS upgrade');
    expect(hopLabel(capture.hops[1])).toContain('inferred');
    expect(header(capture.hops[0], 'Location')).toBe('https://example.com/account');
  });
  test('badges identify the redirect mechanism while descriptions retain HTTP evidence', () => {
    const client = captures.find(c => c.id === 'client')!;
    expect(client.hops.map(hopBadge)).toEqual(['HSTS', 'JS', 'META', '200']);
    expect(captures[0].hops.map(hopBadge)).toEqual(['301', '302', '200']);
    expect(hopDescription(client.hops[1])).toBe('JavaScript redirect · inferred · HTTP 200');
    expect(hopDescription(client.hops[2])).toBe('Meta refresh · 0s delay · HTTP 200');
    expect(hopBadge(captures.find(c => c.id === 'network')!.hops[0])).toBe('ERR');
    expect(hopBadge(captures.find(c => c.id === 'error')!.hops.at(-1)!)).toBe('404');
    expect(hopBadge({ ...client.hops[3], status: null })).toBe('N/A');
    const refresh={...client.hops[2],kind:'refresh' as const,refreshDelaySeconds:1};
    expect(hopBadge(refresh)).toBe('REF');
    expect(hopDescription(refresh)).toBe('HTTP Refresh · 1s delay · HTTP 200');
  });
  test('exports structured evidence with an explicit sample marker', () => {
    const exported = JSON.parse(exportCapture(captures[0]));
    expect(exported.schemaVersion).toBe(1);
    expect(exported.sample).toBe(true);
    expect(exported.hops).toEqual(captures[0].hops);
  });
});
