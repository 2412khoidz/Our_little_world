import { Armchair, Compass, Home, Menu, Shirt, Trees } from 'lucide-react';
import { isMeadowMapUnlocked } from '../../shared/maps';
import type { MapId } from '../../shared/types';

interface QuickNavBarProps {
  currentMapId: MapId;
  decorateActive: boolean;
  onSelectMap: (mapId: MapId) => void;
  onToggleDecorate: () => void;
  onOpenAvatar: () => void;
  onOpenMenu: () => void;
}

export function QuickNavBar({
  currentMapId,
  decorateActive,
  onSelectMap,
  onToggleDecorate,
  onOpenAvatar,
  onOpenMenu,
}: QuickNavBarProps) {
  const meadowUnlocked = isMeadowMapUnlocked();
  return (
    <nav className="quick-nav" aria-label="Điều hướng nhanh">
      <button
        type="button"
        className={`nav-btn ${currentMapId === 'home' && !decorateActive ? 'nav-btn--active' : ''}`}
        data-testid="nav-home"
        onClick={() => onSelectMap('home')}
      >
        <Home size={19} />
        <span>Nhà</span>
      </button>

      <button
        type="button"
        className={`nav-btn ${currentMapId === 'garden' && !decorateActive ? 'nav-btn--active' : ''}`}
        data-testid="nav-garden"
        onClick={() => onSelectMap('garden')}
      >
        <Trees size={19} />
        <span>Vườn</span>
      </button>

      {meadowUnlocked && (
        <button
          type="button"
          className={`nav-btn ${currentMapId === 'meadow' && !decorateActive ? 'nav-btn--active' : ''}`}
          data-testid="nav-meadow"
          onClick={() => onSelectMap('meadow')}
        >
          <Compass size={19} />
          <span>Đồng cỏ</span>
        </button>
      )}

      <button
        type="button"
        className={`nav-btn ${decorateActive ? 'nav-btn--active' : ''}`}
        data-testid="nav-decorate"
        onClick={onToggleDecorate}
      >
        <Armchair size={19} />
        <span>Trang trí</span>
      </button>

      <button
        type="button"
        className="nav-btn"
        data-testid="nav-avatar"
        onClick={onOpenAvatar}
      >
        <Shirt size={19} />
        <span>Ngoại hình</span>
      </button>

      <button
        type="button"
        className="nav-btn"
        data-testid="nav-menu"
        onClick={onOpenMenu}
      >
        <Menu size={19} />
        <span>Menu</span>
      </button>
    </nav>
  );
}
