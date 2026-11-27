import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameHotbar } from '../../ui/components/GameHotbar';
import { EMPTY_HELD_ITEM } from '../../shared/interaction/interactionResolver';
import { OlwCatStrokeBrain } from '../../donors/nintendogs-threejs-43d231c/olwCatStrokeBrain';
import { donorCatOrangeFramePixels } from '../../shared/petLiving/donor/donorCatOrangeAtlasRect';
import { reactToCareStroke } from '../../shared/petLiving/petCare/petCareReactions';
import type { PetCareZone } from '../../shared/petLiving/petCare/petCareTypes';
import {
  createAdoptionState,
  interactPetGently,
  type PhysicalCarePetState,
} from '../../shared/petLiving/petPhysicalCare';
import {
  createDonorPetAutonomyState,
  donorAutonomyTickMs,
  donorCarePhysicalSeed,
  donorHandFeedCat,
  tickDonorPetAutonomy,
  type CarePartnerId,
  type DonorPetAutonomyState,
} from '../../shared/petLiving/donor/donorPetCareAutonomy';
import { stepLicensedCatFrame } from '../../shared/petLiving/donor/donorLicensedCatFrameStep';
import type { PetCareReactionContext } from '../../shared/petLiving/petCare/petCareTypes';
import type { HotbarSlot } from '../../shared/interaction/interactionTypes';
import { licensedCatFrameSeriesForState } from '../../shared/petLiving/petCare/petCareLicensedCatMaps';
import type { PetAnimState } from '../../shared/petLiving/petVisualTypes';

const ATLAS_BASE = import.meta.env.VITE_OLW_PRIVATE_ART === true ? '/assets/private-unified' : '/assets/unified';
const DEMO_SLOTS: HotbarSlot[] = [
  { slotIndex: 0, itemSku: 'pet_kibble_basic', itemKind: 'food', iconId: 'food_kibble', labelVi: 'Hạt mèo', qty: 3, quality: 'normal' },
  { slotIndex: 3, itemSku: 'water_pitcher', itemKind: 'water_pitcher', iconId: 'water_pitcher_full', labelVi: 'Bình nước', qty: 1, waterFillLevel: 70 },
  { slotIndex: 4, itemSku: 'toy_yarn', itemKind: 'toy', iconId: 'yarn_ball', labelVi: 'Cuộn len', qty: 1 },
];

function buildCatFrameTexture(img: HTMLImageElement, frameIndex: number): THREE.CanvasTexture {
  const { srcX, srcY, frameW, frameH } = donorCatOrangeFramePixels(frameIndex);
  const canvas = document.createElement('canvas');
  canvas.width = frameW;
  canvas.height = frameH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, frameW, frameH);
  ctx.drawImage(img, srcX, srcY, frameW, frameH, 0, 0, frameW, frameH);
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function sampleFrameHasCatPixel(img: HTMLImageElement, frameIndex: number): boolean {
  const { srcX, srcY, frameW, frameH } = donorCatOrangeFramePixels(frameIndex);
  const c = document.createElement('canvas');
  c.width = frameW;
  c.height = frameH;
  const ctx = c.getContext('2d');
  if (!ctx) return false;
  ctx.drawImage(img, srcX, srcY, frameW, frameH, 0, 0, frameW, frameH);
  const d = ctx.getImageData(0, 0, frameW, frameH).data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! > 8) return true;
  }
  return false;
}

