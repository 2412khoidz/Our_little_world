// Adapted from SawyerHood/nintendogs-threejs@43d231c props + feline toys (yarn, bell ball, cat wand, cardboard box, bowls, brush)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CatWandSim, type ToyProp } from './toyPhysics';

function trackDispose(root: THREE.Object3D): () => void {
  return () => {
    const geos = new Set<THREE.BufferGeometry>();
    const mats = new Set<THREE.Material>();
    root.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) geos.add(m.geometry);
      if (m.material) {
        if (Array.isArray(m.material)) {
          for (const mat of m.material) mats.add(mat);
        } else {
          mats.add(m.material);
        }
      }
    });
    for (const g of geos) g.dispose();
    for (const mat of mats) mat.dispose();
  };
}

export interface BowlHandle {
  object: THREE.Group;
  pos: THREE.Vector3;
  rim: number;
  fill: () => number;
  setFill: (v: number) => void;
  consume: (amount: number) => void;
  update?: (dt: number) => void;
  triggerRipple?: () => void;
  dispose: () => void;
}

export function makeFoodBowl(pos: THREE.Vector3, initialFill = 0): BowlHandle {
  const g = new THREE.Group();
  g.position.copy(pos);

  const rim = 0.088;
  const bowlMat = new THREE.MeshStandardMaterial({ color: '#f7ead9', roughness: 0.25, metalness: 0.04 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#e67d57', roughness: 0.35 });
  const innerMat = new THREE.MeshStandardMaterial({ color: '#6b4735', roughness: 0.75 });
  const kibbleMat = new THREE.MeshStandardMaterial({ color: '#a56134', roughness: 0.85 });

  // Glazed ceramic outer shell
  const wallGeo = new THREE.CylinderGeometry(rim, rim * 0.82, 0.048, 28, 1, false);
  const wall = new THREE.Mesh(wallGeo, bowlMat);
  wall.position.y = 0.024;
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);

  const collarGeo = new THREE.TorusGeometry(rim * 0.96, 0.008, 10, 28);
  const collar = new THREE.Mesh(collarGeo, rimMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.047;
  g.add(collar);

  const wellGeo = new THREE.CircleGeometry(rim * 0.84, 24);
  const well = new THREE.Mesh(wellGeo, innerMat);
  well.rotation.x = -Math.PI / 2;
  well.position.y = 0.042;
  g.add(well);

  // Kibble mound + scattered pebbles
  const kibbleGroup = new THREE.Group();
  const moundGeo = new THREE.SphereGeometry(rim * 0.72, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const mound = new THREE.Mesh(moundGeo, kibbleMat);
  mound.scale.set(1, 0.42, 1);
  mound.position.y = 0.036;
  kibbleGroup.add(mound);

  const pebbleGeo = new THREE.DodecahedronGeometry(0.011, 0);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.3;
    const rad = rim * (0.18 + (i % 3) * 0.16);
    const p = new THREE.Mesh(pebbleGeo, kibbleMat);
    p.position.set(Math.cos(a) * rad, 0.049 + (i % 2) * 0.007, Math.sin(a) * rad);
    p.rotation.set(i, i * 0.7, 0);
    kibbleGroup.add(p);
  }
  g.add(kibbleGroup);

  let level = THREE.MathUtils.clamp(initialFill, 0, 1);
  const syncFill = () => {
    kibbleGroup.visible = level > 0.02;
    kibbleGroup.scale.set(0.7 + 0.3 * level, Math.max(0.12, level), 0.7 + 0.3 * level);
  };
  syncFill();

  return {
    object: g,
    pos: g.position,
    rim,
    fill: () => level,
    setFill: (v: number) => {
      level = THREE.MathUtils.clamp(v, 0, 1);
      syncFill();
    },
    consume: (amount: number) => {
      level = THREE.MathUtils.clamp(level - amount, 0, 1);
      syncFill();
    },
    dispose: trackDispose(g),
  };
}

export function makeWaterBowl(pos: THREE.Vector3, initialFill = 0.2): BowlHandle {
  const g = new THREE.Group();
  g.position.copy(pos);

  const rim = 0.088;
  const bowlMat = new THREE.MeshStandardMaterial({ color: '#e6f4f9', roughness: 0.22, metalness: 0.06 });
  const accentMat = new THREE.MeshStandardMaterial({ color: '#58a8c9', roughness: 0.32 });
  const waterMat = new THREE.MeshStandardMaterial({
    color: '#6ec7e8',
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.84,
  });
  const rippleMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });

  const wall = new THREE.Mesh(new THREE.CylinderGeometry(rim, rim * 0.82, 0.046, 28), bowlMat);
  wall.position.y = 0.023;
  wall.castShadow = true;
  wall.receiveShadow = true;
  g.add(wall);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(rim * 0.96, 0.008, 10, 28), accentMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.045;
  g.add(collar);

  const water = new THREE.Mesh(new THREE.CircleGeometry(rim * 0.84, 24), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.04;
  g.add(water);

  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.014, 0.022, 24), rippleMat);
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = 0.043;
  g.add(ripple);

  let level = THREE.MathUtils.clamp(initialFill, 0, 1);
  let rippleT = 0;

  const syncFill = () => {
    water.visible = level > 0.02;
    water.position.y = 0.022 + level * 0.02;
    const s = 0.82 + 0.18 * level;
    water.scale.set(s, s, 1);
  };
  syncFill();

  return {
    object: g,
    pos: g.position,
    rim,
    fill: () => level,
    setFill: (v: number) => {
      level = THREE.MathUtils.clamp(v, 0, 1);
      syncFill();
      rippleT = 0.9;
    },
    consume: (amount: number) => {
      level = THREE.MathUtils.clamp(level - amount, 0, 1);
      syncFill();
      rippleT = 0.65;
    },
    triggerRipple: () => {
      rippleT = 0.85;
    },
    update: (dt: number) => {
      if (rippleT > 0) {
        rippleT = Math.max(0, rippleT - dt * 1.1);
        const phase = 1 - rippleT;
        const sc = 1 + phase * 2.7;
        ripple.scale.set(sc, sc, 1);
        ripple.position.y = water.position.y + 0.002;
        rippleMat.opacity = Math.sin(rippleT * Math.PI) * 0.55;
      } else {
        rippleMat.opacity = 0;
      }
    },
    dispose: trackDispose(g),
  };
}

