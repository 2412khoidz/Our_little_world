import { useCallback, useEffect, useRef, useState } from 'react';
import type { PhysicalInventoryBackend } from '../../lib/backend/types';
import { BACKPACK_ROW_SIZE, physicalHotbarIndices, type PhysicalCommand, type PhysicalShortcut, type PhysicalSlotAddress } from '../../shared/inventory/physicalInventory';
import { INITIAL_PHYSICAL_QUERY, preferPhysicalSnapshot, type PhysicalInventoryView, type PhysicalSlotView } from '../../shared/inventory/physicalInventoryApi';
import { loadInventoryLayout } from '../../shared/inventory/inventoryLayoutStore';
import { CatalogSkuIcon } from '../../ui/components/CatalogSkuIcon';
import './nuvora/nuvoraInventorySkin.css';
import './physicalInventory.css';

interface Props {
  readonly backend: PhysicalInventoryBackend;
  readonly worldId: string;
  readonly userId: string;
  readonly revision?: number;
  readonly location: string;
  readonly connection: string;
  readonly showHud: boolean;
  readonly open: boolean;
  readonly onOpen: () => void;
  readonly onClose: () => void;
}

interface Selection {
  readonly address: PhysicalSlotAddress;
  readonly stackId: string;
  readonly qty: number;
}

const CONTAINER_LABEL = { backpack: 'Ba lô', home: 'Kho nhà', overflow: 'Đồ giữ hộ' };

function selectedSlot(view: PhysicalInventoryView | null, address: PhysicalSlotAddress): PhysicalSlotView | undefined {
  return address.container === 'backpack'
    ? view?.backpack[address.index]
    : view?.storage?.kind === address.container ? view.storage.slots.find(({ index }) => index === address.index) : undefined;
}

function oldShortcuts(worldId: string, userId: string): PhysicalShortcut[] {
  return loadInventoryLayout(worldId, userId)?.hotbarBindings.flatMap((slot, index) =>
    slot ? [{ index, itemSku: slot.itemSku, ownerScope: slot.ownerScope, quality: slot.quality }] : [],
  ) ?? [];
}

