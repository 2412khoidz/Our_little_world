import { COUPLE_EMOTES, type CoupleEmoteId, type CoupleInvitePayload, type CouplePostureKind } from '../../shared/couple/coupleTypes';

interface CoupleActionBarProps {
  partnerOnlineSameRoom: boolean;
  localPosture: CouplePostureKind;
  incomingInvite: CoupleInvitePayload | null;
  inviteRemainingSec: number;
  outgoingInviteActive: boolean;
  onSendEmote: (emote: CoupleEmoteId) => void;
  onRequestHug: () => void;
  onAcceptHug: () => void;
  onDeclineHug: () => void;
  onStandUp: () => void;
}

const POSTURE_LABELS: Record<Exclude<CouplePostureKind, 'none'>, string> = {
  sit_study: 'Đang ngồi học',
  sit_sofa: 'Đang ngồi sofa',
  sit_bench: 'Đang ngồi ghế vườn',
  lie_bed: 'Đang nằm nghỉ',
  hug: 'Đang ôm nhau ❤️',
};

export function CoupleActionBar({
  partnerOnlineSameRoom,
  localPosture,
  incomingInvite,
  inviteRemainingSec,
  outgoingInviteActive,
  onSendEmote,
  onRequestHug,
  onAcceptHug,
  onDeclineHug,
  onStandUp,
}: CoupleActionBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        zIndex: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        maxWidth: 'calc(100vw - 24px)',
        pointerEvents: 'none',
      }}
    >
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
            🫂 Người thương mời ôm nhau ({inviteRemainingSec}s)
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              data-testid="couple-hug-accept"
              onClick={onAcceptHug}
            >
              Đồng ý
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
        data-testid="couple-action-bar"
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '5px 8px',
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
            }}
          >
            {item.symbol}
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
          }}
        >
          {outgoingInviteActive ? 'Đang đợi ôm...' : '🫂 Ôm nhau'}
        </button>

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
