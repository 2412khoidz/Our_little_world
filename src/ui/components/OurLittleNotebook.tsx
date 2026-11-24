import { useState } from 'react';
import { BookOpen, CalendarHeart, Camera, CheckSquare, Heart, Mail, Plus, X } from 'lucide-react';
import {
  daysUntilHcmDate,
  type AlbumPhotoRecord,
  type CalendarDateRecord,
  type JournalEntryRecord,
  type SharedLifeSnapshot,
  type SharedLifeVisibility,
  type WishlistItemRecord,
} from '../../shared/sharedLife/sharedLifeTypes';
import { CozyCatIconSvg, CozyHeartMailSvg, CozyNotebookSvg } from '../designSystem/GameIcons';
import { PetNotebookPage, type PetNotebookProfile } from './PetNotebookPage';

type NotebookTab = 'pet' | 'journal' | 'wishlist' | 'calendar' | 'album' | 'mailbox_study';

interface OurLittleNotebookProps {
  petProfile: PetNotebookProfile;
  sharedLife: SharedLifeSnapshot;
  localUserId: string;
  unreadMailboxCount?: number;
  studySummaryLabel?: string;
  onAddJournal?: (entry: { title: string; body: string; visibility: SharedLifeVisibility }) => Promise<boolean> | void;
  onAddWishlist?: (item: { title: string; category: WishlistItemRecord['category'] }) => Promise<boolean> | void;
  onToggleWishlist?: (id: string) => Promise<void> | void;
  onAddCalendar?: (ev: Omit<CalendarDateRecord, 'id' | 'worldId' | 'createdBy'>) => Promise<boolean> | void;
  onSelectWallPhoto?: (photoId: string) => Promise<void> | void;
  onOpenMailbox?: () => void;
  onOpenStudy?: () => void;
  onClose: () => void;
}

