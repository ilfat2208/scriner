'use client';

import { useMemo } from 'react';
import { Badge, Paper, Text, Group, Skeleton } from '@mantine/core';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  BarChart3,
  Settings,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { useTickers } from '@/hooks/useBinance';
import { useSignalStore } from '@/stores/useSignalStore';
import { useTelegramApp } from '@/hooks/useTelegramApp';
import { formatVolume, formatPercent, getPercentColor, cn } from '@/lib/utils';
import Link from 'next/link';

// Топ пары для мониторинга
const WATCHLIST = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];

export default function HomePage() {
  const { user, isTelegram } = useTelegramApp();
  const { tickers, loading } = useTickers('BINANCE', true);
  const { signals } = useSignalStore();

  // Топ movers
  const topMovers = useMemo(() => {
    return [...tickers]
      .sort((a, b) => Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent))
      .slice(0, 10);
  }, [tickers]);

  // Watchlist тикеры
  const watchlistTickers = useMemo(() => {
    return tickers.filter((t) => WATCHLIST.includes(t.symbol));
  }, [tickers]);

  // Статистика
  const stats = useMemo(() => {
    const pumpCount = signals.filter((s) => s.type === 'MOMENTUM' || s.type === 'PRICE_SPIKE').length;
    const whaleCount = signals.filter((s) => s.type === 'WHALE').length;
    const activePairs = tickers.filter((t) => Math.abs(t.priceChangePercent) > 2).length;

    return { pumpCount, whaleCount, activePairs, totalSignals: signals.length };
  }, [signals, tickers]);

  // Приветствие
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '🌙 Доброй ночи';
    if (hour < 12) return '☀️ Доброе утро';
    if (hour < 18) return '🌤️ Добрый день';
    return '🌆 Добрый вечер';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <Skeleton height={40} radius="md" className="mb-4" />
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={80} radius="md" />
          ))}
        </div>
        <Skeleton height={200} radius="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0e1a]/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <Text className="text-sm text-gray-400">
                {getGreeting()}
              </Text>
              <Text className="text-lg font-bold">
                {isTelegram && user ? `👋 ${user.first_name}` : '🐋 Whale Screener'}
              </Text>
            </div>
            <div className="flex items-center gap-2">
              <Badge color="green" size="sm" variant="dot">
                Live
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label="BTC/USDT"
            value={watchlistTickers[0]?.lastPrice || '—'}
            change={watchlistTickers[0]?.priceChangePercent || 0}
            compact
          />
          <StatCard
            label="ETH/USDT"
            value={watchlistTickers[1]?.lastPrice || '—'}
            change={watchlistTickers[1]?.priceChangePercent || 0}
            compact
          />
          <Paper className="bg-[#111827] border border-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-blue-400" />
              <Text className="text-xs text-gray-400">Сигналы</Text>
            </div>
            <Text className="text-xl font-bold">{stats.totalSignals}</Text>
            <Text className="text-xs text-gray-400">
              🟢 {stats.pumpCount} 🔵 {stats.whaleCount}
            </Text>
          </Paper>
          <Paper className="bg-[#111827] border border-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-green-400" />
              <Text className="text-xs text-gray-400">Активных</Text>
            </div>
            <Text className="text-xl font-bold">{stats.activePairs}</Text>
            <Text className="text-xs text-gray-400">пар {'>'}2%</Text>
          </Paper>
        </div>

        {/* Top Movers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <Text className="text-base font-bold">🔥 Топ движения</Text>
            </div>
            <Link href="/signals" className="text-xs text-blue-400">
              Все →
            </Link>
          </div>
          <div className="space-y-2">
            {topMovers.slice(0, 5).map((ticker) => (
              <Paper
                key={ticker.symbol}
                className="bg-[#111827] border border-gray-800 rounded-lg p-3 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        ticker.priceChangePercent >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                      )}
                    >
                      {ticker.priceChangePercent >= 0 ? (
                        <ArrowUpRight className="w-5 h-5 text-green-400" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <Text fw={600} className="text-sm">
                        {ticker.symbol.replace('USDT', '/USDT')}
                      </Text>
                      <Text className="text-xs text-gray-400 font-mono">
                        ${parseFloat(ticker.lastPrice).toLocaleString()}
                      </Text>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      color={ticker.priceChangePercent >= 0 ? 'green' : 'red'}
                      size="sm"
                      variant="filled"
                    >
                      {ticker.priceChangePercent >= 0 ? '+' : ''}
                      {ticker.priceChangePercent.toFixed(2)}%
                    </Badge>
                    <Text className="text-xs text-gray-400 mt-1">
                      {formatVolume(Number(ticker.quoteVolume))}
                    </Text>
                  </div>
                </div>
              </Paper>
            ))}
          </div>
        </div>

        {/* Watchlist */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <Text className="text-base font-bold">👀 Watchlist</Text>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {watchlistTickers.map((ticker) => (
              <Paper
                key={ticker.symbol}
                className="bg-[#111827] border border-gray-800 rounded-lg p-3 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Text fw={600}>{ticker.symbol.replace('USDT', '/USDT')}</Text>
                    <Text className="text-xs text-gray-400 font-mono">
                      ${parseFloat(ticker.lastPrice).toLocaleString()}
                    </Text>
                  </div>
                  <div className="text-right">
                    <Text
                      className={cn(
                        'text-lg font-bold',
                        getPercentColor(ticker.priceChangePercent)
                      )}
                    >
                      {ticker.priceChangePercent >= 0 ? '+' : ''}
                      {ticker.priceChangePercent.toFixed(2)}%
                    </Text>
                  </div>
                </div>
              </Paper>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/signals"
            className="bg-[#111827] border border-gray-800 rounded-lg p-4 text-center active:scale-95 transition-transform"
          >
            <Bell className="w-6 h-6 mx-auto mb-2 text-blue-400" />
            <Text className="text-xs">Сигналы</Text>
          </Link>
          <Link
            href="/analytics"
            className="bg-[#111827] border border-gray-800 rounded-lg p-4 text-center active:scale-95 transition-transform"
          >
            <BarChart3 className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <Text className="text-xs">Аналитика</Text>
          </Link>
          <Link
            href="/settings"
            className="bg-[#111827] border border-gray-800 rounded-lg p-4 text-center active:scale-95 transition-transform"
          >
            <Settings className="w-6 h-6 mx-auto mb-2 text-purple-400" />
            <Text className="text-xs">Настройки</Text>
          </Link>
        </div>
      </main>
    </div>
  );
}

// Компактная карточка статистики
function StatCard({
  label,
  value,
  change,
  compact = false,
}: {
  label: string;
  value: string;
  change: number;
  compact?: boolean;
}) {
  return (
    <Paper className="bg-[#111827] border border-gray-800 rounded-lg p-3">
      <Text className="text-xs text-gray-400 mb-1">{label}</Text>
      <Text className="text-lg font-bold font-mono truncate">
        ${parseFloat(value).toLocaleString()}
      </Text>
      <div className="flex items-center gap-1 mt-1">
        {change >= 0 ? (
          <ArrowUpRight className="w-3 h-3 text-green-400" />
        ) : (
          <ArrowDownRight className="w-3 h-3 text-red-400" />
        )}
        <Text
          className="text-xs font-bold"
          style={{ color: change >= 0 ? '#10b981' : '#ef4444' }}
        >
          {change >= 0 ? '+' : ''}
          {change.toFixed(2)}%
        </Text>
      </div>
    </Paper>
  );
}
