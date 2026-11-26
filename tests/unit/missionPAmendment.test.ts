import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { gameAudio, SFX_DOMAIN_MAP, type AudioDomain } from '../../src/game/audio/gameAudioManager';
import {
  VUENA_JOINT_LIMITS,
  clampBoneRelativeToRest,
  constrainPawReachTarget,
  enforceCatGroundContact,
  preserveBoneLengths,
  safeFinite,
  safeNormalizeVec3,
  sanitizeQuaternion,
  type RestBoneEntry,
} from '../../src/game/pet/care/catAnatomyConstraints';
import { CatAnimationAdapter } from '../../src/game/pet/care/CatAnimationAdapter';
import { solveVuenaFrontPawIk } from '../../src/game/pet/care/catPawIk';
import { computeGameplayZoom, computeScenicBounds, fitWorldZoom } from '../../src/game/art/worldCamera';
import {
  createChickenActorState,
  evaluateNpcReaction,
  evaluateOverworldCatEmergentBehavior,
  isExemptFromCleanupTimeout,
  stepEmergentChicken,
} from '../../src/shared/world/emergentWorldBehavior';

describe('Mission P Amendment — Audio Sprites, Pet Constraints, Emergent Behavior & Safari Guards', () => {
  it('validates all 4 domain audio sprite manifests cover mapped SFX with valid timings', () => {
    const domains: AudioDomain[] = ['farming', 'world', 'pet', 'ui'];
    const manifests = new Map<AudioDomain, { resources: string[]; spritemap: Record<string, { start: number; end: number }> }>();

    for (const d of domains) {
      const jsonPath = path.join(process.cwd(), `public/assets/audio/sprites/${d}.json`);
      const mp3Path = path.join(process.cwd(), `public/assets/audio/sprites/${d}.mp3`);
      expect(fs.existsSync(jsonPath), `${d}.json missing`).toBe(true);
      expect(fs.existsSync(mp3Path), `${d}.mp3 missing`).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      expect(parsed.resources?.[0]).toBe(`/assets/audio/sprites/${d}.mp3`);
      for (const [k, clip] of Object.entries<{ start: number; end: number }>(parsed.spritemap)) {
        expect(clip.end, `${d}:${k}`).toBeGreaterThan(clip.start);
      }
      manifests.set(d, parsed);
    }

    for (const [sfx, spec] of Object.entries(SFX_DOMAIN_MAP)) {
      const m = manifests.get(spec.domain)!;
      expect(m.spritemap[spec.clip], `Missing clip ${spec.clip} in ${spec.domain} for ${sfx}`).toBeDefined();
    }

    // Audio manager stays safe under missing WebAudio / NaN volume in headless/Safari edge cases
    gameAudio.setSettings({ masterVolume: Number.NaN, musicVolume: -1, sfxVolume: 5 });
    const s = gameAudio.getSettings();
    expect(Number.isFinite(s.masterVolume)).toBe(true);
    expect(s.musicVolume).toBeGreaterThanOrEqual(0);
    expect(s.sfxVolume).toBeLessThanOrEqual(1);
    expect(() => gameAudio.playSfx('hoe')).not.toThrow();
    expect(() => gameAudio.playDomainSfx('farming', 'plant')).not.toThrow();
  });

  it('enforces anatomical joint limits, bone lengths, ground contact, and NaN safety on Vuena bones', () => {
    expect(safeFinite(Number.NaN, 1)).toBe(1);
    const zeroVec = new THREE.Vector3(0, 0, 0);
    safeNormalizeVec3(zeroVec, new THREE.Vector3(0, 1, 0));
    expect(zeroVec.y).toBeCloseTo(1);

    const badQuat = new THREE.Quaternion(Number.NaN, 0, 0, 0);
    sanitizeQuaternion(badQuat);
    expect(Number.isFinite(badQuat.w)).toBe(true);
    expect(badQuat.length()).toBeCloseTo(1);

    const actor = new THREE.Group();
    const animRoot = new THREE.Group();
    actor.add(animRoot);

    const hips = new THREE.Bone();
    hips.position.set(0, 0.14, 0);
    const spine = new THREE.Bone();
    spine.position.set(0, 0.04, 0.06);
    const neck = new THREE.Bone();
    neck.position.set(0, 0.05, 0.05);
    const head = new THREE.Bone();
    head.position.set(0, 0.04, 0.04);
    const flU = new THREE.Bone();
    flU.position.set(0.058, 0.0708, 0.0381);
    const flL = new THREE.Bone();
    flL.position.set(0, -0.071, 0);

    animRoot.add(hips);
    hips.add(spine);
    spine.add(neck, flU);
    neck.add(head);
    flU.add(flL);

    // Extreme invalid rotation gets clamped tightly inside VUENA_JOINT_LIMITS.Neck
    const restQuat = neck.quaternion.clone();
    neck.rotateY(2.8);
    neck.rotateX(-1.9);
    clampBoneRelativeToRest(neck, restQuat, VUENA_JOINT_LIMITS.Neck!);
    const clampedEuler = new THREE.Euler().setFromQuaternion(neck.quaternion, 'YXZ');
    expect(Math.abs(clampedEuler.y)).toBeLessThanOrEqual(VUENA_JOINT_LIMITS.Neck!.maxY + 1e-3);
    expect(Math.abs(clampedEuler.x)).toBeLessThanOrEqual(Math.abs(VUENA_JOINT_LIMITS.Neck!.minX) + 1e-3);

    // Bone length preservation fixes stretched lower limb back to rest length
    const restEntries: RestBoneEntry[] = [
      { name: 'Neck', bone: neck, pos: neck.position.clone(), quat: restQuat, length: neck.position.length() },
      { name: 'FrontLowerLeg_L', bone: flL, pos: flL.position.clone(), quat: flL.quaternion.clone(), length: 0.071 },
    ];
    flL.position.set(0, -0.25, 0);
    preserveBoneLengths(restEntries);
    expect(flL.position.length()).toBeCloseTo(0.071, 4);

    // Behind-shoulder target attenuates IK reachWeight cleanly and keeps zero NaN
    const behind = constrainPawReachTarget({
      relActor: new THREE.Vector3(0, 0.05, -0.2),
      upperLen: 0.071,
      lowerLen: 0.071,
      shoulderWorldY: 0.14,
      actorScale: 1,
    });
    expect(behind.reachWeight).toBe(0);

    // Ground contact prevents limb penetration below y=0
    flL.position.set(0, -0.35, 0);
    hips.position.set(0, 0.05, 0);
    enforceCatGroundContact(animRoot, actor, { FrontLowerLeg_L: flL, Hips: hips }, 0);
    actor.updateMatrixWorld(true);
    const footPos = new THREE.Vector3();
    flL.getWorldPosition(footPos);
    expect(footPos.y).toBeGreaterThanOrEqual(-1e-3);

    // CatAnimationAdapter + IK stay NaN-free even under NaN dt & NaN target
    const adapter = new CatAnimationAdapter(
      actor,
      animRoot,
      [new THREE.AnimationClip('idle', 1, [])],
      { Hips: hips, Spine: spine, Neck: neck, Head: head, FrontUpperLeg_L: flU, FrontLowerLeg_L: flL },
    );
    adapter.pawSwipe = {
      side: 'L',
      progress: 0.5,
      active: true,
      targetWorld: new THREE.Vector3(Number.NaN, 0.1, 0.2),
    };
    adapter.update(Number.NaN);
    expect(Number.isFinite(flU.quaternion.x)).toBe(true);
    solveVuenaFrontPawIk({
      actorGroup: actor,
      spine,
      upperActive: flU,
      lowerActive: flL,
      targetWorld: new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0),
      side: 'L',
      weight: 0.8,
    });
    expect(Number.isFinite(flL.quaternion.w)).toBe(true);
  });

  it('drives emergent chicken/NPC/cat behaviors and exempts resting/interacting states from timeouts', () => {
    expect(isExemptFromCleanupTimeout('waiting')).toBe(true);
    expect(isExemptFromCleanupTimeout('sleeping')).toBe(true);
    expect(isExemptFromCleanupTimeout('sitting')).toBe(true);
    expect(isExemptFromCleanupTimeout('interacting')).toBe(true);
    expect(isExemptFromCleanupTimeout('roosting_sleep')).toBe(true);

    const blockWall = (tx: number) => tx >= 12;
    const chick = createChickenActorState('c1', 10 * 16, 14 * 16, 0);
    stepEmergentChicken(chick, {
      nowMs: 1000,
      dtSec: 0.05,
      tilePx: 16,
      playerX: 10 * 16 + 24,
      playerY: 14 * 16,
      playerRunning: false,
      toolSwinging: false,
      heldItemSku: 'seed_turnip',
      isNight: false,
      weatherKind: 'sunny',
      isTileBlocked: blockWall,
    });
    expect(chick.activity).toBe('curious_seed');
    expect(Math.floor(chick.x / 16)).toBeLessThan(12);

    stepEmergentChicken(chick, {
      nowMs: 2000,
      dtSec: 0.05,
      tilePx: 16,
      playerX: chick.x + 12,
      playerY: chick.y,
      playerRunning: true,
      toolSwinging: false,
      heldItemSku: null,
      isNight: false,
      weatherKind: 'sunny',
      isTileBlocked: blockWall,
    });
    expect(chick.activity).toBe('startled_hop');

    stepEmergentChicken(chick, {
      nowMs: 5000,
      dtSec: 0.05,
      tilePx: 16,
      playerX: chick.x + 20,
      playerY: chick.y,
      playerRunning: false,
      toolSwinging: false,
      heldItemSku: null,
      isNight: true,
      weatherKind: 'sunny',
      isTileBlocked: blockWall,
    });
    expect(chick.activity).toBe('roosting_sleep');

    const npcNear = evaluateNpcReaction({
      npcX: 100,
      npcY: 100,
      playerX: 120,
      playerY: 100,
      playerPosture: 'none',
      isNight: false,
      weatherKind: 'sunny',
    });
    expect(npcNear.state).toBe('interacting');
    expect(npcNear.facing).toBe('right');

    const catSofa = evaluateOverworldCatEmergentBehavior({
      isNight: false,
      isStudying: false,
      playerPosture: 'sit_sofa',
      playerFarmingActive: false,
      nearestChickenDistPx: 200,
      nowMs: 1000,
    });
    expect(catSofa.state).toBe('sitting');
    expect(catSofa.intent).toBe('sit');

    const catFarm = evaluateOverworldCatEmergentBehavior({
      isNight: false,
      isStudying: false,
      playerPosture: 'none',
      playerFarmingActive: true,
      nearestChickenDistPx: 200,
      nowMs: 1000,
    });
    expect(catFarm.state).toBe('watching_farm');
  });

  it('guards camera zoom & bounds helpers against zero, negative, and NaN viewport values', () => {
    const z1 = computeGameplayZoom(Number.NaN, 0, -100, 0, Number.NaN);
    const z2 = fitWorldZoom(0, Number.NaN, 0, -5);
    const bounds = computeScenicBounds(0, Number.NaN, 0, 256, 224);
    expect(Number.isFinite(z1) && z1 > 0).toBe(true);
    expect(Number.isFinite(z2) && z2 > 0).toBe(true);
    expect(Number.isFinite(bounds.x) && Number.isFinite(bounds.y)).toBe(true);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
  });
});