export function makeCatBrush(): { object: THREE.Group; dispose: () => void } {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: '#c88d55', roughness: 0.45 });
  const padMat = new THREE.MeshStandardMaterial({ color: '#e9968c', roughness: 0.65 });
  const pinMat = new THREE.MeshStandardMaterial({ color: '#eef2f6', roughness: 0.3, metalness: 0.4 });

  const head = new THREE.Mesh(new RoundedBoxGeometry(0.068, 0.018, 0.092, 3, 0.007), woodMat);
  head.castShadow = true;
  g.add(head);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.11, 12), woodMat);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0.002, 0.088);
  g.add(handle);

  const pad = new THREE.Mesh(new RoundedBoxGeometry(0.056, 0.01, 0.076, 2, 0.004), padMat);
  pad.position.y = -0.008;
  g.add(pad);

  const pinGeo = new THREE.CylinderGeometry(0.0012, 0.0008, 0.014, 5);
  for (let ix = -2; ix <= 2; ix++) {
    for (let iz = -3; iz <= 3; iz++) {
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(ix * 0.011, -0.018, iz * 0.01);
      g.add(pin);
    }
  }

  return { object: g, dispose: trackDispose(g) };
}

export function makeBellBall(): ToyProp {
  const g = new THREE.Group();
  const r = 0.042;
  const ballMat = new THREE.MeshStandardMaterial({ color: '#ff8a6b', roughness: 0.32 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: '#fff3c4', roughness: 0.35 });
  const bellMat = new THREE.MeshStandardMaterial({ color: '#f3ca52', roughness: 0.25, metalness: 0.7 });

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), ballMat);
  sphere.castShadow = true;
  g.add(sphere);

  const band = new THREE.Mesh(new THREE.TorusGeometry(r * 0.99, 0.005, 8, 24), stripeMat);
  band.rotation.x = Math.PI / 2;
  g.add(band);

  const pip = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), bellMat);
  pip.position.set(0, r * 0.85, 0);
  g.add(pip);

  return {
    kind: 'ball',
    object: g,
    radius: r,
    bounce: 0.68,
    rest: r,
    grip: new THREE.Vector3(0, 0, 0),
    dispose: trackDispose(g),
  };
}

