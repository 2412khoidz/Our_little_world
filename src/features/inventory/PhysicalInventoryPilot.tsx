import { canReachDrop } from '../../shared/inventory/physicalInventoryLifecycle';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Archive, ArrowLeftRight, Backpack, ChevronLeft, ChevronRight, MoreHorizontal, Search, X } from 'lucide-react';
import type { PhysicalInventoryBackend } from '../../lib/backend/types';
import { BACKPACK_ROW_SIZE, BACKPACK_TIERS, BACKPACK_UPGRADE_COSTS, physicalHotbarIndices, type PhysicalCommand, type PhysicalShortcut, type PhysicalSlotAddress } from '../../shared/inventory/physicalInventory';
import { INITIAL_HOME_STORAGE_QUERY, INITIAL_PHYSICAL_QUERY, preferPhysicalSnapshot, type PhysicalInventoryView, type PhysicalSlotView } from '../../shared/inventory/physicalInventoryApi';
import { loadInventoryLayout } from '../../shared/inventory/inventoryLayoutStore';
import { CatalogSkuIcon } from '../../ui/components/CatalogSkuIcon';
import { gameEventBus } from '../../game/eventBus';
import { hotbarSkuToHeldKind } from '../../shared/interaction/hotbarContract';
import type { HeldItemState } from '../../shared/interaction/interactionTypes';
import { EMPTY_HELD_ITEM, isEditableInputTarget } from '../../shared/interaction/interactionResolver';
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
  readonly mode: 'backpack' | 'storage' | null;
  readonly touch: boolean;
  readonly onOpen: () => void;
  readonly onHeldItemChange: (held: HeldItemState | null) => void;
  readonly onClose: () => void;
}

interface Selection {
  readonly address: PhysicalSlotAddress;
  readonly stackId: string;
  readonly qty: number;
}

const CONTAINER_LABEL = { backpack: 'Ba lô', home: 'Kho nhà', overflow: 'Đồ giữ hộ' };

