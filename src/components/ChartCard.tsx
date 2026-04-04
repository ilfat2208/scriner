'use client';

import { useState, useEffect } from 'react';
import { Badge, ActionIcon, Group, Menu } from '@mantine/core';
import {
  IconBookmark,
  IconChartLine,
  IconDots,
  IconCode,
  IconX,
  IconPlus,
  IconTrash,
  IconMaximize,
} from '@tabler/icons-react';
import { Ticker, BadgeConfig, Interval } from '@/types';
import { ChartModal } from './ChartModal';

interface ChartCardProps {
  ticker: Ticker;
  chartData: any[];
  interval: Interval;
  isLoading?: boolean;
  error?: string | null;
  onRemove?: () => void;
}

function getBadgeColor(value: number): 'green' | 'red' | 'yellow' | 'gray' {
  if (value > 2) return 'green';
  if (value < -2) return 'red';
  if (value >= 0.5 || value <= -0.5) return 'yellow';
  return 'gray';
}

export function ChartCard({ ticker, interval, isLoading, error, onRemove }: ChartCardProps) {
  const [badges, setBadges] = useState<BadgeConfig[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [contextMenuOpened, setContextMenuOpened] = useState(false);

  // Calculate badges
  useEffect(() => {
    const newBadges: BadgeConfig[] = [];

    const priceChange = ticker.priceChangePercent;
    if (priceChange !== undefined) {
      newBadges.push({
        value: `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`,
        color: getBadgeColor(priceChange),
        label: '24h',
      });
    }

    const volume = ticker.quoteVolume;
    let volumeBadge = 'gray';
    if (volume >= 100000000) volumeBadge = 'green';
    else if (volume >= 50000000) volumeBadge = 'yellow';
    newBadges.push({
      value: volume >= 1000000 ? `${(volume / 1000000).toFixed(1)}M` : `${(volume / 1000).toFixed(0)}K`,
      color: volumeBadge as any,
      label: 'Vol',
    });

    setBadges(newBadges);
  }, [ticker]);

  // Convert interval for TradingView
  const getTVInterval = (int: Interval) => {
    const map: Record<Interval, string> = {
      '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
      '1h': '60', '2h': '120', '4h': '240', '6h': '360', '8h': '480',
      '12h': '720', '1d': 'D',
    };
    return map[int] || '60';
  };

  const tvInterval = getTVInterval(interval);
  const symbol = ticker.symbol;
  const symbolName = ticker.symbol.replace('USDT', '');

  // Минимальный iframe (только свечи)
  const minimalIframeSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_mini_${ticker.symbol}&symbol=BINANCE:${symbol}&interval=${tvInterval}&hidetopbar=1&hidebottomtoolbar=1&hideideas=1&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&style=1&theme=dark&toolbar_bg=%231a1b1e&hidevolume=1`;

  return (
    <>
      <div className="chart-card" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header with badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: '#25262b',
            borderBottom: '1px solid #2d2d2d',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <Group gap={6}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 128 128"
              style={{ color: '#ffeb3b' }}
            >
              <defs>
                <linearGradient id="lightning-grad">
                  <stop offset="0" stopColor="#ffeb3b" />
                  <stop offset="1" stopColor="#fbc02d" />
                </linearGradient>
              </defs>
              <path
                d="m43.08 120.9 22.27-48.71c.63-1.37-.17-3.08-1.44-3.08l-42.26-.19c-1.53-.01-2.24-2.35-1.09-3.61l55.25-60.78c1.38-1.51 3.42.46 2.57 2.49l-16.71 40.26c-.57 1.37.23 3 1.46 3.01l43.22.35c1.52.01 2.23 2.34 1.1 3.6l-61.81 69.21c-1.41 1.57-3.49-.52-2.56-2.55z"
                fill="url(#lightning-grad)"
              />
            </svg>

            {badges.slice(0, 6).map((badge, index) => (
              <Badge
                key={index}
                size="sm"
                variant="outline"
                color={badge.color}
                style={{
                  borderColor:
                    badge.color === 'green'
                      ? 'rgba(105, 219, 124, 1)'
                      : badge.color === 'red'
                      ? 'rgba(255, 135, 135, 1)'
                      : badge.color === 'yellow'
                      ? 'rgba(255, 254, 0, 1)'
                      : '#a5a5a5',
                  color:
                    badge.color === 'green'
                      ? 'rgba(105, 219, 124, 1)'
                      : badge.color === 'red'
                      ? 'rgba(255, 135, 135, 1)'
                      : badge.color === 'yellow'
                      ? 'rgba(255, 254, 0, 1)'
                      : '#a5a5a5',
                  backgroundColor: 'transparent',
                  fontSize: 11,
                  padding: '0 4px',
                  height: 20,
                }}
              >
                {badge.value}
              </Badge>
            ))}
          </Group>

          <Group gap={2}>
            <ActionIcon variant="subtle" size="sm" color="gray">
              <IconBookmark size={14} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              size="sm"
              color="gray"
              onClick={() => setModalOpened(true)}
              title="Открыть полный график"
            >
              <IconMaximize size={14} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="sm" color="gray">
              <IconDots size={14} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="sm" color="gray">
              <IconCode size={14} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="sm" color="gray" onClick={onRemove}>
              <IconX size={14} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="sm" color="gray">
              <IconPlus size={14} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="sm" color="gray">
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <circle
                cx="12" cy="12" r="10"
                stroke="#2d2d2d"
                strokeWidth="4"
                fill="none"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="#00ff88"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 12 12"
                  to="360 12 12"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </path>
            </svg>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
              backgroundColor: 'rgba(255, 65, 108, 0.2)',
              border: '1px solid #ff416c',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#ff416c',
              fontSize: '12px',
              textAlign: 'center',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Watermark */}
        <div
          className="watermark"
          style={{
            top: '15%',
            left: '50%',
            transform: 'translate(-50%, -15%)',
            opacity: isLoading ? 0.3 : 0.5,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {symbolName}
        </div>

        {/* Chart Iframe - Minimal */}
        <iframe
          src={minimalIframeSrc}
          style={{
            flex: 1,
            minHeight: '180px',
            border: 'none',
            opacity: isLoading ? 0.5 : 1,
          }}
          title={`Chart ${ticker.symbol}`}
          loading="lazy"
          onContextMenu={(e) => {
            e.preventDefault();
            setModalOpened(true);
          }}
        />
      </div>

      {/* Full Chart Modal */}
      <ChartModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        symbol={symbol}
        interval={tvInterval}
      />
    </>
  );
}
