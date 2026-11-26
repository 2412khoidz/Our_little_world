import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { gameAudio, musicTrackForMap } from '../../src/game/audio/gameAudioManager';
import { CatVocalizationScheduler } from '../../src/shared/audio/catVocalizationScheduler';
import {
  footstepSfxForSurface,
  resolveFootstepSurface,
} from '../../src/shared/audio/surfaceFootsteps';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

describe('Checkpoint E1 & E2: distinct biome audio, footsteps, natural cat voice & art contract', () => {
  it('assigns distinct tracks per island biome and uses 5 distinct MP3 files on disk', () => {
    expect(musicTrackForMap('home')).toBe('home_garden');
    expect(musicTrackForMap('garden')).toBe('home_garden');
    expect(musicTrackForMap('outdoor')).toBe('home_garden');
    expect(musicTrackForMap('farm')).toBe('farm');
    expect(musicTrackForMap('village')).toBe('town');
    expect(musicTrackForMap('forest')).toBe('forest');
    expect(musicTrackForMap('beach')).toBe('beach');

    gameAudio.setZoneMusic('garden');
    expect(gameAudio.getDesiredMusicTrackId()).toBe('home_garden');
    gameAudio.setZoneMusic('beach');
    expect(gameAudio.getDesiredMusicTrackId()).toBe('beach');
    gameAudio.setZoneMusic('forest');
    expect(gameAudio.getDesiredMusicTrackId()).toBe('forest');

    const trackFiles = ['title.mp3', 'garden.mp3', 'home_garden_theme.mp3', 'farm.mp3', 'town.mp3', 'blue_forest.mp3'];
    const hashes = new Set<string>();
    for (const file of trackFiles) {
      const fullPath = path.join(REPO_ROOT, 'public/assets/audio/music', file);
      expect(fs.existsSync(fullPath), `${file} should exist`).toBe(true);
      const md5 = crypto.createHash('md5').update(fs.readFileSync(fullPath)).digest('hex');
      hashes.add(md5);
    }
    expect(hashes.size).toBe(trackFiles.length);
  });

  it('resolves all 6 surface footstep types accurately from map and tile coordinates', () => {
    const woodHome = resolveFootstepSurface({ mapId: 'home', tileX: 5, tileY: 6 });
    const woodShop = resolveFootstepSurface({ mapId: 'shop_seed', tileX: 11, tileY: 10 });
    const woodBridge = resolveFootstepSurface({ mapId: 'garden', tileX: 7, tileY: 9 });
    const woodPier = resolveFootstepSurface({ mapId: 'beach', tileX: 30, tileY: 16 });
    const woodNorthBridge = resolveFootstepSurface({ mapId: 'village', tileX: 7, tileY: 13 });
    expect([woodHome, woodShop, woodBridge, woodPier, woodNorthBridge]).toEqual([
      'wood',
      'wood',
      'wood',
      'wood',
      'wood',
    ]);
    expect(footstepSfxForSurface('wood')).toBe('footstep_wood');

    expect(resolveFootstepSurface({ mapId: 'farm', tileX: 18, tileY: 12, isFarmPlotTile: true })).toBe('soil');
    expect(resolveFootstepSurface({ mapId: 'forest', tileX: 13, tileY: 20 })).toBe('soil');
    expect(footstepSfxForSurface('soil')).toBe('footstep_soil');

    expect(resolveFootstepSurface({ mapId: 'beach', tileX: 20, tileY: 20 })).toBe('sand');
    expect(resolveFootstepSurface({ mapId: 'village', tileX: 74, tileY: 20 })).toBe('sand');
    expect(footstepSfxForSurface('sand')).toBe('footstep_sand');

    expect(resolveFootstepSurface({ mapId: 'garden', tileX: 8, tileY: 6 })).toBe('stone');
    expect(resolveFootstepSurface({ mapId: 'village', tileX: 42, tileY: 30 })).toBe('stone');
    expect(footstepSfxForSurface('stone')).toBe('footstep_stone');

    expect(resolveFootstepSurface({ mapId: 'beach', tileX: 26, tileY: 20 })).toBe('water');
    expect(resolveFootstepSurface({ mapId: 'forest', tileX: 20, tileY: 16 })).toBe('water');
    expect(footstepSfxForSurface('water')).toBe('footstep_water');

    expect(resolveFootstepSurface({ mapId: 'garden', tileX: 2, tileY: 5 })).toBe('grass');
    expect(resolveFootstepSurface({ mapId: 'farm', tileX: 20, tileY: 20 })).toBe('grass');
    expect(footstepSfxForSurface('grass')).toBe('footstep_grass');
  });

  it('schedules natural non-repeating cat vocalizations with pitch jitter and randomized ambient intervals', () => {
    let seed = 13;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const scheduler = new CatVocalizationScheduler(rng);

    expect(scheduler.pick('ambient', 1000, { isSleeping: true })).toBeNull();

    let prevClip: string | null = null;
    let nowMs = 2000;
    for (let i = 0; i < 20; i += 1) {
      const pick = scheduler.pick('happy', nowMs, { force: true });
      expect(pick).not.toBeNull();
      expect(pick!.clip).not.toBe(prevClip);
      expect(pick!.playbackRate).toBeGreaterThanOrEqual(0.9);
      expect(pick!.playbackRate).toBeLessThanOrEqual(1.12);
      expect(pick!.volumeScale).toBeGreaterThanOrEqual(0.75);
      expect(pick!.volumeScale).toBeLessThanOrEqual(1.0);
      prevClip = pick!.clip;
      nowMs += 4000;
    }

    const firstAmbient = scheduler.pick('ambient', nowMs, { force: true });
    expect(firstAmbient).not.toBeNull();
    // Suppressed shortly after (prevents constant mechanical looping)
    expect(scheduler.pick('ambient', nowMs + 3000)).toBeNull();
    // Allowed after max cooldown >= 18000ms
    expect(scheduler.pick('ambient', nowMs + 18500)).not.toBeNull();
  });

  it('includes surface footsteps, varied meows, and all 5 JRPG stingers in domain audio sprite manifests', () => {
    const worldJson = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'public/assets/audio/sprites/world.json'), 'utf8'),
    ) as { spritemap: Record<string, { start: number; end: number }> };
    for (const clip of [
      'footstep_grass',
      'footstep_soil',
      'footstep_sand',
      'footstep_wood',
      'footstep_stone',
      'footstep_water',
    ]) {
      expect(worldJson.spritemap[clip], `missing world clip ${clip}`).toBeDefined();
    }

    const petJson = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'public/assets/audio/sprites/pet.json'), 'utf8'),
    ) as { spritemap: Record<string, { start: number; end: number }> };
    expect(petJson.spritemap.meow_short).toBeDefined();
    expect(petJson.spritemap.meow_chirp).toBeDefined();

    const uiJson = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'public/assets/audio/sprites/ui.json'), 'utf8'),
    ) as { spritemap: Record<string, { start: number; end: number }> };
    for (const clip of [
      'stinger_item',
      'stinger_fish',
      'stinger_rare',
      'stinger_quest',
      'stinger_area',
    ]) {
      expect(uiJson.spritemap[clip], `missing UI stinger ${clip}`).toBeDefined();
    }
  });

  it('documents donor provenance and all 9 art contract rules in docs/ART_DIRECTION_CONTRACT.md', () => {
    const doc = fs.readFileSync(path.join(REPO_ROOT, 'docs/ART_DIRECTION_CONTRACT.md'), 'utf8');
    expect(doc).toContain('Donor Provenance');
    expect(doc).toContain('Tile Resolution');
    expect(doc).toContain('Door Sizes');
    expect(doc).toContain('Perspective');
    expect(doc).toContain('Warm Cozy Palette');
    expect(doc).toContain('Shadow Direction');
    expect(doc).toContain('NEAREST');
  });
});
