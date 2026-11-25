import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameHotbar } from '../../ui/components/GameHotbar';
import { EMPTY_HELD_ITEM } from '../../shared/interaction/interactionResolver';
import { OlwCatStrokeBrain } from '../../donors/nintendogs-threejs-43d231c/olwCatStrokeBrain';
import { petCareCatFrameCrop } from '../../shared/petLiving/petCare/petCareAtlasFrameMath';
import { reactToCareStroke } from '../../shared/petLiving/petCare/petCareReactions';
import type { PetCareZone } from '../../shared/petLiving/petCare/petCareTypes';
import {
  createAdoptionState,
  createInitialPhysicalCareState,
  interactPetGently,
  type PhysicalCarePetState,
} from '../../shared/petLiving/petPhysicalCare';
import type { PetCareReactionContext } from '../../shared/petLiving/petCare/petCareTypes';
import type { HotbarSlot } from '../../shared/interaction/interactionTypes';
import { licensedCatFrameSeriesForState } from '../../shared/petLiving/petCare/petCareLicensedCatMaps';
import type { PetAnimState } from '../../shared/petLiving/petVisualTypes';

const ATLAS_BASE = import.meta.env.VITE_OLW_PRIVATE_ART === true ? '/assets/private-unified' : '/assets/unified';
const FRAME_W = 16;
const FRAME_H = 16;
const SHEET_W = 192;

const DEMO_SLOTS: HotbarSlot[] = [
  { slotIndex: 0, itemSku: 'pet_kibble_basic', itemKind: 'food', iconId: 'food_kibble', labelVi: 'Hạt mèo', qty: 3, quality: 'normal' },
  { slotIndex: 3, itemSku: 'water_pitcher', itemKind: 'water_pitcher', iconId: 'water_pitcher_full', labelVi: 'Bình nước', qty: 1, waterFillLevel: 70 },
  { slotIndex: 4, itemSku: 'toy_yarn', itemKind: 'toy', iconId: 'yarn_ball', labelVi: 'Cuộn len', qty: 1 },
];

