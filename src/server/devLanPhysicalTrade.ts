import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  getPhysicalCatalog, PhysicalInventoryEdit, physicalError, type PhysicalCatalog, type PhysicalInventory,
} from '../shared/inventory/physicalInventory';
import { isProtectedPhysicalStack } from '../shared/inventory/physicalInventoryLifecycle';
import type { TradeLine, TradeOfferItem, TradeSession } from '../shared/inventory/physicalTrade';
import { loadPhysicalGameplayState, PhysicalInventoryError, type Context } from './devLanPhysicalInventoryRoute';

const id = z.string().min(1).max(128);
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const reference = { tradeId: id };
const schema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('invite') }),
  z.strictObject({ kind: z.literal('accept'), ...reference }),
  z.strictObject({ kind: z.literal('cancel'), ...reference }),
  z.strictObject({ kind: z.literal('offer'), ...reference, revision,
    lines: z.array(z.strictObject({ index: z.number().int().min(0).max(53), stackId: id, qty: z.number().int().min(1).max(2_147_483_647) })).max(54) }),
  z.strictObject({ kind: z.literal('confirm'), ...reference, revision }),
]);

function validateOffer(edit: PhysicalInventoryEdit, lines: readonly TradeLine[]): TradeOfferItem[] {
  if (new Set(lines.map(({ index }) => index)).size !== lines.length) physicalError('INVALID', 'Mỗi ô chỉ được chọn một lần.');
  return lines.map((line) => {
    const { stack } = edit.source({ container: 'backpack', index: line.index }, line.stackId, line.qty);
    if (isProtectedPhysicalStack(stack) || stack.metadata?.starterOwner || (stack.metadata?.instanceId && line.qty !== stack.qty))
      physicalError('PROTECTED', 'Món được bảo vệ không thể trao đổi.');
    return { ...line, availableQty: stack.qty, stack: { ...stack, qty: line.qty } };
  });
}

/** All debits happen on disposable drafts before either recipient is credited. */
export function settlePhysicalTrade(state: PhysicalInventory, session: TradeSession, catalog: PhysicalCatalog): PhysicalInventory {
  const remove = (draft: PhysicalInventory, actor: string) => {
    const edit = new PhysicalInventoryEdit(draft, actor, catalog, false);
    const offered = session.offers[actor] ?? [];
    const checked = validateOffer(edit, offered);
    if (JSON.stringify(checked) !== JSON.stringify(offered)) physicalError('VERSION_CONFLICT', 'Vật phẩm đã thay đổi. Hãy chọn lại.');
    const bag = edit.edit('backpack');
    const items = checked.map((line) => {
      const stack = bag.slots[line.index]!;
      edit.take(bag, line.index, stack, line.qty);
      return edit.span(stack, line.qty, line.qty === stack.qty);
    });
    return { items, draft: edit.finish() };
  };
  const left = remove(state, session.from);
  const right = remove(left.draft, session.to);
  if (!left.items.length && !right.items.length) physicalError('INVALID', 'Hãy thêm ít nhất một món để trao đổi.');
  const credit = (draft: PhysicalInventory, actor: string, items: typeof left.items) => {
    const edit = new PhysicalInventoryEdit(draft, actor, catalog, false);
    for (const stack of items) {
      if (edit.insert(edit.edit('backpack'), stack) !== stack.qty)
        physicalError('FULL', actor === session.from ? 'Ba lô người gửi đã đầy.' : 'Ba lô người nhận đã đầy.');
    }
    return edit.finish();
  };
  return credit(credit(right.draft, session.from, right.items), session.to, left.items);
}

type Position = Context['position'];
export interface TradeContext extends Context {
  tradeSessions: Map<string, TradeSession>;
  tradeInvites: Map<string, number>;
  tradeConnections: Map<string, string>;
  partnerId?: string;
  partnerPosition: Position;
}
const RANGE = 56;

