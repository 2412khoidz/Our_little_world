import { useEffect, useState } from 'react';
import { PetShopCloseUpCat } from '../pet/PetShopCloseUpCat';
import { gameEventBus } from '../../game/eventBus';
import type { PetCareJ4lpanPortraitPayload } from '../../shared/petLiving/petCare/petCareJ4lpanPortraitBus';
import { petCareJ4lpanPortraitEnabled } from '../../shared/petLiving/petCare/petCareJ4lpanPortraitFlag';
import type { PetSnapshot } from '../../shared/pet/petTypes';
import { getPetMoodLabelVi } from '../../shared/pet/petNeeds';
import { shouldShowCareBubble } from '../../shared/petLiving/petCare/petCareTypes';
import type { PetCareExpression } from '../../shared/petLiving/petCare/petCareTypes';

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

function bubbleFromPayload(bubbleVi: string): PetCareExpression {
  return {
    bubbleVi,
    refuse: bubbleVi.includes('không') || bubbleVi.includes('Hừm'),
    squeak: bubbleVi.startsWith('…') ? 'refuse' : undefined,
    anim: 'sit_south',
    earTilt: 0,
    tail: 'idle',
    eyeMood: 'open',
  };
}

export function PetCareJ4lpanPortrait({ active, fallbackSnapshot }: PetCareJ4lpanPortraitProps) {
  const [payload, setPayload] = useState<PetCareJ4lpanPortraitPayload>(EMPTY_PAYLOAD);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    if (!active || !petCareJ4lpanPortraitEnabled()) return;
    return gameEventBus.on('evt:pet-care-j4lpan-portrait', (next) => setPayload(next));
  }, [active]);

  useEffect(() => {
    if (!active || !petCareJ4lpanPortraitEnabled()) return;
    let raf = 0;
    const loop = () => {
      setNowMs(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active || !petCareJ4lpanPortraitEnabled()) return null;

  const snapshot = payload.snapshot ?? fallbackSnapshot;
  if (!snapshot) return null;

  const moodLabel = getPetMoodLabelVi(snapshot.emotion);
  const showBubble = shouldShowCareBubble(bubbleFromPayload(payload.bubbleVi));

  return (
    <div className="pet-care-overlay__portrait" data-testid="pet-care-j4lpan-portrait">
      {showBubble && payload.bubbleVi ? (
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