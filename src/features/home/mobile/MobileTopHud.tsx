import { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Globe,
  Maximize2,
  Menu,
  Minimize2,
  RotateCw,
  UserPlus,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import { gameAudio, type GameAudioSettings } from '../../../game/audio/gameAudioManager';
import type { ConnectionStatus } from '../../../lib/backend/types';
import type { TimeOfDayMode } from '../../../shared/donor/ai-farm-xay-nha/dayCyclePresentation';
import { getMapDefinition, isOutdoorMapUnlocked } from '../../../shared/maps';
import { selectLatestPresenceByUser } from '../../../shared/realtime';
import type { BackendMode, MapId, PresencePayload, WorldMember } from '../../../shared/types';
import type { WorldClockPresentation } from '../../../shared/world/worldClock';
import { useGlobalViewport } from '../../../app/viewport/GlobalViewportContext';

interface MobileTopHudProps {
  worldName: string;
  currentMapId: MapId;
  backendMode: BackendMode;
  connectionStatus: ConnectionStatus;
  members: WorldMember[];
  localUserId: string;
  presences: PresencePayload[];
  clockPresentation: WorldClockPresentation | null;
  timeOfDayMode: TimeOfDayMode;
  walletCoins: number | null;
  hidden?: boolean;
  isRemoteClient?: boolean;
  onTimeOfDayModeChange: (mode: TimeOfDayMode) => void;
  onOpenMenu: () => void;
  onOpenInvite: () => void;
  onOpenOutdoorNav?: () => void;
  onOpenRemoteShare?: () => void;
  onToggleDiagnostics?: () => void;
}

function WeatherPixelIcon({ kind }: { kind: WorldClockPresentation['weather']['kind'] }) {
  const icon = kind === 'drizzle' ? 'rain' : kind === 'cloudy' ? 'cloud' : 'sun';
  return (
    <img
      src={`/assets/ui/hybrid/emotes/${icon}.png`}
      alt=""
      width={15}
      height={15}
      draggable={false}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    />
  );
}

export function MobileTopHud({
  currentMapId,
  backendMode,
  connectionStatus,
  members,
  localUserId,
  presences,
  clockPresentation,
  timeOfDayMode,
  walletCoins,
  hidden = false,
  isRemoteClient = false,
  onTimeOfDayModeChange,
  onOpenMenu,
  onOpenInvite,
  onOpenOutdoorNav,
  onOpenRemoteShare,
  onToggleDiagnostics,
}: MobileTopHudProps) {
  const {
    isFullscreenOrExpanded,
    manualRotateHint,
    toggleAppFullscreen,
  } = useGlobalViewport();

  const [openPopover, setOpenPopover] = useState<'clock' | 'status' | null>(null);
  const [dismissedHintKey, setDismissedHintKey] = useState<string | null>(null);
  const [audioSettings, setAudioSettings] = useState<GameAudioSettings>(() => gameAudio.getSettings());
  const hudRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => gameAudio.subscribe(setAudioSettings), []);

  useEffect(() => {
    if (!openPopover) return;
    const onOutside = (e: PointerEvent) => {
      if (!hudRef.current?.contains(e.target as Node)) {
        setOpenPopover(null);
      }
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [openPopover]);

  if (hidden) return null;

  const partnerMember = members.find((m) => m.userId !== localUserId);
  const latestRemoteByUser = selectLatestPresenceByUser(presences, localUserId);
  const partnerPresence = partnerMember
    ? latestRemoteByUser.get(partnerMember.userId)
    : undefined;

  const connDotClass =
    connectionStatus === 'connected'
      ? 'olw-m-dot olw-m-dot--ok'
      : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
        ? 'olw-m-dot olw-m-dot--warn'
        : 'olw-m-dot olw-m-dot--off';

  const connLabel =
    connectionStatus === 'connected'
      ? 'Trực tuyến'
      : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
        ? 'Đang kết nối lại...'
        : 'Đang mất mạng';

  const partnerShort = !partnerMember
    ? '1/2'
    : partnerMember.nickname;

  const timeIcon = clockPresentation?.clockIcon === 'moon' ? 'moon' : 'sun';
  const showWallet = walletCoins !== null && walletCoins !== undefined;
  const outdoorUnlocked = isOutdoorMapUnlocked();
  const effectiveMuted = audioSettings.muted || audioSettings.masterVolume <= 0.01;

  return (
    <div
      ref={hudRef}
      className="olw-mobile-top-hud"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Top-Left: Coins + Day/Time/Weather + Zone tag */}
      <div className="olw-mobile-top-left" data-testid="mobile-top-left-hud">
        <div
          className="olw-m-plaque"
          data-testid="world-clock-hud"
          role="group"
          aria-label="Thông tin thế giới"
        >
          {showWallet && (
            <span className="olw-m-plaque__seg olw-m-plaque__seg--coin" data-testid="world-clock-wallet">
              <img
                src="/assets/ui/hybrid/items/coin.png"
                alt="Xu"
                width={15}
                height={15}
                draggable={false}
                style={{ imageRendering: 'pixelated' }}
              />
              <strong>{walletCoins}</strong>
            </span>
          )}

          {clockPresentation && (
            <button
              type="button"
              className="olw-m-plaque__btn"
              data-testid="mobile-clock-toggle"
              aria-expanded={openPopover === 'clock'}
              aria-label="Thời gian & ánh sáng"
              onClick={() => setOpenPopover((cur) => (cur === 'clock' ? null : 'clock'))}
            >
              <img
                src={`/assets/ui/hybrid/emotes/${timeIcon}.png`}
                alt=""
                width={15}
                height={15}
                draggable={false}
                style={{ imageRendering: 'pixelated' }}
              />
              <span>
                N{clockPresentation.calendarDay} · {clockPresentation.timeLabelVi}
              </span>
              <WeatherPixelIcon kind={clockPresentation.weather.kind} />
            </button>
          )}
        </div>

        {outdoorUnlocked && onOpenOutdoorNav ? (
          <button
            type="button"
            className="olw-m-zone-chip"
            data-testid="mobile-zone-chip"
            onClick={onOpenOutdoorNav}
            title="Chuyển khu vực nhanh"
          >
            <Compass size={12} />
            <span>{getMapDefinition(currentMapId).nameVi}</span>
          </button>
        ) : (
          <span className="olw-m-zone-chip" data-testid="mobile-zone-chip">
            <span>{getMapDefinition(currentMapId).nameVi}</span>
          </span>
        )}

        {openPopover === 'clock' && clockPresentation && (
          <div className="olw-m-popover olw-m-popover--left" role="dialog" aria-label="Ánh sáng & thời tiết">
            <div className="olw-m-popover__title">
              Ngày {clockPresentation.calendarDay} · {clockPresentation.weather.labelVi}
            </div>
            <div className="olw-m-popover__list">
              {(
                [
                  ['auto', 'Ánh sáng theo giờ thật'],
                  ['day', 'Luôn ban ngày'],
                  ['night', 'Luôn ban đêm'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`olw-m-wood-btn olw-m-wood-btn--sm ${timeOfDayMode === value ? 'is-active' : ''}`}
                  aria-pressed={timeOfDayMode === value}
                  onClick={() => {
                    onTimeOfDayModeChange(value);
                    setOpenPopover(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top-Right: Compact Partner/Connection + Fullscreen + Menu */}
      <div className="olw-mobile-top-right" data-testid="mobile-top-right-hud">
        <button
          type="button"
          className={`olw-m-status-btn ${connectionStatus === 'offline' ? 'is-offline' : ''}`}
          data-testid="connection-pill"
          aria-expanded={openPopover === 'status'}
          aria-label={`Trạng thái kết nối: ${connLabel}`}
          onClick={() => setOpenPopover((cur) => (cur === 'status' ? null : 'status'))}
        >
          {connectionStatus === 'offline' ? (
            <WifiOff size={13} />
          ) : (
            <span className={connDotClass} aria-hidden />
          )}
          <span
            className="olw-m-status-btn__name"
            data-testid="partner-presence-pill"
          >
            {partnerShort}
          </span>
        </button>

        <button
          type="button"
          className={`olw-m-icon-btn ${isFullscreenOrExpanded ? 'is-active' : ''}`}
          data-testid="btn-global-fullscreen"
          aria-label={isFullscreenOrExpanded ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          aria-pressed={isFullscreenOrExpanded}
          title={isFullscreenOrExpanded ? 'Thu nhỏ màn hình' : 'Chơi toàn màn hình'}
          onClick={() => {
            void gameAudio.unlock();
            toggleAppFullscreen();
          }}
        >
          {isFullscreenOrExpanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>

        <button
          type="button"
          className="olw-m-icon-btn"
          data-testid="nav-menu"
          aria-label="Mở menu điều hướng"
          title="Menu & Khu vực"
          onClick={() => {
            setOpenPopover(null);
            onOpenMenu();
          }}
        >
          <Menu size={18} />
        </button>

        {openPopover === 'status' && (
          <div className="olw-m-popover olw-m-popover--right" role="dialog" aria-label="Kết nối & Âm thanh">
            <div className="olw-m-popover__row">
              <span className={connDotClass} />
              <strong>{connLabel}</strong>
            </div>
            <div className="olw-m-popover__sub">
              {!partnerMember ? (
                <button
                  type="button"
                  className="olw-m-wood-btn olw-m-wood-btn--sm"
                  data-testid="btn-top-invite"
                  onClick={() => {
                    setOpenPopover(null);
                    onOpenInvite();
                  }}
                >
                  <UserPlus size={14} /> Mời người thương (1/2)
                </button>
              ) : partnerPresence ? (
                <span>
                  {partnerMember.nickname} đang ở {getMapDefinition(partnerPresence.mapId).nameVi}
                </span>
              ) : (
                <span>{partnerMember.nickname} đang nghỉ ngơi</span>
              )}
            </div>

            <div className="olw-m-popover__audio">
              <button
                type="button"
                className="olw-m-wood-btn olw-m-wood-btn--sm"
                data-testid="btn-audio-controls"
                onClick={() => {
                  void gameAudio.unlock();
                  gameAudio.setSettings({ muted: !audioSettings.muted });
                }}
              >
                {effectiveMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{effectiveMuted ? 'Đang tắt tiếng' : `Âm lượng ${Math.round(audioSettings.masterVolume * 100)}%`}</span>
              </button>
              <input
                type="range"
                min={0}
                max={100}
                aria-label="Âm lượng tổng"
                value={Math.round(audioSettings.masterVolume * 100)}
                onChange={(e) => {
                  void gameAudio.unlock();
                  gameAudio.setSettings({
                    masterVolume: Number(e.target.value) / 100,
                    muted: false,
                  });
                }}
              />
            </div>

            {import.meta.env.DEV && backendMode === 'dev-lan' && !isRemoteClient && onOpenRemoteShare && (
              <button
                type="button"
                className="olw-m-wood-btn olw-m-wood-btn--sm"
                data-testid="btn-remote-share"
                onClick={() => {
                  setOpenPopover(null);
                  onOpenRemoteShare();
                }}
              >
                <Globe size={14} /> Chơi cùng người thương (DEV)
              </button>
            )}

            {import.meta.env.DEV && onToggleDiagnostics && (
              <button
                type="button"
                className="olw-m-wood-btn olw-m-wood-btn--sm"
                data-testid="btn-mobile-diagnostics"
                onClick={() => {
                  setOpenPopover(null);
                  onToggleDiagnostics();
                }}
              >
                Bảng chẩn đoán mạng (DEV)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Non-blocking rotation hint when iOS Safari cannot natively lock orientation */}
      {manualRotateHint && dismissedHintKey !== manualRotateHint && (
        <div className="olw-m-rotate-hint" data-testid="manual-rotate-hint" role="status">
          <RotateCw size={14} />
          <span>
            {manualRotateHint === 'rotate-to-landscape'
              ? 'Hãy xoay ngang điện thoại để chơi chế độ Ngang'
              : 'Hãy dựng dọc điện thoại để chơi chế độ Dọc'}
          </span>
          <button
            type="button"
            aria-label="Ẩn gợi ý xoay"
            onClick={() => setDismissedHintKey(manualRotateHint)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
