import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Ticker, ChartData, Interval } from '@/types';

const BINANCE_FUTURES_URL = 'https://fapi.binance.com';
const BINANCE_SPOT_URL = 'https://api.binance.com';

export function useTickers(exchange: string = 'BINANCE', isFutures: boolean = true) {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickers = async () => {
      try {
        setLoading(true);
        const url = isFutures ? `${BINANCE_FUTURES_URL}/fapi/v1/ticker/24hr` : `${BINANCE_SPOT_URL}/api/v3/ticker/24hr`;
        const response = await axios.get(url);

        const data = response.data;
        const formatted: Ticker[] = Array.isArray(data)
          ? data
              .filter((t: any) => t.symbol?.endsWith('USDT'))
              .map((t: any) => ({
                symbol: t.symbol,
                lastPrice: t.lastPrice || t.lastPrice,
                priceChangePercent: parseFloat(t.priceChangePercent) || 0,
                highPrice: t.highPrice || t.highPrice,
                lowPrice: t.lowPrice || t.lowPrice,
                quoteVolume: parseFloat(t.quoteVolume) || 0,
                openInterest: isFutures ? parseFloat(t.openInterest) || 0 : undefined,
              }))
          : [];

        setTickers(formatted);
        setError(null);
      } catch (err) {
        setError('Failed to fetch tickers');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [exchange, isFutures]);

  return { tickers, loading, error };
}

export function useKlines(symbol: string, interval: Interval = '1h', limit: number = 200, isFutures: boolean = true) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const fetchKlines = async () => {
      try {
        setLoading(true);
        setError(null);
        const baseUrl = isFutures ? BINANCE_FUTURES_URL : BINANCE_SPOT_URL;
        const endpoint = isFutures ? '/fapi/v1/klines' : '/api/v3/klines';
        const url = `${baseUrl}${endpoint}`;
        const response = await axios.get(url, {
          params: { symbol, interval, limit },
        });

        const formatted: ChartData[] = response.data.map((k: any) => ({
          timestamp: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));

        setData(formatted);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch klines';
        setError(errorMsg);
        console.error('Failed to fetch klines:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchKlines();
  }, [symbol, interval, limit, isFutures]);

  return { data, loading, error };
}

export function useOrderbook(symbol: string, limit: number = 100) {
  const [orderbook, setOrderbook] = useState<{ bids: any[]; asks: any[] }>({ bids: [], asks: [] });

  useEffect(() => {
    if (!symbol) return;

    const fetchOrderbook = async () => {
      try {
        const url = `${BINANCE_FUTURES_URL}/fapi/v1/depth`;
        const response = await axios.get(url, {
          params: { symbol, limit },
        });
        setOrderbook({
          bids: response.data.bids || [],
          asks: response.data.asks || [],
        });
      } catch (err) {
        console.error('Failed to fetch orderbook:', err);
      }
    };

    fetchOrderbook();
    const interval = setInterval(fetchOrderbook, 2000);
    return () => clearInterval(interval);
  }, [symbol]);

  return orderbook;
}

export function useOpenInterest(symbol: string) {
  const [openInterest, setOpenInterest] = useState<number>(0);

  useEffect(() => {
    if (!symbol) return;

    const fetchOI = async () => {
      try {
        const url = `${BINANCE_FUTURES_URL}/fapi/v1/openInterest`;
        const response = await axios.get(url, { params: { symbol } });
        setOpenInterest(parseFloat(response.data.openInterest) || 0);
      } catch (err) {
        console.error('Failed to fetch OI:', err);
      }
    };

    fetchOI();
    const interval = setInterval(fetchOI, 5000);
    return () => clearInterval(interval);
  }, [symbol]);

  return openInterest;
}

export function useFundingRate(symbol: string) {
  const [fundingRate, setFundingRate] = useState<number>(0);

  useEffect(() => {
    if (!symbol) return;

    const fetchFunding = async () => {
      try {
        const url = `${BINANCE_FUTURES_URL}/fapi/v1/fundingRate`;
        const response = await axios.get(url, { params: { symbol, limit: 1 } });
        if (response.data.length > 0) {
          // Возвращаем в процентах (0.01 = 0.01%)
          setFundingRate(parseFloat(response.data[0].fundingRate) * 100);
        }
      } catch (err) {
        console.error('Failed to fetch funding rate:', err);
      }
    };

    fetchFunding();
    const interval = setInterval(fetchFunding, 60000);
    return () => clearInterval(interval);
  }, [symbol]);

  return fundingRate;
}
