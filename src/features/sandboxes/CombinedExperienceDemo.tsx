import { useCallback, useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { BookHeart, Compass, DoorOpen, Eye, EyeOff, Palette, Sparkles, Sun } from 'lucide-react';
import '../../ui/designSystem/gameUiTokens.css';
import { playPetFeedbackChime } from '../pets/petAudio';
import {
  WorldExpansionScene,
  type SandboxTelemetry,
} from '../../game/worldSandbox/WorldExpansionScene';
import {
  buildExpansionLandmarks,
  type CosmeticDayPhase,
  type WorldSizeOption,
} from '../../game/worldSandbox/worldExpansionMap';
import {
  EMPTY_HELD_ITEM,
  isEditableInputTarget,
  resolveContextualActions,
  selectHotbarSlot,
} from '../../shared/interaction/interactionResolver';
import type {
  ContextualResolution,
  HeldItemState,
  HotbarSlot,
} from '../../shared/interaction/interactionTypes';
import {
  CAT_ACCESSORIES,
  CAT_VARIANTS,
  type CatAccessoryId,
  type CatCoatVariantId,
} from '../../shared/petLiving/petVisualTypes';
import {
  createAdoptionState,
  createInitialPhysicalCareState,
  fillFoodBowlFromHeld,
  fillWaterPitcherFree,
  interactPetGently,
  pourWaterIntoBowl,
  progressAdoptionStory,
  resolvePetEat,
  type AdoptionStoryState,
  type PhysicalCarePetState,
} from '../../shared/petLiving/petPhysicalCare';
import type { SharedLifeSnapshot } from '../../shared/sharedLife/sharedLifeTypes';
import { ContextualPromptBadge } from '../../ui/components/ContextualPromptBadge';
import { GameDialogueBox } from '../../ui/components/GameDialogueBox';
import { GameHotbar } from '../../ui/components/GameHotbar';
import { OurLittleNotebook } from '../../ui/components/OurLittleNotebook';

const INITIAL_SLOTS: HotbarSlot[] = [
  { slotIndex: 0, itemSku: 'pet_kibble_basic', itemKind: 'food', iconId: 'food_kibble', labelVi: 'Hạt mèo', qty: 5, quality: 'normal' },
  { slotIndex: 1, itemSku: 'fish_salmon_bite', itemKind: 'food', iconId: 'food_salmon_treat', labelVi: 'Cá hồi mềm', qty: 2, quality: 'silver' },
  { slotIndex: 2, itemSku: 'fish_carp_grilled', itemKind: 'food', iconId: 'food_grilled_fish', labelVi: 'Cá chép nướng', qty: 1, quality: 'normal' },
  { slotIndex: 3, itemSku: 'water_pitcher', itemKind: 'water_pitcher', iconId: 'water_pitcher_full', labelVi: 'Bình nước', qty: 1, waterFillLevel: 45 },
  { slotIndex: 4, itemSku: 'toy_yarn', itemKind: 'toy', iconId: 'yarn_ball', labelVi: 'Cuộn len', qty: 1 },
  { slotIndex: 5, itemSku: 'toy_cardboard_box', itemKind: 'toy', iconId: 'cardboard_box', labelVi: 'Hộp giấy', qty: 1 },
];

export function CombinedExperienceDemo({ onExit }: { onExit?: () => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<WorldExpansionScene | null>(null);

  const [uiVariant, setUiVariant] = useState<'warm-pixel-cottage' | 'illustrated-storybook'>('warm-pixel-cottage');
  const [mapSize, setMapSize] = useState<WorldSizeOption>(64);
  const [dayPhase, setDayPhase] = useState<CosmeticDayPhase>('morning');
  const [catVariant, setCatVariant] = useState<CatCoatVariantId>('ginger-tabby');
  const [catAccessory, setCatAccessory] = useState<CatAccessoryId>('ribbon_rose');
  const [petFollow, setPetFollow] = useState(true);
  const [interiorMode, setInteriorMode] = useState<'outdoor' | 'indoor'>('outdoor');
  const [hudHidden, setHudHidden] = useState(false);
  const [showCompass, setShowCompass] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 768 : true,
  );
  const [showTools, setShowTools] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth > 900 && window.innerHeight > 500 : true,
  );

  const [slots, setSlots] = useState<HotbarSlot[]>(INITIAL_SLOTS);
  const [heldItem, setHeldItem] = useState<HeldItemState>(EMPTY_HELD_ITEM);
  const [care, setCare] = useState<PhysicalCarePetState>(() => createInitialPhysicalCareState());
  const [adoption, setAdoption] = useState<AdoptionStoryState>(() =>
    createAdoptionState({ id: 'demo-quyt', name: 'Quýt' }),
  );
  const [resolution, setResolution] = useState<ContextualResolution>({ targetId: null, primary: null, secondary: null });
  const [telemetry, setTelemetry] = useState<SandboxTelemetry | null>(null);
  const [dialogue, setDialogue] = useState<{ speaker: string; text: string; isAdoptPrompt?: boolean } | null>(null);
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [sharedLife, setSharedLife] = useState<SharedLifeSnapshot>({
    worldId: 'combined-demo',
    journal: [
      { id: 'd-j1', worldId: 'combined-demo', authorId: 'partner-a', visibility: 'shared', title: 'Đón bé mèo cam về nhà', body: 'Đặt chút hạt bên hiên nắng, bé chạy lại ngửi rồi cọ đầu vào tay.', createdAt: '2026-11-25T08:00:00Z', updatedAt: '2026-11-25T08:00:00Z' },
    ],
    wishlist: [
      { id: 'd-w1', worldId: 'combined-demo', createdBy: 'partner-a', category: 'visit', title: 'Ngắm hoàng hôn trên cầu tàu cùng Quýt', completed: false, createdAt: '2026-11-25T08:00:00Z' },
    ],
    calendar: [
      { id: 'd-c1', worldId: 'combined-demo', createdBy: 'partner-a', title: 'Buổi học yên tĩnh tối thứ Sáu', dateIso: '2026-11-27', timeHhMm: '20:00', note: 'Chuẩn bị 2 ly cacao ấm', isAnniversary: false },
    ],
    album: [
      { id: 'sunset-porch', worldId: 'combined-demo', uploadedBy: 'system', titleVi: 'Hiên nhà buổi sáng', captionVi: 'Kỷ niệm cùng bé Quýt ngày đầu dạo biển.', skyHex: '#f6b39b', accentHex: '#ffd7b5', mimeType: 'preset', byteSize: 0, createdAt: '2026-11-25T08:00:00Z' },
      { id: 'sakura-picnic', worldId: 'combined-demo', uploadedBy: 'system', titleVi: 'Tán anh đào gió nhẹ', captionVi: 'Bánh dâu và tách trà ấm.', skyHex: '#f3b7c8', accentHex: '#fff0e6', mimeType: 'preset', byteSize: 0, createdAt: '2026-11-25T08:00:00Z' },
    ],
    activeWallPhotoId: 'sunset-porch',
    serverNowMs: 1_795_500_000_000,
  });

  const showQuickNotice = useCallback((msg: string) => {
    setNoticeText(msg);
    window.setTimeout(() => setNoticeText((cur) => (cur === msg ? null : cur)), 2800);
  }, []);

  const deductHeldOne = useCallback((sku: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.itemSku === sku ? { ...s, qty: Math.max(0, s.qty - 1) } : s)),
    );
    setHeldItem((cur) => (cur.itemSku === sku ? EMPTY_HELD_ITEM : cur));
  }, []);

  const executePrimaryAction = useCallback(() => {
    const act = resolution.primary;
    if (!act) return;
    if (!act.available) {
      showQuickNotice(act.reasonVi ?? 'Hiện chưa thể thực hiện thao tác này.');
      return;
    }

    const now = Date.now();
    if (act.code === 'offer_food_pet' && heldItem.itemSku) {
      sceneRef.current?.triggerCatAction('sniff', 900, '❓');
      const res = resolvePetEat(care, { sku: heldItem.itemSku, quality: heldItem.quality }, now);
      if (res.ate) {
        setCare(res.next);
        if (res.consumeHeldQty > 0) deductHeldOne(heldItem.itemSku);
        sceneRef.current?.triggerCatAction(
          res.reaction === 'eager' ? 'happy_hop' : 'eat',
          2600,
          res.reaction === 'eager' ? '❤️🐟' : '🐟',
        );
        playPetFeedbackChime('feed');
        if (adoption.stage !== 'adopted') {
          const nextAdopt = progressAdoptionStory(adoption, { type: 'offer_starter_food' });
          setAdoption(nextAdopt);
          setDialogue({
            speaker: 'Mèo con trước hiên',
            text: 'Bé khẽ tiến lại, đánh hơi phần hạt trên tay bạn và ăn rón rén. Hãy vuốt ve để bé yên tâm nhé!',
          });
          return;
        }
      } else {
        sceneRef.current?.triggerCatAction('idle', 1400, '💤');
      }
      showQuickNotice(res.hintVi);
      return;
    }

    if (act.code === 'fill_food_bowl' && heldItem.itemSku) {
      const filled = fillFoodBowlFromHeld(care, heldItem.itemSku, heldItem.quality);
      if (!filled.ok) {
        showQuickNotice(filled.messageVi);
        return;
      }
      setCare(filled.next);
      deductHeldOne(heldItem.itemSku);
      showQuickNotice(filled.messageVi);
      return;
    }

    if (act.code === 'fill_water_pitcher') {
      const next = fillWaterPitcherFree(care);
      setCare(next);
      setSlots((prev) =>
        prev.map((s) => (s.itemKind === 'water_pitcher' ? { ...s, waterFillLevel: 100, iconId: 'water_pitcher_full' } : s)),
      );
      setHeldItem((cur) => (cur.itemKind === 'water_pitcher' ? { ...cur, waterFillLevel: 100, iconId: 'water_pitcher_full' } : cur));
      showQuickNotice('Đã múc đầy bình nước mát (0₫)!');
      return;
    }

    if (act.code === 'pour_water_bowl') {
      const poured = pourWaterIntoBowl(care);
      if (!poured.ok) {
        showQuickNotice(poured.messageVi);
        return;
      }
      setCare(poured.next);
      setSlots((prev) =>
        prev.map((s) =>
          s.itemKind === 'water_pitcher'
            ? {
                ...s,
                waterFillLevel: poured.next.pitcherWater,
                iconId: poured.next.pitcherWater > 0 ? 'water_pitcher_full' : 'water_pitcher_empty',
              }
            : s,
        ),
      );
      setHeldItem((cur) =>
        cur.itemKind === 'water_pitcher'
          ? {
              ...cur,
              waterFillLevel: poured.next.pitcherWater,
              iconId: poured.next.pitcherWater > 0 ? 'water_pitcher_full' : 'water_pitcher_empty',
            }
          : cur,
      );
      playPetFeedbackChime('water');
      showQuickNotice(poured.messageVi);
      return;
    }

    if (act.code === 'pet_cat') {
      const petRes = interactPetGently(care, now);
      setCare(petRes.next);
      sceneRef.current?.triggerCatAction(petRes.reaction === 'purr' ? 'pet_purr' : 'sleep', 2600, petRes.reaction === 'purr' ? '❤️' : 'Zzz');
      playPetFeedbackChime('pet');
      if (adoption.stage !== 'adopted') {
        const nextAdopt = progressAdoptionStory(adoption, { type: 'gentle_pet' });
        setAdoption(nextAdopt);
        if (nextAdopt.stage === 'ready_to_adopt') {
          setDialogue({
            speaker: 'Mèo con ấm áp',
            text: 'Bé đã tin tưởng dụi đầu vào tay bạn! Hai bạn có muốn đón bé về sống chung trong nhà không?',
            isAdoptPrompt: true,
          });
          return;
        }
      }
      showQuickNotice(petRes.hintVi);
      return;
    }

    if (act.code === 'enter_home') {
      sceneRef.current?.toggleInterior(true);
      showQuickNotice('Đã bước vào ngôi nhà nhỏ ấm áp!');
      return;
    }

    if (act.code === 'exit_home') {
      sceneRef.current?.toggleInterior(false);
      showQuickNotice('Đã bước ra hiên vườn!');
      return;
    }

    if (act.code === 'roll_toy') {
      const toyKind = heldItem.itemSku === 'toy_cardboard_box' ? 'cardboard_box' : 'yarn_ball';
      sceneRef.current?.spawnToyOnGround(toyKind);
      showQuickNotice(toyKind === 'cardboard_box' ? 'Đã đặt hộp giấy — bé tò mò chui vào ngó!' : 'Đã lăn cuộn len — bé đang rình vồ!');
    }
  }, [adoption, care, deductHeldOne, heldItem, resolution.primary, showQuickNotice]);

  const executeSecondaryAction = useCallback(() => {
    const sec = resolution.secondary;
    if (!sec) return;
    if (sec.code === 'roll_toy') {
      const toyKind = heldItem.itemSku === 'toy_cardboard_box' ? 'cardboard_box' : 'yarn_ball';
      sceneRef.current?.spawnToyOnGround(toyKind);
      showQuickNotice(toyKind === 'cardboard_box' ? 'Đã đặt hộp giấy xuống sàn!' : 'Đã lăn cuộn len cho bé vờn!');
      return;
    }
    setHeldItem(EMPTY_HELD_ITEM);
  }, [heldItem.itemSku, resolution.secondary, showQuickNotice]);

  // Mount Phaser World Expansion Sandbox once (RAF-guarded for React StrictMode)
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let game: Phaser.Game | null = null;
    const rafId = window.requestAnimationFrame(() => {
      if (cancelled) return;
      host.replaceChildren();
      const scene = new WorldExpansionScene({
        mapSize: 64,
        dayPhase: 'morning',
        catVariant: 'ginger-tabby',
        catAccessory: 'ribbon_rose',
        petFollowEnabled: true,
        strayAdopted: true,
        heldItem: EMPTY_HELD_ITEM,
        foodBowlPortions: 0,
        waterBowlVolume: 60,
        onTelemetry: setTelemetry,
        onInteriorChange: setInteriorMode,
        onContextResolution: (r) =>
          setResolution((cur) =>
            cur.targetId === r.targetId && cur.primary?.code === r.primary?.code && cur.primary?.available === r.primary?.available && cur.secondary?.code === r.secondary?.code
              ? cur
              : r,
          ),
        onPetTap: () => {
          setDialogue({
            speaker: 'Bé mèo của hai bạn',
            text: 'Meow~ Cầm thức ăn trên thanh 1–6 rồi nhấn [J] để đưa cho bé ngửi, hoặc tay không nhấn [J] để vuốt ve nhé!',
          });
        },
      });
      sceneRef.current = scene;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: host,
        width: host.clientWidth || 800,
        height: host.clientHeight || 540,
        backgroundColor: '#8ec07c',
        pixelArt: true,
        render: { antialias: false, pixelArt: true, roundPixels: true },
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [scene],
      });
      if (game.canvas) {
        game.canvas.style.imageRendering = 'pixelated';
      }
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      sceneRef.current = null;
      game?.canvas?.remove();
      game?.destroy(true);
      host.replaceChildren();
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.updateHooks({
      mapSize,
      dayPhase,
      catVariant,
      catAccessory,
      petFollowEnabled: petFollow,
      strayAdopted: adoption.stage === 'adopted',
      heldItem,
      foodBowlPortions: care.foodBowl.portions,
      waterBowlVolume: care.waterBowl.volume,
      onTelemetry: setTelemetry,
      onInteriorChange: setInteriorMode,
      onContextResolution: (r) =>
        setResolution((cur) =>
          cur.targetId === r.targetId && cur.primary?.code === r.primary?.code && cur.primary?.available === r.primary?.available && cur.secondary?.code === r.secondary?.code
            ? cur
            : r,
        ),
    });
  }, [mapSize, dayPhase, catVariant, catAccessory, petFollow, adoption.stage, heldItem, care.foodBowl.portions, care.waterBowl.volume]);

  // Global keybindings with text-input suppression guard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableInputTarget(e.target)) return;
      if (e.code === 'Escape') {
        setDialogue(null);
        setNotebookOpen(false);
        return;
      }
      if (e.code === 'KeyI') {
        e.preventDefault();
        setNotebookOpen((o) => !o);
        return;
      }
      if (e.code === 'KeyJ') {
        e.preventDefault();
        executePrimaryAction();
        return;
      }
      if (e.code === 'KeyK') {
        e.preventDefault();
        executeSecondaryAction();
        return;
      }
      const num = Number(e.key);
      if (Number.isInteger(num) && num >= 1 && num <= 6) {
        setHeldItem((cur) => selectHotbarSlot(slots, cur, num - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [executePrimaryAction, executeSecondaryAction, slots]);

  // Ensure initial fallback resolution stays fresh when moving slots without walking
  const effectiveResolution =
    resolution.targetId !== null
      ? resolution
      : resolveContextualActions({
          playerX: 0,
          playerY: 0,
          facing: 'down',
          heldItem,
          interactables: [],
        });

  const landmarks = buildExpansionLandmarks(mapSize);
  const activeCatSpec = CAT_VARIANTS.find((v) => v.id === catVariant) ?? CAT_VARIANTS[0]!;

  return (
    <main
      className="olw-game-ui"
      data-ui-variant={uiVariant}
      data-testid="combined-experience-demo"
      style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: '#281e1a' }}
    >
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Top Cozy HUD Bar */}
      {!hudHidden && (
        <header
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            right: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 6,
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          <div className="olw-game-window" style={{ pointerEvents: 'auto', padding: '6px 10px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
            <Compass size={15} />
            <strong>{interiorMode === 'indoor' ? 'Trong Ngôi Nhà Nhỏ' : telemetry?.nearestLandmark.nameVi ?? 'Ngôi nhà chung'}</strong>
            <button
              type="button"
              className="olw-bookmark-tab olw-bookmark-tab--active"
              style={{ minHeight: 28, fontSize: 11, padding: '2px 8px' }}
              data-testid="btn-toggle-interior"
              onClick={() => sceneRef.current?.toggleInterior()}
            >
              <DoorOpen size={12} /> {interiorMode === 'indoor' ? 'Ra hiên vườn' : 'Vào trong nhà'}
            </button>
            <button
              type="button"
              className="olw-bookmark-tab"
              style={{ minHeight: 28, fontSize: 11, padding: '2px 8px' }}
              onClick={() => setMapSize((s) => (s === 64 ? 96 : 64))}
            >
              {mapSize}×{mapSize}
            </button>
            <button
              type="button"
              className="olw-bookmark-tab"
              style={{ minHeight: 28, fontSize: 11, padding: '2px 8px' }}
              onClick={() => setDayPhase((d) => (d === 'morning' ? 'sunset' : d === 'sunset' ? 'twilight' : 'morning'))}
            >
              <Sun size={12} /> {dayPhase}
            </button>
          </div>

          <div style={{ pointerEvents: 'auto', display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="olw-bookmark-tab olw-bookmark-tab--active"
              style={{ minHeight: 34, fontSize: 11.5 }}
              data-testid="btn-open-notebook"
              onClick={() => setNotebookOpen(true)}
            >
              <BookHeart size={13} /> Sổ chung (I)
            </button>
            <button
              type="button"
              className={`olw-bookmark-tab ${showTools ? 'olw-bookmark-tab--active' : ''}`}
              style={{ minHeight: 34, fontSize: 11.5 }}
              data-testid="btn-toggle-tools"
              onClick={() => setShowTools((v) => !v)}
            >
              <Palette size={13} /> Tùy chỉnh
            </button>
            <button
              type="button"
              className="olw-bookmark-tab"
              style={{ minHeight: 34, fontSize: 11.5 }}
              onClick={() => setHudHidden(true)}
              aria-label="Ẩn HUD"
            >
              <EyeOff size={13} />
            </button>
            {showTools && (
              <>
                <button
                  type="button"
                  className="olw-bookmark-tab"
                  style={{ minHeight: 34, fontSize: 11.5 }}
                  onClick={() =>
                    setUiVariant((v) =>
                      v === 'warm-pixel-cottage' ? 'illustrated-storybook' : 'warm-pixel-cottage',
                    )
                  }
                >
                  <Palette size={13} /> {uiVariant === 'warm-pixel-cottage' ? 'Cottage UI' : 'Storybook UI'}
                </button>
                <button
                  type="button"
                  className="olw-bookmark-tab"
                  style={{ minHeight: 34, fontSize: 11.5 }}
                  onClick={() => {
                    const idx = CAT_VARIANTS.findIndex((v) => v.id === catVariant);
                    const next = CAT_VARIANTS[(idx + 1) % CAT_VARIANTS.length]!;
                    setCatVariant(next.id);
                  }}
                >
                  <Sparkles size={13} /> Mèo: {activeCatSpec.defaultNameVi}
                </button>
                <button
                  type="button"
                  className="olw-bookmark-tab"
                  style={{ minHeight: 34, fontSize: 11.5 }}
                  onClick={() => {
                    const idx = CAT_ACCESSORIES.findIndex((a) => a.id === catAccessory);
                    setCatAccessory(CAT_ACCESSORIES[(idx + 1) % CAT_ACCESSORIES.length]!.id);
                  }}
                >
                  Phụ kiện
                </button>
                <button
                  type="button"
                  className="olw-bookmark-tab"
                  style={{ minHeight: 34, fontSize: 11.5 }}
                  onClick={() =>
                    setAdoption((cur) =>
                      cur.stage === 'adopted'
                        ? createAdoptionState(null)
                        : createAdoptionState({ id: 'demo-quyt', name: activeCatSpec.defaultNameVi }),
                    )
                  }
                >
                  {adoption.stage === 'adopted' ? 'Thử cảnh mèo hoang' : 'Mèo đã nhận'}
                </button>
                <button
                  type="button"
                  className="olw-bookmark-tab"
                  style={{ minHeight: 34, fontSize: 11.5 }}
                  onClick={() => setPetFollow((f) => !f)}
                >
                  {petFollow ? 'Đang đi cùng mèo' : 'Mèo ở hiên'}
                </button>
                <button
                  type="button"
                  className={`olw-bookmark-tab ${showCompass ? 'olw-bookmark-tab--active' : ''}`}
                  style={{ minHeight: 34, fontSize: 11.5 }}
                  data-testid="btn-toggle-compass"
                  onClick={() => setShowCompass((v) => !v)}
                >
                  <Compass size={13} /> Bản đồ
                </button>
                {onExit && (
                  <button type="button" className="olw-bookmark-tab" style={{ minHeight: 34, fontSize: 11.5 }} onClick={onExit}>
                    Thoát
                  </button>
                )}
              </>
            )}
          </div>
        </header>
      )}

      {hudHidden && (
        <button
          type="button"
          className="olw-bookmark-tab"
          style={{ position: 'absolute', top: 10, right: 10, zIndex: 30, minHeight: 34 }}
          onClick={() => setHudHidden(false)}
        >
          <Eye size={14} /> Hiện HUD
        </button>
      )}

      {/* Compact Landmark Teleport Strip on right (collapsible for mobile) */}
      {!hudHidden && showCompass && (
        <div
          className="olw-game-window"
          data-testid="compass-landmark-panel"
          style={{
            position: 'absolute',
            top: 96,
            right: 8,
            zIndex: 18,
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            maxWidth: 165,
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {landmarks.slice(0, 6).map((lm) => (
            <button
              key={lm.id}
              type="button"
              className="olw-bookmark-tab"
              style={{ minHeight: 26, fontSize: 10.5, padding: '2px 6px', justifyContent: 'flex-start' }}
              onClick={() => sceneRef.current?.teleportToLandmark(lm.id)}
            >
              {lm.nameVi}
            </button>
          ))}
        </div>
      )}

      {/* Compact Touch D-Pad for mobile & pointer walking */}
      {!hudHidden && (
        <div
          data-testid="touch-dpad-cluster"
          aria-label="Điều hướng nhân vật"
          style={{
            position: 'absolute',
            left: 10,
            bottom: 138,
            zIndex: 22,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 32px)',
            gridTemplateRows: 'repeat(3, 32px)',
            gap: 3,
            opacity: 0.88,
          }}
        >
          <span />
          <button
            type="button"
            className="olw-bookmark-tab"
            style={{ minHeight: 32, padding: 0, justifyContent: 'center', fontSize: 13 }}
            aria-label="Đi lên"
            onPointerDown={() => sceneRef.current?.setJoystick(0, -1)}
            onPointerUp={() => sceneRef.current?.setJoystick(0, 0)}
            onPointerLeave={() => sceneRef.current?.setJoystick(0, 0)}
            onPointerCancel={() => sceneRef.current?.setJoystick(0, 0)}
          >
            ▲
          </button>
          <span />
          <button
            type="button"
            className="olw-bookmark-tab"
            style={{ minHeight: 32, padding: 0, justifyContent: 'center', fontSize: 13 }}
            aria-label="Sang trái"
            onPointerDown={() => sceneRef.current?.setJoystick(-1, 0)}
            onPointerUp={() => sceneRef.current?.setJoystick(0, 0)}
            onPointerLeave={() => sceneRef.current?.setJoystick(0, 0)}
            onPointerCancel={() => sceneRef.current?.setJoystick(0, 0)}
          >
            ◀
          </button>
          <span />
          <button
            type="button"
            className="olw-bookmark-tab"
            style={{ minHeight: 32, padding: 0, justifyContent: 'center', fontSize: 13 }}
            aria-label="Sang phải"
            onPointerDown={() => sceneRef.current?.setJoystick(1, 0)}
            onPointerUp={() => sceneRef.current?.setJoystick(0, 0)}
            onPointerLeave={() => sceneRef.current?.setJoystick(0, 0)}
            onPointerCancel={() => sceneRef.current?.setJoystick(0, 0)}
          >
            ▶
          </button>
          <span />
          <button
            type="button"
            className="olw-bookmark-tab"
            style={{ minHeight: 32, padding: 0, justifyContent: 'center', fontSize: 13 }}
            aria-label="Đi xuống"
            onPointerDown={() => sceneRef.current?.setJoystick(0, 1)}
            onPointerUp={() => sceneRef.current?.setJoystick(0, 0)}
            onPointerLeave={() => sceneRef.current?.setJoystick(0, 0)}
            onPointerCancel={() => sceneRef.current?.setJoystick(0, 0)}
          >
            ▼
          </button>
          <span />
        </div>
      )}

      {/* Bottom Contextual Prompts, Dialogue & Hotbar */}
      {!hudHidden && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 10,
            transform: 'translateX(-50%)',
            zIndex: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            maxWidth: 'calc(100vw - 16px)',
          }}
        >
          {dialogue && (
            <GameDialogueBox
              speakerName={dialogue.speaker}
              text={dialogue.text}
              catPortrait={{ variant: catVariant, accessory: catAccessory }}
              actions={
                dialogue.isAdoptPrompt
                  ? [
                      {
                        id: 'adopt-confirm',
                        labelVi: `Nhận nuôi bé (${activeCatSpec.defaultNameVi})`,
                        primary: true,
                        onClick: () => {
                          setAdoption((cur) =>
                            progressAdoptionStory(cur, {
                              type: 'confirm_adopt',
                              petId: 'adopted-quyt',
                              name: activeCatSpec.defaultNameVi,
                            }),
                          );
                          setDialogue(null);
                          showQuickNotice(`Chào mừng ${activeCatSpec.defaultNameVi} chính thức về chung một nhà! ❤️`);
                        },
                      },
                    ]
                  : undefined
              }
              onDismiss={() => setDialogue(null)}
            />
          )}

          <ContextualPromptBadge
            resolution={effectiveResolution}
            unavailableToast={noticeText}
            onPrimary={executePrimaryAction}
            onSecondary={executeSecondaryAction}
          />

          <GameHotbar
            slots={slots}
            heldItem={heldItem}
            onSelectSlot={(idx) => setHeldItem((cur) => selectHotbarSlot(slots, cur, idx))}
          />
        </div>
      )}

      {notebookOpen && (
        <OurLittleNotebook
          petProfile={{
            name: adoption.adoptedName ?? activeCatSpec.defaultNameVi,
            variant: catVariant,
            accessory: catAccessory,
            adoptedDateLabel: adoption.stage === 'adopted' ? '25/11/2026' : 'Đang làm quen ngoài hiên',
            personalityLabelVi: activeCatSpec.titleVi,
            discoveredFavoriteFoodSkus: care.familiarSkus,
            discoveredFavoriteToyVi: 'Cuộn len pastel',
            discoveredFavoriteSpotVi: 'Hiên nắng cạnh bát ăn',
            recentMemoriesVi: ['Nhớ mùi cá hồi mềm trên tay bạn.', 'Đi dạo cùng hai bạn dọc bờ hồ.'],
            subtleCareHintVi: care.hunger < 45 ? 'Có vẻ bé đang tìm bát ăn ngoài hiên.' : null,
          }}
          sharedLife={sharedLife}
          localUserId="partner-a"
          onAddJournal={(entry) =>
            setSharedLife((s) => ({
              ...s,
              journal: [
                {
                  id: `j-${s.journal.length + 1}`,
                  worldId: s.worldId,
                  authorId: 'partner-a',
                  ...entry,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                ...s.journal,
              ],
            }))
          }
          onAddWishlist={(item) =>
            setSharedLife((s) => ({
              ...s,
              wishlist: [
                {
                  id: `w-${s.wishlist.length + 1}`,
                  worldId: s.worldId,
                  createdBy: 'partner-a',
                  ...item,
                  completed: false,
                  createdAt: new Date().toISOString(),
                },
                ...s.wishlist,
              ],
            }))
          }
          onToggleWishlist={(id) =>
            setSharedLife((s) => ({
              ...s,
              wishlist: s.wishlist.map((w) => (w.id === id ? { ...w, completed: !w.completed } : w)),
            }))
          }
          onSelectWallPhoto={(photoId) => setSharedLife((s) => ({ ...s, activeWallPhotoId: photoId }))}
          onClose={() => setNotebookOpen(false)}
        />
      )}
    </main>
  );
}
