import { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosError, CancelTokenSource } from 'axios';
import { Ticker, ChartData, Interval } from '@/types';

const BINANCE_FUTURES_URL = 'https://fapi.binance.com';
const BINANCE_SPOT_URL = 'https://api.binance.com';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Cache configuration
const CACHE_DURATION = 5000; // 5 seconds for tickers
const klinesCache = new Map<string, { data: ChartData[]; timestamp: number }>();
const tickersCache = new Map<string, { data: Ticker[]; timestamp: number }>();

interface UseTickersResult {
  tickers: Ticker[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

interface UseKlinesResult {
  data: ChartData[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Retry helper with exponential backoff
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  try {
    return await fetchFn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    const delay = RETRY_DELAY * (MAX_RETRIES - retries + 1);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fetchWithRetry(fetchFn, retries - 1);
  }
}

// Check if cache is valid
function isCacheValid(timestamp: number, duration: number): boolean {
  return Date.now() - timestamp < duration;
}

export function useTickers(exchange: string = 'BINANCE', isFutures: boolean = true): UseTickersResult {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);
  const refreshRef = useRef<() => void>(() => {});

  const fetchTickers = useCallback(async () => {
    const cacheKey = `${exchange}-${isFutures}`;
    const cached = tickersCache.get(cacheKey);
    
    if (cached && isCacheValid(cached.timestamp, CACHE_DURATION)) {
      setTickers(cached.data);
      setLastUpdated(new Date(cached.timestamp));
      setLoading(false);
      return;
    }

    try {
      // Cancel previous request
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component re-rendered or unmounted');
      }

      cancelTokenRef.current = axios.CancelToken.source();

      const url = isFutures
        ? `${BINANCE_FUTURES_URL}/fapi/v1/ticker/24hr`
        : `${BINANCE_SPOT_URL}/api/v3/ticker/24hr`;

      const response = await fetchWithRetry(() =>
        axios.get(url, {
          cancelToken: cancelTokenRef.current!.token,
          timeout: REQUEST_TIMEOUT,
        })
      );

      const data = response.data;
      const formatted: Ticker[] = Array.isArray(data)
        ? data
            .filter((t: any) => t.symbol?.endsWith('USDT'))
            .map((t: any) => ({
              symbol: t.symbol,
              lastPrice: t.lastPrice || '0',
              priceChangePercent: parseFloat(t.priceChangePercent) || 0,
              highPrice: t.highPrice || '0',
              lowPrice: t.lowPrice || '0',
              quoteVolume: parseFloat(t.quoteVolume) || 0,
              openInterest: isFutures ? parseFloat(t.openInterest) || 0 : undefined,
            }))
            .sort((a: Ticker, b: Ticker) => b.quoteVolume - a.quoteVolume) // Sort by volume
        : [];

      setTickers(formatted);
      setError(null);
      setLastUpdated(new Date());
      
      // Update cache
      tickersCache.set(cacheKey, {
        data: formatted,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      if (axios.isCancel(err)) {
        return; // Request was cancelled, no need to update state
      }
      const errorMsg = err instanceof AxiosError 
        ? `API Error: ${err.response?.status || 'Network'}` 
        : 'Failed to fetch tickers';
      setError(errorMsg);
      console.error('Failed to fetch tickers:', err);
    } finally {
      setLoading(false);
    }
  }, [exchange, isFutures]);

  // Initial fetch and interval
  useEffect(() => {
    fetchTickers();
    const interval = setInterval(fetchTickers, 10000); // Refresh every 10s
    return () => {
      clearInterval(interval);
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, [fetchTickers]);

  refreshRef.current = fetchTickers;

  return {
    tickers,
    loading,
    error,
    refresh: fetchTickers,
    lastUpdated,
  };
}

export function useKlines(
  symbol: string,
  interval: Interval = '1h',
  limit: number = 200,
  isFutures: boolean = true
): UseKlinesResult {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  const fetchKlines = useCallback(async () => {
    if (!symbol) {
      setLoading(false);
      return;
    }

    const cacheKey = `${symbol}-${interval}-${limit}-${isFutures}`;
    const cached = klinesCache.get(cacheKey);
    
    if (cached && isCacheValid(cached.timestamp, CACHE_DURATION * 2)) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    try {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component re-rendered or unmounted');
      }

      cancelTokenRef.current = axios.CancelToken.source();

      const baseUrl = isFutures ? BINANCE_FUTURES_URL : BINANCE_SPOT_URL;
      const endpoint = isFutures ? '/fapi/v1/klines' : '/api/v3/klines';
      const url = `${baseUrl}${endpoint}`;

      const response = await fetchWithRetry(() =>
        axios.get(url, {
          params: { symbol, interval, limit },
          cancelToken: cancelTokenRef.current!.token,
          timeout: REQUEST_TIMEOUT,
        })
      );

      const formatted: ChartData[] = response.data.map((k: any) => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));

      setData(formatted);
      setError(null);

      // Update cache
      klinesCache.set(cacheKey, {
        data: formatted,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      if (axios.isCancel(err)) {
        return;
      }
      const errorMsg = err instanceof AxiosError
        ? `API Error: ${err.response?.status || 'Network'}`
        : 'Failed to fetch klines';
      setError(errorMsg);
      console.error('Failed to fetch klines:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, limit, isFutures]);

  useEffect(() => {
    fetchKlines();
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, [fetchKlines]);

  return {
    data,
    loading,
    error,
    refresh: fetchKlines,
  };
}

export function useOrderbook(symbol: string, limit: number = 100) {
  const [orderbook, setOrderbook] = useState<{ bids: any[]; asks: any[] }>({ bids: [], asks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const fetchOrderbook = async () => {
      try {
        if (cancelTokenRef.current) {
          cancelTokenRef.current.cancel('New request');
        }
        cancelTokenRef.current = axios.CancelToken.source();

        const url = `${BINANCE_FUTURES_URL}/fapi/v1/depth`;
        const response = await axios.get(url, {
          params: { symbol, limit },
          cancelToken: cancelTokenRef.current.token,
          timeout: REQUEST_TIMEOUT,
        });

        setOrderbook({
          bids: (response.data.bids || []).map((b: any) => ({
            price: parseFloat(b[0]),
            amount: parseFloat(b[1]),
          })),
          asks: (response.data.asks || []).map((a: any) => ({
            price: parseFloat(a[0]),
            amount: parseFloat(a[1]),
          })),
        });
        setError(null);
        setLoading(false);
      } catch (err: any) {
        if (!axios.isCancel(err)) {
          setError('Failed to fetch orderbook');
          console.error('Failed to fetch orderbook:', err);
        }
        setLoading(false);
      }
    };

    fetchOrderbook();
    const interval = setInterval(fetchOrderbook, 2000);
    return () => {
      clearInterval(interval);
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, [symbol, limit]);

  return { ...orderbook, loading, error };
}

export function useOpenInterest(symbol: string) {
  const [openInterest, setOpenInterest] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const fetchOI = async () => {
      try {
        if (cancelTokenRef.current) {
          cancelTokenRef.current.cancel('New request');
        }
        cancelTokenRef.current = axios.CancelToken.source();

        const url = `${BINANCE_FUTURES_URL}/fapi/v1/openInterest`;
        const response = await axios.get(url, {
          params: { symbol },
          cancelToken: cancelTokenRef.current.token,
          timeout: REQUEST_TIMEOUT,
        });

        setOpenInterest(parseFloat(response.data.openInterest) || 0);
        setLoading(false);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Failed to fetch OI:', err);
        }
        setLoading(false);
      }
    };

    fetchOI();
    const interval = setInterval(fetchOI, 5000);
    return () => {
      clearInterval(interval);
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, [symbol]);

  return { openInterest, loading };
}

export function useFundingRate(symbol: string) {
  const [fundingRate, setFundingRate] = useState<number>(0);
  const [nextFundingTime, setNextFundingTime] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const fetchFunding = async () => {
      try {
        if (cancelTokenRef.current) {
          cancelTokenRef.current.cancel('New request');
        }
        cancelTokenRef.current = axios.CancelToken.source();

        const url = `${BINANCE_FUTURES_URL}/fapi/v1/premiumIndex`;
        const response = await axios.get(url, {
          params: { symbol },
          cancelToken: cancelTokenRef.current.token,
          timeout: REQUEST_TIMEOUT,
        });

        // Return in percentage (0.01 = 0.01%)
        setFundingRate(parseFloat(response.data.lastFundingRate || 0) * 100);
        setNextFundingTime(response.data.nextFundingTime || 0);
        setLoading(false);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Failed to fetch funding rate:', err);
        }
        setLoading(false);
      }
    };

    fetchFunding();
    const interval = setInterval(fetchFunding, 60000);
    return () => {
      clearInterval(interval);
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, [symbol]);

  return { fundingRate, nextFundingTime, loading };
}

// New: Use ticker for a single symbol with auto-refresh
export function useTicker(symbol: string, isFutures: boolean = true) {
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelTokenRef = useRef<CancelTokenSource | null>(null);

  const fetchTicker = useCallback(async () => {
    if (!symbol) return;

    try {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('New request');
      }
      cancelTokenRef.current = axios.CancelToken.source();

      const url = isFutures
        ? `${BINANCE_FUTURES_URL}/fapi/v1/ticker/24hr`
        : `${BINANCE_SPOT_URL}/api/v3/ticker/24hr`;

      const response = await axios.get(url, {
        params: { symbol },
        cancelToken: cancelTokenRef.current.token,
        timeout: REQUEST_TIMEOUT,
      });

      const data = response.data;
      const formatted: Ticker = {
        symbol: data.symbol,
        lastPrice: data.lastPrice || '0',
        priceChangePercent: parseFloat(data.priceChangePercent) || 0,
        highPrice: data.highPrice || '0',
        lowPrice: data.lowPrice || '0',
        quoteVolume: parseFloat(data.quoteVolume) || 0,
        openInterest: isFutures ? parseFloat(data.openInterest) || 0 : undefined,
      };

      setTicker(formatted);
      setError(null);
      setLoading(false);
    } catch (err: any) {
      if (!axios.isCancel(err)) {
        setError('Failed to fetch ticker');
        console.error('Failed to fetch ticker:', err);
      }
      setLoading(false);
    }
  }, [symbol, isFutures]);

  useEffect(() => {
    fetchTicker();
    const interval = setInterval(fetchTicker, 5000); // Refresh every 5s
    return () => {
      clearInterval(interval);
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
    };
  }, [fetchTicker]);

  return { ticker, loading, error, refresh: fetchTicker };
}
