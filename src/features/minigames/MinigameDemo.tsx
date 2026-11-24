import { useState } from 'react';
import { BattleshipGame } from './BattleshipGame';
import { CaroGame } from './CaroGame';
import { MemoryGame } from './MemoryGame';
import { OthelloGame } from './OthelloGame';

type DemoGameId = 'caro' | 'othello' | 'memory' | 'battleship';

interface DemoTab {
  readonly id: DemoGameId;
  readonly label: string;
}

const DEMO_TABS: readonly DemoTab[] = [
  { id: 'caro', label: 'Caro' },
  { id: 'othello', label: 'Othello' },
  { id: 'memory', label: 'Lật thẻ' },
  { id: 'battleship', label: 'Bắn tàu' },
];

/**
 * Dev-only switching surface for the four local (same-device) mini-games.
 * Mounted by `src/minigamesDemo.tsx` through `minigames.html`.
 */
export function MinigameDemo() {
  const [activeId, setActiveId] = useState<DemoGameId>('caro');
  const activeLabel =
    DEMO_TABS.find((tab) => tab.id === activeId)?.label ?? 'Mini-game';

  return (
    <main className="mn-demo">
      <header className="mn-demo-header">
        <h1 className="mn-demo-title">Góc mini-game của đôi mình</h1>
        <p className="mn-demo-subtitle">
          Chơi cùng nhau trên một thiết bị. Không xếp hạng, không cược, không mất
          đồ.
        </p>
      </header>

      <nav className="mn-tabs" role="tablist" aria-label="Chọn mini-game">
        {DEMO_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`minigame-tab-control-${tab.id}`}
            aria-selected={activeId === tab.id}
            aria-controls="minigame-panel"
            className={
              activeId === tab.id ? 'mn-tab mn-tab--active' : 'mn-tab'
            }
            data-testid={`minigame-tab-${tab.id}`}
            onClick={() => setActiveId(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div
        className="mn-panel"
        id="minigame-panel"
        role="tabpanel"
        aria-label={activeLabel}
        data-testid="minigame-panel"
      >
        {activeId === 'caro' ? <CaroGame /> : null}
        {activeId === 'othello' ? <OthelloGame /> : null}
        {activeId === 'memory' ? <MemoryGame /> : null}
        {activeId === 'battleship' ? <BattleshipGame /> : null}
      </div>

      <p className="mn-demo-note">Trang xem thử cục bộ, không phải bản phát hành.</p>
    </main>
  );
}
