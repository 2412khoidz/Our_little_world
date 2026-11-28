import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [amounts, setAmounts] = useState<Record<string, number>>({});
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
    onOpenChange(offering);
    return () => onOpenChange(false);
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
    {offering && session && <div className="modal-backdrop physical-inventory-backdrop physical-trade-dialog" role="dialog"
      aria-modal="true" aria-label="Trao đổi vật phẩm" onKeyDown={(event) => {
        if (event.key === 'Escape') { event.stopPropagation(); void request({ kind: 'cancel', tradeId: session.id }); }
      }}>
      <div className="nuvora-desk physical-inventory-panel">
        <header className="physical-panel-header"><h2>Trao đổi vật phẩm</h2>
          <button className="physical-control" disabled={busy} type="button"
            onClick={() => void request({ kind: 'cancel', tradeId: session.id })}>Hủy</button></header>
        <div className="physical-panel-body">
          <div className="physical-inventory-trays">
            {[userId, session.from === userId ? session.to : session.from].map((actor) => (
              <section className="physical-tray" key={actor}>
                <h3>{actor === userId ? 'Bạn' : 'Người thương'} · {session.confirmed.includes(actor) ? 'Đã xác nhận' : 'Chưa xác nhận'}</h3>
                {(session.offers[actor] ?? []).length === 0 && <p>Chưa có vật phẩm.</p>}
                {(session.offers[actor] ?? []).map(({ index, stack }) => <div className="physical-trade-line" key={index}>
                  <CatalogSkuIcon sku={stack.itemSku} />
                  <span>{bag?.definitions[stack.itemSku]?.name ?? stack.itemSku} ×{stack.qty}
                    {' · '}{stack.quality === 'gold' ? 'Vàng' : stack.quality === 'silver' ? 'Bạc' : 'Thường'}
                    {typeof stack.metadata?.variety === 'string' && ' · Giống ' + stack.metadata.variety}
                    {typeof stack.metadata?.durability === 'number' && ' · Độ bền ' + stack.metadata.durability}</span>
                  {actor === userId && <button className="physical-control" type="button" disabled={busy}
                    onClick={() => select({ index, stackId: stack.id, qty: 0 }, 0)}>Bỏ</button>}
                </div>)}
              </section>
            ))}
          </div>
          <section className="physical-tray">
            <h3>Chọn từ ba lô</h3>
            {bag?.backpack.flatMap(({ index, stack, locked }) => {
              if (!stack || locked || stack.favorite || stack.metadata?.reserved || stack.metadata?.starterOwner) return [];
              const qty = Math.max(1, Math.min(stack.qty, amounts[stack.id] ?? 1));
              const label = bag.definitions[stack.itemSku]?.name ?? stack.itemSku;
              return <div className="physical-trade-line" key={index}>
                <CatalogSkuIcon sku={stack.itemSku} />
                <span>{label} ×{stack.qty}</span>
                <input type="number" min={1} max={stack.qty} value={qty} aria-label={'Số lượng ' + label}
                  onChange={(event) => setAmounts({ ...amounts, [stack.id]: Math.trunc(Number(event.target.value)) })} />
                <button className="physical-control" type="button" disabled={busy}
                  onClick={() => select({ index, stackId: stack.id, qty }, qty)}>Đưa vào</button>
              </div>;
            })}
          </section>
          {error && <p role="alert">{error}</p>}
        </div>
        <footer className="physical-inventory-actions">
          <button className="physical-control" type="button" disabled={busy || session.confirmed.includes(userId)
            || !Object.values(session.offers).some((items) => items.length)}
            onClick={() => void request({ kind: 'confirm', tradeId: session.id, revision: session.revision })}>Xác nhận đề nghị</button>
        </footer>
      </div>
    </div>}
  </>;
}
