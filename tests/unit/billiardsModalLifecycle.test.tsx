import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BilliardsModal } from '../../src/features/minigames/billiards/BilliardsModal';
import type {
  BilliardsConnectionStatus,
  BilliardsTransport,
  BilliardsWireEvent,
} from '../../src/shared/billiards/types';

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

describe('BilliardsModal lifecycle, visibility recovery & cleanup (P0 #9, P1)', () => {
  let rafSpy: ReturnType<typeof vi.spyOn>;
  let cancelRafSpy: ReturnType<typeof vi.spyOn>;
  let getContextSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    let nextId = 1;
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => nextId++);
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

  it('separates masterVolume from overworld pause/resume & keeps RAF loop stable', async () => {
    const onPause = vi.fn();
    const onResume = vi.fn();

    const { rerender, unmount } = render(
      <BilliardsModal
        open={true}
        onClose={() => {}}
        initialMode="local_pvp"
        masterVolume={0.8}
        onPauseOverworld={onPause}
        onResumeOverworld={onResume}
      />,
    );

    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onResume).toHaveBeenCalledTimes(0);

    // Launch 2D game from entry menu so RAF starts
    fireEvent.click(screen.getByTestId('billiards-start-btn'));
    await waitFor(() => expect(rafSpy.mock.calls.length).toBeGreaterThan(0));
    const initialRafStarts = rafSpy.mock.calls.length;

    // Changing volume must NOT pause/resume overworld or restart RAF!
    rerender(
      <BilliardsModal
        open={true}
        onClose={() => {}}
        initialMode="local_pvp"
        masterVolume={0.25}
        onPauseOverworld={onPause}
        onResumeOverworld={onResume}
      />,
    );
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onResume).toHaveBeenCalledTimes(0);
    expect(rafSpy.mock.calls.length).toBe(initialRafStarts);

    // Closing invokes onResumeOverworld and cancels active RAF
    rerender(
      <BilliardsModal
        open={false}
        onClose={() => {}}
        initialMode="local_pvp"
        masterVolume={0.25}
        onPauseOverworld={onPause}
        onResumeOverworld={onResume}
      />,
    );
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(cancelRafSpy).toHaveBeenCalled();

    unmount();
  });

  it('sends billiards:state_request on mount, transport reconnect, and Safari visibility/pageshow resume; cleans up listeners on exit', () => {
    const sent: BilliardsWireEvent[] = [];
    const connListeners = new Set<(status: BilliardsConnectionStatus) => void>();
    const unsubConn = vi.fn();
    const unsubMsg = vi.fn();
    const docRemoveSpy = vi.spyOn(document, 'removeEventListener');
    const winRemoveSpy = vi.spyOn(window, 'removeEventListener');

    const transport: BilliardsTransport = {
      send: (evt) => {
        sent.push(evt);
      },
      subscribe: () => unsubMsg,
      subscribeConnection: (fn) => {
        connListeners.add(fn);
        return () => {
          connListeners.delete(fn);
          unsubConn();
        };
      },
      getConnectionStatus: () => 'connected',
    };

    const { unmount } = render(
      <BilliardsModal
        open={true}
        onClose={() => {}}
        initialMode="online"
        localPlayerSlot={1}
        transport={transport}
      />,
    );

    // Initial request on mount
    expect(sent.filter((e) => e.type === 'billiards:state_request')).toHaveLength(1);

    // Reconnect triggers fresh state_request
    act(() => {
      for (const fn of connListeners) fn('reconnecting');
      for (const fn of connListeners) fn('connected');
    });
    expect(sent.filter((e) => e.type === 'billiards:state_request').length).toBeGreaterThanOrEqual(2);

    // Safari visibility resume + pageshow after debounce
    vi.useFakeTimers();
    act(() => {
      vi.advanceTimersByTime(300);
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(300);
      window.dispatchEvent(new Event('pageshow'));
    });
    vi.useRealTimers();

    expect(sent.filter((e) => e.type === 'billiards:state_request').length).toBeGreaterThanOrEqual(4);

    unmount();
    expect(unsubMsg).toHaveBeenCalledTimes(1);
    expect(unsubConn).toHaveBeenCalledTimes(1);
    expect(docRemoveSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(winRemoveSpy).toHaveBeenCalledWith('pageshow', expect.any(Function));
    expect(winRemoveSpy).toHaveBeenCalledWith('online', expect.any(Function));
  });
});
