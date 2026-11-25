import {
  LIVING_PET_LOCAL_SIM_DATA_MARKER,
  isLivingPetLocalSimulationEnabled,
  setLivingPetLocalSimulationPersistent,
} from '../../shared/petLiving/mainGame/petLivingDevFlag';

export function LivingPetDevBanner() {
  if (!import.meta.env.DEV || !isLivingPetLocalSimulationEnabled()) return null;

  return (
    <div
      data-testid={LIVING_PET_LOCAL_SIM_DATA_MARKER}
      data-dev-marker={LIVING_PET_LOCAL_SIM_DATA_MARKER}
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        top: 8,
        zIndex: 40,
        maxWidth: 'min(420px, calc(100vw - 24px))',
        padding: '8px 12px',
        borderRadius: 12,
        background: 'rgba(45, 32, 38, 0.92)',
        border: '1px solid #c98f6a',
        color: '#fff5ea',
        fontSize: 12,
        lineHeight: 1.45,
        textAlign: 'center',
        pointerEvents: 'auto',
      }}
    >
      <strong>Mèo tự sinh — chế độ DEV (mô phỏng cục bộ)</strong>
      <div style={{ marginTop: 4, opacity: 0.9 }}>
        Không ghi kho hay affection. URL: <code>?living-pet=1</code>
        <div style={{ marginTop: 6 }}>
          <button
            type="button"
            onClick={() => {
              setLivingPetLocalSimulationPersistent(false);
              const url = new URL(window.location.href);
              url.searchParams.delete('living-pet');
              window.location.href = url.pathname + url.search;
            }}
            style={{
              background: '#5a3f48',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            Thoát chế độ thử
          </button>
        </div>
      </div>
    </div>
  );
}