function buildCatFrameTexture(img: HTMLImageElement, frameIndex: number): THREE.CanvasTexture {
  const { x, y } = petCareCatFrameCrop(frameIndex, FRAME_W, FRAME_H, SHEET_W);
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, y, FRAME_W, FRAME_H, 0, 0, FRAME_W, FRAME_H);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function DonorPetThreeCare({ onExit }: { onExit?: () => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const brainRef = useRef(new OlwCatStrokeBrain());
  const [_care, setCare] = useState<PhysicalCarePetState>(() => createInitialPhysicalCareState());
  const [adoption] = useState(() => createAdoptionState({ id: 'donor-quyt', name: 'Quýt' }));
  const petDisplayName = adoption.adoptedName ?? 'Quýt';
  const [bubble, setBubble] = useState('...Quýt?');
  const [anim, setAnim] = useState<PetAnimState>('sit_south');
  const [mode, setMode] = useState<'normal' | 'brush'>('normal');
  const [sessionMs, setSessionMs] = useState(0);
  const frameIndexRef = useRef(48);
  const catMatRef = useRef<THREE.SpriteMaterial | null>(null);
  const strokeIndexRef = useRef(0);
  const reactionCtx = useMemo<PetCareReactionContext>(
    () => ({
      petName: 'Quýt',
      traits: {
        glutton: 0.5,
        playful: 0.65,
        clingy: 0.55,
        curious: 0.6,
        shy: 0.2,
        lazy: 0.3,
        independent: 0.4,
      },
      shyRefuseRoll: 0.2,
    }),
    [],
  );

  const advanceFrame = useCallback((state: PetAnimState) => {
    const series = licensedCatFrameSeriesForState(state);
    frameIndexRef.current = series[0] ?? 48;
    setAnim(state);
  }, []);

  const applyStroke = useCallback(
    (zone: PetCareZone) => {
      strokeIndexRef.current += 1;
      const expr = reactToCareStroke(zone, reactionCtx, strokeIndexRef.current);
      const animState: PetAnimState =
        expr.anim === 'pet_purr' || expr.anim === 'idle_south' ? 'sit_south' : expr.anim;
      setBubble(expr.bubbleVi ?? 'Purr~');
      advanceFrame(animState);
      setCare((prev) => interactPetGently(prev, performance.now()).next);
    },
    [advanceFrame, reactionCtx],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let raf = 0;
    let disposed = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1218);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
    camera.position.set(0, 1.1, 4.2);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.2, 32),
      new THREE.MeshStandardMaterial({ color: 0x2a1e24, roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.55;
    scene.add(floor);

    const light = new THREE.DirectionalLight(0xffe8c7, 1.1);
    light.position.set(2, 4, 3);
    scene.add(light, new THREE.AmbientLight(0x56424a, 0.45));

    let catSprite: THREE.Sprite | null = null;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (disposed) return;
      const tex = buildCatFrameTexture(img, frameIndexRef.current);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
      catMatRef.current = mat;
      catSprite = new THREE.Sprite(mat);
      catSprite.scale.set(2.4, 2.4, 1);
      catSprite.position.set(0, 0.15, 0);
      scene.add(catSprite);
    };
    img.src = `${ATLAS_BASE}/world-props.png`;

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    const pointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const hit = brainRef.current.stroke(nx, ny);
      if (hit?.zone) applyStroke(hit.zone);
    };
    const pointerMove = (e: PointerEvent) => {
      if (e.buttons !== 1) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const hit = brainRef.current.stroke(nx, ny);
      if (hit?.zone && hit.speed > 0.08) applyStroke(hit.zone);
      if (brainRef.current.consumeBrushSparkle()) setBubble('Xù mượt~');
    };
    const pointerUp = () => brainRef.current.endStroke();
    renderer.domElement.addEventListener('pointerdown', pointerDown);
    renderer.domElement.addEventListener('pointermove', pointerMove);
    renderer.domElement.addEventListener('pointerup', pointerUp);
    renderer.domElement.style.touchAction = 'none';

    const start = performance.now();
    const tick = () => {
      if (disposed) return;
      setSessionMs(Math.floor(performance.now() - start));
      if (catSprite) catSprite.position.y = 0.15 + Math.sin(performance.now() / 900) * 0.03;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
  tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [applyStroke]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const mat = catMatRef.current;
      if (!mat) return;
      if (mat.map) mat.map.dispose();
      mat.map = buildCatFrameTexture(img, frameIndexRef.current);
      mat.needsUpdate = true;
    };
    img.src = `${ATLAS_BASE}/world-props.png`;
  }, [anim]);

  return (
    <main className="donor-pet-three" data-testid="donor-pet-three-care" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#120e10' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', color: '#ffe8c7', fontSize: 14 }}>
        <span>
          C2 donor · Three.js · {Math.floor(sessionMs / 1000)}s
        </span>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onExit}>
          Thoát
        </button>
      </header>
      <div ref={hostRef} style={{ flex: 1, minHeight: 280, position: 'relative' }} />
      <p style={{ textAlign: 'center', color: '#d8c4b0', margin: '4px 0' }}>{bubble}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 16px 8px', maxWidth: 420, margin: '0 auto', width: '100%' }}>
        <button type="button" className="btn btn--primary" style={{ minHeight: 48 }} onClick={() => { setBubble(`${petDisplayName}!`); advanceFrame('happy_hop'); }}>
          Gọi
        </button>
        <button
          type="button"
          className="btn btn--primary"
          style={{ minHeight: 48 }}
          onClick={() => {
            const next = mode === 'brush' ? 'normal' : 'brush';
            setMode(next);
            brainRef.current.setMode(next);
            advanceFrame(next === 'brush' ? 'groom' : 'sit_south');
          }}
        >
          {mode === 'brush' ? 'Xong chải' : 'Chải'}
        </button>
        <button type="button" className="btn btn--primary" style={{ minHeight: 48 }} onClick={() => { setBubble('Slurp~'); setCare((p) => ({ ...p, thirst: Math.min(100, p.thirst + 12) })); advanceFrame('eat'); }}>
          Nước
        </button>
        <button type="button" className="btn btn--primary" style={{ minHeight: 48 }} onClick={() => { setBubble('Mlem!'); setCare((p) => ({ ...p, hunger: Math.max(0, p.hunger - 15), fun: Math.min(100, p.fun + 6) })); advanceFrame('eat'); }}>
          Cho ăn
        </button>
      </div>
      <div style={{ padding: '0 12px 12px' }}>
        <GameHotbar slots={DEMO_SLOTS} heldItem={EMPTY_HELD_ITEM} onSelectSlot={() => {}} touchFriendly />
      </div>
      <p style={{ fontSize: 11, color: '#8a7870', textAlign: 'center', paddingBottom: 8 }}>
        Vuốt màn hình để chăm · cat-orange licensed · không dùng chó donor
      </p>
    </main>
  );
}