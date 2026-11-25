import { useEffect, useState } from 'react';
import type { CoupleEmoteId, CoupleInvitePayload, CouplePostureKind } from '../../shared/couple/coupleTypes';
import { CoupleActionBar } from './CoupleActionBar';

const DOCK_OPEN_KEY = 'olw-couple-emote-dock-open';

interface CoupleEmoteDockProps {
  partnerOnlineSameRoom: boolean;
  localPosture: CouplePostureKind;
  incomingInvite: CoupleInvitePayload | null;
  inviteRemainingSec: number;
  outgoingInviteActive: boolean;
  onSendEmote: (emote: CoupleEmoteId) => void;
  onRequestHug: () => void;
  onRequestHoldHands?: () => void;
  onAcceptHug: () => void;
  onDeclineHug: () => void;
  onStandUp: () => void;
}

/** Phase II P0 — emotion toolbar collapsed to corner ♥; expands on tap only. */
export function CoupleEmoteDock(props: CoupleEmoteDockProps) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DOCK_OPEN_KEY) === '1';
  });

  useEffect(() => {
    window.localStorage.setItem(DOCK_OPEN_KEY, open ? '1' : '0');
  }, [open]);

  const hugPending = Boolean(props.incomingInvite);

  return (
    <div className="couple-emote-dock" data-testid="couple-emote-dock">
      {!open ? (
        <button
          type="button"
          className={`couple-emote-dock__fab${hugPending ? ' couple-emote-dock__fab--pulse' : ''}`}
          data-testid="couple-emote-fab"
          aria-label={hugPending ? 'Mở cảm xúc — có lời mời ôm' : 'Mở thanh cảm xúc'}
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          ♥
        </button>
      ) : (
        <div className="couple-emote-dock__panel">
          <button
            type="button"
            className="couple-emote-dock__close"
            data-testid="couple-emote-close"
            aria-label="Thu gọn thanh cảm xúc"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
          <CoupleActionBar {...props} embedded />
        </div>
      )}
    </div>
  );
}