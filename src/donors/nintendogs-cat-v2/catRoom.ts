// Adapted from SawyerHood/nintendogs-threejs@43d231c (src/world/room.ts + src/game/cameraRig.ts)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Bounds, Circle } from './catActor';

export class FollowCamera {
  zoom = 1;
  private pos = new THREE.Vector3();
  private tgt = new THREE.Vector3();
  private first = true;
  lateral = 0.38;
  follow = 0.86;
  minDist = 0.52;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    readonly base: { position: THREE.Vector3; target: THREE.Vector3; fov?: number },
  ) {
    camera.fov = base.fov ?? 46;
    camera.updateProjectionMatrix();
    camera.position.copy(base.position);
    camera.lookAt(base.target);
  }

  attachWheel(el: HTMLElement) {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.zoom = THREE.MathUtils.clamp(this.zoom * (1 + e.deltaY * 0.001), 0.58, 1.42);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }

  update(dt: number, focus: THREE.Vector3 | null, snap = false) {
    const b = this.base;
    const tgt = focus ? b.target.clone().lerp(focus, this.follow) : b.target.clone();
    const fwd = b.target.clone().sub(b.position).setY(0).normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const pos = b.position.clone();
    if (focus) {
      const rel = focus.clone().sub(b.position);
      const side = rel.dot(right);
      pos.addScaledVector(right, THREE.MathUtils.clamp(side * this.lateral, -0.95, 0.95));
      const ahead = rel.dot(fwd);
      if (ahead > 1.45) pos.addScaledVector(fwd, (ahead - 1.45) * 0.32);
    }
    const toT = tgt.clone().sub(pos);
    const dist = toT.length();
    const want = Math.max(this.minDist, dist * this.zoom);
    pos.copy(tgt).addScaledVector(toT.normalize(), -want);

    if (this.first || snap) {
      this.pos.copy(pos);
      this.tgt.copy(tgt);
      this.first = false;
    } else {
      const k = 1 - Math.exp(-3.4 * dt);
      this.pos.lerp(pos, k);
      this.tgt.lerp(tgt, 1 - Math.exp(-4.2 * dt));
    }
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.tgt);
  }

  playerSpot(floorY = 0, dist = 0.85): THREE.Vector3 {
    const fwd = this.base.target.clone().sub(this.base.position).setY(0).normalize();
    return this.base.position.clone().setY(floorY).addScaledVector(fwd, dist);
  }
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeWoodPlankTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const g = c.getContext('2d')!;
  const rand = rng(1042);

  g.fillStyle = '#cf9c67';
  g.fillRect(0, 0, 512, 512);

  const plankH = 64;
  for (let row = 0; row < 8; row++) {
    const y = row * plankH;
    const offset = (row % 2) * 128;
    for (let col = -1; col < 3; col++) {
      const x = col * 256 + offset;
      const shade = 0.92 + rand() * 0.16;
      const r = Math.round(206 * shade);
      const gr = Math.round(154 * shade);
      const b = Math.round(102 * shade);
      g.fillStyle = `rgb(${r},${gr},${b})`;
      g.fillRect(x, y, 256, plankH);

      // Subtle grain streaks
      g.strokeStyle = `rgba(110, 68, 32, 0.14)`;
      g.lineWidth = 1.4;
      for (let k = 0; k < 10; k++) {
        const gy = y + 5 + rand() * (plankH - 10);
        g.beginPath();
        g.moveTo(x, gy);
        g.bezierCurveTo(x + 80, gy + (rand() - 0.5) * 6, x + 170, gy + (rand() - 0.5) * 6, x + 256, gy);
        g.stroke();
      }
      // Seam
      g.strokeStyle = 'rgba(92, 56, 28, 0.35)';
      g.lineWidth = 2;
      g.strokeRect(x, y, 256, plankH);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3.2, 3.2);
  tex.needsUpdate = true;
  return tex;
}

function makeRugTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  const rand = rng(907);

  g.fillStyle = '#f4dfc8';
  g.fillRect(0, 0, 256, 256);

  // Warm coral & sage stripes
  g.fillStyle = '#e58e73';
  g.fillRect(0, 22, 256, 18);
  g.fillRect(0, 216, 256, 18);
  g.fillStyle = '#89ad99';
  g.fillRect(0, 48, 256, 10);
  g.fillRect(0, 198, 256, 10);

  // Woven threads
  for (let y = 0; y < 256; y += 4) {
    for (let x = 0; x < 256; x += 6) {
      g.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(130,85,55,0.08)';
      g.fillRect(x, y, 3, 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface CatLivingRoom {
  group: THREE.Group;
  bounds: Bounds;
  obstacles: Circle[];
  bedSpot: THREE.Vector3;
  sunSpot: THREE.Vector3;
  scratchSpot: THREE.Vector3;
  foodBowlSpot: THREE.Vector3;
  waterBowlSpot: THREE.Vector3;
  boxSpot: THREE.Vector3;
  cameraBase: { position: THREE.Vector3; target: THREE.Vector3; fov: number };
  update: (dt: number) => void;
  dispose: () => void;
}

export function buildCatLivingRoom(): CatLivingRoom {
  const group = new THREE.Group();
  const textures: THREE.Texture[] = [];

  const bounds: Bounds = {
    minX: -1.65,
    maxX: 1.65,
    minZ: -1.25,
    maxZ: 1.35,
  };

  // Warm ambient + hemisphere + sunlit key light + cozy interior fill
  const hemi = new THREE.HemisphereLight('#fff4df', '#b88f6a', 1.15);
  group.add(hemi);

  const sunLight = new THREE.DirectionalLight('#fff2d2', 1.75);
  sunLight.position.set(-1.9, 2.8, -0.4);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 0.4;
  sunLight.shadow.camera.far = 9;
  sunLight.shadow.camera.left = -2.4;
  sunLight.shadow.camera.right = 2.4;
  sunLight.shadow.camera.top = 2.4;
  sunLight.shadow.camera.bottom = -2.4;
  sunLight.shadow.bias = -0.0005;
  group.add(sunLight);

  const fillLight = new THREE.PointLight('#ffd9ad', 1.4, 7, 1.5);
  fillLight.position.set(1.2, 1.85, 1.2);
  group.add(fillLight);

  // Floor
  const woodTex = makeWoodPlankTexture();
  textures.push(woodTex);
  const floorMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.72, metalness: 0.02 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4.8), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Walls (warm cream plaster + oak wainscoting)
  const wallMat = new THREE.MeshStandardMaterial({ color: '#f5ead8', roughness: 0.9 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#e6d3b6', roughness: 0.7 });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.8, 0.12), wallMat);
  backWall.position.set(0, 1.4, -1.62);
  backWall.receiveShadow = true;
  group.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.8, 4.8), wallMat);
  leftWall.position.set(-2.12, 1.4, 0.2);
  leftWall.receiveShadow = true;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.8, 4.8), wallMat);
  rightWall.position.set(2.12, 1.4, 0.2);
  rightWall.receiveShadow = true;
  group.add(rightWall);

  const baseboardBack = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.16, 0.15), trimMat);
  baseboardBack.position.set(0, 0.08, -1.6);
  group.add(baseboardBack);

  // Sunlit picture window on back-left wall
  const windowFrameMat = new THREE.MeshStandardMaterial({ color: '#fbf4ea', roughness: 0.45 });
  const glassMat = new THREE.MeshBasicMaterial({ color: '#fff3cc' });
  const winPane = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 1.1), glassMat);
  winPane.position.set(-0.98, 1.24, -1.55);
  group.add(winPane);

  const winFrameTop = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.06, 0.06), windowFrameMat);
  winFrameTop.position.set(-0.98, 1.81, -1.54);
  group.add(winFrameTop);
  const winFrameBot = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.11), windowFrameMat);
  winFrameBot.position.set(-0.98, 0.67, -1.52);
  group.add(winFrameBot);
  const winMullionV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.14, 0.04), windowFrameMat);
  winMullionV.position.set(-0.98, 1.24, -1.53);
  group.add(winMullionV);
  const winMullionH = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.04), windowFrameMat);
  winMullionH.position.set(-0.98, 1.26, -1.53);
  group.add(winMullionH);

  // Soft sunlit patch on floor
  const sunPatchMat = new THREE.MeshBasicMaterial({
    color: '#ffe79c',
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const sunPatch = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 0.95), sunPatchMat);
  sunPatch.rotation.x = -Math.PI / 2;
  sunPatch.rotation.z = -0.18;
  sunPatch.position.set(-0.62, 0.003, -0.35);
  group.add(sunPatch);

  // Cozy woven living-room rug
  const rugTex = makeRugTexture();
  textures.push(rugTex);
  const rugMat = new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.92 });
  const rug = new THREE.Mesh(new RoundedBoxGeometry(1.65, 0.012, 1.15, 2, 0.005), rugMat);
  rug.position.set(-0.05, 0.006, 0.12);
  rug.receiveShadow = true;
  group.add(rug);

  // Couple's cozy loveseat sofa at back-right
  const sofaMat = new THREE.MeshStandardMaterial({ color: '#7ea28f', roughness: 0.85 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: '#f3c19d', roughness: 0.82 });
  const sofa = new THREE.Group();
  sofa.position.set(0.55, 0, -1.16);
  const sofaBase = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.24, 0.56, 3, 0.04), sofaMat);
  sofaBase.position.y = 0.14;
  sofaBase.castShadow = true;
  sofaBase.receiveShadow = true;
  sofa.add(sofaBase);
  const sofaBack = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.42, 0.16, 3, 0.04), sofaMat);
  sofaBack.position.set(0, 0.36, -0.21);
  sofaBack.castShadow = true;
  sofa.add(sofaBack);
  const armL = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.34, 0.56, 3, 0.03), sofaMat);
  armL.position.set(-0.56, 0.26, 0);
  sofa.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.56;
  sofa.add(armR);
  const throwPillow = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.2, 0.1, 2, 0.03), cushionMat);
  throwPillow.position.set(-0.34, 0.34, -0.06);
  throwPillow.rotation.set(-0.2, 0.2, 0.12);
  sofa.add(throwPillow);
  group.add(sofa);

  // Quilted cat bed cushion near sunbeam
  const bedOuterMat = new THREE.MeshStandardMaterial({ color: '#d87d63', roughness: 0.88 });
  const bedInnerMat = new THREE.MeshStandardMaterial({ color: '#fff3e2', roughness: 0.92 });
  const bedSpot = new THREE.Vector3(-0.98, 0, -0.58);
  const bedRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.06, 12, 26), bedOuterMat);
  bedRing.rotation.x = Math.PI / 2;
  bedRing.position.set(bedSpot.x, 0.048, bedSpot.z);
  bedRing.castShadow = true;
  bedRing.receiveShadow = true;
  group.add(bedRing);
  const bedPad = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.035, 22), bedInnerMat);
  bedPad.position.set(bedSpot.x, 0.02, bedSpot.z);
  bedPad.receiveShadow = true;
  group.add(bedPad);

  // Multi-tier sisal cat scratching post
  const woodPostMat = new THREE.MeshStandardMaterial({ color: '#c48d5a', roughness: 0.72 });
  const sisalMat = new THREE.MeshStandardMaterial({ color: '#d9c39b', roughness: 0.96 });
  const scratchSpot = new THREE.Vector3(1.18, 0, -0.52);
  const postBase = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.04, 0.36, 2, 0.01), woodPostMat);
  postBase.position.set(scratchSpot.x, 0.02, scratchSpot.z);
  postBase.castShadow = true;
  postBase.receiveShadow = true;
  group.add(postBase);
  const postCol = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.56, 16), sisalMat);
  postCol.position.set(scratchSpot.x, 0.3, scratchSpot.z);
  postCol.castShadow = true;
  group.add(postCol);
  const postTop = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.04, 0.3, 2, 0.015), bedOuterMat);
  postTop.position.set(scratchSpot.x, 0.58, scratchSpot.z);
  postTop.castShadow = true;
  group.add(postTop);

  // Potted leafy corner plant near window
  const potMat = new THREE.MeshStandardMaterial({ color: '#c96f4d', roughness: 0.65 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#588c5e', roughness: 0.62, side: THREE.DoubleSide });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.22, 16), potMat);
  pot.position.set(-1.58, 0.11, -1.18);
  pot.castShadow = true;
  group.add(pot);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), leafMat);
    const a = (i / 6) * Math.PI * 2;
    leaf.scale.set(1.2, 0.25, 0.6);
    leaf.position.set(-1.58 + Math.cos(a) * 0.1, 0.27 + (i % 2) * 0.05, -1.18 + Math.sin(a) * 0.1);
    leaf.rotation.set(0.35, -a, 0.3);
    group.add(leaf);
  }

  // Framed pixel heart picture above sofa
  const frameMat = new THREE.MeshStandardMaterial({ color: '#a87447', roughness: 0.5 });
  const artMat = new THREE.MeshStandardMaterial({ color: '#fdebd9', roughness: 0.85 });
  const heartMat = new THREE.MeshStandardMaterial({ color: '#eb6c7d', roughness: 0.55 });
  const frame = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.36, 0.03, 2, 0.008), frameMat);
  frame.position.set(0.55, 1.15, -1.55);
  group.add(frame);
  const canvasArt = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.28), artMat);
  canvasArt.position.set(0.55, 1.15, -1.533);
  group.add(canvasArt);
  const heartDot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 12), heartMat);
  heartDot.scale.set(1, 0.9, 0.25);
  heartDot.position.set(0.55, 1.15, -1.525);
  group.add(heartDot);

  // Feeding tray mat (food + water bowls sit cleanly on front-right wooden tray)
  const trayMat = new THREE.MeshStandardMaterial({ color: '#b47c4c', roughness: 0.58 });
  const tray = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.014, 0.24, 2, 0.005), trayMat);
  tray.position.set(0.86, 0.007, 0.42);
  tray.rotation.y = -0.28;
  tray.receiveShadow = true;
  group.add(tray);

  // Floating sunlit dust motes
  const moteCount = 36;
  const motePositions = new Float32Array(moteCount * 3);
  const randMote = rng(551);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = -1.2 + randMote() * 1.4;
    motePositions[i * 3 + 1] = 0.15 + randMote() * 1.3;
    motePositions[i * 3 + 2] = -1.1 + randMote() * 1.3;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMat = new THREE.PointsMaterial({
    color: '#fff2be',
    size: 0.022,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  group.add(motes);

  const obstacles: Circle[] = [
    { x: 0.55, z: -1.14, r: 0.58 }, // sofa center approximation
    { x: 0.15, z: -1.14, r: 0.34 },
    { x: 0.95, z: -1.14, r: 0.34 },
    { x: scratchSpot.x, z: scratchSpot.z, r: 0.22 },
    { x: -1.58, z: -1.18, r: 0.16 },
  ];

  let elapsed = 0;

  return {
    group,
    bounds,
    obstacles,
    bedSpot,
    sunSpot: new THREE.Vector3(-0.62, 0, -0.35),
    scratchSpot: new THREE.Vector3(scratchSpot.x - 0.28, 0, scratchSpot.z + 0.18),
    foodBowlSpot: new THREE.Vector3(0.75, 0, 0.38),
    waterBowlSpot: new THREE.Vector3(0.98, 0, 0.45),
    boxSpot: new THREE.Vector3(-0.78, 0, 0.38),
    cameraBase: {
      position: new THREE.Vector3(0.05, 0.72, 1.88),
      target: new THREE.Vector3(0, 0.16, 0.02),
      fov: 46,
    },
    update: (dt: number) => {
      elapsed += dt;
      const attr = moteGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < moteCount; i++) {
        let y = attr.getY(i) + dt * 0.03;
        if (y > 1.45) y = 0.12;
        attr.setY(i, y);
        attr.setX(i, attr.getX(i) + Math.sin(elapsed * 0.9 + i) * dt * 0.015);
      }
      attr.needsUpdate = true;
    },
    dispose: () => {
      const geos = new Set<THREE.BufferGeometry>();
      const mats = new Set<THREE.Material>();
      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) geos.add(mesh.geometry);
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            for (const m of mesh.material) mats.add(m);
          } else {
            mats.add(mesh.material);
          }
        }
      });
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
