import { useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import { Compass, MapPin, Sun } from 'lucide-react';
import { EMPTY_HELD_ITEM } from '../../shared/interaction/interactionResolver';
import {
  buildExpansionLandmarks,
  type CosmeticDayPhase,
  type WorldSizeOption,
} from '../../game/worldSandbox/worldExpansionMap';
import {
  WorldExpansionScene,
  type SandboxTelemetry,
} from '../../game/worldSandbox/WorldExpansionScene';

export function WorldExpansionSandbox({ onExit }: { onExit?: () => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<WorldExpansionScene | null>(null);

  const [mapSize, setMapSize] = useState<WorldSizeOption>(64);
  const [dayPhase, setDayPhase] = useState<CosmeticDayPhase>('morning');
  const [petFollow, setPetFollow] = useState(true);
  const [telemetry, setTelemetry] = useState<SandboxTelemetry | null>(null);

  const landmarks = useMemo(() => buildExpansionLandmarks(mapSize), [mapSize]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new WorldExpansionScene({
      mapSize: 64,
      dayPhase: 'morning',
      catVariant: 'ginger-tabby',
      catAccessory: 'ribbon_rose',
      petFollowEnabled: true,
      strayAdopted: true,
      heldItem: EMPTY_HELD_ITEM,
      foodBowlPortions: 1,
      waterBowlVolume: 80,
      onTelemetry: setTelemetry,
      onContextResolution: () => {},
    });
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: host.clientWidth || 800,
      height: host.clientHeight || 520,
      backgroundColor: '#8ec07c',
      pixelArt: true,
      render: { antialias: false, pixelArt: true, roundPixels: true },
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [scene],
    });
    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.updateHooks({
      mapSize,
      dayPhase,
      catVariant: 'ginger-tabby',
      catAccessory: 'ribbon_rose',
      petFollowEnabled: petFollow,
      strayAdopted: true,
      heldItem: EMPTY_HELD_ITEM,
      foodBowlPortions: 1,
      waterBowlVolume: 80,
      onTelemetry: setTelemetry,
      onContextResolution: () => {},
    });
  }, [mapSize, dayPhase, petFollow]);

  return (
    <main
      data-testid="world-expansion-sandbox"
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#2c221e',
        color: '#fff8ef',
      }}
    >
      <header style={{ padding: '8px 12px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(35, 25, 22, 0.94)', borderBottom: '1px solid rgba(255,248,239,0.14)' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Compass size={16} /> World Expansion Sandbox ({mapSize}×{mapSize} · 10 Landmarks)
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className={`btn btn--sm ${mapSize === 64 ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setMapSize(64)}>64×64 (1024px)</button>
          <button type="button" className={`btn btn--sm ${mapSize === 96 ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setMapSize(96)}>96×96 (1536px)</button>
          <button type="button" className="btn btn--sm btn--secondary" onClick={() => setDayPhase((d) => (d === 'morning' ? 'sunset' : d === 'sunset' ? 'twilight' : 'morning'))}>
            <Sun size={13} /> {dayPhase === 'morning' ? 'Ban ngày' : dayPhase === 'sunset' ? 'Hoàng hôn' : 'Chạng vạng'}
          </button>
          <button type="button" className={`btn btn--sm ${petFollow ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setPetFollow((p) => !p)}>
            {petFollow ? 'Mèo đi dạo cùng: BẬT' : 'Mèo ở nhà'}
          </button>
          {onExit && <button type="button" className="btn btn--sm btn--secondary" onClick={onExit}>Thoát</button>}
        </div>
      </header>

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Landmark Quick Compass & Telemetry */}
        <aside style={{ position: 'absolute', top: 10, right: 10, width: 200, maxHeight: 'calc(100% - 20px)', overflowY: 'auto', background: 'rgba(35, 25, 22, 0.88)', border: '1px solid rgba(255,248,239,0.2)', borderRadius: 10, padding: 8, fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontWeight: 800 }}>
            <MapPin size={12} /> {telemetry ? `${telemetry.nearestLandmark.nameVi} (${telemetry.playerTileX},${telemetry.playerTileY})` : 'Đang tải...'}
          </div>
          {telemetry && (
            <div style={{ opacity: 0.8 }}>
              Đi bộ Nhà → Biển: ~{telemetry.avgTravelTimeAcrossSec}s · Mèo: {telemetry.petMode}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {landmarks.map((lm) => (
              <button
                key={lm.id}
                type="button"
                className="btn btn--secondary btn--sm"
                style={{ justifyContent: 'flex-start', minHeight: 28, fontSize: 11, padding: '2px 6px' }}
                onClick={() => sceneRef.current?.teleportToLandmark(lm.id)}
              >
                {lm.nameVi}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
