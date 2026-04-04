/**
 * WebSocket хук для получения сигналов в реальном времени
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSignalStore } from '@/stores/useSignalStore';
import { Signal } from '@/types/signal';

interface WebSocketMessage {
  event: 'new_signal' | 'error';
  data?: Signal;
  message?: string;
  code?: string;
}

interface UseWebSocketOptions {
  url?: string;
  enabled?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

const DEFAULT_WS_URL = 'ws://localhost:8000/api/signals/ws';
const RECONNECT_INTERVAL = 3000; // 3 секунды
const MAX_RECONNECT_ATTEMPTS = 10;

export function useSignalWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = DEFAULT_WS_URL,
    enabled = true,
    reconnectInterval = RECONNECT_INTERVAL,
    maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const { addSignal } = useSignalStore();

  // Обработка полученного сообщения
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      setLastMessage(message);

      if (message.event === 'new_signal' && message.data) {
        // Добавление сигнала в store
        addSignal(message.data);

        // Browser notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const signal = message.data;
          new Notification(`🐋 ${signal.type} - ${signal.pair}`, {
            body: `${signal.side} $${signal.volumeUsd.toLocaleString()}`,
            icon: '/icon.png',
            tag: signal.id,
          });
        }
      } else if (message.event === 'error') {
        console.error('WebSocket error:', message.message);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [addSignal]);

  // Обработка открытия соединения
  const handleOpen = useCallback(() => {
    console.log('✅ WebSocket connected');
    setIsConnected(true);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Обработка закрытия соединения
  const handleClose = useCallback(() => {
    console.log('🔌 WebSocket disconnected');
    setIsConnected(false);

    // Попытка переподключения
    if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current += 1;
      console.log(`🔄 Reconnecting (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval);
    } else if (enabled) {
      console.error('❌ Max reconnection attempts reached');
    }
  }, [enabled, reconnectInterval, maxReconnectAttempts]);

  // Обработка ошибок
  const handleError = useCallback((error: Event) => {
    console.error('❌ WebSocket error:', error);
    setIsConnected(false);
  }, []);

  // Подключение к WebSocket
  const connect = useCallback(() => {
    if (!enabled) return;

    // Закрытие существующего соединения
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = handleOpen;
      ws.onmessage = handleMessage;
      ws.onclose = handleClose;
      ws.onerror = handleError;

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [url, enabled, handleOpen, handleMessage, handleClose, handleError]);

  // Отправка сообщения (например, heartbeat)
  const sendMessage = useCallback((message: string | object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(data);
    }
  }, []);

  // Отключение
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Инициализация при монтировании
  useEffect(() => {
    if (enabled) {
      connect();
    }

    // Heartbeat каждые 30 секунд
    const heartbeatInterval = setInterval(() => {
      if (isConnected) {
        sendMessage('ping');
      }
    }, 30000);

    return () => {
      disconnect();
      clearInterval(heartbeatInterval);
    };
  }, [connect, disconnect, sendMessage, isConnected, enabled]);

  // Запрос разрешения на уведомления
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}
