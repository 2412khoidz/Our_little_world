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
        left: 8,
        bottom: 72,
        zIndex: 38,
        maxWidth: 168,
        padding: '4px 8px',
        borderRadius: 8,
        background: 'rgba(45, 32, 38, 0.78)',
        border: '1px solid #a86f52',
        color: '#fff5ea',
        fontSize: 10,
        lineHeight: 1.35,
        pointerEvents: 'auto',
      }}
    >
      <span>Mèo DEV · mô phỏng cục bộ</span>
      <button
        type="button"
        aria-label="Thoát chế độ thử mèo tự sinh"
        onClick={() => {
          setLivingPetLocalSimulationPersistent(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('living-pet');
          window.location.href = url.pathname + url.search;
        }}
        style={{
          marginLeft: 6,
          background: 'transparent',
          color: '#ffc9a8',
          border: 'none',
          cursor: 'pointer',
          fontSize: 10,
          textDecoration: 'underline',
          padding: 0,
        }}
      >
        Thoát
      </button>
    </div>
  );
}