export function makeYarnBall(): ToyProp {
  const g = new THREE.Group();
  const r = 0.048;
  const yarnMat = new THREE.MeshStandardMaterial({ color: '#f07197', roughness: 0.86 });
  const highlightMat = new THREE.MeshStandardMaterial({ color: '#ff9ebb', roughness: 0.88 });

  const core = new THREE.Mesh(new THREE.SphereGeometry(r * 0.93, 18, 14), yarnMat);
  core.castShadow = true;
  g.add(core);

  const angles = [
    [0, 0, 0],
    [1.1, 0.4, 0.5],
    [2.2, 0.9, 1.1],
    [0.5, 1.5, 2.0],
    [1.7, 2.1, 0.3],
  ];
  for (let i = 0; i < angles.length; i++) {
    const loop = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.92, 0.009, 8, 22),
      i % 2 === 0 ? yarnMat : highlightMat,
    );
    loop.rotation.set(angles[i]![0]!, angles[i]![1]!, angles[i]![2]!);
    loop.castShadow = true;
    g.add(loop);
  }

  return {
    kind: 'yarn',
    object: g,
    radius: r,
    bounce: 0.38,
    rest: r,
    grip: new THREE.Vector3(0, 0, 0),
    dispose: trackDispose(g),
  };
}

export function makeCardboardBox(pos: THREE.Vector3): {
  object: THREE.Group;
  pos: THREE.Vector3;
  wiggle: () => void;
  update: (dt: number) => void;
  dispose: () => void;
} {
  const g = new THREE.Group();
  g.position.copy(pos);

  const cardMat = new THREE.MeshStandardMaterial({ color: '#c89b6e', roughness: 0.88, side: THREE.DoubleSide });
  const insideMat = new THREE.MeshStandardMaterial({ color: '#9c734b', roughness: 0.92, side: THREE.DoubleSide });
  const tapeMat = new THREE.MeshStandardMaterial({ color: '#e5cfac', roughness: 0.55 });

  const W = 0.34;
  const H = 0.14;
  const D = 0.28;
  const T = 0.008;

  const base = new THREE.Mesh(new THREE.BoxGeometry(W, T, D), insideMat);
  base.position.y = T / 2;
  base.receiveShadow = true;
  g.add(base);

  const wallGeoFB = new THREE.BoxGeometry(W, H, T);
  const front = new THREE.Mesh(wallGeoFB, cardMat);
  front.position.set(0, H / 2, D / 2);
  front.castShadow = true;
  g.add(front);

  const back = new THREE.Mesh(wallGeoFB, cardMat);
  back.position.set(0, H / 2, -D / 2);
  back.castShadow = true;
  g.add(back);

  const wallGeoLR = new THREE.BoxGeometry(T, H, D);
  const left = new THREE.Mesh(wallGeoLR, cardMat);
  left.position.set(-W / 2, H / 2, 0);
  left.castShadow = true;
  g.add(left);

  const right = new THREE.Mesh(wallGeoLR, cardMat);
  right.position.set(W / 2, H / 2, 0);
  right.castShadow = true;
  g.add(right);

  // Open side flaps
  const flapGeo = new THREE.BoxGeometry(0.08, T, D * 0.92);
  const flapL = new THREE.Mesh(flapGeo, cardMat);
  flapL.position.set(-W / 2 - 0.025, H + 0.015, 0);
  flapL.rotation.z = 0.52;
  g.add(flapL);

  const flapR = new THREE.Mesh(flapGeo, cardMat);
  flapR.position.set(W / 2 + 0.025, H + 0.015, 0);
  flapR.rotation.z = -0.52;
  g.add(flapR);

  const tape = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.004), tapeMat);
  tape.position.set(0, H * 0.58, D / 2 + 0.005);
  g.add(tape);

  let wiggleT = 0;

  return {
    object: g,
    pos: g.position,
    wiggle: () => {
      wiggleT = 0.8;
    },
    update: (dt: number) => {
      if (wiggleT > 0) {
        wiggleT = Math.max(0, wiggleT - dt);
        g.rotation.z = Math.sin(wiggleT * 28) * 0.08 * wiggleT;
      } else {
        g.rotation.z = 0;
      }
    },
    dispose: trackDispose(g),
  };
}

