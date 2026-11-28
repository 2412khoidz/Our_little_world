import { useEffect, useState, type ReactNode } from 'react';
import {
  isPairedCouplePosture,
  type CoupleEmoteId,
  type CoupleInteractionKind,
  type CoupleInvitePayload,
  type CouplePostureKind,
} from '../../shared/couple/coupleTypes';
import { getCoupleInteractionMeta } from '../../shared/couple/coupleProtocol';
import type { HudLayoutMode } from '../../shared/viewport/viewportPolicy';
import { CoupleActionBar, CoupleInviteToast } from './CoupleActionBar';

const DOCK_OPEN_KEY = 'olw-couple-emote-dock-open';

interface CoupleEmoteDockProps {
  tradeAction?: ReactNode;
  partnerOnlineSameRoom: boolean;
  localPosture: CouplePostureKind;
  incomingInvite: CoupleInvitePayload | null;
  inviteRemainingSec: number;
  outgoingInviteActive: boolean;
  hudLayoutMode?: HudLayoutMode;
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

  const isMobileHud = props.hudLayoutMode !== undefined && props.hudLayoutMode !== 'desktop';

  return (
    <div
      className="couple-emote-dock"
      data-testid="couple-emote-dock"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <CoupleInviteToast
        incomingInvite={props.incomingInvite}
        inviteRemainingSec={props.inviteRemainingSec}
        onAccept={props.onAcceptHug}
        onDecline={props.onDeclineHug}
      />
      {props.tradeAction && <div className="couple-emote-dock__trade">{props.tradeAction}</div>}
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
            className={
              isMobileHud
                ? `olw-m-couple-fab${invitePending ? ' olw-m-couple-fab--pulse' : ''}`
                : `couple-emote-dock__fab${invitePending ? ' couple-emote-dock__fab--pulse' : ''}`
            }
            data-testid="couple-emote-fab"
            aria-label={invitePending ? 'Mở cảm xúc — có lời mời từ người thương' : 'Mở thanh cảm xúc'}
            aria-expanded={false}
            onClick={() => setOpen(true)}
          >
            {isMobileHud ? (
              <img
                src={
                  invitePending
                    ? '/assets/ui/hybrid/emotes/hearts_double.png'
                    : '/assets/ui/hybrid/emotes/heart.png'
                }
                alt="Cảm xúc"
                width={22}
                height={22}
                draggable={false}
                style={{ imageRendering: 'pixelated', display: 'block' }}
              />
            ) : (
              '♥'
            )}
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