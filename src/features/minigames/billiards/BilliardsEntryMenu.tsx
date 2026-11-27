import React, { useEffect, useState } from 'react';
import { Bot, Gamepad2, Globe, Play, SlidersHorizontal, Sparkles, Target, Users, X } from 'lucide-react';
import type {
  Billiards3DQuality,
  BilliardsEdition,
  BilliardsLobbyState,
  BilliardsPlayMode,
  BilliardsRule,
  BotDifficulty,
} from '../../../shared/billiards/types';
import { BilliardsTouchCameraSettings } from './BilliardsTouchCameraSettings';
import type { BilliardsLocalStats } from './localStats';
import {
  loadTouchPreferences,
  subscribeTouchPreferences,
  type BilliardsTouchPreferences,
} from './touchPreferences';

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
  const [showSettings, setShowSettings] = useState(false);
  const [touchPrefs, setTouchPrefs] = useState<BilliardsTouchPreferences>(() => loadTouchPreferences());

  useEffect(() => {
    return subscribeTouchPreferences(() => setTouchPrefs(loadTouchPreferences()));
  }, []);

  const hasActiveOnlineMatch = lobbyState?.status === 'in_match' && Boolean(lobbyState.activeMatchId);
  const partnerWaitingInLobby =
    lobbyState?.status === 'lobby' && (lobbyState.players[0].joined || lobbyState.players[1].joined);

  const botLabel = botDifficulty === 'easy' ? 'Dễ' : botDifficulty === 'medium' ? 'Vừa' : 'Cao thủ';
  const qualityLabel =
    quality3d === 'auto' ? 'Tự động' : quality3d === 'low' ? 'Nhẹ' : quality3d === 'medium' ? 'Vừa' : 'Cao';

  const summaryParts = [rule === '8ball' ? '8-Bi' : '9-Bi'];
  if (mode === 'ai') summaryParts.push(`Bot ${botLabel}`);
  if (edition === '3d') summaryParts.push(`3D ${qualityLabel}`);

  return (
    <div className="olw-billiards-shell olw-billiards-shell--title" data-testid="billiards-entry-menu">
      <div className="olw-title-backdrop" aria-hidden="true" />
      <div className="olw-billiards-panel olw-billiards-panel--hall">
        <div className="olw-entry-header">
          <div className="olw-title-emblem">
            <span className="olw-title-ball8" aria-hidden="true">
              8
            </span>
            <div>
              <h2 className="olw-entry-title">Quán Bi-a</h2>
              <div className="olw-entry-tag">Our Little World • {playerNames[0]} &amp; {playerNames[1]}</div>
            </div>
          </div>

          <div className="olw-billiards-row">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              aria-label="Cài đặt & Thành tích"
              title="Cài đặt thể thức, độ khó Bot & Thành tích"
              data-testid="billiards-entry-settings-btn"
              className="olw-billiards-pill olw-billiards-icon-btn"
            >
              <SlidersHorizontal size={16} />
            </button>
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
        </div>

        {(hasActiveOnlineMatch || partnerWaitingInLobby) && (
          <div className="olw-resume-banner" data-testid="billiards-online-resume-banner">
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#fef3c7' }}>
              {hasActiveOnlineMatch
                ? `Ván Online (${lobbyState?.edition.toUpperCase()} • ${lobbyState?.rule === '8ball' ? '8-Bi' : '9-Bi'}) đang mở`
                : 'Phòng chờ Cặp Đôi đang sẵn sàng'}
            </div>
            <button
              type="button"
              data-testid="billiards-resume-online-btn"
              onClick={onResumeOnlineMatch}
              className="olw-wood-cta olw-wood-cta--sm"
            >
              {hasActiveOnlineMatch ? 'Vào lại ván' : 'Vào phòng chờ'}
            </button>
          </div>
        )}

        <div className="olw-edition-grid">
          <button
            type="button"
            data-testid="billiards-edition-2d"
            onClick={() => onEditionChange('2d')}
            className={`olw-edition-card${edition === '2d' ? ' olw-edition-card--selected' : ''}`}
          >
            <div className="olw-edition-thumb olw-edition-thumb--2d">
              <img
                src="/assets/billiards/table-preview.jpg"
                alt=""
                draggable={false}
                className="olw-edition-thumb-img"
              />
              <span className="olw-edition-thumb-shade" />
              <span className="olw-edition-corner">2D</span>
            </div>
            <div className="olw-edition-label">
              <Gamepad2 size={16} />
              <span>Bi-a 2D</span>
            </div>
          </button>

          <button
            type="button"
            data-testid="billiards-edition-3d"
            onClick={() => onEditionChange('3d')}
            className={`olw-edition-card${edition === '3d' ? ' olw-edition-card--selected' : ''}`}
          >
            <div className="olw-edition-thumb olw-edition-thumb--3d">
              <img
                src="/assets/billiards/title-bg.jpg"
                alt=""
                draggable={false}
                className="olw-edition-thumb-img"
              />
              <span className="olw-edition-thumb-shade" />
              <span className="olw-edition-corner">3D</span>
            </div>
            <div className="olw-edition-label">
              <Sparkles size={16} />
              <span>Bi-a 3D</span>
            </div>
          </button>
        </div>

        <div className="olw-mode-grid">
          <button
            type="button"
            data-testid="billiards-mode-local"
            onClick={() => onModeChange('local_pvp')}
            className={`olw-mode-tile${mode === 'local_pvp' ? ' olw-mode-tile--selected' : ''}`}
          >
            <Users size={18} />
            <span>2P Cùng Máy</span>
          </button>

          <button
            type="button"
            data-testid="billiards-mode-ai"
            onClick={() => onModeChange('ai')}
            className={`olw-mode-tile${mode === 'ai' ? ' olw-mode-tile--selected' : ''}`}
          >
            <Bot size={18} />
            <span>Đấu Với Máy</span>
          </button>

          <button
            type="button"
            data-testid="billiards-mode-practice"
            onClick={() => onModeChange('practice')}
            className={`olw-mode-tile${mode === 'practice' ? ' olw-mode-tile--selected' : ''}`}
          >
            <Target size={18} />
            <span>Luyện Tập</span>
          </button>

          <button
            type="button"
            data-testid="billiards-mode-online"
            disabled={!hasPartner}
            onClick={() => onModeChange('online')}
            className={`olw-mode-tile${mode === 'online' ? ' olw-mode-tile--selected' : ''}`}
          >
            <Globe size={18} />
            <span>Online Cặp Đôi</span>
            <span
              className={`olw-presence-dot ${
                !hasPartner
                  ? 'olw-presence-dot--off'
                  : partnerOnline
                    ? 'olw-presence-dot--on'
                    : 'olw-presence-dot--wait'
              }`}
              title={
                !hasPartner ? 'Chưa ghép đôi' : partnerOnline ? `${playerNames[1]} đang online` : 'Đang chờ'
              }
            />
          </button>
        </div>

        <div className="olw-entry-footer">
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="olw-billiards-pill"
            style={{ fontSize: 12 }}
          >
            <SlidersHorizontal size={13} />
            <span>{summaryParts.join(' • ')}</span>
          </button>

          <div className="olw-billiards-row" style={{ marginLeft: 'auto', gap: 8 }}>
            <button type="button" onClick={onClose} className="olw-billiards-pill">
              Về làng
            </button>
            <button
              type="button"
              data-testid="billiards-start-btn"
              onClick={onLaunch}
              className="olw-wood-cta"
            >
              <Play size={15} fill="currentColor" />
              <span>
                {mode === 'online'
                  ? 'Phòng Chờ'
                  : mode === 'practice'
                    ? `Tập (${edition.toUpperCase()})`
                    : `Vào Bàn (${edition.toUpperCase()})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div
          className="olw-modal-backdrop"
          data-testid="billiards-entry-settings-modal"
          onClick={() => setShowSettings(false)}
        >
          <div className="olw-modal-card olw-modal-card--wide" onClick={(e) => e.stopPropagation()}>
            <div className="olw-modal-row">
              <span style={{ fontSize: 15, fontWeight: 900, color: '#fef3c7' }}>Cài đặt trận &amp; Thành tích</span>
              <button
                type="button"
                data-testid="billiards-entry-settings-close"
                onClick={() => setShowSettings(false)}
                className="olw-billiards-pill olw-billiards-icon-btn"
              >
                <X size={16} />
              </button>
            </div>

            <div className="olw-modal-row">
              <span>Thể thức</span>
              <div className="olw-billiards-row">
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
            </div>

            <div className="olw-modal-row">
              <span>Độ khó Bot</span>
              <div className="olw-billiards-row">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    data-testid={`billiards-bot-${diff}`}
                    onClick={() => onBotDifficultyChange(diff)}
                    className={`olw-billiards-pill${botDifficulty === diff ? ' olw-billiards-pill--active' : ''}`}
                  >
                    {diff === 'easy' ? 'Dễ' : diff === 'medium' ? 'Vừa' : 'Cao'}
                  </button>
                ))}
              </div>
            </div>

            <div className="olw-modal-row">
              <span>Đồ họa 3D</span>
              <div className="olw-billiards-row">
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
            </div>

            <div className="olw-stats-strip">
              <div className="olw-stat-box" data-testid="billiards-online-stats-box">
                <strong style={{ color: '#fde68a' }}>Tỷ số Cặp Đôi (Online)</strong>
                <span>
                  {playerNames[0]}: <strong>{onlineScores[0]}</strong> — {playerNames[1]}:{' '}
                  <strong>{onlineScores[1]}</strong>
                </span>
              </div>
              <div className="olw-stat-box" data-testid="billiards-local-stats-box">
                <strong style={{ color: '#fcd34d' }}>Thống kê Riêng (Máy &amp; Bot)</strong>
                <span>
                  2P: {localStats.local2p.p1Wins}-{localStats.local2p.p2Wins} ({localStats.local2p.matches} ván) • Bot ({botLabel}):{' '}
                  {localStats.bot[botDifficulty].wins}T/{localStats.bot[botDifficulty].losses}B
                </span>
              </div>
            </div>

            <BilliardsTouchCameraSettings
              prefs={touchPrefs}
              onChange={setTouchPrefs}
              showCameraRotation={true}
              showShotCameraMode={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BilliardsEntryMenu;
