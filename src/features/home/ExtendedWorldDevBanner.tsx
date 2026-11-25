import {
  EXTENDED_WORLD_DEV_DATA_MARKER,
  isExtendedWorldDevEnabled,
  setExtendedWorldDevPersistent,
} from '../../shared/worldIntegration/extendedWorldDevFlag';

export function ExtendedWorldDevBanner() {
  if (!import.meta.env.DEV || !isExtendedWorldDevEnabled()) return null;

  return (
    <div
      data-testid={EXTENDED_WORLD_DEV_DATA_MARKER}
      data-dev-marker={EXTENDED_WORLD_DEV_DATA_MARKER}
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        top: 8,
        zIndex: 39,
        maxWidth: 'min(440px, calc(100vw - 24px))',
        padding: '8px 12px',
        borderRadius: 12,
        background: 'rgba(32, 48, 38, 0.92)',
        border: '1px solid #8fbf7a',
        color: '#f2fff0',
        fontSize: 12,
        lineHeight: 1.45,
        textAlign: 'center',
        pointerEvents: 'auto',
      }}
    >
      <strong>Thế giới mở rộng — bản xem trước DEV</strong>
      <div style={{ marginTop: 4, opacity: 0.92 }}>
        Từ vườn đi cổng phía Nam (9,13), hoặc nút <em>Ngoài trời</em>. URL: <code>?extended-world=1</code>
        {' '}
        · overlay va chạm: <code>?collision-debug=1</code> hoặc phím <strong>C</strong>
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
    </div>
  );
}