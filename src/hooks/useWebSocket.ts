import { useEffect, useRef, useCallback, useState } from 'react';
import { useSignalStore } from '@/stores/useSignalStore';
import { Signal } from '@/types/signal';

interface WebSocketOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

interface UseWebSocketResult {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (data: any) => void;
  lastMessage: any;
  reconnect: () => void;
  disconnect: () => void;
}

// Binance WebSocket URLs
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const BINANCE_FUTURES_WS_URL = 'wss://fstream.binance.com/ws';

// Generate unique ID for signals
const generateSignalId = () => `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Detect signal type based on trade data
function detectSignalType(price: number, amount: number, volumeUsd: number): 'WHALE' | 'MOMENTUM' | 'PRICE_SPIKE' {
  if (volumeUsd >= 500000) {
    return 'WHALE';
  }
  if (price > 0) {
    return 'MOMENTUM';
  }
  return 'PRICE_SPIKE';
}

export function useWebSocket(options: WebSocketOptions = {}): UseWebSocketResult {
  const {
    url,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    onMessage,
    onError,
    onOpen,
    onClose,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const isManualDisconnectRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<any>(null);

  const addSignal = useSignalStore((state) => state.addSignal);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const wsUrl = url || BINANCE_FUTURES_WS_URL;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectCountRef.current = 0;
        onOpen?.();
        console.log('[WebSocket] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          onMessage?.(data);

          // Process Binance trade data
          if (data.e === 'aggTrade') {
            const price = parseFloat(data.p);
            const amount = parseFloat(data.q);
            const volumeUsd = price * amount;

            // Only process significant trades
            if (volumeUsd >= 100000) {
              const signal: Signal = {
                id: generateSignalId(),
                type: detectSignalType(price, amount, volumeUsd),
                exchange: 'BINANCE',
                pair: data.s.replace('USDT', '/USDT'),
                side: data.m ? 'SELL' : 'BUY',
                volumeUsd,
                amount,
                price,
                timestamp: new Date(data.T).toISOString(),
                isRead: false,
              };

              addSignal(signal);
            }
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = (err) => {
        setError('WebSocket connection error');
        onError?.(err);
        console.error('[WebSocket] Error:', err);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        onClose?.();

        if (!isManualDisconnectRef.current && reconnectCountRef.current < maxReconnectAttempts) {
          reconnectCountRef.current += 1;
          console.log(`[WebSocket] Reconnecting... (${reconnectCountRef.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
      console.error('[WebSocket] Failed to connect:', err);
    }
  }, [url, reconnectInterval, maxReconnectAttempts, onMessage, onError, onOpen, onClose, addSignal]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    console.log('[WebSocket] Disconnected');
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    isManualDisconnectRef.current = false;
    reconnectCountRef.current = 0;
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, could reduce reconnection attempts
      } else {
        // Page is visible, ensure connected
        if (!isConnected && !isConnecting) {
          reconnect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isConnected, isConnecting, reconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    lastMessage,
    reconnect,
    disconnect,
  };
}

// Hook for subscribing to specific symbol trades
export function useTradeWebSocket(symbol: string, isFutures: boolean = true) {
  const streamName = `${symbol.toLowerCase()}@aggTrade`;
  const baseUrl = isFutures ? BINANCE_FUTURES_WS_URL : BINANCE_WS_URL;
  const wsUrl = `${baseUrl}/${streamName}`;

  return useWebSocket({ url: wsUrl });
}

// Hook for subscribing to multiple symbols
export function useMultiStreamWebSocket(symbols: string[], isFutures: boolean = true) {
  const baseUrl = isFutures ? BINANCE_FUTURES_WS_URL : BINANCE_WS_URL;
  const streams = symbols.map((s) => `${s.toLowerCase()}@aggTrade`).join('/');
  const wsUrl = `${baseUrl}/stream?streams=${streams}`;

  return useWebSocket({ url: wsUrl });
}

// Hook for depth data
export function useDepthWebSocket(symbol: string, level: '5' | '10' | '20' = '10') {
  const wsUrl = `${BINANCE_FUTURES_WS_URL}/${symbol.toLowerCase()}@depth${level}@100ms`;

  return useWebSocket({ url: wsUrl });
}

// Hook for ticker data
export function useTickerWebSocket(symbol: string) {
  const wsUrl = `${BINANCE_FUTURES_WS_URL}/${symbol.toLowerCase()}@ticker`;

  return useWebSocket({ url: wsUrl });
}

// Hook for mini ticker (all symbols)
export function useMiniTickerWebSocket() {
  const wsUrl = `${BINANCE_FUTURES_WS_URL}/!miniTicker@arr`;

  return useWebSocket({ url: wsUrl });
}
