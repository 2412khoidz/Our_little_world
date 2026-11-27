import React from 'react';
import { Bot, Cpu, Gamepad2, Globe, Sparkles, Users, Wifi, WifiOff, X } from 'lucide-react';
import type {
  Billiards3DQuality,
  BilliardsEdition,
  BilliardsLobbyState,
  BilliardsPlayMode,
  BilliardsRule,
  BotDifficulty,
} from '../../../shared/billiards/types';
import type { BilliardsLocalStats } from './localStats';

export interface BilliardsEntryMenuProps {
  edition: BilliardsEdition;
  mode: BilliardsPlayMode;
  rule: BilliardsRule;
  botDifficulty: BotDifficulty;
  quality3d: Billiards3DQuality;
  hasPartner: boolean;
  partnerOnline: boolean;
  playerNames: [string, string];
  onlineScores: [number, number];
  localStats: BilliardsLocalStats;
  lobbyState: BilliardsLobbyState | null;
  onEditionChange: (edition: BilliardsEdition) => void;
  onModeChange: (mode: BilliardsPlayMode) => void;
  onRuleChange: (rule: BilliardsRule) => void;
  onBotDifficultyChange: (difficulty: BotDifficulty) => void;
  onQuality3dChange: (quality: Billiards3DQuality) => void;
  onLaunch: () => void;
  onResumeOnlineMatch: () => void;
  onClose: () => void;
}

