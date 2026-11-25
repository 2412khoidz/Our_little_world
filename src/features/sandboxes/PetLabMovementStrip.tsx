import { useMemo, useRef, useEffect } from 'react';
import { buildLabAffordances } from '../../shared/petLiving/petLabSimulation';
import { createPetBrainState, snapshotToInput, tickPetBrain } from '../../shared/petLiving/petAutonomousController';
import type { DecisionContext } from '../../shared/petLiving/petIntelligenceConfig';
import {
  createPetMovementExecutorState,
  movementTargetFromAffordances,
  selectMovementIntent,
  tickPetMovement,
} from '../../shared/petLiving/petMovement';
import { renderLivingCatPreviewToCanvas } from '../../game/pet/petSpriteBuilder';

export function PetLabMovementStrip(props: { ctx: DecisionContext; scenarioId: string; step: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const movement = useMemo(() => {
    const affordances = buildLabAffordances(
      props.scenarioId === 'target_moved' && props.step > 2 ? 'pet_bed' : undefined,
    );
    let brain = createPetBrainState();
    let mover = createPetMovementExecutorState();
    const transitions: string[] = [];
    let lastStatus = 'idle';
    for (let i = 0; i <= props.step; i += 1) {
      const nowMs = props.ctx.nowMs + i * 400;
      const tick = tickPetBrain(
        brain,
        snapshotToInput(
          { ...props.ctx, nowMs },
          affordances,
          ['partner-a', 'partner-b'],
        ),
      );
      brain = tick.state;
      const intent = selectMovementIntent(tick.output);
      const mv = tickPetMovement(mover, {
        nowMs,
        dtMs: 400,
        intent,
        interrupt: tick.output.completions.some((c) => c.kind === 'interrupted' || c.kind === 'cancelled'),
        targets: movementTargetFromAffordances(affordances),
      });
      mover = mv.state;
      if (mv.output.snapshot.status !== lastStatus) {
        transitions.push(`${mv.output.snapshot.status}`);
        lastStatus = mv.output.snapshot.status;
      }
    }
    return { mover, transitions, brainPhase: brain.phase };
  }, [props.ctx, props.scenarioId, props.step]);

  useEffect(() => {
    if (!canvasRef.current) return;
    renderLivingCatPreviewToCanvas(
      canvasRef.current,
      'ginger-tabby',
      'ribbon_rose',
      movement.mover.loco.animState,
      0,
      4,
    );
  }, [movement.mover.loco.animState]);

  return (
    <section
      data-testid="pet-lab-movement-strip"
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        background: '#1a1215',
        border: '1px solid #4a3530',
      }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Movement runtime (04B-1)</h3>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <canvas
          ref={canvasRef}
          width={96}
          height={96}
          style={{ imageRendering: 'pixelated', background: '#2a1f22', borderRadius: 8 }}
        />
        <div style={{ fontSize: 12, lineHeight: 1.5, color: '#e8d8c8' }}>
          <div>
            Vị trí: ({movement.mover.loco.x.toFixed(0)}, {movement.mover.loco.y.toFixed(0)}) ·{' '}
            {movement.mover.loco.animState}
          </div>
          <div>Nav: {movement.mover.status} · Brain: {movement.brainPhase}</div>
          <div>Transitions: {movement.transitions.slice(-5).join(' → ') || 'idle'}</div>
        </div>
      </div>
    </section>
  );
}