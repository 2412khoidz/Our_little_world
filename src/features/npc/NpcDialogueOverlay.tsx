import { useCallback, useEffect, useMemo, useState } from 'react';
import { Heart, MessageCircle, SkipForward, X } from 'lucide-react';
import {
  HAIR_COLOR_OPTIONS,
  OUTFIT_COLOR_OPTIONS,
  SKIN_TONE_OPTIONS,
} from '../../shared/avatar';
import {
  getNpcRelationship,
  loadNpcRelationshipState,
  recordNpcConversation,
  resolveNpcProfile,
  saveNpcRelationshipState,
  setNpcErrandStatus,
  type NpcDialogueActionKind,
  type NpcDialogueChoice,
  type NpcDialogueContext,
  type NpcMood,
} from '../../shared/npc/npcDialogueRegistry';
import type { AvatarConfig, MapId } from '../../shared/types';
import { gameAudio } from '../../game/audio/gameAudioManager';

interface NpcDialogueOverlayProps {
  npcId: string;
  mapId: MapId;
  fallbackLabelVi?: string;
  fallbackRole?: string;
  fallbackDialogueVi?: string;
  context: Omit<NpcDialogueContext, 'affinity' | 'errandStatus'>;
  worldId: string;
  userId: string;
  onAction: (action: NpcDialogueActionKind) => void;
  onClose: () => void;
}

function NpcPixelPortrait({
  avatarConfig,
  mood,
  accentHex,
}: {
  avatarConfig: AvatarConfig;
  mood: NpcMood;
  accentHex: string;
}) {
  const skin = SKIN_TONE_OPTIONS.find((s) => s.id === avatarConfig.skinTone) ?? SKIN_TONE_OPTIONS[1]!;
  const hair = HAIR_COLOR_OPTIONS.find((h) => h.id === avatarConfig.hairColor) ?? HAIR_COLOR_OPTIONS[0]!;
  const outfit = OUTFIT_COLOR_OPTIONS.find((o) => o.id === avatarConfig.outfitColor) ?? OUTFIT_COLOR_OPTIONS[0]!;

  return (
    <div
      className="adv-dialogue-portrait"
      style={{ borderColor: accentHex }}
      data-testid="npc-dialogue-portrait"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={72} height={72} style={{ imageRendering: 'pixelated' }}>
        {/* Cozy portrait sky glow */}
        <rect x="0" y="0" width="24" height="24" fill="#fff6e7" rx="3" />
        {/* Hair back / long lock */}
        <rect x="5" y="4" width="14" height="10" fill={hair.shadeHex} />
        {avatarConfig.hairStyle === 'long' && (
          <rect x="4" y="10" width="16" height="8" fill={hair.baseHex} />
        )}
        {/* Shoulders / outfit */}
        <rect x="4" y="16" width="16" height="8" fill={outfit.baseHex} />
        <rect x="6" y="17" width="12" height="7" fill={outfit.shadeHex} opacity="0.28" />
        <rect x="9" y="16" width="6" height="2" fill="#fffaf2" />
        {/* Head & shading */}
        <rect x="6" y="6" width="12" height="10" fill={skin.baseHex} />
        <rect x="6" y="14" width="12" height="2" fill={skin.shadeHex} opacity="0.45" />
        {/* Front bangs */}
        <rect x="5" y="3" width="14" height="4" fill={hair.baseHex} />
        <rect x="5" y="6" width="2" height="4" fill={hair.baseHex} />
        <rect x="17" y="6" width="2" height="4" fill={hair.baseHex} />
        {/* Eyes based on mood */}
        {mood === 'happy' ? (
          <>
            <rect x="8" y="10" width="2" height="1" fill="#2d1e1c" />
            <rect x="14" y="10" width="2" height="1" fill="#2d1e1c" />
            <rect x="7" y="12" width="2" height="1" fill="#f398ab" opacity="0.7" />
            <rect x="15" y="12" width="2" height="1" fill="#f398ab" opacity="0.7" />
          </>
        ) : (
          <>
            <rect x="8" y="9" width="2" height="2" fill="#2d1e1c" />
            <rect x="14" y="9" width="2" height="2" fill="#2d1e1c" />
            <rect x="8" y="9" width="1" height="1" fill="#ffffff" />
            <rect x="14" y="9" width="1" height="1" fill="#ffffff" />
            <rect x="7" y="12" width="2" height="1" fill="#f398ab" opacity="0.45" />
            <rect x="15" y="12" width="2" height="1" fill="#f398ab" opacity="0.45" />
          </>
        )}
        {/* Mouth */}
        {mood === 'curious' ? (
          <rect x="11" y="13" width="2" height="1" fill="#8b4d42" />
        ) : (
          <>
            <rect x="10" y="13" width="4" height="1" fill="#a85549" />
            {mood === 'happy' && <rect x="11" y="14" width="2" height="1" fill="#e88782" />}
          </>
        )}
        {/* Accessories */}
        {avatarConfig.accessory === 'glasses' && (
          <>
            <rect x="7" y="9" width="4" height="3" fill="none" stroke="#3b2c26" strokeWidth="0.9" />
            <rect x="13" y="9" width="4" height="3" fill="none" stroke="#3b2c26" strokeWidth="0.9" />
            <rect x="11" y="10" width="2" height="1" fill="#3b2c26" />
          </>
        )}
        {avatarConfig.accessory === 'ribbon' && (
          <>
            <rect x="15" y="3" width="4" height="2" fill="#f07898" />
            <rect x="16" y="4" width="2" height="1" fill="#ffe1ea" />
          </>
        )}
      </svg>
    </div>
  );
}