export function DonorPetThreeCare({ onExit }: { onExit?: () => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const brainRef = useRef(new OlwCatStrokeBrain());
  const [care, setCare] = useState<PhysicalCarePetState>(() => donorCarePhysicalSeed());
  const [autonomy, setAutonomy] = useState<DonorPetAutonomyState>(() => createDonorPetAutonomyState());
  /** Phase II — one cat, shared session; per-client caregiver toggle removed. */
  const partner: CarePartnerId = 'partner-a';
  const [adoption] = useState(() => createAdoptionState({ id: 'donor-quyt', name: 'Quýt' }));
  const petDisplayName = adoption.adoptedName ?? 'Quýt';
  const [bubble, setBubble] = useState('...Quýt?');
  const animRef = useRef<PetAnimState>('sit_south');
  const [mode, setMode] = useState<'normal' | 'brush'>('normal');
  const [sessionMs, setSessionMs] = useState(0);
  const frameIndexRef = useRef(48);
  const frameCursorRef = useRef(0);
  const frameAccumRef = useRef(0);
  const atlasImgRef = useRef<HTMLImageElement | null>(null);
  const catMatRef = useRef<THREE.SpriteMaterial | null>(null);
  const catSpriteRef = useRef<THREE.Sprite | null>(null);
  const toySpriteRef = useRef<THREE.Sprite | null>(null);
  const autonomyPostureRef = useRef(autonomy.posture);
  const autonomyRef = useRef(autonomy);
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
    frameCursorRef.current = 0;
    frameAccumRef.current = 0;
    animRef.current = state;
  }, []);

  useEffect(() => {
    autonomyRef.current = autonomy;
    autonomyPostureRef.current = autonomy.posture;
  }, [autonomy]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      setCare((physical) => {
        const tick = tickDonorPetAutonomy(physical, autonomyRef.current, now, donorAutonomyTickMs());
        autonomyRef.current = tick.autonomy;
        setAutonomy(tick.autonomy);
        if (tick.bubbleVi) setBubble(tick.bubbleVi);
        advanceFrame(tick.anim);
        return tick.physical;
      });
    }, donorAutonomyTickMs());
    return () => window.clearInterval(id);
  }, [advanceFrame]);

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
    const camera = new THREE.OrthographicCamera(-1.6, 1.6, 2.0, -2.0, 0.1, 40);
    camera.position.set(0, 0.2, 5);
    camera.lookAt(0, 0.15, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const canvasEl = renderer.domElement;
    canvasEl.style.display = 'block';
    canvasEl.style.position = 'absolute';
    canvasEl.style.inset = '0';
    canvasEl.style.width = '100%';
    canvasEl.style.height = '100%';
    canvasEl.dataset.testid = 'donor-pet-three-canvas';
    host.appendChild(canvasEl);

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

    const attachCatFromImage = (source: HTMLImageElement) => {
      if (disposed) return;
      if (!sampleFrameHasCatPixel(source, frameIndexRef.current)) return;
      atlasImgRef.current = source;
      const tex = buildCatFrameTexture(source, frameIndexRef.current);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      catMatRef.current = mat;
      if (catSprite) {
        catSprite.material = mat;
      } else {
        catSprite = new THREE.Sprite(mat);
        catSprite.scale.set(1.35, 1.35, 1);
        catSprite.position.set(0, 0.05, 0);
        catSprite.center.set(0.5, 0.88);
        catSpriteRef.current = catSprite;
        scene.add(catSprite);
      }
      canvasEl.dataset.donorCatReady = '1';
      if (!toySpriteRef.current) {
        const toyMat = new THREE.SpriteMaterial({ color: 0xf5c74d, depthTest: false });
        const toy = new THREE.Sprite(toyMat);
        toy.scale.set(0.35, 0.35, 1);
        toy.position.set(0.9, -0.05, 0.1);
        toySpriteRef.current = toy;
        scene.add(toy);
      }
    };

    const loadAtlas = (base: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const atlas = new Image();
        atlas.crossOrigin = 'anonymous';
        atlas.onload = () => resolve(atlas);
        atlas.onerror = () => reject(new Error(`atlas failed: ${base}`));
        atlas.src = `${base}/world-props.png`;
      });

    void (async () => {
      const bases = [ATLAS_BASE, '/assets/unified'];
      for (const base of bases) {
        try {
          const loaded = await loadAtlas(base);
          attachCatFromImage(loaded);
          if (canvasEl.dataset.donorCatReady === '1') break;
        } catch {
          /* try fallback atlas */
        }
      }
    })();

    const resize = () => {
      const w = Math.max(host.clientWidth || host.offsetWidth, 280);
      const h = Math.max(host.clientHeight || host.offsetHeight, 280);
      renderer.setSize(w, h, false);
      const aspect = w / h;
      const halfH = 2.0;
      const halfW = halfH * aspect;
      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(host);
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
    let lastFrame = start;
    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = now - lastFrame;
      lastFrame = now;
      setSessionMs(Math.floor(now - start));
      const stepped = stepLicensedCatFrame(animRef.current, frameCursorRef.current, 130, dt, frameAccumRef.current);
      frameCursorRef.current = stepped.nextCursor;
      frameAccumRef.current = stepped.nextAccum;
      if (stepped.frameIndex !== frameIndexRef.current && atlasImgRef.current && catMatRef.current) {
        frameIndexRef.current = stepped.frameIndex;
        if (catMatRef.current.map) catMatRef.current.map.dispose();
        catMatRef.current.map = buildCatFrameTexture(atlasImgRef.current, stepped.frameIndex);
        catMatRef.current.needsUpdate = true;
      }
      if (catSprite) {
        catSprite.position.y = 0.15 + Math.sin(now / 900) * 0.03;
        if (autonomyPostureRef.current === 'chase_toy' && toySpriteRef.current) {
          catSprite.position.x += (toySpriteRef.current.position.x - catSprite.position.x) * 0.04;
        } else {
          catSprite.position.x += (0 - catSprite.position.x) * 0.06;
        }
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.dispose();
      host.removeChild(canvasEl);
    };
  }, [applyStroke]);

  return (
    <main className="donor-pet-three" data-testid="donor-pet-three-care" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#120e10' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', color: '#ffe8c7', fontSize: 14 }}>
        <span>
          C2 (tùy chọn) · ~{Math.floor((autonomy.simulatedSessionMs || sessionMs) / 1000)}s · một mèo, hai người
        </span>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onExit}>
          Thoát
        </button>
      </header>
      <div
        ref={hostRef}
        data-testid="donor-pet-three-stage"
        style={{ flex: 1, minHeight: 320, width: '100%', position: 'relative', overflow: 'hidden' }}
      />
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
        <button
          type="button"
          className="btn btn--primary"
          style={{ minHeight: 48 }}
          onClick={() => {
            const feed = donorHandFeedCat(care, 'pet_kibble_basic', 'normal', partner, performance.now());
            setCare(feed.physical);
            setAutonomy({ ...autonomyRef.current, lastPartner: partner, posture: feed.autonomy.posture });
            setBubble(feed.bubbleVi || 'Mlem!');
            advanceFrame(feed.anim);
          }}
        >
          Cho ăn (2P)
        </button>
      </div>
      <div style={{ padding: '0 12px 12px' }}>
        <GameHotbar slots={DEMO_SLOTS} heldItem={EMPTY_HELD_ITEM} onSelectSlot={() => {}} touchFriendly />
      </div>
      <p style={{ fontSize: 11, color: '#8a7870', textAlign: 'center', paddingBottom: 8 }}>
        Đói {Math.round(care.hunger)} · Vui {Math.round(care.fun)} · {autonomy.posture} · một bé, hai người
      </p>
    </main>
  );
}