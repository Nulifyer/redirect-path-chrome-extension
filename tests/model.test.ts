import { describe, expect, test } from 'bun:test';
import { captures } from '../src/fixtures';
import { exportCapture, header, hopLabel, summarize, tone } from '../src/model';

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
  test('exports structured evidence with an explicit sample marker', () => {
    const exported = JSON.parse(exportCapture(captures[0]));
    expect(exported.schemaVersion).toBe(1);
    expect(exported.sample).toBe(true);
    expect(exported.hops).toEqual(captures[0].hops);
  });
});
