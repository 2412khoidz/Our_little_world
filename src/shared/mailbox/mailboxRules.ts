import {
  MAILBOX_MAX_BODY_LEN,
  MAILBOX_MAX_GIFT_QTY,
  MAILBOX_MAX_SUBJECT_LEN,
  type MailboxGiftSourceScope,
  type MailboxItem,
} from './mailboxTypes';

export function sanitizePlainText(raw: string): string {
  // Strip NUL bytes while preserving exact characters as plain text (never parsed as HTML)
  return raw.split('\0').join('').trim();
}

export function validateLetterInput(
  rawSubject: string,
  rawBody: string,
): { ok: true; subject: string; body: string } | { ok: false; message: string } {
  const subject = sanitizePlainText(rawSubject);
  const body = sanitizePlainText(rawBody);

  if (subject.length > MAILBOX_MAX_SUBJECT_LEN) {
    return { ok: false, message: `Tiêu đề tối đa ${MAILBOX_MAX_SUBJECT_LEN} ký tự.` };
  }
  if (!body) {
    return { ok: false, message: 'Hãy viết ít nhất một lời nhắn ngắn nhé.' };
  }
  if (body.length > MAILBOX_MAX_BODY_LEN) {
    return { ok: false, message: `Nội dung thư tối đa ${MAILBOX_MAX_BODY_LEN} ký tự.` };
  }

  return { ok: true, subject: subject || 'Thư nhỏ gửi bạn', body };
}

export function validateGiftAttachment(
  giftItemSku: string | null,
  giftQty: number,
  sourceScope: MailboxGiftSourceScope,
): { ok: true; giftItemSku: string | null; giftQty: number } | { ok: false; message: string } {
  if (!giftItemSku) {
    return { ok: true, giftItemSku: null, giftQty: 0 };
  }
  if (sourceScope !== 'shared' && sourceScope !== 'personal') {
    return { ok: false, message: 'Ngăn chứa quà không hợp lệ.' };
  }
  if (!Number.isInteger(giftQty) || giftQty < 1 || giftQty > MAILBOX_MAX_GIFT_QTY) {
    return {
      ok: false,
      message: `Số lượng quà gửi kèm phải từ 1 đến ${MAILBOX_MAX_GIFT_QTY}.`,
    };
  }
  return { ok: true, giftItemSku, giftQty };
}

/**
 * Redacts unopened surprise letter body & gift details when returned to the recipient,
 * so the surprise stays genuinely hidden even in network payloads until opened.
 */
export function redactMailboxItemForViewer(item: MailboxItem, viewerUserId: string): MailboxItem {
  if (item.recipientId === viewerUserId && item.openedAt === null && item.isSurprise) {
    return {
      ...item,
      body: null,
      giftItemSku: null,
      giftQty: 0,
      bodyRedacted: true,
      giftRedacted: item.kind === 'gift',
    };
  }
  return {
    ...item,
    bodyRedacted: false,
    giftRedacted: false,
  };
}
