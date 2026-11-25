import { describe, expect, it } from 'vitest';
import { buildDiscoverabilityMarkerSpecs } from '../../src/game/world/discoverabilityMarkers';
import type { InteractableTarget } from '../../src/shared/interaction/interactionTypes';

describe('buildDiscoverabilityMarkerSpecs', () => {
  it('includes shop and waypoint kinds for village hints', () => {
    const interactables: InteractableTarget[] = [
      {
        id: 'cabacos_player_seed_shop_door',
        kind: 'shop_npc',
        labelVi: 'Hạt giống & dụng cụ',
        x: 100,
        y: 200,
        maxRadiusPx: 56,
      },
      {
        id: 'cabacos_sign_farm_gate',
        kind: 'crop_plot',
        labelVi: '→ Trang trại chính',
        x: 300,
        y: 400,
        maxRadiusPx: 64,
      },
    ];
    const specs = buildDiscoverabilityMarkerSpecs('village', interactables);
    expect(specs.some((s) => s.id.includes('seed_shop'))).toBe(true);
    expect(specs.some((s) => s.glyph === '🌾')).toBe(true);
  });

  it('adds Gull Bay beach hint on donor village when portal exists', () => {
    const interactables: InteractableTarget[] = [
      {
        id: 'village-to-beach',
        kind: 'door',
        labelVi: 'Ra bãi biển',
        x: 640,
        y: 480,
        maxRadiusPx: 48,
      },
      {
        id: 'cabacos_player_seed_shop_door',
        kind: 'shop_npc',
        labelVi: 'Hạt giống',
        x: 100,
        y: 200,
        maxRadiusPx: 56,
      },
    ];
    const specs = buildDiscoverabilityMarkerSpecs('village', interactables);
    expect(specs.some((s) => s.id === 'marker-gull-bay-beach')).toBe(true);
  });

  it('caps farm plot markers to avoid clutter', () => {
    const plots: InteractableTarget[] = Array.from({ length: 20 }, (_, i) => ({
      id: i < 12 ? `farm_main_${i}` : `farm_annex_${i - 12}`,
      kind: 'crop_plot' as const,
      labelVi: `Luống ${i}`,
      x: i * 16,
      y: 0,
      maxRadiusPx: 22,
    }));
    plots.push({
      id: 'farm_pond_fishing',
      kind: 'fishing_spot',
      labelVi: 'Ao cá',
      x: 800,
      y: 200,
      maxRadiusPx: 54,
    });
    const specs = buildDiscoverabilityMarkerSpecs('farm', plots);
    const plotMarkers = specs.filter((s) => s.glyph === '🌾');
    expect(plotMarkers.length).toBeLessThanOrEqual(5);
    expect(specs.some((s) => s.glyph === '🎣')).toBe(true);
  });
});