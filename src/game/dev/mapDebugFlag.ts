const QUERY_KEY = 'collision-debug';

export function isMapCollisionDebugEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search);
  return q.get(QUERY_KEY) === '1' || q.get(QUERY_KEY) === 'true';
}

export function mapDebugEntryHint(): string {
  return 'Bật lớp va chạm DEV: thêm ?collision-debug=1 vào URL hoặc nhấn phím C trong game.';
}