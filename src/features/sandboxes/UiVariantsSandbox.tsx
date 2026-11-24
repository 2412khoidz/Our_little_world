import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import '../../ui/designSystem/gameUiTokens.css';
import { EMPTY_HELD_ITEM, selectHotbarSlot } from '../../shared/interaction/interactionResolver';
import type { HeldItemState, HotbarSlot } from '../../shared/interaction/interactionTypes';
import type { SharedLifeSnapshot } from '../../shared/sharedLife/sharedLifeTypes';
import { ContextualPromptBadge } from '../../ui/components/ContextualPromptBadge';
import { GameDialogueBox } from '../../ui/components/GameDialogueBox';
import { GameHotbar } from '../../ui/components/GameHotbar';
import { OurLittleNotebook } from '../../ui/components/OurLittleNotebook';

type UiVariantId = 'warm-pixel-cottage' | 'illustrated-storybook';

const SAMPLE_SLOTS: HotbarSlot[] = [
  { slotIndex: 0, itemSku: 'pet_kibble_basic', itemKind: 'food', iconId: 'food_kibble', labelVi: 'Hạt mèo', qty: 3 },
  { slotIndex: 1, itemSku: 'fish_salmon_bite', itemKind: 'food', iconId: 'food_salmon_treat', labelVi: 'Cá hồi mềm', qty: 1 },
  { slotIndex: 2, itemSku: 'water_pitcher', itemKind: 'water_pitcher', iconId: 'water_pitcher_full', labelVi: 'Bình nước', qty: 1, waterFillLevel: 85 },
  { slotIndex: 3, itemSku: 'toy_yarn', itemKind: 'toy', iconId: 'yarn_ball', labelVi: 'Cuộn len', qty: 1 },
  { slotIndex: 4, itemSku: 'toy_cardboard_box', itemKind: 'toy', iconId: 'cardboard_box', labelVi: 'Hộp giấy', qty: 1 },
];

