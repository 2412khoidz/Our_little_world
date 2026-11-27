import React from 'react';
import { Bot, Compass, Cpu, Gamepad2, Globe, Sparkles, Target, Users, Wifi, WifiOff, X } from 'lucide-react';
import type {
  Billiards3DQuality,
  BilliardsEdition,
  BilliardsLobbyState,
  BilliardsPlayMode,
  BilliardsRule,
  BotDifficulty,
} from '../../../shared/billiards/types';
import type { BilliardsLocalStats } from './localStats';

const MiniTable2DArt: React.FC = () => (
  <svg
    viewBox="0 0 140 66"
    className="olw-edition-art"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="134" height="60" rx="10" fill="#5b341e" stroke="#f59e0b" strokeWidth="2" />
    <rect x="11" y="10" width="118" height="46" rx="5" fill="#156b49" stroke="#0d4a31" strokeWidth="2" />
    <circle cx="11" cy="10" r="4.5" fill="#090d16" />
    <circle cx="70" cy="9" r="4.2" fill="#090d16" />
    <circle cx="129" cy="10" r="4.5" fill="#090d16" />
    <circle cx="11" cy="56" r="4.5" fill="#090d16" />
    <circle cx="70" cy="57" r="4.2" fill="#090d16" />
    <circle cx="129" cy="56" r="4.5" fill="#090d16" />
    <line x1="40" y1="11" x2="40" y2="55" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
    <line x1="40" y1="33" x2="98" y2="27" stroke="#fde047" strokeWidth="1.5" strokeDasharray="3 2" />
    <circle cx="40" cy="33" r="4.5" fill="#f8fafc" />
    <circle cx="98" cy="27" r="4.5" fill="#eab308" />
    <circle cx="106" cy="22" r="4.5" fill="#ef4444" />
    <circle cx="106" cy="33" r="4.5" fill="#111827" />
    <circle cx="114" cy="27" r="4.5" fill="#2563eb" />
  </svg>
);

const MiniTable3DArt: React.FC = () => (
  <svg
    viewBox="0 0 140 66"
    className="olw-edition-art"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="olw3dFeltGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#1e7d5a" />
        <stop offset="100%" stopColor="#0f4733" />
      </linearGradient>
    </defs>
    <polygon points="20,12 120,12 134,58 6,58" fill="#5e321a" stroke="#fbbf24" strokeWidth="1.8" />
    <polygon points="26,17 114,17 125,52 15,52" fill="url(#olw3dFeltGrad)" />
    <circle cx="25" cy="17" r="3.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.2" />
    <circle cx="115" cy="17" r="3.5" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.2" />
    <circle cx="14" cy="52" r="4.2" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.2" />
    <circle cx="126" cy="52" r="4.2" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.2" />
    <line x1="34" y1="45" x2="88" y2="27" stroke="#fde047" strokeWidth="1.6" />
    <line x1="16" y1="53" x2="36" y2="44" stroke="#f5d0a9" strokeWidth="3" strokeLinecap="round" />
    <circle cx="42" cy="42" r="4.6" fill="#f8fafc" />
    <circle cx="88" cy="27" r="4.3" fill="#ef4444" />
    <circle cx="96" cy="25" r="4.2" fill="#111827" />
    <circle cx="94" cy="33" r="4.3" fill="#f59e0b" />
  </svg>
);

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
              <MiniTable2DArt />
              <div className="olw-choice-title">
                <span>
                  <Gamepad2 size={15} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                  Bi-a 2D Cổ Điển
                </span>
                <span className="olw-badge olw-badge--ok">Nhẹ • Bàn dọc Mobile</span>
              </div>
              <div className="olw-choice-desc">
                Tự xoay bàn dọc trên điện thoại như 8 Ball Pool, đường ngắm rõ &amp; vật lý 120Hz chuẩn xác.
              </div>
            </button>

            <button
              type="button"
              data-testid="billiards-edition-3d"
              onClick={() => onEditionChange('3d')}
              className={`olw-choice-card${edition === '3d' ? ' olw-choice-card--selected' : ''}`}
            >
              <MiniTable3DArt />
              <div className="olw-choice-title">
                <span>
                  <Sparkles size={15} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                  Bi-a 3D (8 Ball Pool)
                </span>
                <span className="olw-badge olw-badge--warn">Three.js 3D</span>
              </div>
              <div className="olw-choice-desc">
                Bàn gỗ gụ 9ft, lỗ mạ chrome, nâng cơ Massé 0°–45°, xoay 2 ngón &amp; góc nhìn từ trên.
              </div>
            </button>
          </div>
        </div>

        <div>
          <div className="olw-section-label">2. Chọn chế độ chơi</div>
          <div className="olw-card-grid-2">
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
                Luyện tập với Bot biết chọn bi hợp lệ, né bi cản và đặt bi tự do.
              </div>
            </button>

            <button
              type="button"
              data-testid="billiards-mode-practice"
              onClick={() => onModeChange('practice')}
              className={`olw-choice-card${mode === 'practice' ? ' olw-choice-card--selected' : ''}`}
            >
              <div className="olw-choice-title">
                <span>
                  <Target size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                  Luyện tập tự do
                </span>
                <span className="olw-badge olw-badge--ok">Đặt bi thoải mái</span>
              </div>
              <div className="olw-choice-desc">
                Không tính giờ, không đổi lượt — đặt lại bi cái bất cứ lúc nào để tập các cú đánh khó.
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
                  ? `Mời ${playerNames[1]} vào phòng chờ cùng chọn bàn 2D/3D, bấm sẵn sàng & đồng bộ từng cú đánh.`
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
            <div className="olw-billiards-row" style={{ flexWrap: 'wrap' }}>
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
            <div className="olw-billiards-row" style={{ flexWrap: 'wrap' }}>
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

        <div className="olw-billiards-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Compass size={13} color="#6ee7b7" /> Điện thoại nên dùng bàn dọc 2D hoặc cài PWA ra màn hình chính để đánh sướng nhất.
          </span>
          <div className="olw-billiards-row" style={{ marginLeft: 'auto', gap: 8 }}>
            <button type="button" onClick={onClose} className="olw-billiards-pill">
              Quay về làng
            </button>
            <button
              type="button"
              data-testid="billiards-start-btn"
              onClick={onLaunch}
              className="olw-billiards-btn-cozy"
            >
              {mode === 'online'
                ? 'Vào phòng chờ Online'
                : mode === 'practice'
                  ? `Tập tự do (${edition.toUpperCase()})`
                  : `Bắt đầu chơi (${edition.toUpperCase()})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BilliardsEntryMenu;