export function OurLittleNotebook({
  petProfile,
  sharedLife,
  localUserId,
  unreadMailboxCount = 0,
  studySummaryLabel,
  onAddJournal,
  onAddWishlist,
  onToggleWishlist,
  onAddCalendar,
  onSelectWallPhoto,
  onOpenMailbox,
  onOpenStudy,
  onClose,
}: OurLittleNotebookProps) {
  const [tab, setTab] = useState<NotebookTab>('pet');
  const [jTitle, setJTitle] = useState('');
  const [jBody, setJBody] = useState('');
  const [jVis, setJVis] = useState<SharedLifeVisibility>('shared');
  const [wTitle, setWTitle] = useState('');
  const [wCat, setWCat] = useState<WishlistItemRecord['category']>('activity');
  const [cTitle, setCTitle] = useState('');
  const [cDate, setCDate] = useState('2026-12-24');
  const [cTime, setCTime] = useState('20:00');
  const [cNote, setCNote] = useState('');

  const visibleJournal: JournalEntryRecord[] = sharedLife.journal.filter(
    (e) => e.visibility === 'shared' || e.authorId === localUserId,
  );
  const albumList: AlbumPhotoRecord[] = sharedLife.album;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="our-little-notebook">
      <div
        className="olw-game-window"
        style={{
          width: 'min(560px, calc(100vw - 20px))',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 16,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CozyNotebookSvg size={22} /> Cuốn Sổ Chung Của Hai Mình
          </h2>
          <button
            type="button"
            className="olw-bookmark-tab"
            onClick={onClose}
            aria-label="Đóng"
            style={{ minHeight: 34, padding: '4px 10px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Bookmark Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`olw-bookmark-tab ${tab === 'pet' ? 'olw-bookmark-tab--active' : ''}`}
            data-testid="notebook-tab-pet"
            onClick={() => setTab('pet')}
          >
            <CozyCatIconSvg size={16} /> Hồ sơ bé mèo
          </button>
          <button
            type="button"
            className={`olw-bookmark-tab ${tab === 'journal' ? 'olw-bookmark-tab--active' : ''}`}
            data-testid="notebook-tab-journal"
            onClick={() => setTab('journal')}
          >
            <BookOpen size={15} /> Nhật ký ({visibleJournal.length})
          </button>
          <button
            type="button"
            className={`olw-bookmark-tab ${tab === 'wishlist' ? 'olw-bookmark-tab--active' : ''}`}
            data-testid="notebook-tab-wishlist"
            onClick={() => setTab('wishlist')}
          >
            <CheckSquare size={15} /> Wishlist ({sharedLife.wishlist.length})
          </button>
          <button
            type="button"
            className={`olw-bookmark-tab ${tab === 'calendar' ? 'olw-bookmark-tab--active' : ''}`}
            data-testid="notebook-tab-calendar"
            onClick={() => setTab('calendar')}
          >
            <CalendarHeart size={15} /> Lịch hẹn
          </button>
          <button
            type="button"
            className={`olw-bookmark-tab ${tab === 'album' ? 'olw-bookmark-tab--active' : ''}`}
            data-testid="notebook-tab-album"
            onClick={() => setTab('album')}
          >
            <Camera size={15} /> Album
          </button>
          {(onOpenMailbox || onOpenStudy) && (
            <button
              type="button"
              className={`olw-bookmark-tab ${tab === 'mailbox_study' ? 'olw-bookmark-tab--active' : ''}`}
              onClick={() => setTab('mailbox_study')}
            >
              <CozyHeartMailSvg size={15} /> Thư &amp; Học
            </button>
          )}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 2 }}>
          {tab === 'pet' && <PetNotebookPage profile={petProfile} />}

          {tab === 'journal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {onAddJournal && (
                <div style={{ padding: 10, borderRadius: 10, background: 'var(--ui-bg-inset)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    className="input"
                    data-testid="journal-input-title"
                    placeholder="Tiêu đề trang nhật ký..."
                    value={jTitle}
                    onChange={(e) => setJTitle(e.target.value)}
                  />
                  <textarea
                    className="input"
                    data-testid="journal-input-body"
                    rows={3}
                    placeholder="Viết kỷ niệm hôm nay..."
                    value={jBody}
                    onChange={(e) => setJBody(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Chế độ:</span>
                      <select
                        className="input"
                        value={jVis}
                        onChange={(e) => setJVis(e.target.value === 'private' ? 'private' : 'shared')}
                      >
                        <option value="shared">Trang chung hai người</option>
                        <option value="private">Trang riêng của mình</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="olw-bookmark-tab olw-bookmark-tab--active"
                      data-testid="journal-submit-btn"
                      onClick={async () => {
                        if (!jBody.trim()) return;
                        const ok = await onAddJournal({
                          title: jTitle.trim() || 'Ghi chú nhỏ',
                          body: jBody.trim(),
                          visibility: jVis,
                        });
                        if (ok !== false) {
                          setJTitle('');
                          setJBody('');
                        }
                      }}
                    >
                      <Plus size={14} /> Lưu trang
                    </button>
                  </div>
                </div>
              )}

              {visibleJournal.map((entry) => (
                <article
                  key={entry.id}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    background: 'var(--ui-bg-inset)',
                    border: '1px solid var(--ui-border-inner)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ui-ink-muted)' }}>
                    <strong>{entry.title}</strong>
                    <span>{entry.visibility === 'private' ? '🔒 Riêng tư' : '💞 Chung'}</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{entry.body}</p>
                </article>
              ))}
            </div>
          )}

          {tab === 'wishlist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onAddWishlist && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <select
                    className="input"
                    value={wCat}
                    onChange={(e) =>
                      setWCat(e.target.value as WishlistItemRecord['category'])
                    }
                  >
                    <option value="activity">Hoạt động chung</option>
                    <option value="visit">Nơi muốn đi</option>
                    <option value="buy">Đồ muốn sắm</option>
                  </select>
                  <input
                    className="input"
                    data-testid="wishlist-input-title"
                    placeholder="Điều muốn làm cùng nhau..."
                    value={wTitle}
                    onChange={(e) => setWTitle(e.target.value)}
                    style={{ flex: 1, minWidth: 160 }}
                  />
                  <button
                    type="button"
                    className="olw-bookmark-tab olw-bookmark-tab--active"
                    data-testid="wishlist-submit-btn"
                    onClick={async () => {
                      if (!wTitle.trim()) return;
                      const ok = await onAddWishlist({ title: wTitle.trim(), category: wCat });
                      if (ok !== false) setWTitle('');
                    }}
                  >
                    Thêm
                  </button>
                </div>
              )}
              {sharedLife.wishlist.map((w) => (
                <label
                  key={w.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 9,
                    borderRadius: 9,
                    background: 'var(--ui-bg-inset)',
                    textDecoration: w.completed ? 'line-through' : 'none',
                    cursor: 'pointer',
                    fontSize: 13.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={w.completed}
                    onChange={() => void onToggleWishlist?.(w.id)}
                  />
                  <span style={{ flex: 1 }}>{w.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--ui-ink-muted)' }}>{w.category}</span>
                </label>
              ))}
            </div>
          )}

          {tab === 'calendar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {onAddCalendar && (
                <div style={{ padding: 10, borderRadius: 10, background: 'var(--ui-bg-inset)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    className="input"
                    placeholder="Tên buổi hẹn / ngày kỷ niệm..."
                    value={cTitle}
                    onChange={(e) => setCTitle(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <input type="date" className="input" value={cDate} onChange={(e) => setCDate(e.target.value)} />
                    <input type="time" className="input" value={cTime} onChange={(e) => setCTime(e.target.value)} />
                    <input
                      className="input"
                      placeholder="Ghi chú nhỏ..."
                      value={cNote}
                      onChange={(e) => setCNote(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="olw-bookmark-tab olw-bookmark-tab--active"
                      onClick={async () => {
                        if (!cTitle.trim()) return;
                        const ok = await onAddCalendar({
                          title: cTitle.trim(),
                          dateIso: cDate,
                          timeHhMm: cTime,
                          note: cNote.trim(),
                          isAnniversary: false,
                        });
                        if (ok !== false) {
                          setCTitle('');
                          setCNote('');
                        }
                      }}
                    >
                      Đặt hẹn
                    </button>
                  </div>
                </div>
              )}

              {sharedLife.calendar.map((ev) => {
                const days = daysUntilHcmDate(ev.dateIso, sharedLife.serverNowMs);
                return (
                  <div
                    key={ev.id}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      background: 'var(--ui-bg-inset)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{ev.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ui-ink-muted)' }}>
                        {ev.dateIso} · {ev.timeHhMm} (Asia/Ho_Chi_Minh) {ev.note ? `· ${ev.note}` : ''}
                      </div>
                    </div>
                    <span className="olw-keycap" style={{ padding: '0 8px' }}>
                      {days === 0 ? 'Hôm nay' : days > 0 ? `Còn ${days}d` : `${Math.abs(days)}d trước`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'album' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {albumList.map((photo) => {
                const active = sharedLife.activeWallPhotoId === photo.id;
                return (
                  <div key={photo.id} className="olw-polaroid" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                      style={{
                        height: 82,
                        borderRadius: 4,
                        background: `linear-gradient(155deg, ${photo.skyHex}, ${photo.accentHex})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      🌸🏡🐱
                    </div>
                    <strong style={{ fontSize: 12.5 }}>{photo.titleVi}</strong>
                    <div style={{ fontSize: 11.5, color: 'var(--ui-ink-muted)' }}>{photo.captionVi}</div>
                    {onSelectWallPhoto && (
                      <button
                        type="button"
                        className={`olw-bookmark-tab ${active ? 'olw-bookmark-tab--active' : ''}`}
                        onClick={() => void onSelectWallPhoto(photo.id)}
                        style={{ minHeight: 32, fontSize: 11.5 }}
                      >
                        <Heart size={13} /> {active ? 'Đang treo ở tường' : 'Treo lên khung tường'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'mailbox_study' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {onOpenMailbox && (
                <button
                  type="button"
                  className="olw-bookmark-tab olw-bookmark-tab--active"
                  onClick={() => {
                    onClose();
                    onOpenMailbox();
                  }}
                >
                  <Mail size={16} /> Mở Hòm thư &amp; Quà bất ngờ
                  {unreadMailboxCount > 0 ? ` (${unreadMailboxCount} chưa mở)` : ''}
                </button>
              )}
              {onOpenStudy && (
                <button
                  type="button"
                  className="olw-bookmark-tab"
                  onClick={() => {
                    onClose();
                    onOpenStudy();
                  }}
                >
                  <BookOpen size={16} /> Vào Bàn học yên tĩnh ({studySummaryLabel ?? 'Pomodoro 0 camera'})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
