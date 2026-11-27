import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Send, Sparkles, Wifi, WifiOff, X } from 'lucide-react';
import type {
  BilliardsEdition,
  BilliardsLobbyState,
  BilliardsRule,
  PlayerSlot,
} from '../../../shared/billiards/types';

export interface BilliardsOnlineLobbyProps {
  localPlayerSlot: PlayerSlot;
  playerNames: [string, string];
  lobbyState: BilliardsLobbyState | null;
  assetsReady: boolean;
  assetStatusText: string;
  inviteSentAtMs: number | null;
  getServerNowMs: () => number;
  getRttMs: () => number | null;
  onInvitePartner: () => void;
  onChangeConfig: (edition: BilliardsEdition, rule: BilliardsRule, startingPlayer: PlayerSlot) => void;
  onToggleReady: (ready: boolean) => void;
  onCancelCountdown: () => void;
  onLeaveLobby: () => void;
  onClose: () => void;
}

export const BilliardsOnlineLobby: React.FC<BilliardsOnlineLobbyProps> = ({
  localPlayerSlot,
  playerNames,
  lobbyState,
  assetsReady,
  assetStatusText,
  inviteSentAtMs,
  getServerNowMs,
  getRttMs,
  onInvitePartner,
  onChangeConfig,
  onToggleReady,
  onCancelCountdown,
  onLeaveLobby,
  onClose,
}) => {
  const [countdownMsLeft, setCountdownMsLeft] = useState<number | null>(null);

  const edition = lobbyState?.edition ?? '2d';
  const rule = lobbyState?.rule ?? '8ball';
  const startingPlayer = lobbyState?.startingPlayer ?? 0;
  const localPlayer = lobbyState?.players[localPlayerSlot];
  const isReady = Boolean(localPlayer?.ready);
  const confirmed = lobbyState?.status === 'countdown' ? lobbyState.confirmedConfig : null;

  useEffect(() => {
    if (!confirmed) {
      return;
    }
    const update = () => {
      const rem = Math.max(0, confirmed.startAtServerMs - getServerNowMs());
      setCountdownMsLeft(rem);
    };
    const t0 = window.setTimeout(update, 0);
    const id = window.setInterval(update, 60);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(id);
    };
  }, [confirmed, getServerNowMs]);

  const rttMs = getRttMs();
  const countdownSec = confirmed
    ? Math.max(1, Math.ceil((countdownMsLeft ?? confirmed.countdownMs) / 1000))
    : 0;

  return (
    <div className="olw-billiards-shell" data-testid="billiards-online-lobby">
      <div className="olw-billiards-panel">
        <div className="olw-entry-header">
          <div className="olw-billiards-row" style={{ gap: 10 }}>
            <button
              type="button"
              data-testid="billiards-lobby-leave"
              onClick={onLeaveLobby}
              className="olw-billiards-pill"
            >
              <ArrowLeft size={15} /> Quay lại
            </button>
            <div>
              <h2 className="olw-entry-title">Phòng chờ Bi-a Online</h2>
              <p className="olw-entry-sub">
                Cả hai người bấm Sẵn sàng &amp; tải xong bàn {edition.toUpperCase()} để bắt đầu đồng bộ.
                {rttMs !== null ? ` • Độ trễ ~${Math.round(rttMs)}ms` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng quán Bi-a"
            data-testid="billiards-close"
            className="olw-billiards-pill olw-billiards-icon-btn"
          >
            <X size={18} />
          </button>
        </div>

        <div className="olw-inline-bar">
          <div className="olw-billiards-row" style={{ flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#fde68a' }}>Phiên bản:</span>
            <button
              type="button"
              data-testid="lobby-edition-2d"
              disabled={lobbyState?.status === 'countdown'}
              onClick={() => onChangeConfig('2d', rule, startingPlayer)}
              className={`olw-billiards-pill${edition === '2d' ? ' olw-billiards-pill--active' : ''}`}
            >
              2D
            </button>
            <button
              type="button"
              data-testid="lobby-edition-3d"
              disabled={lobbyState?.status === 'countdown'}
              onClick={() => onChangeConfig('3d', rule, startingPlayer)}
              className={`olw-billiards-pill${edition === '3d' ? ' olw-billiards-pill--active' : ''}`}
            >
              3D
            </button>

            <span style={{ fontSize: 12, fontWeight: 800, color: '#fde68a', marginLeft: 6 }}>
              Thể thức:
            </span>
            <button
              type="button"
              data-testid="lobby-rule-8ball"
              disabled={lobbyState?.status === 'countdown'}
              onClick={() => onChangeConfig(edition, '8ball', startingPlayer)}
              className={`olw-billiards-pill${rule === '8ball' ? ' olw-billiards-pill--active' : ''}`}
            >
              8-Bi
            </button>
            <button
              type="button"
              data-testid="lobby-rule-9ball"
              disabled={lobbyState?.status === 'countdown'}
              onClick={() => onChangeConfig(edition, '9ball', startingPlayer)}
              className={`olw-billiards-pill${rule === '9ball' ? ' olw-billiards-pill--active' : ''}`}
            >
              9-Bi
            </button>
          </div>

          <div className="olw-billiards-row">
            <span style={{ fontSize: 12, fontWeight: 800, color: '#fde68a' }}>Khai cuộc:</span>
            {([0, 1] as const).map((slot) => (
              <button
                key={slot}
                type="button"
                data-testid={`lobby-starter-${slot}`}
                disabled={lobbyState?.status === 'countdown'}
                onClick={() => onChangeConfig(edition, rule, slot)}
                className={`olw-billiards-pill${startingPlayer === slot ? ' olw-billiards-pill--active' : ''}`}
              >
                {playerNames[slot]}
              </button>
            ))}
          </div>
        </div>

        <div className="olw-card-grid-2">
          {([0, 1] as const).map((slot) => {
            const p = lobbyState?.players[slot];
            const isLocal = slot === localPlayerSlot;
            const joined = Boolean(p?.joined);
            const connected = Boolean(p?.connected);
            const pReady = Boolean(p?.ready);
            const pAssets = Boolean(p?.assetsReady);
            return (
              <div
                key={slot}
                data-testid={`lobby-player-${slot}`}
                data-ready={pReady ? '1' : '0'}
                data-assets-ready={pAssets ? '1' : '0'}
                className={`olw-lobby-player${pReady ? ' olw-lobby-player--ready' : ''}`}
              >
                <div className="olw-choice-title">
                  <span>
                    {slot === 0 ? '🏡' : '🌙'} {playerNames[slot]}{' '}
                    {isLocal && (
                      <span style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700 }}>(Bạn)</span>
                    )}
                  </span>
                  <span className={`olw-badge ${connected ? 'olw-badge--ok' : 'olw-badge--warn'}`}>
                    {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
                    {connected ? (joined ? 'Trong phòng' : 'Đang ở ngoài') : 'Ngoại tuyến'}
                  </span>
                </div>

                <div className="olw-choice-desc">
                  Tài nguyên {edition.toUpperCase()}:{' '}
                  <strong>{pAssets ? 'Đã tải xong' : isLocal ? assetStatusText : 'Đang chờ tải...'}</strong>
                </div>

                <div className="olw-billiards-row" style={{ justifyContent: 'space-between' }}>
                  <span className={`olw-badge ${pReady ? 'olw-badge--ok' : ''}`}>
                    {pReady ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                    {pReady ? 'Đã sẵn sàng' : 'Chưa sẵn sàng'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {confirmed && (
          <div className="olw-countdown-box" data-testid="billiards-countdown">
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fffbeb' }}>
              <Sparkles size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              Bắt đầu sau {countdownSec}s...
            </div>
            <div style={{ fontSize: 12, color: '#fde68a' }}>
              Xác nhận máy chủ: <strong>{confirmed.edition.toUpperCase()}</strong> •{' '}
              <strong>{confirmed.rule === '8ball' ? '8-Bi' : '9-Bi'}</strong> • Khai cuộc:{' '}
              <strong>{playerNames[confirmed.startingPlayer]}</strong>
            </div>
            <button
              type="button"
              data-testid="billiards-lobby-cancel"
              onClick={onCancelCountdown}
              className="olw-billiards-pill"
              style={{ marginTop: 4 }}
            >
              Hủy đếm ngược
            </button>
          </div>
        )}

        <div className="olw-billiards-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            data-testid="billiards-invite-partner"
            onClick={onInvitePartner}
            className="olw-billiards-pill"
          >
            <Send size={14} />
            {inviteSentAtMs ? `Đã gửi lời mời tới ${playerNames[1 - localPlayerSlot]}` : `Mời ${playerNames[1 - localPlayerSlot]}`}
          </button>

          <button
            type="button"
            data-testid="billiards-lobby-ready-btn"
            disabled={!assetsReady || !lobbyState?.players[localPlayerSlot]?.joined}
            onClick={() => onToggleReady(!isReady)}
            className="olw-billiards-btn-cozy"
          >
            {!assetsReady
              ? assetStatusText
              : isReady
                ? 'Hủy sẵn sàng'
                : 'Sẵn sàng thi đấu'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BilliardsOnlineLobby;