export default function PhysicalInventoryPilot({
  backend, worldId, userId, revision, location, connection, showHud, open, onOpen, onClose,
}: Props) {
  const [view, setView] = useState<PhysicalInventoryView | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [equipped, setEquipped] = useState<string | null>(null);
  const [query, setQuery] = useState(INITIAL_PHYSICAL_QUERY);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const applying = useRef(false);
  const dragging = useRef<Selection | null>(null);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    const result = await backend.read(worldId, query);
    if (request !== sequence.current) return;
    if (result.ok) setView((old) => preferPhysicalSnapshot(old, result.data));
    else setMessage(result.message);
  }, [backend, worldId, query]);

  useEffect(() => {
    void refresh();
    return () => { sequence.current += 1; };
  }, [refresh, revision, location, connection, open]);

  const apply = useCallback(async (command: PhysicalCommand) => {
    if (!view || applying.current) return;
    applying.current = true;
    setBusy(true);
    setMessage('');
    try {
      const request = ++sequence.current;
      const result = await backend.apply({
        worldId, query, version: view.version, command, idempotencyKey: crypto.randomUUID(),
      });
      if (result.ok) {
        if (request === sequence.current) setView((old) => preferPhysicalSnapshot(old, result.data));
        else void refresh();
        setSelection(null);
        if (command.kind === 'rotate') setEquipped(null);
      } else {
        setMessage(result.message);
        await refresh();
      }
    } finally {
      setBusy(false);
      applying.current = false;
    }
  }, [backend, query, refresh, view, worldId]);

  const activeRow = view?.player.activeRow ?? 0;
  const hotbar = physicalHotbarIndices(activeRow).map((index) => view?.backpack[index]);
  const visibleHeld = hotbar.find((cell) => cell?.stack?.id === equipped)?.stack;
  const source = selection && selectedSlot(view, selection.address);
  const held = selection && source?.stack?.id === selection.stackId && source.stack.qty >= selection.qty ? selection : null;

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        if (selection) setSelection(null);
        else onClose();
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      if (!open && showHud && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        onOpen();
        return;
      }
      if (open || !showHud || !view) return;
      if (event.key === 'Tab' && (target === document.body || target instanceof HTMLCanvasElement)) {
        event.preventDefault();
        void apply({ kind: 'rotate', direction: event.shiftKey ? -1 : 1 });
      } else if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        const index = Number(event.key) - 1 + view.player.activeRow * BACKPACK_ROW_SIZE;
        setEquipped(view.backpack[index]?.stack?.id ?? null);
      }
    };
    window.addEventListener('keydown', keyDown, true);
    return () => window.removeEventListener('keydown', keyDown, true);
  }, [apply, onClose, onOpen, open, selection, showHud, view]);

  function pick(address: PhysicalSlotAddress, cell: PhysicalSlotView, single: boolean) {
    if (busy) return;
    if (held) {
      if (held.address.container === address.container && held.address.index === address.index) {
        setSelection(null);
        return;
      }
      void apply({
        kind: 'move', from: held.address, to: address, qty: single ? 1 : held.qty, stackId: held.stackId,
      });
    } else if (cell.stack && !cell.locked) {
      setSelection({ address, stackId: cell.stack.id, qty: single ? Math.ceil(cell.stack.qty / 2) : cell.stack.qty });
    }
  }

  function drawCell(cell: PhysicalSlotView, container: PhysicalSlotAddress['container']) {
    const address = { container, index: cell.index };
    const stack = cell.stack;
    const name = stack ? view?.definitions[stack.itemSku]?.name ?? stack.itemSku : 'Ô trống';
    const selected = held?.address.container === container && held.address.index === cell.index;
    return (
      <button key={cell.index} type="button" className={`nuvora-sl ${selected ? 'nuvora-sl--selected' : ''}`}
        data-testid={`physical-${container}-${cell.index}`} data-qty={stack?.qty ?? 0}
        aria-label={`${CONTAINER_LABEL[container]} ô ${cell.index + 1}, ${name}${stack ? ` ×${stack.qty}` : ''}`}
        aria-pressed={selected} draggable={Boolean(stack && !cell.locked && !busy)}
        onClick={() => pick(address, cell, false)}
        onContextMenu={(event) => { event.preventDefault(); pick(address, cell, true); }}
        onPointerCancel={() => { dragging.current = null; }}
        onDragStart={(event) => {
          if (!stack || cell.locked) return;
          dragging.current = { address, stackId: stack.id, qty: stack.qty };
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', stack.itemSku);
        }}
        onDragOver={(event) => { if (dragging.current) event.preventDefault(); }}
        onDragEnd={() => { dragging.current = null; }}
        onDrop={(event) => {
          event.preventDefault();
          const drag = dragging.current;
          dragging.current = null;
          if (drag) void apply({ kind: 'move', from: drag.address, to: address, qty: drag.qty, stackId: drag.stackId });
        }}>
        {stack && <CatalogSkuIcon sku={stack.itemSku} size={25} />}
        {stack && stack.qty > 1 && <b className="nuvora-sl__qty">{stack.qty}</b>}
        {stack?.quality !== undefined && stack.quality !== 'normal' &&
          <span className="physical-slot-mark" aria-hidden>{stack.quality === 'gold' ? '★' : '◆'}</span>}
      </button>
    );
  }

  const storage = view?.storage;
  const shortcuts = open && view?.atHome && !view.player.importedShortcuts ? oldShortcuts(worldId, userId) : [];
  return <>
    {showHud && !open && (
      <div className="physical-hotbar" role="toolbar" aria-label="Hàng ba lô đang dùng" data-testid="physical-hotbar">
        {hotbar.map((cell, key) => (
          <button key={key} type="button" className="nuvora-sl"
            data-testid={`physical-hotbar-${key + 1}`} data-qty={cell?.stack?.qty ?? 0}
            aria-pressed={Boolean(visibleHeld && cell?.stack?.id === visibleHeld.id)}
            aria-label={cell?.stack ? view?.definitions[cell.stack.itemSku]?.name ?? cell.stack.itemSku : `Ô ${key + 1} trống`}
            onClick={() => setEquipped(cell?.stack?.id ?? null)}>
            <small aria-hidden>{key + 1}</small>
            {cell?.stack && <CatalogSkuIcon sku={cell.stack.itemSku} size={22} />}
            {cell?.stack && cell.stack.qty > 1 && <b className="nuvora-sl__qty">{cell.stack.qty}</b>}
          </button>
        ))}
        <button className="btn btn--secondary btn--sm" type="button" disabled={busy || !view}
          title="Tab khi đang điều khiển nhân vật" onClick={() => void apply({ kind: 'rotate', direction: 1 })}>
          Hàng {activeRow + 1} ↻
        </button>
        <button className="btn btn--primary btn--sm" type="button" onClick={onOpen}>Ba lô</button>
      </div>
    )}
    {open && (
      <div className="modal-backdrop" role="dialog" aria-label="Ba lô và kho" aria-modal="true">
        <div className="nuvora-desk physical-inventory-panel" data-testid="physical-inventory-modal">
          <header className="nuvora-desk__title-row">
            <h2 className="nuvora-desk__title">Ba lô và kho</h2>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => { setSelection(null); onClose(); }}>Đóng</button>
          </header>
          {message && <p role="status">{message}</p>}
          {!view && <button className="btn btn--secondary btn--sm" type="button" onClick={() => void refresh()}>Tải lại</button>}
          {view && <>
            <section aria-label="Ba lô">
              <div className="physical-inventory-actions">
                <strong>Ba lô · Hàng đang dùng {activeRow + 1}</strong>
                <button type="button" className="btn btn--secondary btn--sm" disabled={busy}
                  onClick={() => void apply({ kind: 'rotate', direction: 1 })}>Đổi hàng</button>
                {shortcuts.length > 0 && <button type="button" className="btn btn--secondary btn--sm" disabled={busy}
                  onClick={() => void apply({ kind: 'import_shortcuts', shortcuts })}>Lấy món từ ô nhanh cũ</button>}
              </div>
              <div className="physical-slot-grid">{view.backpack.map((cell) => drawCell(cell, 'backpack'))}</div>
            </section>
            {held && source?.stack && (
              <div className="physical-inventory-actions" aria-label="Món đang chọn">
                <span>{view.definitions[source.stack.itemSku]?.name ?? source.stack.itemSku} · chọn {held.qty}</span>
                <button type="button" className="btn btn--secondary btn--sm" disabled={busy}
                  onClick={() => setSelection({ ...held, qty: Math.max(1, Math.ceil(source.stack!.qty / 2)) })}>Tách đôi</button>
                <button type="button" className="btn btn--secondary btn--sm" disabled={busy}
                  onClick={() => setSelection({ ...held, qty: 1 })}>Chọn 1</button>
                {view.atHome && <button type="button" className="btn btn--secondary btn--sm" disabled={busy}
                  onClick={() => void apply({ kind: 'transfer', from: held.address, stackId: held.stackId, qty: held.qty,
                    to: held.address.container === 'backpack' ? 'home' : 'backpack' })}>Chuyển nhanh</button>}
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => setSelection(null)}>Bỏ chọn</button>
              </div>
            )}
            {storage ? (
              <section aria-label={CONTAINER_LABEL[storage.kind]}>
                <div className="physical-inventory-actions">
                  <strong>{CONTAINER_LABEL[storage.kind]}</strong>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => {
                    setSelection(null);
                    setQuery({ storage: storage.kind === 'home' ? 'overflow' : 'home', page: 0, search: '' });
                    setSearch('');
                  }}>{storage.kind === 'home' ? 'Xem đồ giữ hộ' : 'Xem kho nhà'}</button>
                </div>
                <form className="physical-inventory-actions" onSubmit={(event) => {
                  event.preventDefault(); setQuery((old) => ({ ...old, page: 0, search: search.trim() }));
                }}>
                  <input aria-label="Tên vật phẩm" maxLength={80} value={search} onChange={(event) => setSearch(event.target.value)} />
                  <select aria-label="Loại vật phẩm" value={query.category ?? ''} onChange={(event) => {
                    const category = event.target.value || undefined;
                    setQuery((old) => ({ ...old, page: 0, category }));
                  }}>
                    <option value="">Tất cả loại</option>
                    {view.categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <button className="btn btn--secondary btn--sm" type="submit">Tìm</button>
                </form>
                <div className="physical-slot-grid">{storage.slots.map((cell) => drawCell(cell, storage.kind))}</div>
                <div className="physical-inventory-actions">
                  <button className="btn btn--secondary btn--sm" type="button" disabled={storage.page === 0}
                    onClick={() => setQuery((old) => ({ ...old, page: storage.page - 1 }))}>Trang trước</button>
                  <span>Trang {storage.page + 1} / {storage.pages}</span>
                  <button className="btn btn--secondary btn--sm" type="button" disabled={storage.page + 1 >= storage.pages}
                    onClick={() => setQuery((old) => ({ ...old, page: storage.page + 1 }))}>Trang sau</button>
                </div>
              </section>
            ) : <p>Về nhà để mở kho đồ.</p>}
          </>}
        </div>
      </div>
    )}
  </>;
}
