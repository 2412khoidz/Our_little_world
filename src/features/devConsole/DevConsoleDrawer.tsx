import { useState } from 'react';
import { Bug, Copy, Download, FastForward, Home, RotateCcw, Sparkles, Trees, Upload, X } from 'lucide-react';
import type { DevConsoleBackend } from '../../lib/backend/types';
import type { InventoryCatalogItem } from '../../shared/inventory/inventoryTypes';
import type { PetSnapshot } from '../../shared/pet/petTypes';
import type { StudySnapshot } from '../../shared/study/studyTypes';
import type { MapId } from '../../shared/types';

interface DevConsoleDrawerProps {
  devConsole: DevConsoleBackend;
  worldId: string;
  catalog: readonly InventoryCatalogItem[];
  pet: PetSnapshot | null;
  studySnapshot: StudySnapshot | null;
  onRefreshAll: () => Promise<void>;
  onJumpMap: (mapId: MapId) => void;
  onToast: (message: string, isError?: boolean) => void;
  onClose: () => void;
}

export function DevConsoleDrawer({
  devConsole,
  worldId,
  catalog,
  pet,
  studySnapshot,
  onRefreshAll,
  onJumpMap,
  onToast,
  onClose,
}: DevConsoleDrawerProps) {
  const [itemSku, setItemSku] = useState(catalog[0]?.sku ?? 'gift_flower_bouquet');
  const [scope, setScope] = useState<'shared' | 'personal'>('personal');
  const [qty, setQty] = useState(1);
  const [hunger, setHunger] = useState(pet?.vitals.hunger ?? 70);
  const [energy, setEnergy] = useState(pet?.vitals.energy ?? 80);
  const [fun, setFun] = useState(pet?.vitals.fun ?? 80);
  const [snapshotJson, setSnapshotJson] = useState('');
  const [busy, setBusy] = useState(false);

  const activeSession = studySnapshot?.sharedSession ?? studySnapshot?.soloSession ?? null;

  async function runAction<T>(fn: () => Promise<{ ok: true; data: T } | { ok: false; message: string }>, okMsg: string) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      onToast(res.message, true);
      return null;
    }
    await onRefreshAll();
    onToast(okMsg);
    return res.data;
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      data-testid="dev-console-drawer"
      data-dev-marker="dev-console-k6"
    >
      <div className="modal-panel" style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bug size={18} /> Dev Console (K6 — Chỉ trong Dev)
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        <div className="pill" style={{ background: '#fff3d6', color: '#6b470c', fontSize: 12 }}>
          Phím tắt: Ctrl+Shift+D · Không tồn tại trong production build (verify-prod-guard).
        </div>

        {/* 1. Teleport nhanh */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => {
              onJumpMap('home');
              onClose();
            }}
          >
            <Home size={15} /> Nhảy vào Trong nhà
          </button>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => {
              onJumpMap('garden');
              onClose();
            }}
          >
            <Trees size={15} /> Nhảy ra Khu vườn
          </button>
        </div>

        {/* 2. Spawn vật phẩm K5 */}
        <section style={{ padding: 10, borderRadius: 12, background: 'var(--surface-warm)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong style={{ fontSize: 13 }}>Spawn vật phẩm (Kho K5)</strong>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <select
              className="input"
              data-testid="dev-spawn-sku"
              value={itemSku}
              onChange={(e) => setItemSku(e.target.value)}
              style={{ flex: 2, minWidth: 160 }}
            >
              {catalog.map((c) => (
                <option key={c.sku} value={c.sku}>
                  {c.nameVi} ({c.sku})
                </option>
              ))}
            </select>
            <select
              className="input"
              data-testid="dev-spawn-scope"
              value={scope}
              onChange={(e) => setScope(e.target.value === 'shared' ? 'shared' : 'personal')}
            >
              <option value="personal">Ngăn riêng</option>
              <option value="shared">Túi chung</option>
            </select>
            <input
              type="number"
              className="input"
              data-testid="dev-spawn-qty"
              min={-10}
              max={10}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 1)}
              style={{ width: 68 }}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            data-testid="dev-spawn-submit"
            disabled={busy}
            onClick={() =>
              void runAction(
                () => devConsole.spawnItem({ worldId, scope, itemSku, qty }),
                `Đã spawn ${qty} ${itemSku}`,
              )
            }
          >
            <Sparkles size={15} /> Thực hiện Spawn
          </button>
        </section>

        {/* 3. Chỉnh chỉ số bé mèo cam */}
        <section style={{ padding: 10, borderRadius: 12, background: 'var(--surface-warm)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong style={{ fontSize: 13 }}>
            Trạng thái bé mèo cam {pet ? `(${pet.name})` : '(Chưa nhận nuôi)'}
          </strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12 }}>
            <label>
              No bụng ({hunger})
              <input type="range" min={0} max={100} value={hunger} onChange={(e) => setHunger(Number(e.target.value))} style={{ width: '100%' }} />
            </label>
            <label>
              Năng lượng ({energy})
              <input type="range" min={0} max={100} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} style={{ width: '100%' }} />
            </label>
            <label>
              Vui vẻ ({fun})
              <input type="range" min={0} max={100} value={fun} onChange={(e) => setFun(Number(e.target.value))} style={{ width: '100%' }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                setHunger(32);
                setEnergy(40);
                setFun(50);
              }}
            >
              Preset: Đói &amp; Buồn ngủ
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              data-testid="dev-pet-apply"
              disabled={busy || !pet}
              onClick={() =>
                void runAction(
                  () => devConsole.setPetVitals({ worldId, hunger, energy, fun }),
                  'Đã cập nhật chỉ số bé mèo',
                )
              }
            >
              Áp dụng chỉ số mèo
            </button>
          </div>
        </section>

        {/* 4. Tua nhanh Pomodoro */}
        <section style={{ padding: 10, borderRadius: 12, background: 'var(--surface-warm)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong style={{ fontSize: 13 }}>Đồng hồ Pomodoro</strong>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              data-testid="dev-study-advance-5m"
              disabled={busy || !activeSession}
              onClick={() =>
                activeSession &&
                void runAction(
                  () => devConsole.advanceStudy({ worldId, sessionId: activeSession.id, deltaSeconds: 300 }),
                  'Đã tua nhanh +5 phút',
                )
              }
            >
              <FastForward size={15} /> +5 phút
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              data-testid="dev-study-advance-25m"
              disabled={busy || !activeSession}
              onClick={() =>
                activeSession &&
                void runAction(
                  () => devConsole.advanceStudy({ worldId, sessionId: activeSession.id, deltaSeconds: 1500 }),
                  'Đã tua nhanh +25 phút',
                )
              }
            >
              <FastForward size={15} /> +25 phút
            </button>
          </div>
        </section>

        {/* 5. Snapshot JSON đã khử thông tin nhạy cảm */}
        <section style={{ padding: 10, borderRadius: 12, background: 'var(--surface-warm)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong style={{ fontSize: 13 }}>Snapshot Test World (JSON đã lọc bí mật)</strong>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              data-testid="dev-snapshot-export"
              disabled={busy}
              onClick={async () => {
                const res = await devConsole.exportSnapshot(worldId);
                if (!res.ok) {
                  onToast(res.message, true);
                  return;
                }
                setSnapshotJson(JSON.stringify(res.data, null, 2));
                onToast('Đã xuất snapshot (đã bỏ email, token, nội dung thư riêng)');
              }}
            >
              <Download size={15} /> Xuất Snapshot JSON
            </button>
            {snapshotJson && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(snapshotJson);
                  onToast('Đã sao chép JSON vào clipboard');
                }}
              >
                <Copy size={15} /> Sao chép
              </button>
            )}
            <button
              type="button"
              className="btn btn--primary btn--sm"
              data-testid="dev-snapshot-restore"
              disabled={busy || !snapshotJson.trim()}
              onClick={() => {
                try {
                  const parsed = JSON.parse(snapshotJson);
                  void runAction(
                    () => devConsole.restoreSnapshot(worldId, parsed),
                    'Đã khôi phục snapshot vào test world!',
                  );
                } catch {
                  onToast('JSON snapshot không đúng cú pháp.', true);
                }
              }}
            >
              <Upload size={15} /> Khôi phục Snapshot
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setSnapshotJson('')}
            >
              <RotateCcw size={15} /> Xóa khung JSON
            </button>
          </div>
          <textarea
            className="input"
            data-testid="dev-snapshot-textarea"
            rows={5}
            value={snapshotJson}
            onChange={(e) => setSnapshotJson(e.target.value)}
            placeholder="Bấm 'Xuất Snapshot JSON' hoặc dán snapshot hợp lệ vào đây..."
            style={{ fontFamily: 'monospace', fontSize: 11.5 }}
          />
        </section>
      </div>
    </div>
  );
}
