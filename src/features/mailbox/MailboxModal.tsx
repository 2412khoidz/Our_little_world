import { useMemo, useState } from 'react';
import { Gift, Inbox, Mail, Send, Sparkles, X } from 'lucide-react';
import type { InventorySnapshot } from '../../shared/inventory/inventoryTypes';
import {
  MAILBOX_MAX_BODY_LEN,
  MAILBOX_MAX_SUBJECT_LEN,
  type MailboxGiftSourceScope,
  type MailboxSnapshot,
} from '../../shared/mailbox/mailboxTypes';
import { validateGiftAttachment, validateLetterInput } from '../../shared/mailbox/mailboxRules';
import type { WorldMember } from '../../shared/types';

interface MailboxModalProps {
  snapshot: MailboxSnapshot | null;
  inventory: InventorySnapshot | null;
  localUserId: string;
  members: WorldMember[];
  busy: boolean;
  onSend: (params: {
    recipientId: string;
    subject: string;
    body: string;
    giftItemSku: string | null;
    giftQty: number;
    sourceScope: MailboxGiftSourceScope;
    isSurprise: boolean;
  }) => Promise<boolean>;
  onOpenItem: (letterId: string) => Promise<void>;
  onClose: () => void;
}

type MailboxTab = 'inbox' | 'sent' | 'compose';

