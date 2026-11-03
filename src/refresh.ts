/** Resolve a declared meta/HTTP Refresh target without executing or fetching it. */
export function refreshTarget(value: string, base: string): { url: string; delay: number } | undefined {
  const match = value.match(/^\s*(\d+(?:\.\d+)?)\s*(?:[;,]\s*(?:url\s*=\s*)?(.*?)\s*)?$/i);
  if (!match) return;
  const delay = Number(match[1]);
  if (!Number.isFinite(delay)) return;
  let target = match[2]?.trim() ?? '';
  if ((target.startsWith('"') && target.endsWith('"')) || (target.startsWith("'") && target.endsWith("'"))) target = target.slice(1, -1);
  try {
    const url = new URL(target, base);
    if (/^https?:$/.test(url.protocol)) return { url: url.href, delay };
  } catch {}
}