export interface CatWandHandle {
  object: THREE.Group;
  sim: CatWandSim;
  tipWorld: THREE.Vector3;
  setHandleWorld: (tip: THREE.Vector3) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

export function makeCatWand(): CatWandHandle {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: '#c4834b', roughness: 0.45 });
  const cordMat = new THREE.LineBasicMaterial({ color: '#f5efe6', linewidth: 2 });
  const featherPink = new THREE.MeshStandardMaterial({ color: '#ff7fa6', roughness: 0.65, side: THREE.DoubleSide });
  const featherGold = new THREE.MeshStandardMaterial({ color: '#ffd36b', roughness: 0.65, side: THREE.DoubleSide });
  const bellMat = new THREE.MeshStandardMaterial({ color: '#f6cb52', roughness: 0.25, metalness: 0.75 });

  // Wand stick (pointing backward along +Z / up from tip)
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.008, 0.52, 8), woodMat);
  stick.rotation.x = Math.PI * 0.36;
  stick.position.set(0, 0.11, 0.22);
  const tipGroup = new THREE.Group();
  tipGroup.add(stick);
  g.add(tipGroup);

  const sim = new CatWandSim(new THREE.Vector3(0, 0.52, 0.35));

  // Cord line
  const cordPositions = new Float32Array(sim.nodes.length * 3);
  const cordGeo = new THREE.BufferGeometry();
  cordGeo.setAttribute('position', new THREE.BufferAttribute(cordPositions, 3));
  const cordLine = new THREE.Line(cordGeo, cordMat);
  g.add(cordLine);

  // Feather lure cluster at sim.lurePos
  const lureGroup = new THREE.Group();
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.013, 12, 10), bellMat);
  lureGroup.add(bell);

  const fGeo = new THREE.ConeGeometry(0.018, 0.075, 5);
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(fGeo, i === 1 ? featherGold : featherPink);
    const a = (i / 3) * Math.PI * 2;
    f.position.set(Math.cos(a) * 0.012, -0.032, Math.sin(a) * 0.012);
    f.rotation.set(0.28, a, 0.22);
    lureGroup.add(f);
  }
  g.add(lureGroup);

  const tipWorld = new THREE.Vector3(0, 0.55, 0.35);

  const syncVisuals = () => {
    tipGroup.position.copy(tipWorld);
    const attr = cordGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < sim.nodes.length; i++) {
      const n = sim.nodes[i]!;
      attr.setXYZ(i, n.x, n.y, n.z);
    }
    attr.needsUpdate = true;
    const prev = sim.nodes[sim.nodes.length - 2]!;
    const lure = sim.lurePos;
    lureGroup.position.copy(lure);
    lureGroup.rotation.z = THREE.MathUtils.clamp((prev.x - lure.x) * 6, -0.8, 0.8);
    lureGroup.rotation.x = THREE.MathUtils.clamp((lure.z - prev.z) * 6, -0.8, 0.8);
  };
  syncVisuals();

  return {
    object: g,
    sim,
    tipWorld,
    setHandleWorld: (tip: THREE.Vector3) => {
      tipWorld.copy(tip);
    },
    update: (dt: number) => {
      sim.step(dt, tipWorld);
      syncVisuals();
    },
    dispose: () => {
      cordGeo.dispose();
      cordMat.dispose();
      trackDispose(g)();
    },
  };
}
