import type { PhysicalStack } from './physicalInventory';

export interface TradeLine { index: number; stackId: string; qty: number; }
export interface TradeOfferItem extends TradeLine { stack: PhysicalStack; availableQty: number; }
export interface TradeSession {
  id: string;
  from: string;
  to: string;
  phase: 'invited' | 'offering' | 'settled' | 'cancelled';
  expiresAt: number;
  revision: number;
  offers: Record<string, TradeOfferItem[]>;
  confirmed: string[];
}

export type TradeCommand = { kind: 'invite' } |
  { kind: 'accept' | 'cancel'; tradeId: string } |
  { kind: 'offer'; tradeId: string; revision: number; lines: TradeLine[] } |
  { kind: 'confirm'; tradeId: string; revision: number };
