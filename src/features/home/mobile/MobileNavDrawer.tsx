import { useEffect, useState } from 'react';
import {
  Armchair,
  Backpack,
  BookOpen,
  Bug,
  Cat,
  CircleDot,
  ClipboardCheck,
  Compass,
  Factory,
  Fish,
  FlaskConical,
  Flower2,
  Gamepad2,
  Globe,
  Home,
  LogOut,
  Mail,
  Maximize2,
  Minimize2,
  RotateCcw,
  Shirt,
  Smartphone,
  Sparkles,
  Sprout,
  Trees,
  UserCheck,
  UserPlus,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ART_ATLAS_PATH } from '../../../game/art/atlasProfile';
import { gameAudio, type GameAudioSettings } from '../../../game/audio/gameAudioManager';
import type { LocalPresetAccountId } from '../../../lib/backend/types';
import { isOutdoorMapUnlocked } from '../../../shared/maps';
import type { BackendMode, MapId } from '../../../shared/types';
import { useGlobalViewport } from '../../../app/viewport/GlobalViewportContext';

const OUTDOOR_GROUP_IDS: MapId[] = [
  'village',
  'beach',
  'shop',
  'shop_seed',
  'shop_tool',
  'shop_crop_market',
  'shop_town_hall',
  'forest',
  'outdoor',
];

