import {
  FlaskConical,
  Gamepad2,
  LogOut,
  RotateCcw,
  Smartphone,
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
  onOpenPwaGuide: () => void;
  onOpenSpikeLab: () => void;
  onQuickSwitchDev?: (preset: LocalPresetAccountId) => void;
  onResetDevWorld?: () => void;
  onSignOut: () => void;
  onClose: () => void;
}

export function MenuModal({
  worldName,
  backendMode,
  showJoystick,
  onToggleJoystick,
  onOpenInvite,
  onOpenPwaGuide,
  onOpenSpikeLab,
  onQuickSwitchDev,
  onResetDevWorld,
  onSignOut,
  onClose,
}: MenuModalProps) {
  const showDevSection = import.meta.env.DEV;

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

        <button type="button" className="btn btn--danger" onClick={onSignOut}>
          <LogOut size={17} /> Đăng xuất
        </button>
      </div>
    </div>
  );
}
