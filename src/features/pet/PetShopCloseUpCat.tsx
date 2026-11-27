import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  PET_SHOP_CLOSEUP_CAT_MARKUP,
  PET_SHOP_ORANGE_TABBY_VARS,
} from '../../donors/pet-shop-j4lpan/petShopCloseUpCatSvg';
import {
  isFeedEatPhase,
  nextBlinkDelayMs,
  nextIdleMicroDelayMs,
  PET_SHOP_BLINK_DOUBLE_GAP_MS,
  PET_SHOP_BLINK_MS,
  PET_SHOP_EAR_TWITCH_MS,
  PET_SHOP_YAWN_MS,
  pickIdleMicroAction,
  shouldDoubleBlink,
} from '../../shared/donor/pet-shop-j4lpan/petShopCareAnimLoop';
import {
  resolvePetShopCareMode,
  selectPetShopCareFace,
} from '../../shared/donor/pet-shop-j4lpan/petShopCareFace';
import type { PetActionType, PetMood, PetVitals } from '../../shared/pet/petTypes';

import './petShopCloseUpCat.css';

interface PetShopCloseUpCatProps {
  catName?: string;
  moodLabel?: string;
  mood: PetMood;
  vitals: PetVitals;
  careFlashAction?: PetActionType | null;
  careFlashAtMs?: number | null;
  /** Toy / play beat from PetCareScene (not in PetSnapshot authority). */
  careFlashPlay?: boolean;
  /** Monotonic ms for cooldown + flash windows (panel tick). */
  nowMs: number;
}

export function PetShopCloseUpCat({
  catName = 'Quýt',
  moodLabel,
  mood,
  vitals,
  careFlashAction = null,
  careFlashAtMs = null,
  careFlashPlay = false,
  nowMs,
}: PetShopCloseUpCatProps) {
  const [blinking, setBlinking] = useState(false);
  const [yawning, setYawning] = useState(false);
  const [earTwitch, setEarTwitch] = useState(false);

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout> | undefined;
    let idleTimeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const scheduleBlink = () => {
      blinkTimeout = setTimeout(() => {
        if (cancelled) return;
        setBlinking(true);
        setTimeout(() => {
          if (!cancelled) setBlinking(false);
        }, PET_SHOP_BLINK_MS);
        if (shouldDoubleBlink(Math.random())) {
          setTimeout(() => {
            if (cancelled) return;
            setBlinking(true);
            setTimeout(() => {
              if (!cancelled) setBlinking(false);
            }, PET_SHOP_BLINK_MS);
          }, PET_SHOP_BLINK_DOUBLE_GAP_MS);
        }
        scheduleBlink();
      }, nextBlinkDelayMs(Math.random()));
    };

    const scheduleIdle = () => {
      idleTimeout = setTimeout(() => {
        if (cancelled) return;
        const action = pickIdleMicroAction(Math.random());
        if (action === 'yawn') {
          setYawning(true);
          setTimeout(() => {
            if (!cancelled) setYawning(false);
          }, PET_SHOP_YAWN_MS);
        } else if (action === 'ear_twitch') {
          setEarTwitch(true);
          setTimeout(() => {
            if (!cancelled) setEarTwitch(false);
          }, PET_SHOP_EAR_TWITCH_MS);
        }
        scheduleIdle();
      }, nextIdleMicroDelayMs(Math.random()));
    };

    scheduleBlink();
    scheduleIdle();
    return () => {
      cancelled = true;
      if (blinkTimeout) clearTimeout(blinkTimeout);
      if (idleTimeout) clearTimeout(idleTimeout);
    };
  }, []);

  const flashKind = careFlashPlay ? 'play' : (careFlashAction ?? null);
  const careMode = resolvePetShopCareMode(flashKind, careFlashAtMs ?? null, nowMs);
  const face = useMemo(
    () =>
      selectPetShopCareFace({
        mood,
        vitals,
        careMode,
        feedEatPhase: careMode === 'feed' && isFeedEatPhase(careFlashAtMs ?? null, nowMs),
      }),
    [mood, vitals, careMode, careFlashAtMs, nowMs],
  );

  const hostClass = [
    'pet-shop-closeup-cat',
    face.tailWagBoost ? 'pet-shop-closeup-cat--wag-boost' : '',
    blinking ? 'pet-shop-closeup-cat--blink' : '',
    yawning ? 'pet-shop-closeup-cat--yawn' : '',
    earTwitch ? 'pet-shop-closeup-cat--ear-twitch' : '',
    face.showSleepZzz ? 'pet-shop-closeup-cat--sleepy' : '',
    face.showBlush ? 'pet-shop-closeup-cat--blush-on' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={hostClass}
      data-testid="pet-shop-closeup-cat"
      data-eyes={face.eyes}
      data-mouth={yawning ? 'normal' : face.mouth}
      style={PET_SHOP_ORANGE_TABBY_VARS as CSSProperties}
      aria-label={moodLabel ? `${catName} — ${moodLabel}` : `Chân dung ${catName}`}
    >
      <div
        className="pet-shop-closeup-cat__stage"
        dangerouslySetInnerHTML={{ __html: PET_SHOP_CLOSEUP_CAT_MARKUP }}
      />
      {face.showSleepZzz ? (
        <span className="pet-shop-closeup-cat__zzz" aria-hidden="true">
          z z z
        </span>
      ) : null}
      {moodLabel ? (
        <span className="pet-shop-closeup-cat__mood" data-testid="pet-shop-closeup-mood">
          {moodLabel}
        </span>
      ) : null}
    </div>
  );
}