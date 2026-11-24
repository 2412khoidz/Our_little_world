export const MAILBOX_MAX_SUBJECT_LEN = 60;
export const MAILBOX_MAX_BODY_LEN = 500;
export const MAILBOX_MAX_GIFT_QTY = 10;

export type MailboxItemKind = 'letter' | 'gift';
export type MailboxGiftSourceScope = 'shared' | 'personal';

export interface MailboxItem {
  id: string;
  worldId: string;
  senderId: string;
  recipientId: string;
  kind: MailboxItemKind;
  subject: string;
  body: string | null;
  giftItemSku: string | null;
  giftQty: number;
  isSurprise: boolean;
  openedAt: string | null;
  createdAt: string;
  bodyRedacted: boolean;
  giftRedacted: boolean;
}

export interface MailboxSnapshot {
  worldId: string;
  items: MailboxItem[];
  unreadCount: number;
  serverNowMs: number;
}

export interface SendMailboxParams {
  worldId: string;
  recipientId: string;
  subject: string;
  body: string;
  giftItemSku: string | null;
  giftQty: number;
  sourceScope: MailboxGiftSourceScope;
  isSurprise: boolean;
  idempotencyKey: string;
}

export interface OpenMailboxParams {
  worldId: string;
  letterId: string;
  idempotencyKey: string;
}
