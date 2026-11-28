import { useEffect, useRef, type ReactNode } from 'react';
import { Fish, Maximize, Minimize, X } from 'lucide-react';
import { useOptionalGlobalViewport } from '../../app/viewport/GlobalViewportContext';
import { ranchMinnowFrame, RANCH_FISHING_SIZE, RANCH_FISHING_URL } from '../../shared/art/ranchActionAtlas';
import { RANCH_MINNOW_LEGACY_URL } from './ranchFishingUiArt';
import type { TidefallFishRarity } from '../../shared/donor/tidefall-phaser/tidefallFishCatalog';
import { tidefallFishRarityLabelVi } from '../../shared/donor/tidefall-phaser/tidefallFishCatalog';
import { FISHING_FRENZY_RARITY_BORDER } from '../../shared/donor/fishing-frenzy/fishingFrenzyRarityUi';
import '../inventory/nuvora/nuvoraInventorySkin.css';
import './ranchFishing.css';

const FOCUS_ID = 'fishing';

export function FishingModalFrame({
  title, testId, onClose, children, controls,
}: {
  title: string;
  testId: string;
  onClose: () => void;
  children: ReactNode;
  controls?: ReactNode;
}) {
  const root = useRef<HTMLDivElement | null>(null);
  const viewport = useOptionalGlobalViewport();
  const release = viewport?.releaseMinigameFocus;
  useEffect(() => () => release?.(FOCUS_ID), [release]);
  const ownFocus = viewport?.fullscreenOwner === 'minigame' && viewport.isFullscreenOrExpanded;
  return (
    <div
      ref={root}
      className="modal-backdrop nuvora-inv-backdrop ranch-fishing"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid={testId}
      data-focus-expanded={ownFocus ? '1' : '0'}
    >
      <div className="nuvora-desk ranch-fishing__panel">
        <header className="nuvora-desk__title-row ranch-fishing__header">
          <h2 className="nuvora-desk__title"><Fish size={19} aria-hidden="true" /> {title}</h2>
          <div className="ranch-fishing__tools">
            {controls}
            {viewport && viewport.fullscreenOwner !== 'app' && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                aria-label={ownFocus ? 'Thu nhỏ câu cá' : 'Mở rộng câu cá'}
                data-testid="fishing-fullscreen-btn"
                onClick={() => ownFocus ? release?.(FOCUS_ID) : viewport.requestMinigameFocus(FOCUS_ID, root.current)}
              >
                {ownFocus ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            )}
            <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function FishingFishArt({ spriteUrl }: { spriteUrl: string }) {
  if (spriteUrl === RANCH_MINNOW_LEGACY_URL) {
    const scale = 3;
    return (
      <span
        className="ranch-fishing__fish"
        aria-hidden="true"
        style={{
          width: ranchMinnowFrame.w * scale, height: ranchMinnowFrame.h * scale,
          backgroundImage: `url("${RANCH_FISHING_URL}")`,
          backgroundSize: `${RANCH_FISHING_SIZE.w * scale}px ${RANCH_FISHING_SIZE.h * scale}px`,
          backgroundPosition: `${-ranchMinnowFrame.x * scale}px ${-ranchMinnowFrame.y * scale}px`,
        }}
      />
    );
  }
  return <img className="ranch-fishing__fish" src={spriteUrl} alt="" width={52} height={40} />;
}

export interface FishingCatchPresentation {
  escaped: boolean;
  labelVi: string;
  rarity: TidefallFishRarity;
  spriteUrl: string;
  overflowUnits?: number;
}

export function CatchRevealCard({ rarity, spriteUrl, escaped, labelVi, overflowUnits }: FishingCatchPresentation) {
  return (
    <div
      className="ranch-fishing__catch"
      data-testid="fishing-frenzy-catch-reveal"
      data-escaped={escaped}
      style={{ borderColor: FISHING_FRENZY_RARITY_BORDER[rarity] }}
      role="status"
    >
      <FishingFishArt spriteUrl={spriteUrl} />
      <div>
        <strong>{escaped ? `${labelVi} tuột mất…` : `Bắt được ${labelVi}!`}</strong>
        <small>{tidefallFishRarityLabelVi(rarity)}{escaped ? ' · Thử quăng lại nhé' : !overflowUnits ? ' · Đã nhận vật phẩm' : ''}</small>
        {!escaped && Boolean(overflowUnits) && <p>Ba lô đầy, chuyển vào Đồ giữ hộ.</p>}
      </div>
    </div>
  );
}
