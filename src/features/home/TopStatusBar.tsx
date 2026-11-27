import { Globe, Trees, Home, Sparkles, UserPlus, WifiOff } from 'lucide-react';
import type { ConnectionStatus } from '../../lib/backend/types';
import { getMapDefinition } from '../../shared/maps';
import { selectLatestPresenceByUser } from '../../shared/realtime';
import type { BackendMode, MapId, PresencePayload, WorldMember } from '../../shared/types';
import { AudioControlsChip } from './AudioControlsChip';

interface TopStatusBarProps {
  worldName: string;
  currentMapId: MapId;
  backendMode: BackendMode;
  connectionStatus: ConnectionStatus;
  members: WorldMember[];
  localUserId: string;
  presences: PresencePayload[];
  onOpenInvite: () => void;
  isRemoteClient?: boolean;
  onOpenRemoteShare?: () => void;
  onToggleDiagnostics?: () => void;
}

export function TopStatusBar({
  worldName,
  currentMapId,
  backendMode,
  connectionStatus,
  members,
  localUserId,
  presences,
  onOpenInvite,
  isRemoteClient = false,
  onOpenRemoteShare,
  onToggleDiagnostics,
}: TopStatusBarProps) {
  const partnerMember = members.find((m) => m.userId !== localUserId);
  const latestRemoteByUser = selectLatestPresenceByUser(presences, localUserId);
  const partnerPresence = partnerMember
    ? latestRemoteByUser.get(partnerMember.userId)
    : undefined;

  const connLabel =
    connectionStatus === 'connected'
      ? 'Trực tuyến'
      : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
        ? 'Đang kết nối lại...'
        : 'Đang mất mạng';

  const dotClass =
    connectionStatus === 'connected'
      ? 'status-dot'
      : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
        ? 'status-dot status-dot--reconnecting'
        : 'status-dot status-dot--offline';

  return (
    <header className="top-status-bar">
      <div className="status-group">
        <span className="pill" title={worldName}>
          {currentMapId === 'home' ? <Home size={14} /> : <Trees size={14} />}
          <span>{getMapDefinition(currentMapId).nameVi}</span>
        </span>

        {import.meta.env.DEV && backendMode === 'dev-lan' && !isRemoteClient && (
          <span className="pill pill--preview" data-testid="badge-dev-lan">
            <Sparkles size={13} /> Dev LAN
          </span>
        )}

        {import.meta.env.DEV && backendMode === 'dev-lan' && !isRemoteClient && onOpenRemoteShare && (
          <button
            type="button"
            className="pill"
            data-testid="btn-remote-share"
            onClick={onOpenRemoteShare}
            style={{ background: 'rgba(217, 119, 98, 0.28)', borderColor: '#e99683', cursor: 'pointer' }}
          >
            <Globe size={13} /> Chơi cùng người thương
          </button>
        )}
      </div>

      <div className="status-group">
        {!partnerMember ? (
          <button
            type="button"
            className="pill"
            style={{ background: 'rgba(217, 119, 98, 0.36)', borderColor: '#e99683' }}
            data-testid="btn-top-invite"
            onClick={onOpenInvite}
          >
            <UserPlus size={14} /> Mời người thương (1/2)
          </button>
        ) : partnerPresence ? (
          <span className="pill pill--partner-online" data-testid="partner-presence-pill">
            <span className="status-dot" />
            {partnerMember.nickname} đang ở {getMapDefinition(partnerPresence.mapId).nameVi}
          </span>
        ) : (
          <span className="pill" data-testid="partner-presence-pill">
            {partnerMember.nickname} đang nghỉ ngơi
          </span>
        )}

        {import.meta.env.DEV && onToggleDiagnostics ? (
          <button
            type="button"
            className={`pill ${connectionStatus === 'offline' ? 'pill--offline' : ''}`}
            data-testid="connection-pill"
            onClick={onToggleDiagnostics}
            title="Bật/tắt bảng chẩn đoán mạng"
            style={{ cursor: 'pointer' }}
          >
            {connectionStatus === 'offline' ? <WifiOff size={13} /> : <span className={dotClass} />}
            <span>{connLabel}</span>
          </button>
        ) : (
          <span
            className={`pill ${connectionStatus === 'offline' ? 'pill--offline' : ''}`}
            data-testid="connection-pill"
          >
            {connectionStatus === 'offline' ? <WifiOff size={13} /> : <span className={dotClass} />}
            <span>{connLabel}</span>
          </span>
        )}
        <AudioControlsChip />
      </div>
    </header>
  );
}
