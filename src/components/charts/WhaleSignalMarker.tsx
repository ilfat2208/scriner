'use client';

import { useEffect, useState } from 'react';
import { Signal } from '@/types/signal';

interface WhaleSignalMarkerProps {
  signals: Signal[];
}

export function WhaleSignalMarker({ signals }: WhaleSignalMarkerProps) {
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);

  useEffect(() => {
    // Показываем сигналы за последние 5 минут
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recent = signals.filter(
      (s) => new Date(s.timestamp).getTime() > fiveMinutesAgo
    );
    setRecentSignals(recent);
  }, [signals]);

  if (recentSignals.length === 0) return null;

  return (
    <div className="absolute top-2 left-2 z-20 flex gap-1 flex-wrap">
      {recentSignals.map((signal) => (
        <div
          key={signal.id}
          className={`
            px-2 py-1 rounded text-xs font-bold animate-pulse
            ${signal.side === 'BUY' 
              ? 'bg-success/90 text-white' 
              : 'bg-danger/90 text-white'}
          `}
        >
          {signal.type === 'WHALE' ? '🐋' : signal.type === 'MOMENTUM' ? '📈' : '⚡'}
          {signal.side} ${signal.volumeUsd >= 100000 ? '$100K+' : '$50K+'}
        </div>
      ))}
    </div>
  );
}
