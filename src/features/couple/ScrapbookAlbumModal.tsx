import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Heart, ImagePlus, Sparkles, Sticker, X } from 'lucide-react';
import type { CoupleScrapbookPayload } from '../../shared/couple/coupleTypes';
import {
  SCRAPBOOK_STICKERS,
  SCRAPBOOK_UPLOAD_MAX_BYTES,
  type ScrapbookAlbumState,
  type ScrapbookPage,
  type ScrapbookStickerEmoji,
} from '../../shared/couple/scrapbookTypes';
import { SCRAPBOOK_PIXEL_STICKER_URLS } from '../../shared/art/kilnItemIcons';
import { loadScrapbookAlbum, saveScrapbookAlbum } from './scrapbookAlbumStorage';
import './scrapbookAlbum.css';

function PixelStickerGlyph({ emoji, size = 22 }: { emoji: string; size?: number }) {
  const url = SCRAPBOOK_PIXEL_STICKER_URLS[emoji];
  if (url) {
    return (
      <img
        src={url}
        alt={emoji}
        width={size}
        height={size}
        draggable={false}
        style={{ imageRendering: 'pixelated', display: 'block' }}
      />
    );
  }
  return <>{emoji}</>;
}

interface ScrapbookPageProps {
  page: ScrapbookPage;
  localUserId: string;
  selectedSticker: ScrapbookStickerEmoji | null;
  onPlaceSticker: (pageId: string, xPct: number, yPct: number) => void;
}

const ScrapbookFlipPage = forwardRef<HTMLDivElement, ScrapbookPageProps>(function ScrapbookFlipPage(
  { page, localUserId, selectedSticker, onPlaceSticker },
  ref,
) {
  const gradient =
    page.kind === 'preset' && page.skyHex && page.accentHex
      ? `linear-gradient(155deg, ${page.skyHex}, ${page.accentHex})`
      : 'linear-gradient(155deg, #d9cfc0, #f5ebe0)';

  return (
    <div
      ref={ref}
      className="scrapbook-page"
      data-testid={`scrapbook-page-${page.id}`}
      onClick={(e) => {
        if (!selectedSticker) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;
        onPlaceSticker(page.id, xPct, yPct);
      }}
      style={{ cursor: selectedSticker ? 'copy' : 'default' }}
    >
      <div className="scrapbook-polaroid">
        <div className="scrapbook-polaroid__shot" style={{ background: page.imageDataUrl ? undefined : gradient }}>
          {page.imageDataUrl ? (
            <img src={page.imageDataUrl} alt={page.titleVi} />
          ) : (
            <span style={{ fontSize: 28 }} aria-hidden>
              🏡
            </span>
          )}
        </div>
        <div className="scrapbook-polaroid__meta">
          <div className="scrapbook-polaroid__title">{page.titleVi}</div>
          <div className="scrapbook-polaroid__caption">{page.captionVi}</div>
          {page.dateLabel ? <div className="scrapbook-polaroid__date">{page.dateLabel}</div> : null}
        </div>
      </div>
      {page.stickers.map((s) => (
        <span
          key={s.id}
          className={`scrapbook-sticker${s.placedByUserId !== localUserId ? ' scrapbook-sticker--partner' : ''}`}
          style={{ left: `${s.xPct}%`, top: `${s.yPct}%` }}
        >
          <PixelStickerGlyph emoji={s.emoji} size={24} />
        </span>
      ))}
    </div>
  );
});

export interface ScrapbookAlbumModalProps {
  worldId: string | null;
  localUserId: string;
  partnerPageIndex: number | null;
  partnerUserId: string | null;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  onPublishScrapbook: (packet: CoupleScrapbookPayload) => void;
  onClose: () => void;
}

