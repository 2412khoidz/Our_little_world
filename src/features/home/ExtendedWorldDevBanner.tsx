import {
  EXTENDED_WORLD_DEV_DATA_MARKER,
  isExtendedWorldDevEnabled,
  setExtendedWorldDevPersistent,
} from '../../shared/worldIntegration/extendedWorldDevFlag';
import { CollapsibleDevBanner } from './CollapsibleDevBanner';

export function ExtendedWorldDevBanner() {
  if (!import.meta.env.DEV || !isExtendedWorldDevEnabled()) return null;
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search);
    if (q.get('extended-world') !== '1' && q.get('collision-debug') !== '1') {
      return null;
    }
  }

  return (
    <CollapsibleDevBanner
      testId={EXTENDED_WORLD_DEV_DATA_MARKER}
      dataMarker={EXTENDED_WORLD_DEV_DATA_MARKER}
      summary="Thế giới mở rộng · DEV"
      className="olw-dev-banner--extended-world"
    >
      <div style={{ fontSize: 12, lineHeight: 1.45, textAlign: 'left' }}>
        Từ vườn đi cổng phía Nam (9,13), hoặc nút <em>Ngoài trời</em>. URL: <code>?extended-world=1</code> ·{' '}
        <code>?collision-debug=1</code> / <strong>C</strong>
        <div style={{ marginTop: 6 }}>
          <button
            type="button"
            onClick={() => {
              setExtendedWorldDevPersistent(false);
              const url = new URL(window.location.href);
              url.searchParams.delete('extended-world');
              window.location.href = url.pathname + url.search;
            }}
            style={{
              background: '#3f5a48',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            Thoát xem trước
          </button>
        </div>
      </div>
    </CollapsibleDevBanner>
  );
}