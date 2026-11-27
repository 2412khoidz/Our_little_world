import {
  COUPLE_ACTIVE_INTERACTION_OPTIONS,
  COUPLE_EMOTES,
  isPairedCouplePosture,
  type CoupleEmoteId,
  type CoupleInteractionKind,
  type CoupleInvitePayload,
  type CouplePostureKind,
} from '../../shared/couple/coupleTypes';
import { getCoupleInteractionMeta } from '../../shared/couple/coupleProtocol';
import { COUPLE_EMOTE_PIXEL_URLS } from '../../shared/art/kilnItemIcons';

interface CoupleActionBarProps {
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
  embedded?: boolean;
  hideInviteToast?: boolean;
}

const POSTURE_LABELS: Record<Exclude<CouplePostureKind, 'none'>, string> = {
  sit_study: 'Đang ngồi học',
  sit_sofa: 'Đang ngồi sofa',
  sit_bench: 'Đang ngồi ghế vườn',
  lie_bed: 'Đang nằm nghỉ',
  hug: 'Đang ôm nhau ❤️',
  hold_hands: 'Đang nắm tay 💛',
  kiss: 'Đang trao nụ hôn 💕',
  lean_shoulder: 'Đang tựa vai nhau ✨',
  dance: 'Đang khiêu vũ 🎶',
  give_flower: 'Đang tặng hoa 🌸',
};

export function CoupleInviteToast({
  incomingInvite,
  inviteRemainingSec,
  onAccept,
  onDecline,
}: {
  incomingInvite: CoupleInvitePayload | null;
  inviteRemainingSec: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  if (!incomingInvite) return null;
  const meta = getCoupleInteractionMeta(incomingInvite.kind);
  return (
    <div
      className="cozy-card"
      data-testid="couple-hug-invite-toast"
      style={{
        pointerEvents: 'auto',
        padding: '8px 12px',
        borderRadius: 16,
        background: 'rgba(255, 248, 239, 0.96)',
        border: '2px solid #e68ca4',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
        boxShadow: '0 8px 20px rgba(45, 29, 34, 0.16)',
        maxWidth: 'min(360px, calc(100vw - 24px))',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
        {`${meta.symbol} Người thương ${meta.invitePromptVi} (${inviteRemainingSec}s)`}
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          data-testid="couple-hug-accept"
          onClick={onAccept}
        >
          {meta.acceptBtnVi}
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          data-testid="couple-hug-decline"
          onClick={onDecline}
        >
          Để sau
        </button>
      </div>
    </div>
  );
}

export function CoupleActionBar({
  partnerOnlineSameRoom,
  localPosture,
  incomingInvite,
  inviteRemainingSec,
  outgoingInviteActive,
  onSendEmote,
  onRequestHug,
  onRequestHoldHands,
  onRequestInteraction,
  onAcceptHug,
  onDeclineHug,
  onStandUp,
  embedded = false,
  hideInviteToast = false,
}: CoupleActionBarProps) {
  const triggerInteraction = (kind: CoupleInteractionKind) => {
    if (onRequestInteraction) {
      onRequestInteraction(kind);
      return;
    }
    if (kind === 'hold_hands' && onRequestHoldHands) {
      onRequestHoldHands();
      return;
    }
    if (kind === 'hug') {
      onRequestHug();
    }
  };

  const exitLabel = isPairedCouplePosture(localPosture)
    ? getCoupleInteractionMeta(localPosture).shortExitVi
    : 'Đứng dậy';

  return (
    <div className={`couple-action-shell${embedded ? ' couple-action-shell--embedded' : ''}`}>
      {!hideInviteToast && (
        <CoupleInviteToast
          incomingInvite={incomingInvite}
          inviteRemainingSec={inviteRemainingSec}
          onAccept={onAcceptHug}
          onDecline={onDeclineHug}
        />
      )}

      <div
        className="couple-action-bar"
        data-testid="couple-action-bar"
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 999,
          background: 'rgba(255, 248, 239, 0.92)',
          border: '1px solid var(--border-honey)',
          boxShadow: '0 6px 18px rgba(45, 29, 34, 0.12)',
          overflowX: 'auto',
          maxWidth: 'calc(100vw - 24px)',
        }}
      >
        {COUPLE_EMOTES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="btn btn--secondary btn--sm"
            data-testid={`couple-emote-${item.id}`}
            title={item.labelVi}
            aria-label={item.labelVi}
            onClick={() => onSendEmote(item.id)}
            style={{
              minWidth: 36,
              minHeight: 36,
              padding: '4px 7px',
              borderRadius: 999,
              fontSize: 15,
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {COUPLE_EMOTE_PIXEL_URLS[item.id] ? (
              <img
                src={COUPLE_EMOTE_PIXEL_URLS[item.id]}
                alt=""
                width={18}
                height={18}
                draggable={false}
                style={{ imageRendering: 'pixelated', display: 'block' }}
              />
            ) : (
              item.symbol
            )}
          </button>
        ))}

        {COUPLE_ACTIVE_INTERACTION_OPTIONS.filter((opt) =>
          onRequestInteraction || opt.id === 'hug' || (opt.id === 'hold_hands' && onRequestHoldHands),
        ).map((opt) => {
          const testId =
            opt.id === 'hug'
              ? 'couple-hug-btn'
              : opt.id === 'hold_hands'
                ? 'couple-hold-hands-btn'
                : `couple-${opt.id}-btn`;
          const pixelIcon =
            opt.id === 'hug'
              ? '/assets/ui/hybrid/emotes/hearts_double.png'
              : opt.id === 'hold_hands'
                ? '/assets/ui/hybrid/emotes/heart.png'
                : null;
          return (
            <button
              key={opt.id}
              type="button"
              className={`btn btn--sm ${opt.id === 'hug' ? 'btn--primary' : 'btn--secondary'}`}
              data-testid={testId}
              disabled={!partnerOnlineSameRoom || outgoingInviteActive}
              title={
                partnerOnlineSameRoom
                  ? `Mời người thương ${opt.labelVi.toLowerCase()}`
                  : 'Cần cả hai đang ở cùng phòng'
              }
              onClick={() => triggerInteraction(opt.id)}
              style={{
                minHeight: 36,
                borderRadius: 999,
                padding: '4px 10px',
                fontSize: 12.5,
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {pixelIcon ? (
                <img
                  src={pixelIcon}
                  alt=""
                  width={15}
                  height={15}
                  draggable={false}
                  style={{ imageRendering: 'pixelated' }}
                />
              ) : (
                <span aria-hidden="true">{opt.symbol}</span>
              )}
              {opt.id === 'hug' && outgoingInviteActive ? 'Đang đợi...' : opt.labelVi}
            </button>
          );
        })}

        {localPosture !== 'none' && (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            data-testid="couple-standup-btn"
            title={POSTURE_LABELS[localPosture]}
            onClick={onStandUp}
            style={{
              minHeight: 36,
              borderRadius: 999,
              padding: '4px 10px',
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {exitLabel}
          </button>
        )}
      </div>
    </div>
  );
}
