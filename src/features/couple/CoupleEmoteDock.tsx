import { useEffect, useState } from 'react';
import {
  isPairedCouplePosture,
  type CoupleEmoteId,
  type CoupleInteractionKind,
  type CoupleInvitePayload,
  type CouplePostureKind,
} from '../../shared/couple/coupleTypes';
import { getCoupleInteractionMeta } from '../../shared/couple/coupleProtocol';
import { CoupleActionBar, CoupleInviteToast } from './CoupleActionBar';

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
  onRequestInteraction?: (kind: CoupleInteractionKind) => void;
  onAcceptHug: () => void;
  onDeclineHug: () => void;
  onStandUp: () => void;
}

/** Emotion toolbar collapsed to corner ♥; incoming invites remain visible even while collapsed. */
export function CoupleEmoteDock(props: CoupleEmoteDockProps) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DOCK_OPEN_KEY) === '1';
  });

  useEffect(() => {
    window.localStorage.setItem(DOCK_OPEN_KEY, open ? '1' : '0');
  }, [open]);

  const invitePending = Boolean(props.incomingInvite);
  const quickExitLabel =
    props.localPosture === 'hold_hands'
      ? 'Buông tay'
      : isPairedCouplePosture(props.localPosture)
        ? getCoupleInteractionMeta(props.localPosture).shortExitVi
        : 'Đứng dậy';

  return (
    <div className="couple-emote-dock" data-testid="couple-emote-dock">
      <CoupleInviteToast
        incomingInvite={props.incomingInvite}
        inviteRemainingSec={props.inviteRemainingSec}
        onAccept={props.onAcceptHug}
        onDecline={props.onDeclineHug}
      />
      {!open ? (
        <div className="couple-emote-dock__collapsed-row">
          {props.localPosture !== 'none' && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              data-testid="couple-quick-exit-btn"
              onClick={props.onStandUp}
              style={{ pointerEvents: 'auto', borderRadius: 999 }}
            >
              {quickExitLabel}
            </button>
          )}
          <button
            type="button"
            className={`couple-emote-dock__fab${invitePending ? ' couple-emote-dock__fab--pulse' : ''}`}
            data-testid="couple-emote-fab"
            aria-label={invitePending ? 'Mở cảm xúc — có lời mời từ người thương' : 'Mở thanh cảm xúc'}
            aria-expanded={false}
            onClick={() => setOpen(true)}
          >
            ♥
          </button>
        </div>
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
          <CoupleActionBar {...props} embedded hideInviteToast />
        </div>
      )}
    </div>
  );
}