export function handlePhysicalTrade(ctx: TradeContext): boolean {
  const { worldId, userId, partnerId } = ctx;
  const send = (status: number, body: unknown) => ctx.sendJson(ctx.res, status, body);
  if (!worldId || !ctx.isWorldMember(worldId, userId)) {
    send(403, { ok: false, code: 'FORBIDDEN', message: 'Bạn không thuộc ngôi nhà này.' });
    return true;
  }
  const now = Date.now();
  const { position: a, partnerPosition: b } = ctx;
  const close = Boolean(partnerId && a && b && a.mapId === b.mapId
    && Math.hypot((a.x ?? NaN) - (b.x ?? NaN), (a.y ?? NaN) - (b.y ?? NaN)) <= RANGE);
  const connectionPair = [a?.connectionId, b?.connectionId].sort().join('|');
  const row = ctx.tradeSessions.get(worldId);
  let current = row && row.expiresAt > now && [row.from, row.to].includes(userId) ? row : undefined;
  if (current && (!close || connectionPair !== ctx.tradeConnections.get(worldId)) && ['offering', 'invited'].includes(current.phase)) {
    current = { ...current, phase: 'cancelled', confirmed: [], expiresAt: now + 6000 };
    ctx.tradeSessions.set(worldId, current);
  }
  const ok = (session?: TradeSession) => send(200, { ok: true, data: { nearby: close, session: session ?? null } });
  if (ctx.req.method === 'GET') { ok(current); return true; }
  try {
    const { worldId: requested, command } = z.strictObject({ worldId: id, command: schema }).parse(ctx.body);
    if (requested !== worldId) physicalError('FORBIDDEN', 'Giao dịch thuộc ngôi nhà khác.');
    const operations = ctx.db.v015;
    if (command.kind === 'confirm' && operations.physicalInventory?.[worldId]?.tradeReceipts?.[command.tradeId]) {
      const receipt = operations.physicalInventory[worldId].tradeReceipts![command.tradeId]!;
      if ([receipt.from, receipt.to].includes(userId) && command.revision === receipt.revision) {
        ok({ ...receipt, expiresAt: now + 6000 });
        return true;
      }
    }
    if (command.kind === 'invite') {
      if (!close || !partnerId) physicalError('UNAVAILABLE', 'Hãy đứng gần người thương để mời trao đổi.');
      if (current && ['offering', 'invited'].includes(current.phase)) { ok(current); return true; }
      const throttle = worldId + ':' + userId;
      if ((ctx.tradeInvites.get(throttle) ?? 0) > now) physicalError('UNAVAILABLE', 'Chờ một chút rồi hãy mời lại.');
      ctx.tradeInvites.set(throttle, now + 8000);
      ctx.tradeConnections.set(worldId, connectionPair);
      current = { id: randomUUID(), from: userId, to: partnerId, phase: 'invited',
        expiresAt: now + 25000, revision: 0, offers: {}, confirmed: [] };
    } else {
      if (!current || current.id !== command.tradeId) physicalError('NOT_FOUND', 'Phiên trao đổi đã kết thúc.');
      if (command.kind === 'cancel') {
        if (current.phase === 'settled') { ok(current); return true; }
        current = { ...current, phase: 'cancelled', confirmed: [], expiresAt: now + 6000 };
      } else {
        if (!close) physicalError('UNAVAILABLE', 'Hai bạn cần ở gần nhau để trao đổi.');
        if (command.kind === 'accept') {
          if (current.phase === 'offering') { ok(current); return true; }
          if (current.phase !== 'invited' || current.to !== userId) physicalError('FORBIDDEN', 'Lời mời không còn hiệu lực.');
          current = { ...current, phase: 'offering', expiresAt: now + 120000 };
        } else {
          if (current.phase !== 'offering' || current.revision !== command.revision)
            physicalError('VERSION_CONFLICT', 'Đề nghị vừa thay đổi. Hãy kiểm tra lại.');
          const state = loadPhysicalGameplayState(ctx.db, worldId, ctx.catalog);
          const catalog = getPhysicalCatalog(ctx.catalog);
          if (command.kind === 'offer') {
            const items = validateOffer(new PhysicalInventoryEdit(state, userId, catalog, false), command.lines);
            current = { ...current, revision: current.revision + 1, offers: { ...current.offers, [userId]: items },
              confirmed: [], expiresAt: now + 120000 };
          } else {
            const confirmed = [...new Set([...current.confirmed, userId])];
            const next: TradeSession = { ...current, confirmed };
            if (confirmed.length === 2) {
              const committed = operations.physicalInventory?.[worldId];
              if (!committed) physicalError('UNAVAILABLE', 'Cả hai hãy mở ba lô trước khi trao đổi.');
              let draft: PhysicalInventory;
              try { draft = settlePhysicalTrade(state, next, catalog); }
              catch (error) {
                ctx.tradeSessions.set(worldId, { ...current, confirmed: [], revision: current.revision + 1 });
                throw error;
              }
              current = { ...next, phase: 'settled', expiresAt: now + 10000 };
              const receipts = Object.fromEntries(Object.entries(draft.tradeReceipts ?? {}).slice(-63));
              operations.physicalInventory![worldId] = { ...draft, tradeReceipts: { ...receipts, [current.id]: current } };
              try { ctx.saveDb(); }
              catch (error) { operations.physicalInventory![worldId] = committed; throw error; }
              ctx.broadcastInventory(worldId);
            } else current = next;
          }
        }
      }
    }
    ctx.tradeSessions.set(worldId, current);
    ok(current);
  } catch (error) {
    if (error instanceof z.ZodError) send(400, { ok: false, code: 'VALIDATION_ERROR', message: 'Đề nghị trao đổi không hợp lệ.' });
    else if (error instanceof PhysicalInventoryError) send(error.code === 'FORBIDDEN' ? 403 : 409,
      { ok: false, code: error.code, message: error.message });
    else throw error;
  }
  return true;
}
