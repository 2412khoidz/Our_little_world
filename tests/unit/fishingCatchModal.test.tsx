import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ChillFishingModal } from '../../src/features/donor/ChillFishingModal';
import { TensionFishingModal } from '../../src/features/donor/TensionFishingModal';
import { RANCH_FISHING_URL } from '../../src/shared/art/ranchActionAtlas';
import { resolveCanonicalFishByCritterId } from '../../src/shared/donor/fishing/canonicalFishRegistry';

const api = vi.hoisted(() => ({
  start: vi.fn(),
  resolve: vi.fn(),
  sync: vi.fn().mockResolvedValue(undefined),
  fetch: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../src/lib/backend/donorDevLanClient', () => ({
  postDonorFishingStart: api.start, postDonorFishingResolve: api.resolve,
  postDonorFishingSync: api.sync, fetchDonorFishingSession: api.fetch,
}));
vi.mock('../../src/features/donor/ranchFishingUiArt', async (loadOriginal) => ({
  ...await loadOriginal<typeof import('../../src/features/donor/ranchFishingUiArt')>(),
  loadRanchFishingUiArt: () => Promise.resolve(null),
}));
vi.mock('../../src/shared/donor/fishing-frenzy/fishingFrenzyArt', () => ({ loadFishingFrenzyArt: () => Promise.resolve(null) }));
vi.mock('../../src/features/donor/tidefallFishingCanvas', () => ({ drawTidefallFishingScene: vi.fn() }));
vi.mock('../../src/features/donor/fishingAudio', () => ({
  isFishingAudioMuted: () => true, setFishingAudioMuted: vi.fn(), playCastWhoosh: vi.fn(),
  playWaterSplash: vi.fn(), playBiteAlert: vi.fn(), playEscapeSplash: vi.fn(), playReelTick: vi.fn(), playCatchFanfare: vi.fn(),
}));
vi.mock('../../src/game/audio/gameAudioManager', () => ({ gameAudio: { playStinger: vi.fn() } }));
vi.mock('../../src/shared/donor/tidefall-phaser/tidefallFishingFsm', async (original) => {
  const real = await original<typeof import('../../src/shared/donor/tidefall-phaser/tidefallFishingFsm')>();
  return { ...real, tickTidefallFishing: (state: ReturnType<typeof real.createTidefallFishingIdle>) =>
    state.phase === 'casting' ? { ...state, phase: 'landed', progress: 1 } : state };
});
vi.mock('../../src/shared/donor/canvas-games-fishing/tensionReelSim', async (original) => {
  const real = await original<typeof import('../../src/shared/donor/canvas-games-fishing/tensionReelSim')>();
  return { ...real, tickTensionReel: (state: ReturnType<typeof real.createTensionReelReady>) =>
    ({ ...state, phase: 'caught', reelProgress: 1 }) };
});

let callbacks = new Map<number, FrameRequestCallback>();
beforeEach(() => {
  let nextFrame = 0;
  callbacks = new Map();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = ++nextFrame;
    callbacks.set(id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  api.start.mockReset();
  api.resolve.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function frame(time: number) {
  await act(async () => {
    const pending = Array.from(callbacks.values());
    callbacks.clear();
    for (const draw of pending) draw(time);
  });
}
const minnow = resolveCanonicalFishByCritterId('minnow');
const result = { itemSku: minnow.sku, spriteUrl: minnow.spriteUrl, labelVi: minnow.labelVi, rarity: minnow.rarity, escaped: false };
const start = (seed: number) => ({ seed, preview: { name: 'Minnow', critterId: 'minnow', ...result } });

it('shows the confirmed minnow in Chill and never re-resolves it while the next cast is starting', async () => {
  const refresh = vi.fn().mockResolvedValue(undefined);
  let secondCast!: (value: ReturnType<typeof start>) => void;
  api.start.mockResolvedValueOnce(start(87)).mockImplementationOnce(() => new Promise((resolve) => { secondCast = resolve; }));
  api.resolve.mockResolvedValue(result);
  render(<ChillFishingModal worldId="world" onClose={vi.fn()} onInventoryRefresh={refresh} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Quăng cần' })); });
  await frame(100);
  const card = screen.getByTestId('fishing-frenzy-catch-reveal');
  expect(card).toHaveTextContent(minnow.labelVi);
  expect(card.querySelector<HTMLElement>('.ranch-fishing__fish')?.style.backgroundImage).toContain(RANCH_FISHING_URL);
  expect(api.resolve).toHaveBeenCalledExactlyOnceWith('world', 1000, 87);
  expect(refresh).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Quăng lại' }));
  await frame(200);
  expect(api.resolve).toHaveBeenCalledTimes(1);
  await act(async () => secondCast(start(88)));
  await frame(300);
  expect(api.resolve).toHaveBeenNthCalledWith(2, 'world', 1000, 88);
  fireEvent.click(screen.getByRole('button', { name: /^Xong$/ }));
  expect(screen.queryByTestId('fishing-frenzy-catch-reveal')).toBeNull();
  expect(screen.getByRole('button', { name: 'Quăng cần' })).toBeEnabled();
});

it('retries the same Tension catch after an interrupted response and returns to the normal cast state', async () => {
  const refresh = vi.fn().mockResolvedValue(undefined);
  api.start.mockResolvedValue(start(91));
  api.resolve.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(result);
  render(<TensionFishingModal worldId="world" spotId="east_stream" titleVi="Suối" onClose={vi.fn()} onInventoryRefresh={refresh} />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Quăng cần' })); });
  await frame(100);
  expect(screen.queryByTestId('fishing-frenzy-catch-reveal')).toBeNull();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Thử nhận kết quả' })); });
  expect(api.resolve).toHaveBeenNthCalledWith(1, 'world', 1000, 91);
  expect(api.resolve).toHaveBeenNthCalledWith(2, 'world', 1000, 91);
  expect(screen.getByTestId('fishing-frenzy-catch-reveal')).toHaveTextContent(minnow.labelVi);
  expect(refresh).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /^Xong$/ }));
  expect(screen.getByRole('button', { name: 'Quăng cần' })).toBeEnabled();
});