const CATEGORY_VI: Readonly<Record<string, string>> = {
  seed: 'Hạt giống', crop: 'Nông sản', grain: 'Ngũ cốc', veg: 'Rau củ', fruit: 'Trái cây',
  fish: 'Cá', bait: 'Mồi câu', dish: 'Món ăn', tool: 'Dụng cụ', keepsake: 'Kỷ vật',
  pet_food: 'Thức ăn cho mèo', pet_toy: 'Đồ chơi cho mèo', flower: 'Hoa', gift: 'Quà',
  ingredient: 'Nguyên liệu', tree_sapling: 'Cây giống', animal_product: 'Sản phẩm chăn nuôi',
  livestock_feed: 'Thức ăn chăn nuôi', fertilizer: 'Phân bón', sprinkler: 'Vòi tưới',
  stationery: 'Giấy viết thư', artisan: 'Thành phẩm', bouquet: 'Bó hoa',
};

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
  backend, worldId, userId, revision, location, connection, showHud, mode, touch, onOpen, onClose, onHeldItemChange,
}: Props) {
  const [view, setView] = useState<PhysicalInventoryView | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [equipped, setEquipped] = useState<string | null>(null);
  const [waterByStack, setWaterByStack] = useState<Record<string, number>>({});
  const open = mode !== null;
  const [storageQuery, setStorageQuery] = useState(INITIAL_HOME_STORAGE_QUERY);
  const query = mode === 'storage' ? storageQuery : INITIAL_PHYSICAL_QUERY;
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [lockedSlot, setLockedSlot] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const applying = useRef(false);
  const dragging = useRef<Selection | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const clearSelection = useCallback(() => {
    setSelection(null);
    setLockedSlot(null);
    setMenuOpen(false);
    setConfirmDiscard(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const origin = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (origin instanceof HTMLElement && origin.isConnected) origin.focus();
    };
  }, [open]);

  useEffect(() => {
    let current = true;
    if (!open) queueMicrotask(() => {
      if (!current) return;
      clearSelection();
      setMessage('');
      setSearch('');
      setStorageQuery(INITIAL_HOME_STORAGE_QUERY);
    });
    return () => { current = false; };
  }, [clearSelection, open]);

  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    const result = await backend.read(worldId, query);
    if (request !== sequence.current) return;
    if (result.ok) setView((old) => preferPhysicalSnapshot(old, result.data));
    else setMessage(result.message);
  }, [backend, worldId, query]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void refresh(); });
    return () => { active = false; sequence.current += 1; };
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
        if (command.kind === 'rotate') setEquipped(null);
        else if (command.kind !== 'pickup') clearSelection();
      } else {
        if (command.kind !== 'pickup' || open) setMessage(result.message);
        await refresh();
      }
    } finally {
      setBusy(false);
      applying.current = false;
    }
  }, [backend, clearSelection, open, query, refresh, view, worldId]);

  useEffect(() => {
    const publish = () => gameEventBus.emit('cmd:sync-physical-drops', {
      mapId: location, drops: view?.dropMapId === location ? view.mapDrops : [],
    });
    publish();
    return gameEventBus.on('evt:scene-ready', publish);
  }, [location, view]);

  const pickupAttempt = useRef({ mapId: '', version: -1, ids: new Set<string>(), nextAt: 0 });
  useEffect(() => gameEventBus.on('evt:local-position-sync', (position) => {
    if (!showHud || open || connection !== 'connected' || !view || applying.current) return;
    const now = Date.now();
    const attempt = pickupAttempt.current;
    if (now < attempt.nextAt) return;
    if (view.dropMapId !== position.mapId) {
      attempt.nextAt = now + 400;
      void refresh();
      return;
    }
    if (attempt.mapId !== position.mapId || attempt.version !== view.version) {
      attempt.mapId = position.mapId;
      attempt.version = view.version;
      attempt.ids.clear();
    }
    const nearby = view.mapDrops.filter((drop) => canReachDrop(drop, position));
    for (const id of attempt.ids) {
      if (!nearby.some((drop) => drop.id === id)) attempt.ids.delete(id);
    }
    const drop = nearby.find((item) => !attempt.ids.has(item.id) &&
      (item.droppedBy !== userId || now >= (item.pickupAfterMs ?? 0)));
    if (!drop) return;
    attempt.ids.add(drop.id);
    attempt.nextAt = now + 350;
    void apply({ kind: 'pickup', dropId: drop.id });
  }), [apply, connection, open, refresh, showHud, userId, view]);

  const activeRow = view?.player.activeRow ?? 0;
  const hotbar = physicalHotbarIndices(activeRow).map((index) => view?.backpack[index]);
  const equippedIndex = hotbar.findIndex((cell) => cell?.stack?.id === equipped);
  const visibleHeld = hotbar[equippedIndex]?.stack;
  const equippedName = visibleHeld ? view?.definitions[visibleHeld.itemSku]?.name ?? visibleHeld.itemSku : '';
  if (equipped && view && !visibleHeld) setEquipped(null);

  useEffect(() => {
    const item: HeldItemState = visibleHeld ? {
      ...EMPTY_HELD_ITEM,
      slotIndex: equippedIndex,
      physicalSource: { index: activeRow * BACKPACK_ROW_SIZE + equippedIndex, stackId: visibleHeld.id },
      itemSku: visibleHeld.itemSku,
      itemKind: hotbarSkuToHeldKind(visibleHeld.itemSku),
      ownerScope: `user:${userId}`,
      labelVi: equippedName,
      quality: visibleHeld.quality,
      waterFillLevel: waterByStack[visibleHeld.id] ?? 100,
    } : EMPTY_HELD_ITEM;
    onHeldItemChange(item);
    gameEventBus.emit('cmd:sync-held-item', item);
  }, [activeRow, equippedIndex, equippedName, onHeldItemChange, userId, visibleHeld, waterByStack]);
  useEffect(() => {
    const unsubscribe = gameEventBus.on('cmd:clear-physical-held-item', () => setEquipped(null));
    return () => { unsubscribe(); onHeldItemChange(null); };
  }, [onHeldItemChange]);
  useEffect(() => gameEventBus.on('evt:held-water-adjust', ({ level, itemSku }) => {
    if (!visibleHeld || (itemSku && itemSku !== visibleHeld.itemSku)) return;
    setWaterByStack((old) => ({ ...old, [visibleHeld.id]: Math.max(0, Math.min(100, Math.round(level))) }));
  }), [visibleHeld]);
  const source = selection && selectedSlot(view, selection.address);
  const held = selection && source?.stack?.id === selection.stackId && source.stack.qty >= selection.qty ? selection : null;

  const rotate = useCallback((direction: 1 | -1) => {
    if (view) void apply({ kind: 'rotate', direction });
  }, [apply, view]);

  useEffect(() => {
    if (!open && showHud) return gameEventBus.on('cmd:rotate-physical-hotbar', rotate);
  }, [open, rotate, showHud]);

  useLayoutEffect(() => {
    let shiftKey: string | null = null;
    let shiftPressedAt = 0;
    const pressedKeys = new Set<string>();
    const cancelShift = () => { shiftKey = null; };
    const resetKeys = () => { cancelShift(); pressedKeys.clear(); };
    const keyDown = (event: KeyboardEvent) => {
      pressedKeys.add(event.code);
      if (event.code !== shiftKey) cancelShift();
      if (event.repeat || event.defaultPrevented) return;
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        if (selection || lockedSlot !== null) clearSelection();
        else onClose();
        return;
      }
      const target = event.target;
      if (isEditableInputTarget(target)) return;
      if (open || !showHud || !view) return;
      if (event.key === 'Shift' && pressedKeys.size === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
        shiftKey = event.code;
        shiftPressedAt = performance.now();
      } else if (!event.altKey && !event.ctrlKey && !event.metaKey && /^[1-9]$/.test(event.key)) {
        event.preventDefault();
        const index = Number(event.key) - 1 + view.player.activeRow * BACKPACK_ROW_SIZE;
        setEquipped(view.backpack[index]?.stack?.id ?? null);
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(event.code);
      if (event.code === shiftKey && performance.now() - shiftPressedAt < 350) rotate(1);
      cancelShift();
    };
    window.addEventListener('keydown', keyDown, true);
    window.addEventListener('keyup', keyUp, true);
    window.addEventListener('pointerdown', cancelShift, true);
    window.addEventListener('blur', resetKeys);
    return () => {
      window.removeEventListener('keydown', keyDown, true);
      window.removeEventListener('keyup', keyUp, true);
      window.removeEventListener('pointerdown', cancelShift, true);
      window.removeEventListener('blur', resetKeys);
    };
  }, [clearSelection, lockedSlot, onClose, open, rotate, selection, showHud, view]);

  function trapTab(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const controls = [...(panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled])',
    ) ?? [])];
    const first = controls.at(0);
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  function pick(address: PhysicalSlotAddress, cell: PhysicalSlotView, single: boolean) {
    if (busy) return;
    setMenuOpen(false);
    setConfirmDiscard(false);
    if (address.container === 'backpack' && !held && (!cell.stack || cell.locked)) {
      setLockedSlot(lockedSlot === address.index ? null : address.index);
      return;
    }
    setLockedSlot(null);
    if (held) {
      if (held.address.container === address.container && held.address.index === address.index) {
        clearSelection();
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
    const selected = (held?.address.container === container && held.address.index === cell.index)
      || (container === 'backpack' && !held && lockedSlot === cell.index);
    return (
      <button key={cell.index} type="button" className="nuvora-sl"
        data-testid={`physical-${container}-${cell.index}`} data-qty={stack?.qty ?? 0}
        aria-label={`${CONTAINER_LABEL[container]} ô ${cell.index + 1}, ${name}${stack ? ` ×${stack.qty}` : ''}`}
        aria-pressed={selected} data-locked={cell.locked || undefined} draggable={Boolean(stack && !cell.locked && !busy)}
        title={name}
        onClick={(event) => {
          if (event.shiftKey && !held && stack && !cell.locked && storage?.kind === 'home') {
            void apply({ kind: 'transfer', from: address, qty: stack.qty, stackId: stack.id,
              to: container === 'backpack' ? 'home' : 'backpack' });
          } else pick(address, cell, false);
        }}
        onContextMenu={(event) => { event.preventDefault(); pick(address, cell, true); }}
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
        {(cell.locked || stack?.favorite) && <span className="physical-slot-lock" aria-hidden>{cell.locked ? '🔒' : '♥'}</span>}
        {stack?.quality !== undefined && stack.quality !== 'normal' &&
          <span className="physical-slot-mark" aria-hidden>{stack.quality === 'gold' ? '★' : '◆'}</span>}
      </button>
    );
  }

  const storage = mode === 'storage' && view?.storage?.kind === query.storage ? view.storage : null;
  const upgradeCost = view ? BACKPACK_UPGRADE_COSTS.at(view.player.tier) : undefined;
  const nextCapacity = view ? BACKPACK_TIERS.at(view.player.tier + 1) : undefined;
  const shortcuts = storage?.kind === 'home' && view && !view.player.importedShortcuts ? oldShortcuts(worldId, userId) : [];
  const currentStack = held && source?.stack;
  const title = mode === 'storage' ? 'Kho nhà' : 'Ba lô';
  const occupied = view?.backpack.filter(({ stack }) => stack).length ?? 0;
  const rows = (view?.backpack.length ?? BACKPACK_TIERS[0]) / BACKPACK_ROW_SIZE;

  return <>
    {showHud && !open && (
      <div className="physical-hotbar" data-touch={touch || undefined} data-active-row={activeRow + 1}
        role="group" aria-label="Thanh vật phẩm nhanh" data-testid="physical-hotbar"
        onPointerDown={(event) => event.stopPropagation()}>
        <div className="physical-hotbar__slots">
          {hotbar.map((cell, key) => (
            <button key={key} type="button" className="nuvora-sl"
              data-testid={`physical-hotbar-${key + 1}`} data-qty={cell?.stack?.qty ?? 0}
              aria-pressed={Boolean(visibleHeld && cell?.stack?.id === visibleHeld.id)}
              aria-label={cell?.stack ? view?.definitions[cell.stack.itemSku]?.name ?? cell.stack.itemSku : `Ô ${key + 1} trống`}
              onClick={() => setEquipped(cell?.stack?.id ?? null)}>
              {!touch && <small aria-hidden>{key + 1}</small>}
              {cell?.stack && <CatalogSkuIcon sku={cell.stack.itemSku} size={22} />}
              {cell?.stack && cell.stack.qty > 1 && <b className="nuvora-sl__qty">{cell.stack.qty}</b>}
            </button>
          ))}
        </div>
        <div className="physical-hotbar__controls">
          <button className="physical-icon-button physical-row-button" type="button" disabled={busy || !view}
            aria-label={`Đổi hàng vật phẩm, hàng ${activeRow + 1} trên ${rows}`}
            title="Đổi hàng vật phẩm (Shift)" onClick={() => rotate(1)}>
            <span className="physical-row-marks" aria-hidden="true">
              {Array.from({ length: rows }, (_, index) => <i key={index} data-current={activeRow === index || undefined} />)}
            </span>
            {!touch && <kbd>Shift</kbd>}
          </button>
          <button className="physical-icon-button" type="button" aria-label="Mở ba lô" title="Mở ba lô (I)" onClick={onOpen}>
            <Backpack size={22} aria-hidden="true" />
            {!touch && <kbd>I</kbd>}
            {Boolean(view?.nearbyDrops.length) && <i className="physical-hotbar__drop" aria-label="Có đồ rơi gần đây" />}
          </button>
        </div>
      </div>
    )}
    {open && (
      <div className="modal-backdrop physical-inventory-backdrop" role="dialog" aria-label={title} aria-modal="true">
        <div className="nuvora-desk physical-inventory-panel" ref={panelRef} onKeyDown={trapTab}
          data-testid={mode === 'storage' ? 'physical-home-storage-modal' : 'physical-inventory-modal'} data-mode={mode}>
          <header className="physical-panel-header">
            <h2>{mode === 'storage' ? <Archive size={23} /> : <Backpack size={23} />}{title}</h2>
            <button ref={closeRef} className="physical-control physical-control--icon" type="button" aria-label="Đóng" onClick={onClose}>
              <X size={20} />
            </button>
          </header>
          <div className="physical-panel-body">
            {view ? <>
              <div className="physical-inventory-trays">
                <section className="physical-tray" aria-label="Ba lô">
                  <div className="physical-tray__heading">
                    <h3>{mode === 'storage' ? 'Ba lô' : 'Vật phẩm'} <small>{occupied}/{view.backpack.length}</small></h3>
                    <button type="button" className="physical-control" disabled={busy}
                      onClick={() => void apply({ kind: 'organize', container: 'backpack' })}>Sắp xếp</button>
                  </div>
                  <div className="physical-slot-grid">{view.backpack.map((cell) => drawCell(cell, 'backpack'))}</div>
                  <div className="physical-inventory-actions physical-bag-options">
                    <button type="button" className="physical-control" disabled={busy}
                      onClick={() => rotate(1)}>Đổi hàng</button>
                    {mode === 'backpack' && view.atHome && upgradeCost !== undefined && nextCapacity !== undefined && (
                      <button type="button" className="physical-control" disabled={busy || view.coins < upgradeCost}
                        onClick={() => void apply({ kind: 'upgrade_backpack' })}>Mở {nextCapacity} ô · {upgradeCost} xu</button>
                    )}
                    {shortcuts.length > 0 && <button type="button" className="physical-control" disabled={busy}
                      onClick={() => void apply({ kind: 'import_shortcuts', shortcuts })}>Lấy món từ ô nhanh cũ</button>}
                  </div>
                  {mode === 'backpack' && view.nearbyDrops.length > 0 && <section aria-label="Đồ rơi gần đây" className="physical-inventory-actions">
                    {view.nearbyDrops.map((drop) => (
                      <button type="button" key={drop.id} className="physical-control" disabled={busy}
                        onClick={() => void apply({ kind: 'pickup', dropId: drop.id })}>
                        Nhặt {view.definitions[drop.stack.itemSku]?.name ?? drop.stack.itemSku} ×{drop.stack.qty}
                      </button>
                    ))}
                  </section>}
                </section>
                {mode === 'storage' && <section className="physical-tray physical-tray--shelf" aria-label="Kho chung">
                  {storage ? <>
                    <div className="physical-tray__heading">
                      <div className="physical-storage-switch" aria-label="Ngăn kho">
                        {(['home', 'overflow'] as const).map((kind) =>
                          <button type="button" key={kind} className="physical-control" aria-pressed={query.storage === kind}
                            onClick={() => {
                              clearSelection();
                              setSearch('');
                              setStorageQuery({ ...INITIAL_HOME_STORAGE_QUERY, storage: kind });
                            }}>{CONTAINER_LABEL[kind]}</button>)}
                      </div>
                      <button type="button" className="physical-control" disabled={busy}
                        onClick={() => void apply({ kind: 'organize', container: storage.kind })}>Xếp kho</button>
                    </div>
                    <form className="physical-search" role="search" onSubmit={(event) => {
                      event.preventDefault();
                      clearSelection();
                      setStorageQuery((old) => ({ ...old, page: 0, search: search.trim() }));
                    }}>
                      <label className="physical-search__field">
                        <Search size={17} aria-hidden="true" />
                        <input aria-label="Tên vật phẩm" placeholder="Tìm trong kho…" maxLength={80} value={search}
                          onChange={(event) => setSearch(event.target.value)} />
                      </label>
                      <select aria-label="Loại vật phẩm" value={query.category ?? ''} onChange={(event) => {
                        clearSelection();
                        const category = event.target.value || undefined;
                        setStorageQuery((old) => ({ ...old, page: 0, category }));
                      }}>
                        <option value="">Tất cả loại</option>
                        {view.categories.map((category) => <option key={category} value={category}>{CATEGORY_VI[category] ?? 'Khác'}</option>)}
                      </select>
                      <button className="physical-control physical-control--icon" type="submit" aria-label="Tìm"><ChevronRight size={18} /></button>
                    </form>
                    <div className="physical-slot-grid physical-slot-grid--shelf">
                      {storage.slots.length ? storage.slots.map((cell) => drawCell(cell, storage.kind)) : <p>Không có món phù hợp.</p>}
                    </div>
                    <div className="physical-shelf-footer">
                      {storage.kind === 'home' && <div className="physical-inventory-actions">
                        <button type="button" className="physical-control" disabled={busy}
                          onClick={() => void apply({ kind: 'deposit', matchingOnly: true })}>Cất món cùng loại</button>
                        <button type="button" className="physical-control" disabled={busy}
                          onClick={() => void apply({ kind: 'deposit', matchingOnly: false })}>Cất nhanh tất cả</button>
                      </div>}
                      <nav className="physical-pages" aria-label="Trang kho">
                        <button className="physical-control physical-control--icon" type="button" disabled={storage.page === 0}
                          aria-label="Trang trước" onClick={() => setStorageQuery((old) => ({ ...old, page: storage.page - 1 }))}><ChevronLeft size={17} /></button>
                        <span>{storage.page + 1} / {storage.pages}</span>
                        <button className="physical-control physical-control--icon" type="button" disabled={storage.page + 1 >= storage.pages}
                          aria-label="Trang sau" onClick={() => setStorageQuery((old) => ({ ...old, page: storage.page + 1 }))}><ChevronRight size={17} /></button>
                      </nav>
                    </div>
                  </> : <div className="physical-inventory-actions">
                    <p>Đứng cạnh tủ để mở kho.</p>
                    <button type="button" className="physical-control" onClick={() => void refresh()}>Tải lại kho</button>
                  </div>}
                </section>}
              </div>
            </> : <button className="physical-control" type="button" onClick={() => void refresh()}>Tải lại túi đồ</button>}
          </div>
          <footer className="physical-item-actions" aria-label="Món đang chọn">
            <div className="physical-item-status" role="status">
              {message || (currentStack && view
                ? `${view.definitions[currentStack.itemSku]?.name ?? currentStack.itemSku} ×${held.qty}`
                : lockedSlot !== null ? `Ô ${lockedSlot + 1}`
                  : mode === 'storage' ? 'Chọn một món để chuyển.' : 'Chọn một ô để xem thao tác.')}
            </div>
            <div className="physical-inventory-actions">
              {held && currentStack && view && <>
                {storage && (storage.kind === 'home' || held.address.container !== 'backpack') &&
                  <button type="button" className="physical-control physical-control--accent" disabled={busy}
                    onClick={() => void apply({ kind: 'transfer', from: held.address, stackId: held.stackId, qty: held.qty,
                      to: held.address.container === 'backpack' ? 'home' : 'backpack' })}>
                    <ArrowLeftRight size={16} /> {held.address.container === 'backpack' ? 'Cất vào kho' : 'Lấy vào ba lô'}
                  </button>}
                {currentStack.qty > 1 && <button type="button" className="physical-control" disabled={busy}
                  onClick={() => setSelection({ ...held, qty: 1 })}>Chọn 1</button>}
                <button type="button" className="physical-control physical-control--icon" aria-label="Thao tác khác" aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(!menuOpen)}><MoreHorizontal size={20} /></button>
                <button type="button" className="physical-control physical-control--icon" aria-label="Bỏ chọn" onClick={clearSelection}><X size={17} /></button>
              </>}
              {!held && lockedSlot !== null && view && (
                <button type="button" className="physical-control" disabled={busy}
                  onClick={() => void apply({ kind: 'lock_slot', at: { container: 'backpack', index: lockedSlot } })}>
                  {view.backpack[lockedSlot]?.locked ? 'Mở khóa ô' : 'Khóa ô trống'}
                </button>
              )}
            </div>
            {menuOpen && held && currentStack && view && (
              <div className="physical-item-menu" aria-label="Thao tác vật phẩm">
                {currentStack.qty > 1 && <>
                  <label>Số lượng <input aria-label="Số lượng đang chọn" type="number" min={1} max={currentStack.qty}
                    value={held.qty} onChange={(event) => {
                      const qty = Number(event.target.value);
                      if (Number.isInteger(qty) && qty >= 1 && qty <= currentStack.qty) setSelection({ ...held, qty });
                      setConfirmDiscard(false);
                    }} /></label>
                  <button type="button" className="physical-control" disabled={busy}
                    onClick={() => setSelection({ ...held, qty: Math.ceil(currentStack.qty / 2) })}>Tách đôi</button>
                </>}
                {held.address.container === 'backpack' && <>
                  <button type="button" className="physical-control" disabled={busy}
                    onClick={() => void apply({ kind: 'favorite', at: held.address, stackId: held.stackId })}>
                    {currentStack.favorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                  </button>
                  <button type="button" className="physical-control" disabled={busy}
                    onClick={() => void apply({ kind: 'lock_slot', at: held.address })}>Khóa ô</button>
                  {!currentStack.favorite && !view.definitions[currentStack.itemSku]?.essential && <>
                    {view.saleChannel && (
                      <button type="button" className="physical-control" disabled={busy}
                        onClick={() => void apply({ kind: 'sell', from: held.address, qty: held.qty,
                          stackId: held.stackId, channel: view.saleChannel! })}>
                        {view.saleChannel === 'shipping' ? 'Gửi thùng hàng' : 'Bán'} {held.qty} món
                      </button>
                    )}
                    <button type="button" className="physical-control" disabled={busy || !view.canDrop}
                      onClick={() => void apply({ kind: 'drop', from: held.address, qty: held.qty, stackId: held.stackId })}>Thả</button>
                    <button type="button" className="physical-control" disabled={busy}
                      onClick={() => setConfirmDiscard(true)}>Bỏ vĩnh viễn…</button>
                    {confirmDiscard && <button type="button" className="physical-control physical-control--danger" disabled={busy}
                      onClick={() => void apply({ kind: 'discard', from: held.address, qty: held.qty, stackId: held.stackId, confirm: true })}>
                      Xác nhận bỏ {held.qty} món
                    </button>}
                  </>}
                </>}
              </div>
            )}
          </footer>
        </div>
      </div>
    )}
  </>;
}