export function NpcDialogueOverlay({
  npcId,
  mapId,
  fallbackLabelVi,
  fallbackRole,
  fallbackDialogueVi,
  context,
  worldId,
  userId,
  onAction,
  onClose,
}: NpcDialogueOverlayProps) {
  const profile = useMemo(
    () => resolveNpcProfile(npcId, { labelVi: fallbackLabelVi, role: fallbackRole, dialogueVi: fallbackDialogueVi }),
    [npcId, fallbackLabelVi, fallbackRole, fallbackDialogueVi],
  );

  const [relMap, setRelMap] = useState(() => {
    const loaded = loadNpcRelationshipState(worldId, userId);
    const updated = recordNpcConversation(loaded, profile.id);
    saveNpcRelationshipState(worldId, userId, updated);
    return updated;
  });
  const rel = getNpcRelationship(relMap, profile.id);

  const [nodeId, setNodeId] = useState<string>(profile.entryNodeId);
  const node = profile.nodes[nodeId] ?? profile.nodes[profile.entryNodeId]!;

  const fullContext: NpcDialogueContext = useMemo(
    () => ({
      ...context,
      mapId,
      affinity: rel.affinity,
      errandStatus: rel.errandStatus,
    }),
    [context, mapId, rel.affinity, rel.errandStatus],
  );

  const fullText = useMemo(() => node.textVi(fullContext), [node, fullContext]);
  const choices = useMemo(() => node.choices?.(fullContext) ?? [], [node, fullContext]);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealKey = `${node.id}:${fullText}`;
  const [typedState, setTypedState] = useState<{ key: string; count: number }>({
    key: revealKey,
    count: prefersReducedMotion ? fullText.length : 0,
  });

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setTypedState((cur) => {
        const base = cur.key === revealKey ? cur.count : 0;
        if (base >= fullText.length) {
          window.clearInterval(id);
          return cur.key === revealKey ? cur : { key: revealKey, count: base };
        }
        return { key: revealKey, count: Math.min(fullText.length, base + 2) };
      });
    }, 24);
    return () => window.clearInterval(id);
  }, [revealKey, fullText.length, prefersReducedMotion]);

  const revealedCount = prefersReducedMotion
    ? fullText.length
    : typedState.key === revealKey
      ? Math.min(fullText.length, typedState.count)
      : 0;
  const typingDone = revealedCount >= fullText.length;
  const visibleText = fullText.slice(0, revealedCount);

  const handleAdvanceOrSkip = useCallback(() => {
    if (!typingDone) {
      setTypedState({ key: revealKey, count: fullText.length });
      return;
    }
    if (node.nextNodeId && profile.nodes[node.nextNodeId]) {
      gameAudio.playSfx('ui_select', { volumeScale: 0.45 });
      setNodeId(node.nextNodeId);
    } else if (choices.length === 0) {
      onClose();
    }
  }, [typingDone, fullText.length, node.nextNodeId, profile.nodes, choices.length, revealKey, onClose]);

  const handleSelectChoice = useCallback(
    (choice: NpcDialogueChoice) => {
      gameAudio.playSfx('ui_select', { volumeScale: 0.6 });
      if (choice.action === 'accept_errand') {
        setRelMap((prev) => {
          const next = setNpcErrandStatus(prev, profile.id, 'active', 0);
          saveNpcRelationshipState(worldId, userId, next);
          return next;
        });
      } else if (choice.action === 'complete_errand') {
        setRelMap((prev) => {
          const next = setNpcErrandStatus(prev, profile.id, 'done', 2);
          saveNpcRelationshipState(worldId, userId, next);
          return next;
        });
      } else if (choice.action) {
        onAction(choice.action);
        return;
      }

      if (choice.closesDialogue) {
        onClose();
        return;
      }
      if (choice.nextNodeId && profile.nodes[choice.nextNodeId]) {
        setNodeId(choice.nextNodeId);
      }
    },
    [profile.id, profile.nodes, worldId, userId, onAction, onClose],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ') {
        e.preventDefault();
        e.stopPropagation();
        handleAdvanceOrSkip();
        return;
      }
      if (typingDone && choices.length > 0) {
        const idx = Number(e.key) - 1;
        if (Number.isInteger(idx) && idx >= 0 && idx < choices.length) {
          e.preventDefault();
          e.stopPropagation();
          handleSelectChoice(choices[idx]!);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose, handleAdvanceOrSkip, handleSelectChoice, typingDone, choices]);

  const filledHearts = Math.min(5, Math.max(1, Math.ceil(rel.affinity / 2)));

  return (
    <div
      className="adv-dialogue-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Trò chuyện với ${profile.nameVi}`}
      onClick={onClose}
    >
      <div
        className="adv-dialogue-panel olw-game-window"
        data-testid="npc-dialogue-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <NpcPixelPortrait
          avatarConfig={profile.avatarConfig}
          mood={node.mood}
          accentHex={profile.accentHex}
        />

        <div className="adv-dialogue-content">
          <div className="adv-dialogue-header">
            <div className="adv-dialogue-nameplate" style={{ borderColor: profile.accentHex }}>
              <MessageCircle size={13} />
              <strong>{profile.nameVi}</strong>
              <span className="adv-dialogue-role">{profile.roleTitleVi}</span>
            </div>

            <div className="adv-dialogue-meta">
              <span className="adv-dialogue-affinity" title={`Thân thiết cấp ${rel.affinity}/10`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Heart
                    key={i}
                    size={12}
                    fill={i < filledHearts ? '#ec6d8a' : 'transparent'}
                    color={i < filledHearts ? '#b53f5b' : '#b89f87'}
                  />
                ))}
              </span>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                data-testid="btn-npc-dialogue-close"
                aria-label="Đóng hội thoại"
                onClick={onClose}
                style={{ minHeight: 30, padding: '4px 9px', fontSize: 12 }}
              >
                <X size={13} /> Đóng
              </button>
            </div>
          </div>

          <div
            className="adv-dialogue-body"
            data-testid="npc-dialogue-text"
            onClick={handleAdvanceOrSkip}
            role="button"
            tabIndex={0}
          >
            <p>{visibleText}</p>
            {!typingDone ? (
              <span className="adv-dialogue-cursor" aria-hidden>▌</span>
            ) : null}
          </div>

          <div className="adv-dialogue-footer">
            {!typingDone ? (
              <button
                type="button"
                className="adv-choice-btn adv-choice-btn--subtle"
                data-testid="btn-npc-dialogue-skip"
                onClick={handleAdvanceOrSkip}
              >
                <SkipForward size={13} /> Hiện hết chữ (Space)
              </button>
            ) : choices.length > 0 ? (
              <div className="adv-dialogue-choices" data-testid="npc-dialogue-choices">
                {choices.map((choice, idx) => (
                  <button
                    key={choice.id}
                    type="button"
                    className={`adv-choice-btn ${choice.action ? 'adv-choice-btn--primary' : ''}`}
                    data-testid={`npc-choice-${choice.id}`}
                    onClick={() => handleSelectChoice(choice)}
                  >
                    <span className="adv-choice-num">{idx + 1}</span>
                    <span>{choice.labelVi}</span>
                    {choice.badgeVi ? (
                      <span className="adv-choice-badge">{choice.badgeVi}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : node.nextNodeId ? (
              <button
                type="button"
                className="adv-choice-btn adv-choice-btn--primary"
                data-testid="btn-npc-dialogue-next"
                onClick={handleAdvanceOrSkip}
              >
                Tiếp tục →
              </button>
            ) : (
              <button
                type="button"
                className="adv-choice-btn"
                onClick={onClose}
              >
                Kết thúc trò chuyện
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
