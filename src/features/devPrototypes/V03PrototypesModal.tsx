import { useState } from 'react';
import { BookHeart, CalendarHeart, Camera, Sparkles, UtensilsCrossed, X } from 'lucide-react';
import { STATIC_PHOTO_PRESETS } from '../../shared/couple/coupleTypes';

interface V03PrototypesModalProps {
  onClose: () => void;
}

type ProtoTab = 'journal' | 'wishlist' | 'album' | 'cozy_loops';

export function V03PrototypesModal({ onClose }: V03PrototypesModalProps) {
  const [tab, setTab] = useState<ProtoTab>('journal');
  const [journalDraft, setJournalDraft] = useState('');
  const [journalEntries, setJournalEntries] = useState([
    { id: 'j1', author: 'Mây', date: 'Hôm nay', text: 'Cùng Nắng học 2 phiên Pomodoro và cho bé Quýt ăn hạt.' },
    { id: 'j2', author: 'Nắng', date: 'Hôm qua', text: 'Ngồi ngoài cầu gỗ vườn anh đào nghe tiếng mưa nhẹ rất thư giãn.' },
  ]);
  const [wishlist, setWishlist] = useState([
    { id: 'w1', title: 'Xem bộ phim Ghibli cuối tuần cùng nhau', done: false },
    { id: 'w2', title: 'Nấu món pasta kem nấm trong góc bếp V0.2.4', done: false },
    { id: 'w3', title: 'Chạm mốc 100 ngày chuyển vào căn nhà nhỏ', done: true },
  ]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      data-testid="v03-dev-prototypes"
    >
      <div className="modal-panel" style={{ maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} /> Prototype UI V0.3 (Dev-only)
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        <div className="pill" style={{ background: '#fff3d6', color: '#6b470c', fontSize: 12 }}>
          Prototype UI V0.3 (Dev-only — dữ liệu mẫu cục bộ, chưa lưu Cloud, bị loại khỏi production build).
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn--sm ${tab === 'journal' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setTab('journal')}
          >
            <BookHeart size={14} /> Nhật ký
          </button>
          <button
            type="button"
            className={`btn btn--sm ${tab === 'wishlist' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setTab('wishlist')}
          >
            <CalendarHeart size={14} /> Wishlist &amp; Hẹn hò
          </button>
          <button
            type="button"
            className={`btn btn--sm ${tab === 'album' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setTab('album')}
          >
            <Camera size={14} /> Album Kỷ niệm
          </button>
          <button
            type="button"
            className={`btn btn--sm ${tab === 'cozy_loops' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setTab('cozy_loops')}
          >
            <UtensilsCrossed size={14} /> Bếp · Chợ · Mini-game
          </button>
        </div>

        {tab === 'journal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                className="input"
                placeholder="Viết thử một dòng nhật ký cục bộ..."
                value={journalDraft}
                onChange={(e) => setJournalDraft(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => {
                  const trimmed = journalDraft.trim();
                  if (!trimmed) return;
                  setJournalEntries((cur) => [
                    { id: `j-${cur.length + 1}`, author: 'Bạn', date: 'Vừa xong', text: trimmed },
                    ...cur,
                  ]);
                  setJournalDraft('');
                }}
              >
                Thêm thử
              </button>
            </div>
            {journalEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: 'var(--surface-warm)',
                  border: '1px solid var(--border-honey)',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  {entry.author} · {entry.date}
                </div>
                <div style={{ fontSize: 13.5, marginTop: 4 }}>{entry.text}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'wishlist' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              className="pill"
              style={{
                alignSelf: 'flex-start',
                fontSize: 12,
                background: '#efdfd2',
                color: '#4b3036',
                borderColor: '#d9b9a3',
              }}
            >
              🗓️ Đếm ngược kỷ niệm mẫu: còn 14 ngày tới ngày gặp mặt
            </div>
            {wishlist.map((item) => (
              <label
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 10,
                  borderRadius: 10,
                  background: 'var(--surface-warm)',
                  fontSize: 13.5,
                  textDecoration: item.done ? 'line-through' : 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() =>
                    setWishlist((cur) =>
                      cur.map((w) => (w.id === item.id ? { ...w, done: !w.done } : w)),
                    )
                  }
                />
                <span>{item.title}</span>
              </label>
            ))}
          </div>
        )}

        {tab === 'album' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {STATIC_PHOTO_PRESETS.map((card) => (
              <div
                key={card.id}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: '2px solid #d5b28f',
                  background: `linear-gradient(155deg, ${card.skyHex}, ${card.accentHex})`,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#4c3239' }}>{card.dateLabel}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#382127', marginTop: 6 }}>
                  {card.titleVi}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'cozy_loops' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13.5 }}>
            <div style={{ padding: 10, borderRadius: 10, background: 'var(--surface-warm)' }}>
              <strong>🍲 Góc Bếp chung (V0.2.4 Preview):</strong> Chọn công thức nấu cùng nhau và 2 thanh nhịp nấu ăn đơn giản (không tính tiền tệ trong prototype này).
            </div>
            <div style={{ padding: 10, borderRadius: 10, background: 'var(--surface-warm)' }}>
              <strong>🌱 Trồng cây &amp; Câu cá hợp tác (V0.2.1–V0.2.2 Preview):</strong> Lưới nông trại ngoài hiên &amp; bến hồ vịt con đã có sẵn không gian trực quan trong Garden.
            </div>
            <div style={{ padding: 10, borderRadius: 10, background: 'var(--surface-warm)' }}>
              <strong>🎲 Mini-game đôi (V0.3 Preview):</strong> Cờ caro / xếp hình ghép đôi ngay trên bàn gỗ uống trà phòng khách.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
