import React, { useEffect, useRef, useState } from 'react';
import { Bot, Target } from 'lucide-react';
import {
  drawCozyWardrobePreview,
  loadCozyWardrobeAvatarAtlas,
} from '../../../game/art/donorAvatarWardrobePreview';
import { AVATAR_ATLAS_ROW_IDLE } from '../../../game/art/avatarAtlasLayout';
import { DEFAULT_AVATAR_PARTNER_A, DEFAULT_AVATAR_PARTNER_B } from '../../../shared/avatar';
import type { PlayerSlot } from '../../../shared/billiards/types';

let cachedAtlasPromise: Promise<HTMLImageElement | null> | null = null;
function getSharedAvatarAtlas(): Promise<HTMLImageElement | null> {
  if (!cachedAtlasPromise) {
    cachedAtlasPromise = loadCozyWardrobeAvatarAtlas().catch(() => null);
  }
  return cachedAtlasPromise;
}

export interface BilliardsAvatarPortraitProps {
  slot: PlayerSlot;
  kind?: 'human' | 'ai' | 'practice';
  size?: number;
}

/**
 * Renders the authentic Our Little World pixel-art character portrait (Mây / Nắng) from
 * the existing avatar atlas, or a clean vector crest for Bot / Practice opponents.
 */
export const BilliardsAvatarPortrait: React.FC<BilliardsAvatarPortraitProps> = ({
  slot,
  kind = 'human',
  size = 34,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [atlas, setAtlas] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (kind !== 'human') return;
    let active = true;
    void getSharedAvatarAtlas().then((img) => {
      if (active) setAtlas(img);
    });
    return () => {
      active = false;
    };
  }, [kind]);

  useEffect(() => {
    if (kind !== 'human' || !canvasRef.current) return;
    const cfg = slot === 0 ? DEFAULT_AVATAR_PARTNER_A : DEFAULT_AVATAR_PARTNER_B;
    drawCozyWardrobePreview(canvasRef.current, atlas, cfg, 2, AVATAR_ATLAS_ROW_IDLE, 'down', 0);
  }, [atlas, kind, slot]);

  if (kind === 'ai') {
    return (
      <div className="olw-avatar-crest olw-avatar-crest--bot" aria-hidden="true">
        <Bot size={Math.round(size * 0.56)} />
      </div>
    );
  }
  if (kind === 'practice') {
    return (
      <div className="olw-avatar-crest olw-avatar-crest--practice" aria-hidden="true">
        <Target size={Math.round(size * 0.56)} />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={32}
      height={32}
      aria-hidden="true"
      className="olw-avatar-canvas"
      style={{ width: size - 6, height: size - 6 }}
    />
  );
};
