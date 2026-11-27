import {
  LIVING_PET_LOCAL_SIM_DATA_MARKER,
  isLivingPetLocalSimulationEnabled,
  setLivingPetLocalSimulationPersistent,
} from '../../shared/petLiving/mainGame/petLivingDevFlag';
import { CollapsibleDevBanner } from './CollapsibleDevBanner';

export function LivingPetDevBanner() {
  if (!import.meta.env.DEV || !isLivingPetLocalSimulationEnabled()) return null;
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search);
    if (q.get('living-pet') !== '1' && q.get('collision-debug') !== '1') {
      return null;
    }
  }

  return (
    <CollapsibleDevBanner
      testId={LIVING_PET_LOCAL_SIM_DATA_MARKER}
      dataMarker={LIVING_PET_LOCAL_SIM_DATA_MARKER}
      summary="Mèo DEV · mô phỏng cục bộ"
      className="olw-dev-banner--living-pet"
    >
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
          marginTop: 4,
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
    </CollapsibleDevBanner>
  );
}