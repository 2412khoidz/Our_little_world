import { Armchair, Compass, Home, Menu, Shirt, Sprout, Trees } from 'lucide-react';
import { isOutdoorMapUnlocked } from '../../shared/maps';
import type { MapId } from '../../shared/types';

const DONOR_WORLD_NAV_IDS: MapId[] = ['village', 'beach', 'shop', 'forest', 'outdoor'];

interface QuickNavBarProps {
  hidden?: boolean;
  currentMapId: MapId;
  decorateActive: boolean;
  onSelectMap: (mapId: MapId) => void;
  onToggleDecorate: () => void;
  onOpenAvatar: () => void;
  onOpenMenu: () => void;
}

export function QuickNavBar({
  hidden = false,
  currentMapId,
  decorateActive,
  onSelectMap,
  onToggleDecorate,
  onOpenAvatar,
  onOpenMenu,
}: QuickNavBarProps) {
  if (hidden) return null;
  const outdoorUnlocked = isOutdoorMapUnlocked();
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
        <Sprout size={19} />
        <span>Vườn nhà</span>
      </button>

      <button
        type="button"
        className={`nav-btn ${currentMapId === 'farm' && !decorateActive ? 'nav-btn--active' : ''}`}
        data-testid="nav-farm"
        onClick={() => onSelectMap('farm')}
      >
        <Trees size={19} />
        <span>Trang trại</span>
      </button>

      {outdoorUnlocked && (
        <button
          type="button"
          className={`nav-btn ${DONOR_WORLD_NAV_IDS.includes(currentMapId) && !decorateActive ? 'nav-btn--active' : ''}`}
          data-testid="nav-outdoor"
          onClick={() => onSelectMap('village')}
        >
          <Compass size={19} />
          <span>Làng</span>
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