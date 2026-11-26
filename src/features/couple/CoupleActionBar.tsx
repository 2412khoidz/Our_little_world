import { COUPLE_EMOTES, type CoupleEmoteId, type CoupleInvitePayload, type CouplePostureKind } from '../../shared/couple/coupleTypes';
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
  onAcceptHug: () => void;
  onDeclineHug: () => void;
  onStandUp: () => void;
  embedded?: boolean;
}

const POSTURE_LABELS: Record<Exclude<CouplePostureKind, 'none'>, string> = {
  sit_study: 'Đang ngồi học',
  sit_sofa: 'Đang ngồi sofa',
  sit_bench: 'Đang ngồi ghế vườn',
  lie_bed: 'Đang nằm nghỉ',
  hug: 'Đang ôm nhau ❤️',
  hold_hands: 'Đang nắm tay 💛',
};

export function CoupleActionBar({
  partnerOnlineSameRoom,
  localPosture,
  incomingInvite,
  inviteRemainingSec,
  outgoingInviteActive,
  onSendEmote,
  onRequestHug,
  onRequestHoldHands,
  onAcceptHug,
  onDeclineHug,
  onStandUp,
  embedded = false,
}: CoupleActionBarProps) {
  const isHoldHandsInvite = incomingInvite?.kind === 'hold_hands';

  return (
    <div className={`couple-action-shell${embedded ? ' couple-action-shell--embedded' : ''}`}>
      {incomingInvite && (
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
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
            {isHoldHandsInvite
              ? `🤝 Người thương mời nắm tay (${inviteRemainingSec}s)`
              : `🫂 Người thương mời ôm nhau (${inviteRemainingSec}s)`}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              data-testid="couple-hug-accept"
              onClick={onAcceptHug}
            >
              {isHoldHandsInvite ? 'Nắm tay nhé' : 'Ôm lại ngay'}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              data-testid="couple-hug-decline"
              onClick={onDeclineHug}
            >
              Để sau
            </button>
          </div>
        </div>
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

        <button
          type="button"
          className="btn btn--primary btn--sm"
          data-testid="couple-hug-btn"
          disabled={!partnerOnlineSameRoom || outgoingInviteActive}
          title={
            partnerOnlineSameRoom
              ? 'Mời người thương ôm nhau'
              : 'Cần cả hai đang ở cùng phòng'
          }
          onClick={onRequestHug}
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
          <img
            src="/assets/ui/hybrid/emotes/hearts_double.png"
            alt=""
            width={15}
            height={15}
            draggable={false}
            style={{ imageRendering: 'pixelated' }}
          />
          {outgoingInviteActive ? 'Đang đợi...' : 'Ôm nhau'}
        </button>

        {onRequestHoldHands && (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            data-testid="couple-hold-hands-btn"
            disabled={!partnerOnlineSameRoom || outgoingInviteActive}
            title={
              partnerOnlineSameRoom
                ? 'Mời người thương nắm tay'
                : 'Cần cả hai đang ở cùng phòng'
            }
            onClick={onRequestHoldHands}
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
            <img
              src="/assets/ui/hybrid/emotes/heart.png"
              alt=""
              width={15}
              height={15}
              draggable={false}
              style={{ imageRendering: 'pixelated' }}
            />
            Nắm tay
          </button>
        )}

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
            Đứng dậy
          </button>
        )}
      </div>
    </div>
  );
}
