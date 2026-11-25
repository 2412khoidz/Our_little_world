import { useEffect, useState } from 'react';
import { PetShopCloseUpCat } from '../pet/PetShopCloseUpCat';
import { gameEventBus } from '../../game/eventBus';
import type { PetCareJ4lpanPortraitPayload } from '../../shared/petLiving/petCare/petCareJ4lpanPortraitBus';
import { petCareJ4lpanPortraitEnabled } from '../../shared/petLiving/petCare/petCareJ4lpanPortraitFlag';
import type { PetSnapshot } from '../../shared/pet/petTypes';
import { getPetMoodLabelVi } from '../../shared/pet/petNeeds';

interface PetCareJ4lpanPortraitProps {
  active: boolean;
  /** Authoritative snapshot from App when bus is quiet. */
  fallbackSnapshot: PetSnapshot | null;
}

const EMPTY_PAYLOAD: PetCareJ4lpanPortraitPayload = {
  snapshot: null,
  bubbleVi: '',
  careFlash: null,
  careFlashAtMs: 0,
  serverNowMs: 0,
};

export function PetCareJ4lpanPortrait({ active, fallbackSnapshot }: PetCareJ4lpanPortraitProps) {
  const [payload, setPayload] = useState<PetCareJ4lpanPortraitPayload>(EMPTY_PAYLOAD);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active || !petCareJ4lpanPortraitEnabled()) return;
    return gameEventBus.on('evt:pet-care-j4lpan-portrait', (next) => setPayload(next));
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [active]);

  if (!active || !petCareJ4lpanPortraitEnabled()) return null;

  const snapshot = payload.snapshot ?? fallbackSnapshot;
  if (!snapshot) return null;

  const nowMs = (payload.serverNowMs || snapshot.serverNowMs || 0) + tick * 500;
  const moodLabel = getPetMoodLabelVi(snapshot.emotion);

  return (
    <div className="pet-care-overlay__portrait" data-testid="pet-care-j4lpan-portrait">
      {payload.bubbleVi ? (
        <p className="pet-care-overlay__bubble" data-testid="pet-care-j4lpan-bubble">
          {payload.bubbleVi}
        </p>
      ) : null}
      <PetShopCloseUpCat
        catName={snapshot.name}
        moodLabel={moodLabel}
        mood={snapshot.emotion}
        vitals={snapshot.vitals}
        careFlashAction={payload.careFlash === 'play' ? null : payload.careFlash}
        careFlashAtMs={payload.careFlash ? payload.careFlashAtMs : null}
        careFlashPlay={payload.careFlash === 'play'}
        nowMs={nowMs}
      />
    </div>
  );
}