interface MobileNavDrawerProps {
  open: boolean;
  worldName: string;
  currentMapId: MapId;
  decorateActive: boolean;
  backendMode: BackendMode;
  mailboxUnreadCount?: number;
  isRemoteClient?: boolean;
  onSelectMap: (mapId: MapId) => void;
  onOpenOutdoorNav?: () => void;
  onToggleDecorate: () => void;
  onOpenAvatar: () => void;
  onOpenInvite: () => void;
  onOpenInventory?: () => void;
  onOpenPet?: () => void;
  onOpenStudy?: () => void;
  onOpenMailbox?: () => void;
  onOpenBilliards?: () => void;
  onOpenFlowerOrchard?: () => void;
  onOpenLivestock?: () => void;
  onOpenDonorWorkshop?: () => void;
  onOpenOrderBoard?: () => void;
  onOpenPwaGuide: () => void;
  onOpenSpikeLab?: () => void;
  onOpenDevConsole?: () => void;
  onOpenV03Prototypes?: () => void;
  onOpenDonorFishing?: () => void;
  onQuickSwitchDev?: (preset: LocalPresetAccountId) => void;
  onResetDevWorld?: () => void;
  onOpenRemoteShare?: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

export function MobileNavDrawer({
  open,
  worldName,
  currentMapId,
  decorateActive,
  backendMode,
  mailboxUnreadCount = 0,
  isRemoteClient = false,
  onSelectMap,
  onOpenOutdoorNav,
  onToggleDecorate,
  onOpenAvatar,
  onOpenInvite,
  onOpenInventory,
  onOpenPet,
  onOpenStudy,
  onOpenMailbox,
  onOpenBilliards,
  onOpenFlowerOrchard,
  onOpenLivestock,
  onOpenDonorWorkshop,
  onOpenOrderBoard,
  onOpenPwaGuide,
  onOpenSpikeLab,
  onOpenDevConsole,
  onOpenV03Prototypes,
  onOpenDonorFishing,
  onQuickSwitchDev,
  onResetDevWorld,
  onOpenRemoteShare,
  onSignOut,
  onClose,
}: MobileNavDrawerProps) {
  const {
    isFullscreenOrExpanded,
    canLockOrientation,
    orientationPreference,
    joystickMode,
    joystickEnabled,
    setOrientationPreference,
    setJoystickMode,
    setJoystickEnabled,
    toggleAppFullscreen,
  } = useGlobalViewport();

  const [audioSettings, setAudioSettings] = useState<GameAudioSettings>(() => gameAudio.getSettings());
  useEffect(() => gameAudio.subscribe(setAudioSettings), []);

  if (!open) return null;

  const outdoorUnlocked = isOutdoorMapUnlocked();
  const showDevSection = import.meta.env.DEV && !isRemoteClient;
  const effectiveMuted = audioSettings.muted || audioSettings.masterVolume <= 0.01;

  return (
    <div
      className="modal-backdrop olw-m-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Menu điều hướng và tính năng"
      data-testid="mobile-nav-drawer"
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="olw-m-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="olw-m-drawer__header">
          <div>
            <h2 className="olw-m-drawer__title">{worldName}</h2>
            <span className="olw-m-drawer__subtitle">Điều hướng &amp; Tiện ích</span>
          </div>
          <button
            type="button"
            className="olw-m-icon-btn"
            onClick={onClose}
            aria-label="Đóng menu"
            data-testid="mobile-nav-close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="olw-m-drawer__scroll">
          {/* 1. Destinations & Core World Actions */}
          <section className="olw-m-drawer__section">
            <div className="olw-m-drawer__section-label">Khu vực &amp; Tùy biến</div>
            <div className="olw-m-drawer__grid">
              <button
                type="button"
                className={`olw-m-wood-btn ${currentMapId === 'home' && !decorateActive ? 'is-active' : ''}`}
                data-testid="nav-home"
                onClick={() => {
                  onClose();
                  onSelectMap('home');
                }}
              >
                <Home size={16} /> <span>Nhà</span>
              </button>

              <button
                type="button"
                className={`olw-m-wood-btn ${currentMapId === 'garden' && !decorateActive ? 'is-active' : ''}`}
                data-testid="nav-garden"
                onClick={() => {
                  onClose();
                  onSelectMap('garden');
                }}
              >
                <Sprout size={16} /> <span>Vườn nhà</span>
              </button>

              <button
                type="button"
                className={`olw-m-wood-btn ${currentMapId === 'farm' && !decorateActive ? 'is-active' : ''}`}
                data-testid="nav-farm"
                onClick={() => {
                  onClose();
                  onSelectMap('farm');
                }}
              >
                <Trees size={16} /> <span>Trang trại</span>
              </button>

              {outdoorUnlocked && (
                <button
                  type="button"
                  className={`olw-m-wood-btn ${OUTDOOR_GROUP_IDS.includes(currentMapId) && !decorateActive ? 'is-active' : ''}`}
                  data-testid="nav-outdoor"
                  onClick={() => {
                    onClose();
                    if (onOpenOutdoorNav) onOpenOutdoorNav();
                    else onSelectMap('village');
                  }}
                >
                  <Compass size={16} /> <span>Khám phá</span>
                </button>
              )}

              <button
                type="button"
                className={`olw-m-wood-btn ${decorateActive ? 'is-active' : ''}`}
                data-testid="nav-decorate"
                onClick={() => {
                  onClose();
                  onToggleDecorate();
                }}
              >
                <Armchair size={16} /> <span>Trang trí</span>
              </button>

              <button
                type="button"
                className="olw-m-wood-btn"
                data-testid="nav-avatar"
                onClick={() => {
                  onClose();
                  onOpenAvatar();
                }}
              >
                <Shirt size={16} /> <span>Ngoại hình</span>
              </button>
            </div>
          </section>

          {/* 2. Gameplay Activities */}
          <section className="olw-m-drawer__section">
            <div className="olw-m-drawer__section-label">Sinh hoạt cùng nhau</div>
            <div className="olw-m-drawer__grid olw-m-drawer__grid--2col">
              {onOpenInventory && (
                <button
                  type="button"
                  className="olw-m-wood-btn"
                  data-testid="menu-inventory"
                  onClick={() => {
                    onClose();
                    onOpenInventory();
                  }}
                >
                  <Backpack size={16} /> <span>Túi đồ</span>
                </button>
              )}
              {onOpenPet && (
                <button
                  type="button"
                  className="olw-m-wood-btn"
                  data-testid="menu-pet"
                  onClick={() => {
                    onClose();
                    onOpenPet();
                  }}
                >
                  <Cat size={16} /> <span>Bé mèo Quýt</span>
                </button>
              )}
              {onOpenStudy && (
                <button
                  type="button"
                  className="olw-m-wood-btn"
                  data-testid="menu-study"
                  onClick={() => {
                    onClose();
                    onOpenStudy();
                  }}
                >
                  <BookOpen size={16} /> <span>Phòng học</span>
                </button>
              )}
              {onOpenMailbox && (
                <button
                  type="button"
                  className="olw-m-wood-btn"
                  data-testid="menu-mailbox"
                  onClick={() => {
                    onClose();
                    onOpenMailbox();
                  }}
                >
                  <Mail size={16} />
                  <span>Hộp thư{mailboxUnreadCount > 0 ? ` (${mailboxUnreadCount})` : ''}</span>
                </button>
              )}
              {onOpenBilliards && (
                <button
                  type="button"
                  className="olw-m-wood-btn"
                  data-testid="menu-billiards"
                  onClick={() => {
                    onClose();
                    onOpenBilliards();
                  }}
                >
                  <CircleDot size={16} /> <span>Bi-a 8 &amp; 9 bi</span>
                </button>
              )}
              {onOpenFlowerOrchard && (
                <button
                  type="button"
                  className="olw-m-wood-btn"
                  data-testid="menu-flower-orchard"
                  onClick={() => {
                    onClose();
                    onOpenFlowerOrchard();
                  }}
                >
                  <Flower2 size={16} /> <span>Hoa &amp; Vườn cây</span>
                </button>
              )}
              {onOpenLivestock && (
                <button
                  type="button"
                  className="olw-m-wood-btn"
                  data-testid="menu-livestock"
                  onClick={() => {
                    onClose();
                    onOpenLivestock();
                  }}
                >
                  <Cat size={16} /> <span>Chuồng vật nuôi</span>
                </button>
              )}
              {onOpenDonorWorkshop && (
                <button
                  type="button"
                  className="olw-m-wood-btn"
                  data-testid="menu-workshops"
                  onClick={() => {
                    onClose();
                    onOpenDonorWorkshop();
                  }}
                >
                  <Factory size={16} /> <span>Xưởng chế biến</span>
                </button>
              )}
              {onOpenOrderBoard && (
                <button
                  type="button"
                  className="olw-m-wood-btn"
                  data-testid="menu-order-board"
                  onClick={() => {
                    onClose();
                    onOpenOrderBoard();
                  }}
                >
                  <ClipboardCheck size={16} /> <span>Đơn hàng làng</span>
                </button>
              )}
              <button
                type="button"
                className="olw-m-wood-btn"
                data-testid="menu-invite"
                onClick={() => {
                  onClose();
                  onOpenInvite();
                }}
              >
                <UserPlus size={16} /> <span>Ghép cặp &amp; Mời</span>
              </button>
            </div>
          </section>

          {/* 3. Touch Controls, Orientation & Fullscreen */}
          <section className="olw-m-drawer__section">
            <div className="olw-m-drawer__section-label">Điều khiển &amp; Màn hình</div>

            <div className="olw-m-drawer__control-row">
              <span>
                <Gamepad2 size={14} /> Cần điều khiển
              </span>
              <div className="olw-m-segmented">
                <button
                  type="button"
                  className={joystickEnabled && joystickMode === 'fixed' ? 'is-active' : ''}
                  data-testid="joystick-mode-fixed"
                  onClick={() => {
                    setJoystickEnabled(true);
                    setJoystickMode('fixed');
                  }}
                >
                  Cố định
                </button>
                <button
                  type="button"
                  className={joystickEnabled && joystickMode === 'floating' ? 'is-active' : ''}
                  data-testid="joystick-mode-floating"
                  onClick={() => {
                    setJoystickEnabled(true);
                    setJoystickMode('floating');
                  }}
                >
                  Tự do
                </button>
                <button
                  type="button"
                  className={!joystickEnabled ? 'is-active' : ''}
                  data-testid="joystick-mode-off"
                  onClick={() => setJoystickEnabled(false)}
                >
                  Ẩn
                </button>
              </div>
            </div>

            <div className="olw-m-drawer__control-row">
              <span>Hướng màn hình</span>
              <div className="olw-m-segmented">
                <button
                  type="button"
                  className={orientationPreference === 'auto' ? 'is-active' : ''}
                  data-testid="orient-auto"
                  onClick={() => setOrientationPreference('auto')}
                >
                  Tự động
                </button>
                <button
                  type="button"
                  className={orientationPreference === 'portrait' ? 'is-active' : ''}
                  data-testid="orient-portrait"
                  onClick={() => setOrientationPreference('portrait')}
                >
                  Dọc
                </button>
                <button
                  type="button"
                  className={orientationPreference === 'landscape' ? 'is-active' : ''}
                  data-testid="orient-landscape"
                  onClick={() => setOrientationPreference('landscape')}
                >
                  Ngang
                </button>
              </div>
            </div>
            {!canLockOrientation && orientationPreference !== 'auto' && (
              <p className="olw-m-drawer__note">
                Trình duyệt hiện tại không hỗ trợ khóa xoay tự động — bạn hãy xoay điện thoại bằng tay theo hướng đã chọn.
              </p>
            )}

            <div className="olw-m-drawer__grid olw-m-drawer__grid--2col" style={{ marginTop: 6 }}>
              <button
                type="button"
                className={`olw-m-wood-btn ${isFullscreenOrExpanded ? 'is-active' : ''}`}
                onClick={() => {
                  toggleAppFullscreen();
                  onClose();
                }}
              >
                {isFullscreenOrExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                <span>{isFullscreenOrExpanded ? 'Thoát toàn màn hình' : 'Chế độ toàn màn hình'}</span>
              </button>

              <button
                type="button"
                className="olw-m-wood-btn"
                data-testid="menu-pwa-guide"
                onClick={() => {
                  onClose();
                  onOpenPwaGuide();
                }}
              >
                <Smartphone size={16} /> <span>Thêm lên MH chính</span>
              </button>
            </div>
          </section>

          {/* 4. Audio Settings */}
          <section className="olw-m-drawer__section">
            <div className="olw-m-drawer__section-label">Âm thanh</div>
            <div className="olw-m-drawer__audio-box">
              <button
                type="button"
                className="olw-m-wood-btn olw-m-wood-btn--sm"
                onClick={() => {
                  void gameAudio.unlock();
                  gameAudio.setSettings({ muted: !audioSettings.muted });
                }}
              >
                {effectiveMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{effectiveMuted ? 'Bật tiếng' : 'Tắt tiếng'}</span>
              </button>
              <label>
                <span>Nhạc nền ({Math.round(audioSettings.musicVolume * 100)}%)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(audioSettings.musicVolume * 100)}
                  onChange={(e) => {
                    void gameAudio.unlock();
                    gameAudio.setSettings({ musicVolume: Number(e.target.value) / 100 });
                  }}
                />
              </label>
              <label>
                <span>Hiệu ứng ({Math.round(audioSettings.sfxVolume * 100)}%)</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(audioSettings.sfxVolume * 100)}
                  onChange={(e) => {
                    void gameAudio.unlock();
                    gameAudio.setSettings({ sfxVolume: Number(e.target.value) / 100 });
                  }}
                />
              </label>
            </div>
          </section>

          {/* 5. DEV Section (strictly isolated behind import.meta.env.DEV) */}
          {showDevSection && (
            <section className="olw-m-drawer__section olw-m-drawer__section--dev">
              <div className="olw-m-drawer__section-label">Công cụ phát triển (DEV)</div>
              <div className="olw-m-drawer__grid olw-m-drawer__grid--2col">
                {backendMode === 'dev-lan' && onOpenRemoteShare && (
                  <button
                    type="button"
                    className="olw-m-wood-btn olw-m-wood-btn--sm"
                    data-testid="menu-remote-share"
                    onClick={() => {
                      onClose();
                      onOpenRemoteShare();
                    }}
                  >
                    <Globe size={14} /> <span>Link HTTPS</span>
                  </button>
                )}
                {onOpenSpikeLab && (
                  <button
                    type="button"
                    className="olw-m-wood-btn olw-m-wood-btn--sm"
                    data-testid="menu-spike-lab"
                    onClick={() => {
                      onClose();
                      onOpenSpikeLab();
                    }}
                  >
                    <FlaskConical size={14} /> <span>Spike 0 Lab</span>
                  </button>
                )}
                {onOpenDevConsole && (
                  <button
                    type="button"
                    className="olw-m-wood-btn olw-m-wood-btn--sm"
                    data-testid="menu-dev-console"
                    onClick={() => {
                      onClose();
                      onOpenDevConsole();
                    }}
                  >
                    <Bug size={14} /> <span>Dev Console</span>
                  </button>
                )}
                {backendMode === 'dev-lan' && onOpenDonorFishing && (
                  <button
                    type="button"
                    className="olw-m-wood-btn olw-m-wood-btn--sm"
                    data-testid="menu-donor-fishing"
                    onClick={() => {
                      onClose();
                      onOpenDonorFishing();
                    }}
                  >
                    <Fish size={14} /> <span>Thử câu cá</span>
                  </button>
                )}
                {onOpenV03Prototypes && (
                  <button
                    type="button"
                    className="olw-m-wood-btn olw-m-wood-btn--sm"
                    data-testid="menu-v03-prototypes"
                    onClick={() => {
                      onClose();
                      onOpenV03Prototypes();
                    }}
                  >
                    <Sparkles size={14} /> <span>V0.3 Proto</span>
                  </button>
                )}
                {backendMode === 'dev-lan' && onQuickSwitchDev && (
                  <>
                    <button
                      type="button"
                      className="olw-m-wood-btn olw-m-wood-btn--sm"
                      onClick={() => {
                        onClose();
                        onQuickSwitchDev('partner-a');
                      }}
                    >
                      <UserCheck size={14} /> <span>Vai Mây</span>
                    </button>
                    <button
                      type="button"
                      className="olw-m-wood-btn olw-m-wood-btn--sm"
                      onClick={() => {
                        onClose();
                        onQuickSwitchDev('partner-b');
                      }}
                    >
                      <UserCheck size={14} /> <span>Vai Nắng</span>
                    </button>
                  </>
                )}
                {backendMode === 'dev-lan' && onResetDevWorld && (
                  <button
                    type="button"
                    className="olw-m-wood-btn olw-m-wood-btn--sm"
                    data-testid="menu-dev-reset"
                    onClick={() => {
                      onClose();
                      onResetDevWorld();
                    }}
                  >
                    <RotateCcw size={14} /> <span>Đặt lại Dev</span>
                  </button>
                )}
              </div>
            </section>
          )}

          <div className="olw-m-drawer__footer">
            <a
              className="olw-m-wood-btn olw-m-wood-btn--sm"
              href={ART_ATLAS_PATH + '/CREDITS.md'}
              target="_blank"
              rel="noopener"
            >
              Nguồn hình ảnh
            </a>
            <button
              type="button"
              className="olw-m-wood-btn olw-m-wood-btn--danger"
              onClick={() => {
                onClose();
                onSignOut();
              }}
            >
              <LogOut size={15} /> <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