export function ScrapbookAlbumModal({
  worldId,
  localUserId,
  partnerPageIndex,
  partnerUserId,
  selectedPresetId,
  onSelectPreset,
  onPublishScrapbook,
  onClose,
}: ScrapbookAlbumModalProps) {
  const bookRef = useRef<{ pageFlip: () => { flip: (n: number) => void; getCurrentPageIndex: () => number } } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [album, setAlbum] = useState<ScrapbookAlbumState>(() => loadScrapbookAlbum(worldId));
  const [selectedSticker, setSelectedSticker] = useState<ScrapbookStickerEmoji | null>(null);
  const [bookVersion, setBookVersion] = useState(0);
  const suppressFlipBroadcast = useRef(false);

  useEffect(() => {
    saveScrapbookAlbum(worldId, album);
  }, [album, worldId]);

  const publishFlip = useCallback(
    (pageIndex: number) => {
      if (!worldId) return;
      onPublishScrapbook({
        type: 'COUPLE_SCRAPBOOK',
        worldId,
        userId: localUserId,
        action: 'flip',
        pageIndex,
        atMs: Date.now(),
      });
    },
    [localUserId, onPublishScrapbook, worldId],
  );

  const publishSticker = useCallback(
    (pageId: string, emoji: string, xPct: number, yPct: number) => {
      if (!worldId) return;
      onPublishScrapbook({
        type: 'COUPLE_SCRAPBOOK',
        worldId,
        userId: localUserId,
        action: 'sticker',
        pageId,
        stickerEmoji: emoji,
        xPct,
        yPct,
        atMs: Date.now(),
      });
    },
    [localUserId, onPublishScrapbook, worldId],
  );

  useEffect(() => {
    if (partnerPageIndex === null || partnerUserId === localUserId) return;
    const flipApi = bookRef.current?.pageFlip();
    if (!flipApi) return;
    if (flipApi.getCurrentPageIndex() === partnerPageIndex) return;
    suppressFlipBroadcast.current = true;
    flipApi.flip(partnerPageIndex);
    setAlbum((prev) => ({ ...prev, openPageIndex: partnerPageIndex }));
    window.setTimeout(() => {
      suppressFlipBroadcast.current = false;
    }, 120);
  }, [localUserId, partnerPageIndex, partnerUserId]);

  const placeSticker = useCallback(
    (pageId: string, xPct: number, yPct: number) => {
      if (!selectedSticker) return;
      const sticker = {
        id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        emoji: selectedSticker,
        xPct: Math.max(4, Math.min(96, xPct)),
        yPct: Math.max(8, Math.min(92, yPct)),
        placedByUserId: localUserId,
        placedAtMs: Date.now(),
      };
      setAlbum((prev) => ({
        ...prev,
        pages: prev.pages.map((p) => (p.id === pageId ? { ...p, stickers: [...p.stickers, sticker] } : p)),
      }));
      publishSticker(pageId, selectedSticker, sticker.xPct, sticker.yPct);
      setSelectedSticker(null);
    },
    [localUserId, publishSticker, selectedSticker],
  );

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > SCRAPBOOK_UPLOAD_MAX_BYTES) {
      window.alert('Ảnh quá lớn — tối đa 5 MB cho kỷ niệm riêng tư.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      window.alert('Vui lòng chọn file ảnh (JPG/PNG/WebP).');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('read fail'));
      reader.readAsDataURL(file);
    });
    const title = file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Ảnh của hai bạn';
    const newPage: ScrapbookPage = {
      id: `upload-${Date.now()}`,
      kind: 'upload',
      titleVi: title,
      captionVi: 'Kỷ niệm tải lên — chỉ lưu trên thiết bị / Dev LAN.',
      imageDataUrl: dataUrl,
      stickers: [],
    };
    setAlbum((prev) => ({
      pages: [...prev.pages, newPage],
      openPageIndex: prev.pages.length,
    }));
    setBookVersion((v) => v + 1);
  };

  const currentPage = album.pages[album.openPageIndex];

  return (
    <div className="modal-backdrop scrapbook-modal" role="dialog" aria-modal="true" data-testid="photo-frame-modal">
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Heart size={18} /> Album kỷ niệm (lật trang)
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        {partnerPageIndex !== null && partnerUserId && partnerUserId !== localUserId ? (
          <p className="scrapbook-partner-pill" data-testid="scrapbook-partner-view">
            Người yêu đang xem trang {partnerPageIndex + 1} — lật cùng nhau nhé
          </p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center', margin: 0 }}>
            Vuốt hoặc bấm mép sách để lật · dán sticker · tải ảnh Polaroid
          </p>
        )}

        <div className="scrapbook-book-host">
          <HTMLFlipBook
            key={bookVersion}
            ref={bookRef}
            width={280}
            height={360}
            size="stretch"
            minWidth={240}
            maxWidth={400}
            minHeight={320}
            maxHeight={480}
            style={{}}
            drawShadow
            flippingTime={480}
            usePortrait
            startZIndex={0}
            autoSize
            maxShadowOpacity={0.45}
            showCover={false}
            mobileScrollSupport
            clickEventForward
            useMouseEvents
            swipeDistance={24}
            showPageCorners
            disableFlipByClick={false}
            className="scrapbook-flipbook"
            onFlip={(ev) => {
              const idx = typeof ev.data === 'number' ? ev.data : 0;
              setAlbum((prev) => ({ ...prev, openPageIndex: idx }));
              if (!suppressFlipBroadcast.current) {
                publishFlip(idx);
              }
            }}
            startPage={album.openPageIndex}
          >
            {album.pages.map((page) => (
              <ScrapbookFlipPage
                key={page.id}
                page={page}
                localUserId={localUserId}
                selectedSticker={selectedSticker}
                onPlaceSticker={placeSticker}
              />
            ))}
          </HTMLFlipBook>
        </div>

        <div className="scrapbook-toolbar" role="toolbar" aria-label="Dụng cụ album">
          {SCRAPBOOK_STICKERS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={`btn btn--secondary btn--sm btn--sticker${selectedSticker === emoji ? ' btn--primary' : ''}`}
              aria-pressed={selectedSticker === emoji}
              aria-label={`Sticker ${emoji}`}
              title="Chọn sticker rồi chạm vào trang"
              onClick={() => setSelectedSticker((cur) => (cur === emoji ? null : emoji))}
            >
              <PixelStickerGlyph emoji={emoji} size={20} />
            </button>
          ))}
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            title="Tải ảnh Polaroid (≤5MB)"
            data-testid="scrapbook-upload"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus size={15} /> Tải ảnh
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(ev) => void handleUpload(ev)}
          />
          {currentPage?.kind === 'preset' ? (
            <button
              type="button"
              className={`btn btn--sm ${selectedPresetId === currentPage.id ? 'btn--primary' : 'btn--secondary'}`}
              data-testid="scrapbook-set-wall"
              onClick={() => onSelectPreset(currentPage.id)}
            >
              <Sparkles size={14} /> Treo khung tường
            </button>
          ) : null}
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', margin: '8px 0 0', lineHeight: 1.4 }}>
          <Sticker size={12} style={{ verticalAlign: 'middle' }} /> StPageFlip · ảnh tải lên lưu cục bộ theo ngôi nhà (Dev
          LAN); đồng bộ lật trang & sticker qua realtime 2 người.
        </p>
      </div>
    </div>
  );
}