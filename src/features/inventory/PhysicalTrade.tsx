import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getItem } from '../../shared/economy/catalogConfig';
import type { PhysicalStack } from '../../shared/inventory/physicalInventory';
import { ArrowLeftRight } from 'lucide-react';
import type { PhysicalInventoryBackend } from '../../lib/backend/types';
import { INITIAL_PHYSICAL_QUERY, type PhysicalInventoryView } from '../../shared/inventory/physicalInventoryApi';
import type { TradeCommand, TradeLine, TradeSession } from '../../shared/inventory/physicalTrade';
import { CatalogSkuIcon } from '../../ui/components/CatalogSkuIcon';
import './physicalInventory.css';

interface TradeView { nearby: boolean; session: TradeSession | null; }

export default function PhysicalTrade({ worldId, userId, backend, onOpenChange }: {
  worldId: string; userId: string; backend: PhysicalInventoryBackend; onOpenChange: (open: boolean) => void;
}) {
  const [view, setView] = useState<TradeView>();
  const [bag, setBag] = useState<PhysicalInventoryView>();
  const [selected, setSelected] = useState<{ sessionId: string; actor: string; index: number; id: string } | null>(null);
  const [amount, setAmount] = useState(1);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const sending = useRef(false);
  const session = view?.session;
  const offering = session?.phase === 'offering';
  const endpoint = '/api/dev-lan/inventory/physical-trade?worldId=' + encodeURIComponent(worldId);

  const request = useCallback(async (command?: TradeCommand) => {
    if (sending.current) return;
    if (command) { sending.current = true; setBusy(true); setError(''); }
    const seq = ++sequence.current;
    try {
      const response = await fetch(endpoint, {
        headers: { 'content-type': 'application/json', 'x-dev-user-id': userId },
        ...(command && { method: 'POST', body: JSON.stringify({ worldId, command }) }),
      });
      const result = await response.json() as { ok: boolean; data?: TradeView; message?: string };
      if (seq !== sequence.current) return;
      if (!result.ok || !result.data) {
        if (command) setError(result.message ?? 'Không trao đổi được. Hãy thử lại.');
        return;
      }
      setView(result.data);
    } catch {
      if (command) setError('Mất kết nối. Hãy thử lại.');
    } finally {
      if (command) { sending.current = false; setBusy(false); }
    }
  }, [endpoint, userId, worldId]);

  useEffect(() => {
    const timer = window.setInterval(() => void request(), 1000);
    const start = window.setTimeout(() => void request(), 0);
    return () => { window.clearInterval(timer); window.clearTimeout(start); sequence.current += 1; };
  }, [request]);

  useEffect(() => {
    const origin = document.activeElement;
    if (offering) cancelRef.current?.focus();
    onOpenChange(offering);
    return () => {
      onOpenChange(false);
      if (offering && origin instanceof HTMLElement && origin.isConnected) origin.focus();
    };
  }, [offering, onOpenChange]);

  useEffect(() => {
    if (!offering) return;
    let active = true;
    const refresh = () => void backend.read(worldId, INITIAL_PHYSICAL_QUERY).then((result) => {
      if (active && result.ok) setBag((old) => old && old.version > result.data.version ? old : result.data);
    });
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [backend, offering, worldId]);

  function select(line: TradeLine, qty: number) {
    if (!session) return;
    const others = (session.offers[userId] ?? []).filter(({ index }) => index !== line.index)
      .map(({ index, stackId, qty }) => ({ index, stackId, qty }));
    const lines = qty ? [...others, { ...line, qty }] : others;
    void request({ kind: 'offer', tradeId: session.id, revision: session.revision, lines });
  }

  const partner = session?.from === userId ? session.to : session?.from;
  const ownOffer = session?.offers[userId] ?? [];
  const currentChoice = selected && selected.sessionId === session?.id ? selected : null;
  const picked = currentChoice?.actor === userId
    ? bag?.backpack.find((cell) => cell.index === currentChoice.index)?.stack
    : currentChoice && session?.offers[currentChoice.actor]?.find((line) => line.index === currentChoice.index)?.stack;
  const selectedStack = picked && picked.id === currentChoice?.id ? picked : null;
  const canEdit = Boolean(selectedStack && currentChoice?.actor === userId);
  const selectedOffer = ownOffer.find((line) => line.index === currentChoice?.index && line.stackId === selectedStack?.id);
  const qty = Math.min(Math.max(1, amount), selectedStack?.qty ?? 1);
  const modalRoot = typeof document === 'undefined' ? null : document.getElementById('olw-gameplay-modal-root');
  const label = (stack: PhysicalStack) => bag?.definitions[stack.itemSku]?.name ?? getItem(stack.itemSku)?.nameVi ?? stack.itemSku;
  const quality = (stack: PhysicalStack) => stack.quality === 'gold' ? 'Vàng' : stack.quality === 'silver' ? 'Bạc' : 'Thường';
  const locked = (stack: PhysicalStack) => Boolean(stack.favorite || stack.metadata?.reserved || stack.metadata?.starterOwner);
  const inspect = (actor: string, index: number, stack: PhysicalStack) => {
    if (!session) return;
    setSelected({ sessionId: session.id, actor, index, id: stack.id });
    setAmount(actor === userId ? ownOffer.find((line) => line.index === index && line.stackId === stack.id)?.qty ?? 1 : stack.qty);
  };
  const icon = (stack: PhysicalStack) => <>
    <CatalogSkuIcon sku={stack.itemSku} size={26} />
    {stack.qty > 1 && <b className="nuvora-sl__qty">{stack.qty}</b>}
    {stack.quality !== 'normal' && <span className="physical-trade-quality" data-quality={stack.quality} aria-hidden>◆</span>}
  </>;
  return <>
    <button type="button" className="physical-control physical-trade-trigger" aria-label="Mời trao đổi"
      title="Mời trao đổi" disabled={busy || !view?.nearby || session?.phase === 'invited' || offering}
      onClick={() => void request({ kind: 'invite' })}>
      <ArrowLeftRight size={21} />
    </button>
    {session?.phase === 'invited' && <div className="physical-trade-invite olw-game-window" role="status">
      {session.to === userId ? 'Người thương muốn trao đổi.' : 'Đang chờ người thương…'}
      {session.to === userId && <button className="physical-control" disabled={busy} type="button"
        onClick={() => void request({ kind: 'accept', tradeId: session.id })}>Đồng ý</button>}
      <button className="physical-control" disabled={busy} type="button"
        onClick={() => void request({ kind: 'cancel', tradeId: session.id })}>{session.to === userId ? 'Từ chối' : 'Hủy'}</button>
    </div>}
    {!offering && (error || session?.phase === 'settled' || session?.phase === 'cancelled') &&
      <small className="physical-trade-invite olw-game-window" role="status">
        {error || (session?.phase === 'settled' ? 'Đã trao đổi.' : 'Đã hủy trao đổi.')}
      </small>}
    {offering && session && modalRoot && createPortal(
      <div className="modal-backdrop physical-inventory-backdrop physical-trade-dialog olw-gameplay-modal" role="dialog"
        aria-modal="true" aria-label="Trao đổi vật phẩm"
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.stopPropagation(); void request({ kind: 'cancel', tradeId: session.id }); }
          if (event.key !== 'Tab') return;
          const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
          const first = controls.at(0), last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
        <div className="nuvora-desk physical-inventory-panel physical-trade-panel olw-gameplay-modal__panel">
          <header className="physical-panel-header"><h2>Trao đổi vật phẩm</h2></header>
          <div className="physical-panel-body olw-gameplay-modal__scroll" data-testid="trade-scroll">
            <div className="physical-trade-offers">
              {[userId, partner!].map((actor) => {
                const items = session.offers[actor] ?? [];
                const confirmed = session.confirmed.includes(actor);
                return <section className="physical-tray" key={actor}
                  onDragOver={actor === userId ? (event) => event.preventDefault() : undefined}
                  onDrop={actor === userId ? (event) => {
                    event.preventDefault();
                    const stackId = event.dataTransfer.getData('application/x-olw-trade-stack');
                    const cell = bag?.backpack.find((row) => row.stack?.id === stackId);
                    if (!cell?.stack || cell.locked || locked(cell.stack) || busy) return;
                    const next = selectedStack?.id === stackId ? qty : 1;
                    inspect(actor, cell.index, cell.stack);
                    setAmount(next);
                    select({ index: cell.index, stackId, qty: next }, next);
                  } : undefined}>
                  <h3>{actor === userId ? 'Bạn' : 'Người thương'}</h3>
                  <small className="physical-trade-ready" data-confirmed={confirmed}>
                    {confirmed ? '✓ Đã xác nhận' : 'Chưa xác nhận'}
                  </small>
                  <div className="physical-trade-grid physical-trade-grid--offer">
                    {items.map(({ index, stack }) => <button key={index} type="button" className="nuvora-sl"
                      aria-label={label(stack) + ' ×' + stack.qty + ' · ' + quality(stack)}
                      aria-pressed={currentChoice?.actor === actor && currentChoice.id === stack.id}
                      onClick={() => inspect(actor, index, stack)}>{icon(stack)}</button>)}
                    {Array.from({ length: Math.max(0, 6 - items.length) }, (_, index) =>
                      <span key={'empty-' + index} className="nuvora-sl" aria-hidden />)}
                  </div>
                </section>;
              })}
            </div>
            <section className="physical-tray">
              <h3>Ba lô</h3>
              <div className="physical-trade-grid physical-trade-grid--bag">
                {bag?.backpack.map(({ index, stack, locked: slotLocked }) => {
                  const unusable = !stack || slotLocked || locked(stack);
                  return <button key={index} type="button" className="nuvora-sl" disabled={unusable}
                    aria-label={stack ? label(stack) + ' ×' + stack.qty + ' · ' + quality(stack) : 'Ô ' + (index + 1) + ' trống'}
                    aria-pressed={Boolean(stack && currentChoice?.actor === userId && currentChoice.id === stack.id)}
                    draggable={!unusable && !busy}
                    onDragStart={(event) => { if (stack) event.dataTransfer.setData('application/x-olw-trade-stack', stack.id); }}
                    onClick={() => { if (stack) inspect(userId, index, stack); }}>
                    {stack && icon(stack)}
                  </button>;
                })}
              </div>
            </section>
            <section className="physical-tray physical-trade-inspector" aria-label="Vật phẩm đang chọn">
              {selectedStack && currentChoice ? <>
                <div><strong>{label(selectedStack)}</strong> · {quality(selectedStack)} · ×{selectedStack.qty}
                  {typeof selectedStack.metadata?.durability === 'number' && ' · Độ bền ' + selectedStack.metadata.durability}
                  {typeof selectedStack.metadata?.variety === 'string' && ' · Giống ' + selectedStack.metadata.variety}
                </div>
                {canEdit && <div className="physical-inventory-actions physical-trade-stepper">
                  <button type="button" className="physical-control" aria-label="Giảm 1"
                    disabled={qty <= 1} onClick={() => setAmount(qty - 1)}>−</button>
                  <output aria-label="Số lượng trao đổi">{qty}</output>
                  <button type="button" className="physical-control" disabled={qty >= selectedStack.qty}
                    onClick={() => setAmount(qty + 1)}>+1</button>
                  <button type="button" className="physical-control" disabled={qty >= selectedStack.qty}
                    onClick={() => setAmount(Math.min(qty + 5, selectedStack.qty))}>+5</button>
                  <button type="button" className="physical-control" disabled={qty >= selectedStack.qty}
                    onClick={() => setAmount(selectedStack.qty)}>Tối đa</button>
                  <button type="button" className="physical-control" disabled={busy}
                    onClick={() => select({ index: currentChoice.index, stackId: selectedStack.id, qty }, qty)}>
                    {selectedOffer ? 'Cập nhật' : 'Đưa vào'}
                  </button>
                  {selectedOffer && <button type="button" className="physical-control" disabled={busy}
                    onClick={() => select(selectedOffer, 0)}>Bỏ</button>}
                </div>}
              </> : 'Chọn một ô để xem vật phẩm.'}
            </section>
          </div>
          {error && <p className="physical-trade-error" role="alert">{error}</p>}
          <footer className="physical-inventory-actions physical-trade-footer">
            <button ref={cancelRef} className="physical-control" disabled={busy} type="button"
              onClick={() => void request({ kind: 'cancel', tradeId: session.id })}>Hủy</button>
            <button className="physical-control" type="button" disabled={busy || session.confirmed.includes(userId)
              || !Object.values(session.offers).some((items) => items.length)}
              onClick={() => void request({ kind: 'confirm', tradeId: session.id, revision: session.revision })}>Xác nhận đề nghị</button>
          </footer>
        </div>
      </div>, modalRoot)}
  </>;
}
