import { renderHook, waitFor } from '@testing-library/react';
import { useTickers, useKlines } from '../useBinance';

// Моки для axios
jest.mock('axios', () => ({
  get: jest.fn(),
}));

const axios = require('axios');

describe('useBinance hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useTickers', () => {
    it('should fetch tickers successfully', async () => {
      const mockTickers = [
        {
          symbol: 'BTCUSDT',
          lastPrice: '50000.00',
          priceChangePercent: '2.5',
          highPrice: '51000.00',
          lowPrice: '49000.00',
          quoteVolume: '1000000000',
          openInterest: '500000000',
        },
        {
          symbol: 'ETHUSDT',
          lastPrice: '3000.00',
          priceChangePercent: '-1.2',
          highPrice: '3100.00',
          lowPrice: '2900.00',
          quoteVolume: '500000000',
          openInterest: '200000000',
        },
      ];

      axios.get.mockResolvedValueOnce({ data: mockTickers });

      const { result } = renderHook(() => useTickers('BINANCE', true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tickers).toHaveLength(2);
      expect(result.current.tickers[0].symbol).toBe('BTCUSDT');
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useTickers('BINANCE', true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch tickers');
      expect(result.current.tickers).toHaveLength(0);
    });

    it('should filter only USDT pairs', async () => {
      const mockTickers = [
        { symbol: 'BTCUSDT', lastPrice: '50000', priceChangePercent: '1', highPrice: '51000', lowPrice: '49000', quoteVolume: '1000' },
        { symbol: 'ETHBTC', lastPrice: '0.06', priceChangePercent: '0.5', highPrice: '0.061', lowPrice: '0.059', quoteVolume: '500' },
      ];

      axios.get.mockResolvedValueOnce({ data: mockTickers });

      const { result } = renderHook(() => useTickers('BINANCE', true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tickers).toHaveLength(1);
      expect(result.current.tickers[0].symbol).toBe('BTCUSDT');
    });
  });

  describe('useKlines', () => {
    it('should fetch klines for futures', async () => {
      const mockKlines = [
        [1609459200000, '50000.00', '51000.00', '49000.00', '50500.00', '1000.00'],
        [1609462800000, '50500.00', '51500.00', '50000.00', '51000.00', '1200.00'],
      ];

      axios.get.mockResolvedValueOnce({ data: mockKlines });

      const { result } = renderHook(() => useKlines('BTCUSDT', '1h', 100, true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data[0].open).toBe(50000);
      expect(result.current.data[0].close).toBe(50500);
    });

    it('should fetch klines for spot', async () => {
      const mockKlines = [
        [1609459200000, '3000.00', '3100.00', '2900.00', '3050.00', '500.00'],
      ];

      axios.get.mockResolvedValueOnce({ data: mockKlines });

      const { result } = renderHook(() => useKlines('ETHUSDT', '1h', 100, false));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toHaveLength(1);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v3/klines'),
        expect.any(Object)
      );
    });

    it('should handle klines fetch error', async () => {
      axios.get.mockRejectedValueOnce(new Error('Failed to fetch klines'));

      const { result } = renderHook(() => useKlines('INVALID', '1h', 100, true));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toHaveLength(0);
    });

    it('should not fetch if symbol is empty', () => {
      const { result } = renderHook(() => useKlines('', '1h', 100, true));

      expect(result.current.loading).toBe(true);
      expect(axios.get).not.toHaveBeenCalled();
    });
  });
});
