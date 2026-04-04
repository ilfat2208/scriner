export interface Ticker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: number;
  highPrice: string;
  lowPrice: string;
  quoteVolume: number;
  openInterest?: number;
  fundingRate?: number;
  bidVol?: number;
  askVol?: number;
  spread?: number;
}

export interface Exchange {
  id: string;
  name: string;
  emoji: string;
}

export interface ChartData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BadgeConfig {
  value: string | number;
  color: 'green' | 'red' | 'yellow' | 'gray';
  label: string;
}

export type Interval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d';
export type GridSize = 4 | 9 | 16 | 25;
export type PriceRange = 'priceRange1h' | 'priceRange4h' | 'priceRange24h';
export type Mode = 'FUTURES' | 'SPOT';

export const EXCHANGES: Exchange[] = [
  { id: 'BINANCE', name: 'Binance', emoji: '🟡' },
  { id: 'BYBIT', name: 'ByBit', emoji: '🔵' },
  { id: 'OKX', name: 'OKX', emoji: '⚫' },
  { id: 'GATEIO', name: 'Gate', emoji: '🟢' },
  { id: 'MEXC', name: 'MEXC', emoji: '🔷' },
  { id: 'BITGET', name: 'BitGet', emoji: '🔶' },
  { id: 'KUCOIN', name: 'KuCoin', emoji: '🟣' },
  { id: 'BINGX', name: 'BingX', emoji: '🔵' },
  { id: 'HTX', name: 'HTX', emoji: '🟠' },
];

export const INTERVALS: { value: Interval; label: string }[] = [
  { value: '1m', label: '1м' },
  { value: '3m', label: '3м' },
  { value: '5m', label: '5м' },
  { value: '15m', label: '15м' },
  { value: '30m', label: '30м' },
  { value: '1h', label: '1ч' },
  { value: '2h', label: '2ч' },
  { value: '4h', label: '4ч' },
  { value: '6h', label: '6ч' },
  { value: '8h', label: '8ч' },
  { value: '12h', label: '12ч' },
  { value: '1d', label: '1д' },
];

export const GRID_SIZES: { value: string; label: string }[] = [
  { value: '4', label: '4 (2×2)' },
  { value: '9', label: '9 (3×3)' },
  { value: '16', label: '16 (4×4)' },
  { value: '25', label: '25 (5×5)' },
];

export const PRICE_RANGES: { value: PriceRange; label: string }[] = [
  { value: 'priceRange1h', label: 'Рендж за 1ч' },
  { value: 'priceRange4h', label: 'Рендж за 4ч' },
  { value: 'priceRange24h', label: 'Рендж за 24ч' },
];
