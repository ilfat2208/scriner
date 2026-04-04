export type SignalType = 'WHALE' | 'MOMENTUM' | 'PRICE_SPIKE';
export type SignalSide = 'BUY' | 'SELL';
export type Exchange = 'BINANCE' | 'BYBIT' | 'UNISWAP' | 'PANCAKESWAP';

export interface Signal {
  id: string;
  type: SignalType;
  exchange: Exchange;
  pair: string;
  side: SignalSide;
  volumeUsd: number;
  amount: number;
  price: number;
  timestamp: string;
  txHash?: string;
  isRead: boolean;
}

export interface SignalFilters {
  type?: SignalType;
  exchange?: Exchange;
  side?: SignalSide;
  minVolume?: number;
  search?: string;
}

export interface SignalStats {
  totalSignals: number;
  activeTokens: number;
  profit24h: number;
  whaleCount: number;
  momentumCount: number;
}
