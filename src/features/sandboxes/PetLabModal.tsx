import { useMemo, useState } from 'react';
import { Activity, FastForward, Play, RefreshCw, X } from 'lucide-react';
import {
  PET_PERSONALITY_PRESETS,
  createDefault8Needs,
  derive9Emotion,
  type Pet8Needs,
  type PetPersonalityTraits,
} from '../../shared/petLiving/petIntelligenceConfig';
import {
  PET_LAB_SCENARIOS,
  buildLabAffordances,
  evaluateLivingPetStep,
  runPetLabVerificationTrace,
} from '../../shared/petLiving/petLabSimulation';
import { renderLivingCatPreviewToCanvas } from '../../game/pet/petSpriteBuilder';
import { useEffect, useRef } from 'react';

export function PetLabModal({ onClose }: { onClose?: () => void }) {
  const [presetIdx, setPresetIdx] = useState(0);
  const [scenarioId, setScenarioId] = useState<string>('hungry');
  const [speedMult, setSpeedMult] = useState<1 | 5 | 20>(1);
  const [simStep, setSimStep] = useState(0);
  const [customNeeds, setCustomNeeds] = useState<Pet8Needs | null>(null);

  const personality = PET_PERSONALITY_PRESETS[presetIdx] ?? PET_PERSONALITY_PRESETS[0]!;
  const traits: PetPersonalityTraits = personality.traits;

  const baseCtx = useMemo(() => {
    const scenario = PET_LAB_SCENARIOS.find((s) => s.id === scenarioId) ?? PET_LAB_SCENARIOS[0]!;
    const raw = scenario.setup({
      needs: createDefault8Needs(),
      traits,
      emotion: 'relaxed',
      bowlFoodPortions: 1,
      waterBowlVolume: 80,
      isStudying: false,
      partnersSittingSofa: false,
      partnerJustArrived: false,
      hasNewFurnitureId: null,
      nowMs: 1_000_000 + simStep * speedMult * 2000,
    });
    return customNeeds ? { ...raw, needs: customNeeds } : raw;
  }, [scenarioId, traits, simStep, speedMult, customNeeds]);

  const evalResult = useMemo(() => {
    const affordances = buildLabAffordances(scenarioId === 'target_moved' ? 'pet_bed' : undefined);
    return evaluateLivingPetStep(baseCtx, affordances, null);
  }, [baseCtx, scenarioId]);

  const trace = useMemo(
    () => runPetLabVerificationTrace({ presetId: scenarioId, traits, steps: 18 }),
    [scenarioId, traits],
  );

  const previewRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!previewRef.current) return;
    const anim =
      evalResult.chosen?.action === 'sleep_cushion'
        ? 'sleep'
        : evalResult.chosen?.action === 'eat_bowl'
          ? 'eat'
          : evalResult.chosen?.action === 'play_yarn'
            ? 'play_pounce'
            : evalResult.chosen?.action === 'hide_in_box'
              ? 'box_peek'
              : 'idle_south';
    renderLivingCatPreviewToCanvas(previewRef.current, 'ginger-tabby', 'ribbon_rose', anim, 0, 4);
  }, [evalResult.chosen?.action]);

  const liveEmotion = derive9Emotion(baseCtx.needs, traits);

  return (
    <main
      data-testid="pet-lab-sandbox"
      data-dev-marker="menu-pet-debugger"
      style={{
        minHeight: '100vh',
        background: '#241a1d',
        color: '#fff6ea',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} /> Pet Intelligence Lab (Dev-Only — Không hiển thị cho người chơi)
          </h1>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            18 Scenario Presets · 7 Personality Traits · 8 Needs · 9 Emotions · 24-Event Memory Adapter · Utility Breakdown
          </div>
        </div>
        {onClose && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
            <X size={15} /> Đóng Pet Lab
          </button>
        )}
      </header>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PET_PERSONALITY_PRESETS.map((p, idx) => (
          <button
            key={p.id}
            type="button"
            className={`btn btn--sm ${presetIdx === idx ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setPresetIdx(idx)}
          >
            {p.labelVi}
          </button>
        ))}
        {([1, 5, 20] as const).map((spd) => (
          <button
            key={spd}
            type="button"
            className={`btn btn--sm ${speedMult === spd ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setSpeedMult(spd)}
          >
            <FastForward size={13} /> {spd}×
          </button>
        ))}
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => setSimStep((s) => s + 1)}
        >
          <Play size={13} /> Step Simulation
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={() => {
            setCustomNeeds(null);
            setSimStep(0);
          }}
        >
          <RefreshCw size={13} /> Reset Scenario
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PET_LAB_SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            type="button"
            className={`btn btn--sm ${scenarioId === sc.id ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => {
              setScenarioId(sc.id);
              setCustomNeeds(null);
            }}
          >
            {sc.labelVi}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 12 }}>
        <section style={{ padding: 12, borderRadius: 12, background: '#35262a', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong>Quyết định hiện tại &amp; Trạng thái Animation</strong>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <canvas ref={previewRef} style={{ imageRendering: 'pixelated', background: '#f5e4c8', borderRadius: 10 }} />
            <div style={{ fontSize: 13 }}>
              <div>Action: <strong>{evalResult.chosen?.action ?? 'idle'}</strong></div>
              <div>Target: <strong>{evalResult.chosen?.targetId ?? 'none'}</strong></div>
              <div>Emotion (9): <strong>{liveEmotion}</strong></div>
              <div>Lý do: <em>{evalResult.switchReason}</em></div>
            </div>
          </div>

          <strong style={{ marginTop: 6 }}>Utility Candidates (Top 6)</strong>
          {evalResult.candidates.slice(0, 6).map((c) => (
            <div key={c.action} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span>{c.action} ({c.targetId})</span>
              <strong>{c.score01.toFixed(3)}</strong>
            </div>
          ))}
        </section>

        <section style={{ padding: 12, borderRadius: 12, background: '#35262a', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <strong>8 Nhu cầu Nội bộ (Chỉ xem trong Dev Lab)</strong>
          {(Object.entries(baseCtx.needs) as Array<[keyof Pet8Needs, number]>).map(([k, val]) => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ width: 92 }}>{k}: {val}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={val}
                onChange={(e) =>
                  setCustomNeeds({
                    ...baseCtx.needs,
                    [k]: Number(e.target.value),
                  })
                }
                style={{ flex: 1 }}
              />
            </label>
          ))}
        </section>

        <section style={{ padding: 12, borderRadius: 12, background: '#35262a', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <strong>Kiểm chứng 72s Trace ({trace.actionsChosen.length} bước)</strong>
          <div style={{ fontSize: 12.5 }}>Số lần chuyển hành động: <strong>{trace.switches}</strong> (chống rung lắc)</div>
          <div style={{ fontSize: 12.5 }}>Bộ nhớ giới hạn (max 24): <strong>{trace.memoryCount}/24</strong></div>
          <div style={{ fontSize: 12.5 }}>7 Traits: {JSON.stringify(traits)}</div>
          <div style={{ fontSize: 11.5, opacity: 0.85, wordBreak: 'break-word' }}>
            Trace: {trace.actionsChosen.slice(0, 10).join(' → ')}
          </div>
        </section>
      </div>
    </main>
  );
}
