// Subtle 3D floating emote sprites (heart, sparkle, note, zzz) + partner hand aura
// Uses canvas textures instead of noisy chat bubbles over the cat's face.
import * as THREE from 'three';

export type CatEmoteKind = 'heart' | 'sparkle' | 'note' | 'zzz' | 'question' | 'drop';

interface ActiveEmote {
  sprite: THREE.Sprite;
  age: number;
  life: number;
  vy: number;
  vx: number;
}

function makeEmoteTexture(kind: CatEmoteKind): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 64, 64);

  if (kind === 'heart') {
    g.fillStyle = '#ff6b8a';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(32, 50);
    g.bezierCurveTo(10, 36, 8, 16, 22, 16);
    g.bezierCurveTo(28, 16, 32, 22, 32, 24);
    g.bezierCurveTo(32, 22, 36, 16, 42, 16);
    g.bezierCurveTo(56, 16, 54, 36, 32, 50);
    g.closePath();
    g.fill();
    g.stroke();
  } else if (kind === 'sparkle') {
    g.fillStyle = '#ffd966';
    g.strokeStyle = '#fff9db';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(32, 8);
    g.quadraticCurveTo(36, 28, 56, 32);
    g.quadraticCurveTo(36, 36, 32, 56);
    g.quadraticCurveTo(28, 36, 8, 32);
    g.quadraticCurveTo(28, 28, 32, 8);
    g.closePath();
    g.fill();
    g.stroke();
  } else if (kind === 'note') {
    g.fillStyle = '#ff9d5c';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2.5;
    g.beginPath();
    g.ellipse(24, 44, 9, 7, -0.35, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(31, 42);
    g.lineTo(31, 14);
    g.lineTo(48, 20);
    g.lineTo(48, 27);
    g.lineTo(34, 22);
    g.stroke();
  } else if (kind === 'zzz') {
    g.font = 'bold 28px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    g.strokeText('z', 24, 38);
    g.fillStyle = '#8aa7d6';
    g.fillText('z', 24, 38);
    g.font = 'bold 20px Georgia, serif';
    g.strokeText('z', 42, 22);
    g.fillText('z', 42, 22);
  } else if (kind === 'question') {
    g.font = 'bold 34px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    g.strokeText('?', 32, 32);
    g.fillStyle = '#e88b58';
    g.fillText('?', 32, 32);
  } else {
    // drop
    g.fillStyle = '#6ec7e8';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(32, 10);
    g.quadraticCurveTo(48, 32, 44, 42);
    g.arc(32, 40, 12, 0.2, Math.PI - 0.2);
    g.closePath();
    g.fill();
    g.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class PetCareEmoteSystem {
  private readonly textures = new Map<CatEmoteKind, THREE.CanvasTexture>();
  private readonly active: ActiveEmote[] = [];

  constructor(private readonly parent: THREE.Object3D) {}

  private tex(kind: CatEmoteKind): THREE.CanvasTexture {
    let t = this.textures.get(kind);
    if (!t) {
      t = makeEmoteTexture(kind);
      this.textures.set(kind, t);
    }
    return t;
  }

  spawn(kind: CatEmoteKind, worldPos: THREE.Vector3) {
    const mat = new THREE.SpriteMaterial({
      map: this.tex(kind),
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(worldPos);
    sprite.position.y += 0.24;
    sprite.scale.set(0.085, 0.085, 0.085);
    this.parent.add(sprite);
    this.active.push({
      sprite,
      age: 0,
      life: kind === 'zzz' ? 1.55 : 1.05,
      vy: 0.16 + Math.random() * 0.08,
      vx: (Math.random() - 0.5) * 0.08,
    });
  }

  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i]!;
      e.age += dt;
      const p = e.age / e.life;
      if (p >= 1) {
        e.sprite.removeFromParent();
        e.sprite.material.dispose();
        this.active.splice(i, 1);
        continue;
      }
      e.sprite.position.y += e.vy * dt;
      e.sprite.position.x += e.vx * dt;
      const s = 0.065 + Math.sin(Math.min(1, p * 2.2) * Math.PI * 0.5) * 0.032;
      e.sprite.scale.set(s, s, s);
      e.sprite.material.opacity = p > 0.55 ? Math.max(0, 1 - (p - 0.55) / 0.45) : 0.95;
    }
  }

  dispose() {
    for (const e of this.active) {
      e.sprite.removeFromParent();
      e.sprite.material.dispose();
    }
    this.active.length = 0;
    for (const t of this.textures.values()) t.dispose();
    this.textures.clear();
  }
}