export function UiVariantsSandbox({ onExit }: { onExit?: () => void }) {
  const [variant, setVariant] = useState<UiVariantId>('warm-pixel-cottage');
  const [held, setHeld] = useState<HeldItemState>(EMPTY_HELD_ITEM);
  const [notebookOpen, setNotebookOpen] = useState(true);
  const [hudHidden, setHudHidden] = useState(false);
  const [sharedLife, setSharedLife] = useState<SharedLifeSnapshot>({
    worldId: 'ui-sandbox',
    journal: [
      { id: 'j1', worldId: 'ui-sandbox', authorId: 'partner-a', visibility: 'shared', title: 'Buổi tối mưa nhẹ', body: 'Ngồi cạnh nhau nghe tiếng mưa và thấy bé Quýt chạy ra dụi đầu.', createdAt: '2026-11-24T20:00:00Z', updatedAt: '2026-11-24T20:00:00Z' },
    ],
    wishlist: [
      { id: 'w1', worldId: 'ui-sandbox', createdBy: 'partner-a', category: 'visit', title: 'Ngắm hoàng hôn cầu tàu', completed: false, createdAt: '2026-11-24T20:00:00Z' },
    ],
    calendar: [
      { id: 'c1', worldId: 'ui-sandbox', createdBy: 'partner-a', title: 'Xem phim Ghibli cuối tuần', dateIso: '2026-11-29', timeHhMm: '20:30', note: 'Chuẩn bị trà đào', isAnniversary: false },
    ],
    album: [
      { id: 'sunset-porch', worldId: 'ui-sandbox', uploadedBy: 'system', titleVi: 'Chiều hiên hoa anh đào', captionVi: 'Ngày đầu chuyển về nhà chung.', skyHex: '#f6b39b', accentHex: '#ffd7b5', mimeType: 'preset', byteSize: 0, createdAt: '2026-11-24T20:00:00Z' },
      { id: 'sakura-picnic', worldId: 'ui-sandbox', uploadedBy: 'system', titleVi: 'Dã ngoại picnic', captionVi: 'Hai tách trà ấm bên vườn.', skyHex: '#f3b7c8', accentHex: '#fff0e6', mimeType: 'preset', byteSize: 0, createdAt: '2026-11-24T20:00:00Z' },
    ],
    activeWallPhotoId: 'sunset-porch',
    serverNowMs: 1_795_500_000_000,
  });

  return (
    <main
      className="olw-game-ui"
      data-ui-variant={variant}
      data-testid="ui-variant-sandbox"
      style={{
        minHeight: '100vh',
        background: variant === 'warm-pixel-cottage' ? '#584434' : '#73585e',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div className="olw-game-window" style={{ padding: '10px 14px', width: 'min(820px, 100%)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800 }}>
          Game UI Design System Sandbox — 2 Distinct Variants (Dev-Only)
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`olw-bookmark-tab ${variant === 'warm-pixel-cottage' ? 'olw-bookmark-tab--active' : ''}`}
            data-testid="btn-variant-cottage"
            onClick={() => setVariant('warm-pixel-cottage')}
          >
            Variant A: Warm Pixel Cottage
          </button>
          <button
            type="button"
            className={`olw-bookmark-tab ${variant === 'illustrated-storybook' ? 'olw-bookmark-tab--active' : ''}`}
            data-testid="btn-variant-storybook"
            onClick={() => setVariant('illustrated-storybook')}
          >
            Variant B: Illustrated Storybook
          </button>
          <button
            type="button"
            className="olw-bookmark-tab"
            onClick={() => setHudHidden((h) => !h)}
          >
            {hudHidden ? <Eye size={14} /> : <EyeOff size={14} />} {hudHidden ? 'Hiện HUD' : 'Chế độ chụp ảnh'}
          </button>
          <button type="button" className="olw-bookmark-tab" onClick={() => setNotebookOpen(true)}>
            Mở Sổ Chung
          </button>
          {onExit && (
            <button type="button" className="olw-bookmark-tab" onClick={onExit}>
              Thoát
            </button>
          )}
        </div>
      </div>

      {!hudHidden && (
        <>
          <ContextualPromptBadge
            resolution={{
              targetId: 'cat',
              primary: {
                code: held.itemKind === 'food' ? 'offer_food_pet' : 'pet_cat',
                keyHint: 'J',
                labelVi: held.itemKind === 'food' ? `Đưa ${held.labelVi} cho Quýt ngửi` : 'Vuốt ve Quýt nhẹ nhàng',
                targetId: 'cat',
                available: true,
              },
              secondary:
                held.itemKind !== 'none'
                  ? { code: 'put_away_held', keyHint: 'K', labelVi: 'Cất vật phẩm', targetId: 'hands', available: true }
                  : null,
            }}
            onPrimary={() => {}}
            onSecondary={() => setHeld(EMPTY_HELD_ITEM)}
          />

          <GameDialogueBox
            speakerName="Quýt (Bé mèo vàng cam)"
            text="Meow~ Có vẻ bé đánh hơi thấy mùi cá hồi mềm trên tay bạn rồi đấy!"
            catPortrait={{ variant: 'ginger-tabby', accessory: 'ribbon_rose' }}
            actions={[{ id: 'ok', labelVi: 'Đặt xuống cho bé', primary: true, onClick: () => {} }]}
            onDismiss={() => {}}
          />

          <GameHotbar
            slots={SAMPLE_SLOTS}
            heldItem={held}
            onSelectSlot={(idx) => setHeld((cur) => selectHotbarSlot(SAMPLE_SLOTS, cur, idx))}
          />
        </>
      )}

      {notebookOpen && (
        <OurLittleNotebook
          petProfile={{
            name: 'Quýt',
            variant: 'ginger-tabby',
            accessory: 'ribbon_rose',
            adoptedDateLabel: '25/11/2026',
            personalityLabelVi: 'Tinh nghịch & Ham ăn',
            discoveredFavoriteFoodSkus: ['fish_salmon_bite'],
            discoveredFavoriteToyVi: 'Cuộn len hồng',
            discoveredFavoriteSpotVi: 'Cạnh bàn học buổi tối',
            recentMemoriesVi: [
              'Đón bạn ngoài cửa khi vừa về nhà.',
              'Ngủ cuộn tròn bên cạnh khi hai bạn học Pomodoro.',
            ],
            subtleCareHintVi: 'Bé có vẻ thích mùi cá hồi mềm.',
          }}
          sharedLife={sharedLife}
          localUserId="partner-a"
          onAddJournal={(entry) => {
            setSharedLife((s) => ({
              ...s,
              journal: [
                {
                  id: `local-${s.journal.length + 1}`,
                  worldId: s.worldId,
                  authorId: 'partner-a',
                  ...entry,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                ...s.journal,
              ],
            }));
          }}
          onAddWishlist={(item) => {
            setSharedLife((s) => ({
              ...s,
              wishlist: [
                {
                  id: `wish-${s.wishlist.length + 1}`,
                  worldId: s.worldId,
                  createdBy: 'partner-a',
                  ...item,
                  completed: false,
                  createdAt: new Date().toISOString(),
                },
                ...s.wishlist,
              ],
            }));
          }}
          onToggleWishlist={(id) => {
            setSharedLife((s) => ({
              ...s,
              wishlist: s.wishlist.map((w) => (w.id === id ? { ...w, completed: !w.completed } : w)),
            }));
          }}
          onSelectWallPhoto={(photoId) => {
            setSharedLife((s) => ({ ...s, activeWallPhotoId: photoId }));
          }}
          onClose={() => setNotebookOpen(false)}
        />
      )}
    </main>
  );
}
