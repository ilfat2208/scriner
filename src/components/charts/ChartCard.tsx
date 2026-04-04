'use client';

import { useState, useEffect, useMemo } from 'react';
import { Badge, ActionIcon, Group, Tooltip } from '@mantine/core';
import {
  IconBookmark,
  IconMaximize,
  IconDots,
  IconX,
  IconPlus,
  IconTrash,
  IconTrendingUp,
  IconTrendingDown,
  IconAlertTriangle,
  IconCurrencyDollar,
} from '@tabler/icons-react';
import { Ticker, BadgeConfig, Interval } from '@/types';
import { Signal, SignalType } from '@/types/signal';
import { ChartModal } from '@/components/charts/ChartModal';
import { formatPercent, getPercentColor, formatVolume } from '@/lib/utils';

interface ChartCardProps {
  ticker: Ticker;
  chartData?: any[];
  interval: Interval;
  whaleSignals?: Signal[];
  isLoading?: boolean;
  error?: string | null;
  onRemove?: () => void;
  onExpand?: () => void;
  showWatermark?: boolean;
}

function getBadgeColor(value: number): 'green' | 'red' | 'yellow' | 'gray' {
  if (value > 2) return 'green';
  if (value < -2) return 'red';
  if (value >= 0.5 || value <= -0.5) return 'yellow';
  return 'gray';
}

function getSignalIcon(type: SignalType) {
  switch (type) {
    case 'WHALE':
      return <IconCurrencyDollar size={12} />;
    case 'MOMENTUM':
      return <IconTrendingUp size={12} />;
    case 'PRICE_SPIKE':
      return <IconAlertTriangle size={12} />;
  }
}

function getSignalColor(type: SignalType) {
  switch (type) {
    case 'WHALE':
      return 'violet';
    case 'MOMENTUM':
      return 'green';
    case 'PRICE_SPIKE':
      return 'red';
  }
}

