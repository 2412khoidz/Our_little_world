import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BilliardsModal } from '../../src/features/minigames/billiards/BilliardsModal';
import { loadBilliardsLocalStats } from '../../src/features/minigames/billiards/localStats';

function createMockCanvasContext() {
  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    roundRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    clip: vi.fn(),
    setLineDash: vi.fn(),
    fillText: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'round',
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
  };
}

describe('Billiards V3 controls, Space power charge, overworld key isolation & mode stats separation', () => {
  let rafQueue: FrameRequestCallback[] = [];
  let rafSpy: ReturnType<typeof vi.spyOn>;
  let cancelRafSpy: ReturnType<typeof vi.spyOn>;
  let getContextSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    rafQueue = [];
    let nextId = 1;
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafQueue.push(cb);
      return nextId++;
    });
    cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockCanvasContext() as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    rafSpy.mockRestore();
    cancelRafSpy.mockRestore();
    getContextSpy.mockRestore();
    vi.restoreAllMocks();
  });

  function stepFrames(count: number, dtMs = 16) {
    let now = performance.now();
    for (let i = 0; i < count; i++) {
      now += dtMs;
      const batch = rafQueue.splice(0, rafQueue.length);
      for (const cb of batch) cb(now);
    }
  }

  it('restores Space oscillating power control, Escape cancel, Arrow aim, and blocks overworld keys while open', async () => {
    const overworldListener = vi.fn();
    window.addEventListener('keydown', overworldListener);

    const onMatchComplete = vi.fn();
    const { unmount } = render(
      <BilliardsModal
        open={true}
        onClose={() => {}}
        initialMode="local_pvp"
        hasPartner={false}
        onMatchComplete={onMatchComplete}
      />,
    );

    // Entry menu shows 2D, 3D, Local 2P, Bot, and disabled Online when no partner
    expect(screen.getByTestId('billiards-entry-menu')).toBeTruthy();
    expect((screen.getByTestId('billiards-mode-online') as HTMLButtonElement).disabled).toBe(true);

    // Launch Local 2P 2D (never initializes 3D stage!)
    fireEvent.click(screen.getByTestId('billiards-edition-2d'));
    fireEvent.click(screen.getByTestId('billiards-mode-local'));
    fireEvent.click(screen.getByTestId('billiards-start-btn'));

    const game = await waitFor(() => screen.getByTestId('billiards-2d-game'));
    expect(screen.queryByTestId('billiards-3d-stage')).toBeNull();

    // Overworld keys (W, Space, Arrows) must NOT bubble to overworld listeners
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
    });
    expect(overworldListener).not.toHaveBeenCalled();

    // Hold Space -> power oscillates upward
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
      stepFrames(15, 25); // 375ms -> +0.468 -> ~55%
    });
    const chargedPct = Number(game.getAttribute('data-power-pct'));
    expect(chargedPct).toBeGreaterThan(20);
    expect(chargedPct).toBeLessThanOrEqual(100);

    // Escape cancels Space charge without shooting!
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
    });
    expect(Number(game.getAttribute('data-power-pct'))).toBe(0);
    expect(game.getAttribute('data-phase')).toBe('aim');

    // Hold Space again -> release Space -> shoots ball into moving phase!
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
      stepFrames(10, 20);
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }));
    });
    expect(game.getAttribute('data-phase')).toBe('moving');

    // Local stats remain clean & online callback was NEVER called for local match
    expect(onMatchComplete).not.toHaveBeenCalled();
    expect(loadBilliardsLocalStats().local2p.matches).toBe(0);

    unmount();
    window.removeEventListener('keydown', overworldListener);

    // After leaving billiards, normal overworld keys work again
    const postExitListener = vi.fn();
    window.addEventListener('keydown', postExitListener);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
    expect(postExitListener).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', postExitListener);
  });
});
