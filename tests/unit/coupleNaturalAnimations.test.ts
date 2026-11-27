import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoupleEmoteDock } from '../../src/features/couple/CoupleEmoteDock';
import {
  computeSharedHandAnchor,
  solveTwoBoneArmFabrik,
} from '../../src/shared/couple/coupleHandKinematics';
import {
  computeHoldHandsCompanionTarget,
  evaluateHoldHandsTether,
} from '../../src/shared/couple/couplePairLocomotion';
import {
  evaluateCouplePhase,
  HOLD_CONNECT_MS,
  HOLD_REACH_MS,
  HOLD_RELEASE_MS,
  HUG_APPROACH_MS,
  HUG_EMBRACE_MS,
  HUG_RELEASE_MS,
} from '../../src/shared/couple/coupleStateMachine';
import {
  COUPLE_ACTIVE_INTERACTION_OPTIONS,
  COUPLE_P1_ENABLED,
  type CoupleInvitePayload,
} from '../../src/shared/couple/coupleTypes';

describe('Natural P0 couple animations & docked invite visibility', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('keeps P1 disabled and exposes only hug and hold_hands in active P0 options', () => {
    expect(COUPLE_P1_ENABLED).toBe(false);
    expect(COUPLE_ACTIVE_INTERACTION_OPTIONS.map((o) => o.id)).toEqual(['hold_hands', 'hug']);
  });

  it('solves 2-bone FABRIK arm link and meets hands at shared midpoint anchor', () => {
    const arm = solveTwoBoneArmFabrik({ x: 96, y: 92 }, { x: 100, y: 96 }, 3.2, 3.2, -1);
    expect(arm.shoulder).toEqual({ x: 96, y: 92 });
    expect(Math.hypot(arm.wrist.x - 100, arm.wrist.y - 96)).toBeLessThanOrEqual(0.5);

    const contactS1 = computeSharedHandAnchor({
      ax: 100,
      ay: 120,
      aFacing: 'down',
      bx: 112,
      by: 120,
      bFacing: 'down',
      reachAlpha: 1,
      walkPhaseRad: 0,
      moving: false,
      scale: 1,
    });
    expect(contactS1.distPx).toBeLessThanOrEqual(1.5);
    expect(contactS1.anchorX).toBeGreaterThan(100);
    expect(contactS1.anchorX).toBeLessThan(112);

    const contactS2 = computeSharedHandAnchor({
      ax: 200,
      ay: 240,
      aFacing: 'down',
      bx: 224,
      by: 240,
      bFacing: 'down',
      reachAlpha: 1,
      walkPhaseRad: Math.PI / 2,
      moving: true,
      scale: 2,
    });
    expect(contactS2.distPx).toBeLessThanOrEqual(2.5);

    const restingIdleS2 = computeSharedHandAnchor({
      ax: 200,
      ay: 240,
      aFacing: 'down',
      bx: 224,
      by: 240,
      bFacing: 'down',
      reachAlpha: 1,
      walkPhaseRad: 0,
      moving: false,
      scale: 2,
    });
    expect(contactS2.anchorY).not.toBeCloseTo(restingIdleS2.anchorY, 1);
  });

  it('evaluates deterministic P0 hug and hold_hands phase state machines', () => {
    const t0 = 10_000;
    expect(evaluateCouplePhase('hug', t0, t0 + 100).phase).toBe('approach');
    expect(evaluateCouplePhase('hug', t0, t0 + HUG_APPROACH_MS + 100).phase).toBe('embrace');
    const hugHold = evaluateCouplePhase('hug', t0, t0 + HUG_APPROACH_MS + HUG_EMBRACE_MS + 10);
    expect(hugHold.phase).toBe('hold');
    expect(hugHold.contactWeight).toBe(1);

    const relStart = t0 + 2000;
    expect(
      evaluateCouplePhase('hug', t0, relStart + HUG_RELEASE_MS - 10, {
        releasing: true,
        releaseStartedAtMs: relStart,
      }).releaseComplete,
    ).toBe(false);
    expect(
      evaluateCouplePhase('hug', t0, relStart + HUG_RELEASE_MS + 1, {
        releasing: true,
        releaseStartedAtMs: relStart,
      }).releaseComplete,
    ).toBe(true);

    expect(evaluateCouplePhase('hold_hands', t0, t0 + 50).phase).toBe('reach');
    expect(evaluateCouplePhase('hold_hands', t0, t0 + HOLD_REACH_MS + 50).phase).toBe('connect');
    expect(
      evaluateCouplePhase('hold_hands', t0, t0 + HOLD_REACH_MS + HOLD_CONNECT_MS + 50, {
        moving: false,
      }).phase,
    ).toBe('idle');
    expect(
      evaluateCouplePhase('hold_hands', t0, t0 + HOLD_REACH_MS + HOLD_CONNECT_MS + 50, {
        moving: true,
      }).phase,
    ).toBe('walk');
    expect(
      evaluateCouplePhase('hold_hands', t0, relStart + HOLD_RELEASE_MS + 5, {
        releasing: true,
        releaseStartedAtMs: relStart,
      }).releaseComplete,
    ).toBe(true);
  });

  it('avoids blocked obstacles during companion hand-holding and enforces tether limits', () => {
    const safeTarget = computeHoldHandsCompanionTarget({
      leaderX: 200,
      leaderY: 200,
      leaderFacing: 'down',
      followerX: 160,
      followerY: 200,
      preferLeft: true,
      scale: 2,
      // Block left side (x < 190) so companion chooses opposite walkable right side
      canStand: (x) => x >= 190,
    });
    expect(safeTarget.formation).toBe('side_by_side');
    expect(safeTarget.x).toBeGreaterThan(200);

    const trappedFallback = computeHoldHandsCompanionTarget({
      leaderX: 200,
      leaderY: 200,
      leaderFacing: 'down',
      followerX: 185,
      followerY: 205,
      preferLeft: true,
      scale: 2,
      canStand: () => false,
    });
    expect(trappedFallback).toEqual({ x: 185, y: 205, formation: 'fallback' });

    // Approaching closer is always permitted even beyond soft limit
    const closer = evaluateHoldHandsTether({
      curLeaderX: 280,
      curLeaderY: 200,
      nextLeaderX: 274,
      nextLeaderY: 200,
      followerX: 200,
      followerY: 200,
      scale: 2,
    });
    expect(closer.allowLeaderStep).toBe(true);
    expect(closer.shouldBreakHold).toBe(false);

    // Stepping farther beyond softMax (34 * 2 = 68px) holds leader gently
    const stretched = evaluateHoldHandsTether({
      curLeaderX: 266,
      curLeaderY: 200,
      nextLeaderX: 274,
      nextLeaderY: 200,
      followerX: 200,
      followerY: 200,
      scale: 2,
    });
    expect(stretched.allowLeaderStep).toBe(false);
    expect(stretched.shouldBreakHold).toBe(false);

    // Far separation (> 72 * s) cleanly breaks hold
    const broken = evaluateHoldHandsTether({
      curLeaderX: 360,
      curLeaderY: 200,
      nextLeaderX: 365,
      nextLeaderY: 200,
      followerX: 200,
      followerY: 200,
      scale: 2,
    });
    expect(broken.shouldBreakHold).toBe(true);
  });

  it('keeps incoming couple invite toast visible while dock is collapsed and renders only P0 buttons when expanded', () => {
    const incomingInvite: CoupleInvitePayload = {
      type: 'COUPLE_INVITE',
      inviteId: 'inv-1',
      kind: 'hold_hands',
      worldId: 'dev-lan-world',
      fromUserId: 'partner-a',
      fromSessionId: 'sess-a',
      toUserId: 'partner-b',
      mapId: 'village',
      anchorX: 320,
      anchorY: 320,
      createdAtMs: 1000,
      expiresAtMs: 16000,
    };

    const onAcceptHug = vi.fn();
    render(
      React.createElement(CoupleEmoteDock, {
        partnerOnlineSameRoom: true,
        localPosture: 'none',
        incomingInvite,
        inviteRemainingSec: 12,
        outgoingInviteActive: false,
        onSendEmote: vi.fn(),
        onRequestHug: vi.fn(),
        onRequestHoldHands: vi.fn(),
        onRequestInteraction: vi.fn(),
        onAcceptHug,
        onDeclineHug: vi.fn(),
        onStandUp: vi.fn(),
      }),
    );

    // Collapsed by default — FAB visible AND invite toast already visible without opening dock
    expect(screen.getByTestId('couple-emote-fab')).toBeTruthy();
    expect(screen.getByTestId('couple-hug-invite-toast')).toBeTruthy();
    fireEvent.click(screen.getByTestId('couple-hug-accept'));
    expect(onAcceptHug).toHaveBeenCalledTimes(1);

    // Expanding dock reveals only P0 couple actions (Ôm nhau, Nắm tay) — no P1 actions
    fireEvent.click(screen.getByTestId('couple-emote-fab'));
    expect(screen.getByTestId('couple-hug-btn')).toBeTruthy();
    expect(screen.getByTestId('couple-hold-hands-btn')).toBeTruthy();
    expect(screen.queryByTestId('couple-kiss-btn')).toBeNull();
    expect(screen.queryByTestId('couple-lean_shoulder-btn')).toBeNull();
    expect(screen.queryByTestId('couple-dance-btn')).toBeNull();
    expect(screen.queryByTestId('couple-give_flower-btn')).toBeNull();
  });
});
