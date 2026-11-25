/**
 * Parse vite-plugin-pwa precacheAndRoute entries from dist/sw.js.
 * @param {string} swSource
 * @returns {{ url: string, revision: string | null }[]}
 */
export function parsePrecacheEntries(swSource) {
  const start = swSource.indexOf('precacheAndRoute([');
  if (start === -1) return [];
  const slice = swSource.slice(start);
  const entries = [];
  const re = /\{url:"([^"]+)",revision:(null|"[^"]+")\}/g;
  let m;
  while ((m = re.exec(slice)) !== null) {
    entries.push({
      url: m[1],
      revision: m[2] === 'null' ? null : m[2].slice(1, -1),
    });
  }
  return entries;
}

/** @returns {{ url: string, count: number, revisions: (string|null)[] }[]} */
export function findDuplicatePrecacheUrls(swSource) {
  const entries = parsePrecacheEntries(swSource);
  const byUrl = new Map();
  for (const { url, revision } of entries) {
    const row = byUrl.get(url) ?? { count: 0, revisions: [] };
    row.count += 1;
    row.revisions.push(revision);
    byUrl.set(url, row);
  }
  return [...byUrl.entries()]
    .filter(([, v]) => v.count > 1)
    .map(([url, v]) => ({ url, count: v.count, revisions: v.revisions }));
}