export const BilliardsEntryMenu: React.FC<BilliardsEntryMenuProps> = ({
  edition,
  mode,
  rule,
  botDifficulty,
  quality3d,
  hasPartner,
  partnerOnline,
  playerNames,
  onlineScores,
  localStats,
  lobbyState,
  onEditionChange,
  onModeChange,
  onRuleChange,
  onBotDifficultyChange,
  onQuality3dChange,
  onLaunch,
  onResumeOnlineMatch,
  onClose,
}) => {
  const hasActiveOnlineMatch = lobbyState?.status === 'in_match' && Boolean(lobbyState.activeMatchId);
  const partnerWaitingInLobby =
    lobbyState?.status === 'lobby' && (lobbyState.players[0].joined || lobbyState.players[1].joined);

  return (
    <div className="olw-billiards-shell" data-testid="billiards-entry-menu">
      <div className="olw-billiards-panel">
        <div className="olw-entry-header">
          <div>
            <h2 className="olw-entry-title">Quán Bi-a — Our Little World</h2>
            <p className="olw-entry-sub">
              Chọn phiên bản 2D hoặc 3D, chơi cùng máy, đấu Bot hoặc rủ {playerNames[1]} chơi Online.
            </p>
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

        {(hasActiveOnlineMatch || partnerWaitingInLobby) && (
          <div className="olw-resume-banner" data-testid="billiards-online-resume-banner">
            <div style={{ fontSize: 12, fontWeight: 700, color: '#d1fae5' }}>
              {hasActiveOnlineMatch
                ? `Đang có ván Online (${lobbyState?.edition.toUpperCase()} • ${lobbyState?.rule === '8ball' ? '8-Bi' : '9-Bi'}) đang diễn ra.`
                : 'Phòng Bi-a Online đang mở sẵn sàng ghép đôi!'}
            </div>
            <button
              type="button"
              data-testid="billiards-resume-online-btn"
              onClick={onResumeOnlineMatch}
              className="olw-billiards-btn-cozy"
            >
              {hasActiveOnlineMatch ? 'Quay lại ván Online' : 'Vào phòng chờ'}
            </button>
          </div>
        )}

        <div>
          <div className="olw-section-label">1. Chọn phiên bản bàn Bi-a</div>
          <div className="olw-card-grid-2">
            <button
              type="button"
              data-testid="billiards-edition-2d"
              onClick={() => onEditionChange('2d')}
              className={`olw-choice-card${edition === '2d' ? ' olw-choice-card--selected' : ''}`}
            >
              <div className="olw-choice-title">
                <span>
                  <Gamepad2 size={15} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                  Bi-a 2D Cổ Điển
                </span>
                <span className="olw-badge olw-badge--ok">Nhẹ &amp; Mượt</span>
              </div>
              <div className="olw-choice-desc">
                Góc nhìn trên cao rõ nét, vật lý 120Hz chuẩn xác. Hỗ trợ 8-Bi và 9-Bi.
              </div>
            </button>

            <button
              type="button"
              data-testid="billiards-edition-3d"
              onClick={() => onEditionChange('3d')}
              className={`olw-choice-card${edition === '3d' ? ' olw-choice-card--selected' : ''}`}
            >
              <div className="olw-choice-title">
                <span>
                  <Sparkles size={15} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                  Bi-a 3D (8 Ball Pool)
                </span>
                <span className="olw-badge olw-badge--warn">Three.js 3D</span>
              </div>
              <div className="olw-choice-desc">
                Bàn gỗ gụ 9ft, lỗ mạ chrome, 3 góc camera, nâng cơ Massé &amp; xoáy 3D.
              </div>
            </button>
          </div>
        </div>

        <div>
          <div className="olw-section-label">2. Chọn chế độ chơi</div>
          <div className="olw-card-grid-3">
            <button
              type="button"
              data-testid="billiards-mode-local"
              onClick={() => onModeChange('local_pvp')}
              className={`olw-choice-card${mode === 'local_pvp' ? ' olw-choice-card--selected' : ''}`}
            >
              <div className="olw-choice-title">
                <span>
                  <Users size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                  2 người cùng máy
                </span>
              </div>
              <div className="olw-choice-desc">
                Đấu luân phiên trên cùng chuột, bàn phím hoặc màn hình cảm ứng. Không cần mạng.
              </div>
            </button>

            <button
              type="button"
              data-testid="billiards-mode-ai"
              onClick={() => onModeChange('ai')}
              className={`olw-choice-card${mode === 'ai' ? ' olw-choice-card--selected' : ''}`}
            >
              <div className="olw-choice-title">
                <span>
                  <Bot size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                  Đấu với Máy
                </span>
              </div>
              <div className="olw-choice-desc">
                Luyện tập 1 mình với Bot biết chọn bi hợp lệ, né bi cản và đặt bi tự do.
              </div>
            </button>

            <button
              type="button"
              data-testid="billiards-mode-online"
              disabled={!hasPartner}
              onClick={() => onModeChange('online')}
              className={`olw-choice-card${mode === 'online' ? ' olw-choice-card--selected' : ''}`}
            >
              <div className="olw-choice-title">
                <span>
                  <Globe size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                  Online Cặp Đôi
                </span>
                {hasPartner ? (
                  <span className={`olw-badge ${partnerOnline ? 'olw-badge--ok' : 'olw-badge--warn'}`}>
                    {partnerOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                    {partnerOnline ? 'Online' : 'Đang chờ'}
                  </span>
                ) : (
                  <span className="olw-badge">Chưa ghép đôi</span>
                )}
              </div>
              <div className="olw-choice-desc">
                {hasPartner
                  ? `Mời ${playerNames[1]} vào phòng chờ xác nhận sẵn sàng & đồng bộ từng cú đánh.`
                  : 'Cần có thành viên thứ 2 trong ngôi nhà để đấu Online.'}
              </div>
            </button>
          </div>
        </div>

        <div className="olw-inline-bar">
          <div className="olw-billiards-row">
            <span style={{ fontSize: 12, fontWeight: 800, color: '#fde68a' }}>Thể thức:</span>
            <button
              type="button"
              data-testid="billiards-entry-rule-8ball"
              onClick={() => onRuleChange('8ball')}
              className={`olw-billiards-pill${rule === '8ball' ? ' olw-billiards-pill--active' : ''}`}
            >
              8-Bi
            </button>
            <button
              type="button"
              data-testid="billiards-entry-rule-9ball"
              onClick={() => onRuleChange('9ball')}
              className={`olw-billiards-pill${rule === '9ball' ? ' olw-billiards-pill--active' : ''}`}
            >
              9-Bi
            </button>
          </div>

          {mode === 'ai' && (
            <div className="olw-billiards-row">
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fde68a' }}>Độ khó Bot:</span>
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  data-testid={`billiards-bot-${diff}`}
                  onClick={() => onBotDifficultyChange(diff)}
                  className={`olw-billiards-pill${botDifficulty === diff ? ' olw-billiards-pill--active' : ''}`}
                >
                  {diff === 'easy' ? 'Dễ' : diff === 'medium' ? 'Vừa' : 'Cao thủ'}
                </button>
              ))}
            </div>
          )}

          {edition === '3d' && (
            <div className="olw-billiards-row">
              <Cpu size={13} color="#fcd34d" />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fde68a' }}>Đồ họa 3D:</span>
              {(['auto', 'low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  data-testid={`billiards-3d-quality-${q}`}
                  onClick={() => onQuality3dChange(q)}
                  className={`olw-billiards-pill${quality3d === q ? ' olw-billiards-pill--active' : ''}`}
                >
                  {q === 'auto' ? 'Tự động' : q === 'low' ? 'Nhẹ' : q === 'medium' ? 'Vừa' : 'Cao'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="olw-stats-strip">
          <div className="olw-stat-box" data-testid="billiards-online-stats-box">
            <strong style={{ color: '#93c5fd' }}>Tỷ số Cặp Đôi (Online)</strong>
            <span>
              {playerNames[0]}: <strong>{onlineScores[0]}</strong> — {playerNames[1]}:{' '}
              <strong>{onlineScores[1]}</strong>
            </span>
          </div>
          <div className="olw-stat-box" data-testid="billiards-local-stats-box">
            <strong style={{ color: '#fcd34d' }}>Thống kê Riêng (Cùng máy &amp; Bot)</strong>
            <span>
              2P cùng máy: {localStats.local2p.p1Wins}-{localStats.local2p.p2Wins} ({localStats.local2p.matches} ván) • Bot ({botDifficulty === 'easy' ? 'Dễ' : botDifficulty === 'medium' ? 'Vừa' : 'Cao thủ'}):{' '}
              {localStats.bot[botDifficulty].wins}T / {localStats.bot[botDifficulty].losses}B
            </span>
          </div>
        </div>

        <div className="olw-billiards-row" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} className="olw-billiards-pill">
            Quay về làng
          </button>
          <button
            type="button"
            data-testid="billiards-start-btn"
            onClick={onLaunch}
            className="olw-billiards-btn-cozy"
          >
            {mode === 'online' ? 'Vào phòng chờ Online' : `Bắt đầu chơi (${edition.toUpperCase()})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BilliardsEntryMenu;