export function MailboxModal({
  snapshot,
  inventory,
  localUserId,
  members,
  busy,
  onSend,
  onOpenItem,
  onClose,
}: MailboxModalProps) {
  const [tab, setTab] = useState<MailboxTab>('inbox');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedAttachmentKey, setSelectedAttachmentKey] = useState('');
  const [giftQty, setGiftQty] = useState(1);
  const [isSurprise, setIsSurprise] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const partner = useMemo(
    () => members.find((m) => m.userId !== localUserId) ?? null,
    [members, localUserId],
  );
  const memberNames = useMemo(
    () => new Map(members.map((m) => [m.userId, m.nickname])),
    [members],
  );
  const catalogBySku = useMemo(
    () => new Map((inventory?.catalog ?? []).map((c) => [c.sku, c])),
    [inventory],
  );

  const availableGiftStacks = useMemo(() => {
    return (inventory?.items ?? [])
      .filter((item) => item.qty > 0)
      .map((item) => {
        const meta = catalogBySku.get(item.itemSku);
        const sourceScope: MailboxGiftSourceScope = item.ownerScope === 'shared' ? 'shared' : 'personal';
        return {
          key: `${sourceScope}:${item.itemSku}`,
          sourceScope,
          sku: item.itemSku,
          qty: item.qty,
          label: `${meta?.nameVi ?? item.itemSku} (${sourceScope === 'shared' ? 'Túi chung' : 'Ngăn riêng'}, còn ${item.qty})`,
        };
      });
  }, [catalogBySku, inventory]);

  const inboxItems = useMemo(
    () => (snapshot?.items ?? []).filter((item) => item.recipientId === localUserId),
    [localUserId, snapshot],
  );
  const sentItems = useMemo(
    () => (snapshot?.items ?? []).filter((item) => item.senderId === localUserId),
    [localUserId, snapshot],
  );

  async function handleSubmit() {
    if (!partner) {
      setFormError('Cần ghép đôi thành công với người thương trước khi gửi thư nhé.');
      return;
    }
    const textCheck = validateLetterInput(subject, body);
    if (!textCheck.ok) {
      setFormError(textCheck.message);
      return;
    }

    let sourceScope: MailboxGiftSourceScope = 'shared';
    let giftItemSku: string | null = null;
    if (selectedAttachmentKey) {
      const [scopePart, ...skuParts] = selectedAttachmentKey.split(':');
      sourceScope = scopePart === 'personal' ? 'personal' : 'shared';
      giftItemSku = skuParts.join(':') || null;
    }

    const giftCheck = validateGiftAttachment(giftItemSku, giftItemSku ? giftQty : 0, sourceScope);
    if (!giftCheck.ok) {
      setFormError(giftCheck.message);
      return;
    }

    setFormError(null);
    const ok = await onSend({
      recipientId: partner.userId,
      subject: textCheck.subject,
      body: textCheck.body,
      giftItemSku: giftCheck.giftItemSku,
      giftQty: giftCheck.giftQty,
      sourceScope,
      isSurprise,
    });
    if (ok) {
      setSubject('');
      setBody('');
      setSelectedAttachmentKey('');
      setGiftQty(1);
      setTab('sent');
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" data-testid="mailbox-modal">
      <div className="modal-panel" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={18} /> Hộp thư &amp; Quà bất ngờ
          </h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn--sm ${tab === 'inbox' ? 'btn--primary' : 'btn--secondary'}`}
            data-testid="mailbox-tab-inbox"
            onClick={() => setTab('inbox')}
          >
            <Inbox size={15} /> Hộp thư đến ({snapshot?.unreadCount ?? 0})
          </button>
          <button
            type="button"
            className={`btn btn--sm ${tab === 'sent' ? 'btn--primary' : 'btn--secondary'}`}
            data-testid="mailbox-tab-sent"
            onClick={() => setTab('sent')}
          >
            <Send size={15} /> Đã gửi ({sentItems.length})
          </button>
          <button
            type="button"
            className={`btn btn--sm ${tab === 'compose' ? 'btn--primary' : 'btn--secondary'}`}
            data-testid="mailbox-tab-compose"
            onClick={() => setTab('compose')}
          >
            <Gift size={15} /> Viết thư / Gửi quà
          </button>
        </div>

        {tab === 'inbox' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
            {inboxItems.length === 0 ? (
              <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', padding: '12px 0' }}>
                Hộp thư đến chưa có thư nào. Hãy rủ người thương ghé hòm thư đỏ ngoài hiên nhé!
              </div>
            ) : (
              inboxItems.map((item) => {
                const lockedSurprise = item.openedAt === null && item.isSurprise;
                const giftMeta = item.giftItemSku ? catalogBySku.get(item.giftItemSku) : null;
                return (
                  <div
                    key={item.id}
                    data-testid={`mailbox-item-${item.id}`}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: item.openedAt ? 'var(--surface)' : 'var(--surface-warm)',
                      border: `1px solid ${item.openedAt ? 'var(--border)' : 'var(--border-honey)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <strong style={{ fontSize: 14 }}>
                        {item.kind === 'gift' ? '🎁 ' : '💌 '}
                        {item.subject}
                      </strong>
                      <span className="pill" style={{ fontSize: 11 }}>
                        Từ {memberNames.get(item.senderId) ?? 'Người thương'}
                      </span>
                    </div>

                    {lockedSurprise ? (
                      <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                        ✨ Đây là hộp thư/quà bí mật chưa mở — nội dung được giữ kín cho đến khi bạn mở ra!
                      </div>
                    ) : (
                      <>
                        <p
                          data-testid={`mailbox-body-${item.id}`}
                          style={{
                            margin: 0,
                            fontSize: 13.5,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: 'var(--ink)',
                          }}
                        >
                          {item.body ?? ''}
                        </p>
                        {item.giftItemSku && item.giftQty > 0 && (
                          <div className="pill" style={{ alignSelf: 'flex-start', fontSize: 12 }}>
                            🎁 Đính kèm: {giftMeta?.nameVi ?? item.giftItemSku} ×{item.giftQty}
                          </div>
                        )}
                      </>
                    )}

                    {item.openedAt === null ? (
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        data-testid={`mailbox-open-${item.id}`}
                        disabled={busy}
                        onClick={() => void onOpenItem(item.id)}
                      >
                        <Sparkles size={14} /> {item.kind === 'gift' ? 'Mở quà & nhận vào ngăn riêng' : 'Mở đọc thư'}
                      </button>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                        Đã mở lúc {new Date(item.openedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'sent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
            {sentItems.length === 0 ? (
              <div style={{ fontSize: 13.5, color: 'var(--ink-muted)', padding: '12px 0' }}>
                Bạn chưa gửi lá thư hoặc món quà nào.
              </div>
            ) : (
              sentItems.map((item) => {
                const giftMeta = item.giftItemSku ? catalogBySku.get(item.giftItemSku) : null;
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 14 }}>{item.subject}</strong>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                        {item.openedAt ? 'Người thương đã mở' : 'Đang chờ mở'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {item.body ?? ''}
                    </p>
                    {item.giftItemSku && item.giftQty > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        Quà kèm: {giftMeta?.nameVi ?? item.giftItemSku} ×{item.giftQty}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'compose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <span>Tiêu đề (tối đa {MAILBOX_MAX_SUBJECT_LEN} ký tự)</span>
              <input
                type="text"
                className="input"
                data-testid="mailbox-input-subject"
                maxLength={MAILBOX_MAX_SUBJECT_LEN}
                placeholder="Ví dụ: Gửi bạn buổi sáng ấm áp"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <span>Lời nhắn ({body.trim().length}/{MAILBOX_MAX_BODY_LEN})</span>
              <textarea
                className="input"
                data-testid="mailbox-input-body"
                rows={4}
                maxLength={MAILBOX_MAX_BODY_LEN}
                placeholder="Viết điều bạn muốn nhắn cho người thương..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <span>Gửi kèm quà từ túi (không bắt buộc)</span>
              <select
                className="input"
                data-testid="mailbox-select-gift"
                value={selectedAttachmentKey}
                onChange={(e) => setSelectedAttachmentKey(e.target.value)}
              >
                <option value="">Chỉ gửi thư tay (không đính kèm quà)</option>
                {availableGiftStacks.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>

            {selectedAttachmentKey && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span>Số lượng:</span>
                <input
                  type="number"
                  className="input"
                  data-testid="mailbox-input-qty"
                  min={1}
                  max={availableGiftStacks.find((g) => g.key === selectedAttachmentKey)?.qty ?? 1}
                  value={giftQty}
                  onChange={(e) => setGiftQty(Math.max(1, Number(e.target.value) || 1))}
                  style={{ width: 88 }}
                />
              </label>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                data-testid="mailbox-checkbox-surprise"
                checked={isSurprise}
                onChange={(e) => setIsSurprise(e.target.checked)}
              />
              <span>Gói quà bất ngờ (giấu kín nội dung tới khi người thương tự tay mở)</span>
            </label>

            {formError && (
              <div style={{ fontSize: 12.5, color: '#b42318', fontWeight: 600 }}>{formError}</div>
            )}

            <button
              type="button"
              className="btn btn--primary"
              data-testid="mailbox-submit-send"
              disabled={busy || !partner}
              onClick={() => void handleSubmit()}
            >
              <Send size={16} /> {busy ? 'Đang gửi...' : `Gửi tới ${partner?.nickname ?? 'người thương'}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