export function ChartCard({
  ticker,
  interval,
  whaleSignals = [],
  isLoading,
  error,
  onRemove,
  onExpand,
  showWatermark = true,
}: ChartCardProps) {
  const [badges, setBadges] = useState<BadgeConfig[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Фильтрация сигналов для текущего тикера
  const tickerSignals = useMemo(
    () =>
      whaleSignals.filter(
        (s) => s.pair.replace('/USDT', '') === ticker.symbol.replace('USDT', '')
      ),
    [whaleSignals, ticker.symbol]
  );

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

    // Add funding rate badge if available
    if (ticker.fundingRate !== undefined) {
      newBadges.push({
        value: `${ticker.fundingRate >= 0 ? '+' : ''}${ticker.fundingRate.toFixed(3)}%`,
        color: ticker.fundingRate > 0.01 ? 'red' : ticker.fundingRate < -0.01 ? 'green' : 'gray',
        label: 'Funding',
      });
    }

    // Add open interest badge if available
    if (ticker.openInterest !== undefined && ticker.openInterest > 0) {
      newBadges.push({
        value: formatVolume(ticker.openInterest),
        color: 'yellow',
        label: 'OI',
      });
    }

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

  // TradingView widget URL с улучшенными параметрами
  const tvWidgetSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_mini_${ticker.symbol}&symbol=BINANCE:${symbolName}USDT&interval=${tvInterval}&hidetopbar=1&hidebottomtoolbar=1&hideideas=1&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&style=1&theme=dark&toolbar_bg=%231a1b1e&hidevolume=1&symbol_name=${symbolName}&studies=[]&overrides={"symbolWatermarkProperties":{"color":"rgba(255,255,255,0.1)"}}`;

  return (
    <>
      <div
        className="chart-card"
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#1e1e20',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #2d2d2d',
        }}
      >
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
          <Group gap={6} wrap="nowrap">
            {/* Lightning Icon */}
            <Tooltip label={ticker.symbol} withArrow>
              <svg
                width="16"
                height="16"
                viewBox="0 0 128 128"
                style={{ color: '#ffeb3b', flexShrink: 0, cursor: 'pointer' }}
              >
                <defs>
                  <linearGradient id={`lightning-grad-${ticker.symbol}`}>
                    <stop offset="0" stopColor="#ffeb3b" />
                    <stop offset="1" stopColor="#fbc02d" />
                  </linearGradient>
                </defs>
                <path
                  d="m43.08 120.9 22.27-48.71c.63-1.37-.17-3.08-1.44-3.08l-42.26-.19c-1.53-.01-2.24-2.35-1.09-3.61l55.25-60.78c1.38-1.51 3.42.46 2.57 2.49l-16.71 40.26c-.57 1.37.23 3 1.46 3.01l43.22.35c1.52.01 2.23 2.34 1.1 3.6l-61.81 69.21c-1.41 1.57-3.49-.52-2.56-2.55z"
                  fill={`url(#lightning-grad-${ticker.symbol})`}
                />
              </svg>
            </Tooltip>

            {/* Badges */}
            <Group gap={4} wrap="nowrap" style={{ overflow: 'hidden' }}>
              {badges.slice(0, 5).map((badge, index) => (
                <Tooltip key={index} label={`${badge.label}: ${badge.value}`} withArrow>
                  <Badge
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
                      fontSize: 10,
                      padding: '0 6px',
                      height: 22,
                      flexShrink: 0,
                    }}
                  >
                    {badge.value}
                  </Badge>
                </Tooltip>
              ))}
            </Group>

            {/* Signal indicators */}
            {tickerSignals.length > 0 && (
              <Group gap={2}>
                {tickerSignals.slice(0, 3).map((signal, idx) => (
                  <Tooltip
                    key={idx}
                    label={`${signal.type} ${signal.side} - ${formatVolume(signal.volumeUsd)}`}
                    withArrow
                  >
                    <Badge
                      size="sm"
                      color={getSignalColor(signal.type)}
                      variant="filled"
                      style={{
                        padding: '0 6px',
                        height: 22,
                        fontSize: 10,
                        cursor: 'pointer',
                      }}
                    >
                      {getSignalIcon(signal.type)}
                    </Badge>
                  </Tooltip>
                ))}
                {tickerSignals.length > 3 && (
                  <Badge
                    size="sm"
                    color="gray"
                    variant="outline"
                    style={{ padding: '0 6px', height: 22, fontSize: 10 }}
                  >
                    +{tickerSignals.length - 3}
                  </Badge>
                )}
              </Group>
            )}
          </Group>

          {/* Actions */}
          <Group gap={2}>
            <Tooltip label="Сохранить" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="gray"
                style={{ '--ai-hover-bg': '#3d3d40' } as any}
              >
                <IconBookmark size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Развернуть" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="gray"
                onClick={() => (onExpand ? onExpand() : setModalOpened(true))}
              >
                <IconMaximize size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Ещё" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="gray"
                style={{ '--ai-hover-bg': '#3d3d40' } as any}
              >
                <IconDots size={14} />
              </ActionIcon>
            </Tooltip>
            {onRemove && (
              <Tooltip label="Удалить" withArrow>
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  color="red"
                  onClick={onRemove}
                  style={{ '--ai-hover-bg': 'rgba(255, 65, 108, 0.2)' } as any}
                >
                  <IconX size={14} />
                </ActionIcon>
              </Tooltip>
            )}
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
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="#2d2d2d"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="#00ff88"
                strokeWidth="3"
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
            <span style={{ color: '#888', fontSize: 12 }}>Загрузка графика...</span>
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
              zIndex: 20,
              backgroundColor: 'rgba(255, 65, 108, 0.15)',
              border: '1px solid #ff416c',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#ff416c',
              fontSize: 13,
              textAlign: 'center',
              maxWidth: '80%',
            }}
          >
            <IconAlertTriangle size={20} style={{ marginBottom: 8 }} />
            <br />
            {error}
          </div>
        )}

        {/* Watermark */}
        {showWatermark && (
          <div
            className="watermark"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.08,
              pointerEvents: 'none',
              zIndex: 1,
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#ffffff',
              letterSpacing: '4px',
            }}
          >
            {symbolName}
          </div>
        )}

        {/* Chart Iframe */}
        <iframe
          src={tvWidgetSrc}
          style={{
            flex: 1,
            minHeight: '180px',
            border: 'none',
            opacity: isLoading ? 0.5 : 1,
            transition: 'opacity 0.3s',
          }}
          title={`Chart ${ticker.symbol}`}
          loading="lazy"
          onLoad={() => setIframeLoaded(true)}
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
