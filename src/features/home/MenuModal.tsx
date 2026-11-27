import { ART_ATLAS_PATH } from '../../game/art/atlasProfile';
import {
  Backpack,
  BookOpen,
  Bug,
  Cat,
  CircleDot,
  ClipboardCheck,
  Factory,
  Fish,
  FlaskConical,
  Flower2,
  Gamepad2,
  Globe,
  LogOut,
  Mail,
  RotateCcw,
  Smartphone,
  Sparkles,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import type { LocalPresetAccountId } from '../../lib/backend/types';
import type { BackendMode } from '../../shared/types';

interface MenuModalProps {
  worldName: string;
  backendMode: BackendMode;
  showJoystick: boolean;
  onToggleJoystick: () => void;
  onOpenInvite: () => void;
  onOpenInventory?: () => void;
  onOpenPet?: () => void;
  onOpenStudy?: () => void;
  onOpenMailbox?: () => void;
  mailboxUnreadCount?: number;
  onOpenBilliards?: () => void;
  onOpenPwaGuide: () => void;
  onOpenSpikeLab: () => void;
  onOpenDevConsole?: () => void;
  onOpenV03Prototypes?: () => void;
  onQuickSwitchDev?: (preset: LocalPresetAccountId) => void;
  onResetDevWorld?: () => void;
  onOpenDonorWorkshop?: () => void;
  onOpenDonorFishing?: () => void;
  onOpenFlowerOrchard?: () => void;
  onOpenLivestock?: () => void;
  onOpenOrderBoard?: () => void;
  onOpenRemoteShare?: () => void;
  isRemoteClient?: boolean;
  onSignOut: () => void;
  onClose: () => void;
}

export function MenuModal({
  worldName,
  backendMode,
  showJoystick,
  onToggleJoystick,
  onOpenInvite,
  onOpenInventory,
  onOpenPet,
  onOpenStudy,
  onOpenMailbox,
  mailboxUnreadCount = 0,
  onOpenBilliards,
  onOpenPwaGuide,
  onOpenSpikeLab,
  onOpenDevConsole,
  onOpenV03Prototypes,
  onQuickSwitchDev,
  onResetDevWorld,
  onOpenDonorWorkshop,
  onOpenDonorFishing,
  onOpenFlowerOrchard,
  onOpenLivestock,
  onOpenOrderBoard,
  onOpenRemoteShare,
  isRemoteClient = false,
  onSignOut,
  onClose,
}: MenuModalProps) {
  const showDevSection = import.meta.env.DEV && !isRemoteClient;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Menu chính">
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">{worldName}</h2>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <button
          type="button"
          className="btn btn--secondary"
          data-testid="menu-invite"
          onClick={() => {
            onClose();
            onOpenInvite();
          }}
        >
          <UserPlus size={17} /> Ghép cặp &amp; Mã mời
        </button>

        {onOpenInventory && (
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="menu-inventory"
            onClick={() => {
              onClose();
              onOpenInventory();
            }}
          >
            <Backpack size={17} /> Túi đồ &amp; Hạt mèo (0₫)
          </button>
        )}

        {onOpenPet && (
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="menu-pet"
            onClick={() => {
              onClose();
              onOpenPet();
            }}
          >
            <Cat size={17} /> Bé mèo cam
          </button>
        )}

        {onOpenStudy && (
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="menu-study"
            onClick={() => {
              onClose();
              onOpenStudy();
            }}
          >
            <BookOpen size={17} /> Phòng học yên tĩnh (Pomodoro)
          </button>
        )}

        {onOpenMailbox && (
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="menu-mailbox"
            onClick={() => {
              onClose();
              onOpenMailbox();
            }}
          >
            <Mail size={17} /> Hộp thư &amp; Quà{mailboxUnreadCount > 0 ? ` (${mailboxUnreadCount} mới)` : ''}
          </button>
        )}

        {onOpenBilliards && (
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="menu-billiards"
            onClick={() => {
              onClose();
              onOpenBilliards();
            }}
          >
            <CircleDot size={17} /> Bi-a 8 &amp; 9 bi
          </button>
        )}

        {onOpenFlowerOrchard && (
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="menu-flower-orchard"
            onClick={() => {
              onClose();
              onOpenFlowerOrchard();
            }}
          >
            <Flower2 size={17} /> Hoa lai &amp; Vườn cây ăn quả
          </button>
        )}

        {onOpenLivestock && (
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="menu-livestock"
            onClick={() => {
              onClose();
              onOpenLivestock();
            }}
          >
            <Cat size={17} /> Chuồng vật nuôi chung
          </button>
        )}

        {onOpenDonorWorkshop && (
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="menu-workshops"
            onClick={() => {
              onClose();
              onOpenDonorWorkshop();
            }}
          >
            <Factory size={17} /> Xưởng chế biến 8 nghề
          </button>
        )}

        {onOpenOrderBoard && (
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="menu-order-board"
            onClick={() => {
              onClose();
              onOpenOrderBoard();
            }}
          >
            <ClipboardCheck size={17} /> Bảng Đơn Hàng Làng
          </button>
        )}

        <button type="button" className="btn btn--secondary" onClick={onToggleJoystick}>
          <Gamepad2 size={17} />
          {showJoystick ? 'Ẩn cần điều khiển trên màn hình' : 'Hiện cần điều khiển trên màn hình'}
        </button>

        <button
          type="button"
          className="btn btn--secondary"
          data-testid="menu-pwa-guide"
          onClick={() => {
            onClose();
            onOpenPwaGuide();
          }}
        >
          <Smartphone size={17} /> Thêm lên màn hình chính (iPhone)
        </button>

        {showDevSection && (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: 'var(--surface-warm)',
              border: '1px solid var(--border-honey)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-muted)' }}>
              Công cụ kiểm thử (Chỉ hiển thị trong Development)
            </div>

            {backendMode === 'dev-lan' && onOpenRemoteShare && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                data-testid="menu-remote-share"
                onClick={() => {
                  onClose();
                  onOpenRemoteShare();
                }}
              >
                <Globe size={16} /> Chơi cùng người thương (Link HTTPS)
              </button>
            )}

            <button
              type="button"
              className="btn btn--secondary btn--sm"
              data-testid="menu-spike-lab"
              onClick={() => {
                onClose();
                onOpenSpikeLab();
              }}
            >
              <FlaskConical size={16} /> Spike 0 Lab (Đo hiệu năng &amp; Video Sync PoC)
            </button>

            {onOpenDevConsole && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                data-testid="menu-dev-console"
                onClick={() => {
                  onClose();
                  onOpenDevConsole();
                }}
              >
                <Bug size={16} /> Dev Console K6 (Ctrl+Shift+D)
              </button>
            )}

            {backendMode === 'dev-lan' && onOpenDonorWorkshop && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                data-testid="menu-donor-workshop"
                onClick={() => {
                  onClose();
                  onOpenDonorWorkshop();
                }}
              >
                <Factory size={16} /> Xưởng chế biến ruộng
              </button>
            )}

            {backendMode === 'dev-lan' && onOpenDonorFishing && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                data-testid="menu-donor-fishing"
                onClick={() => {
                  onClose();
                  onOpenDonorFishing();
                }}
              >
                <Fish size={16} /> Thử cầu cá ngoài trời
              </button>
            )}

            {onOpenV03Prototypes && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                data-testid="menu-v03-prototypes"
                onClick={() => {
                  onClose();
                  onOpenV03Prototypes();
                }}
              >
                <Sparkles size={16} /> Prototype UI V0.3 (Dev-only)
              </button>
            )}

            {backendMode === 'dev-lan' && onQuickSwitchDev && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => {
                    onClose();
                    onQuickSwitchDev('partner-a');
                  }}
                >
                  <UserCheck size={14} /> Vai Mây
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => {
                    onClose();
                    onQuickSwitchDev('partner-b');
                  }}
                >
                  <UserCheck size={14} /> Vai Nắng
                </button>
                {onResetDevWorld && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    data-testid="menu-dev-reset"
                    onClick={() => {
                      onClose();
                      onResetDevWorld();
                    }}
                  >
                    <RotateCcw size={14} /> Đặt lại nhà Dev
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <a className="btn btn--secondary btn--sm" href={ART_ATLAS_PATH + '/CREDITS.md'} target="_blank" rel="noopener">
          Nguồn hình ảnh
        </a>
        <button type="button" className="btn btn--danger" onClick={onSignOut}>
          <LogOut size={17} /> Đăng xuất
        </button>
      </div>
    </div>
  );
}
