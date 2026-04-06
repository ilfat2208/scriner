'use client';

import { useState, useMemo } from 'react';
import { Paper, Badge, Group, Switch, Text } from '@mantine/core';
import { useSignalStore } from '@/stores/useSignalStore';
import { useTickers } from '@/hooks/useBinance';
import { Signal, SignalType } from '@/types/signal';
import {
  Bell,
  BellOff,
  Filter,
  Search,
  CheckCheck,
  ArrowUpDown,
} from 'lucide-react';
import {
  formatTime,
  formatVolume,
  formatPrice,
  formatPercent,
  getPercentColor,
  cn,
} from '@/lib/utils';

type SortField = 'timestamp' | 'volumeUsd' | 'price' | 'type';
type SortOrder = 'asc' | 'desc';

export default function SignalsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  const { signals, markAsRead, markAllAsRead, getUnreadCount } = useSignalStore();
  const { tickers } = useTickers('BINANCE', true);

  // Mock signals from tickers
  const mockSignals: Signal[] = useMemo(() => {
    return tickers.slice(0, 50).map((t, i) => ({
      id: `signal-${i}`,
      type: t.priceChangePercent > 5 ? 'MOMENTUM' : t.priceChangePercent < -5 ? 'PRICE_SPIKE' : 'WHALE',
      exchange: 'BINANCE',
      pair: t.symbol.replace('USDT', '/USDT'),
      side: t.priceChangePercent > 0 ? 'BUY' : 'SELL',
      volumeUsd: t.quoteVolume,
      amount: parseFloat(t.lastPrice),
      price: parseFloat(t.lastPrice),
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      isRead: false,
    }));
  }, [tickers]);

  const displaySignals = signals.length > 0 ? signals : mockSignals;
  const unreadCount = getUnreadCount();

  const filteredSignals = useMemo(() => {
    let result = [...displaySignals];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.pair.toLowerCase().includes(query) ||
          s.exchange.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((s) => s.type === typeFilter);
    }

    if (sideFilter !== 'all') {
      result = result.filter((s) => s.side === sideFilter);
    }

    if (showOnlyUnread) {
      result = result.filter((s) => !s.isRead);
    }

    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'timestamp') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [displaySignals, searchQuery, typeFilter, sideFilter, showOnlyUnread, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getTypeColor = (type: SignalType) => {
    switch (type) {
      case 'WHALE': return 'violet';
      case 'MOMENTUM': return 'green';
      case 'PRICE_SPIKE': return 'red';
      default: return 'gray';
    }
  };

  const getSideColor = (side: string) => side === 'BUY' ? 'green' : 'red';

  const getTypeIcon = (type: SignalType) => {
    switch (type) {
      case 'WHALE': return '🐋';
      case 'MOMENTUM': return '📈';
      case 'PRICE_SPIKE': return '📉';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0e1a]/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">🔔 Сигналы</h1>
                {unreadCount > 0 && (
                  <Badge color="blue" size="sm">{unreadCount}</Badge>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {filteredSignals.length} сигналов
              </p>
            </div>
            <Group gap="xs">
              <button
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="p-2 rounded-lg bg-gray-800/50 active:scale-95 transition-transform disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            </Group>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск пары..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111827] border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#1f2937] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white min-w-[110px]"
            >
              <option value="all">Все типы</option>
              <option value="WHALE">🐋 Кит</option>
              <option value="MOMENTUM">📈 Моментум</option>
              <option value="PRICE_SPIKE">📉 Скачок</option>
            </select>
            <select
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value)}
              className="bg-[#1f2937] border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white min-w-[90px]"
            >
              <option value="all">Все</option>
              <option value="BUY">🟢 BUY</option>
              <option value="SELL">🔴 SELL</option>
            </select>
            <Group gap="xs" className="flex-shrink-0">
              <Switch
                checked={showOnlyUnread}
                onChange={(event) => setShowOnlyUnread(event.currentTarget.checked)}
                size="sm"
              />
              <Text size="xs" className="text-gray-400 whitespace-nowrap">
                Непрочитанные
              </Text>
            </Group>
          </div>
        </div>
      </header>

      {/* Signals List */}
      <main className="px-4 py-4 space-y-2">
        {filteredSignals.length === 0 ? (
          <Paper className="bg-[#111827] border border-gray-800 rounded-lg p-8 text-center">
            <BellOff className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <Text className="text-gray-400">Сигналы не найдены</Text>
          </Paper>
        ) : (
          filteredSignals.map((signal) => {
            const ticker = tickers.find((t) => t.symbol === signal.pair.replace('/USDT', ''));
            const priceChange = ticker?.priceChangePercent || 0;

            return (
              <Paper
                key={signal.id}
                className={cn(
                  'bg-[#111827] border rounded-lg p-3 active:scale-[0.98] transition-transform cursor-pointer',
                  !signal.isRead
                    ? 'border-blue-500/30'
                    : 'border-gray-800'
                )}
                onClick={() => markAsRead(signal.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {!signal.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    )}
                    <Text fw={600} className="text-blue-400">
                      {signal.pair}
                    </Text>
                  </div>
                  <Badge
                    color={getTypeColor(signal.type)}
                    variant="filled"
                    size="sm"
                  >
                    {getTypeIcon(signal.type)} {signal.type}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <Text className="text-gray-400 text-xs">Сторона</Text>
                    <Badge
                      color={getSideColor(signal.side)}
                      variant="filled"
                      size="sm"
                    >
                      {signal.side === 'BUY' ? '🟢' : '🔴'} {signal.side}
                    </Badge>
                  </div>
                  <div>
                    <Text className="text-gray-400 text-xs">Цена</Text>
                    <Text className="font-mono">
                      {formatPrice(signal.price)}
                    </Text>
                  </div>
                  <div>
                    <Text className="text-gray-400 text-xs">Объём 24ч</Text>
                    <Text className="text-green-400 font-mono">
                      {formatVolume(signal.volumeUsd)}
                    </Text>
                  </div>
                  <div>
                    <Text className="text-gray-400 text-xs">Изменение</Text>
                    <Text className={cn('font-mono', getPercentColor(priceChange))}>
                      {formatPercent(priceChange)}
                    </Text>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800">
                  <Text className="text-xs text-gray-500">
                    {formatTime(signal.timestamp)}
                  </Text>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(signal.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-800 active:scale-90 transition-transform"
                  >
                    {signal.isRead ? (
                      <BellOff className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Bell className="w-4 h-4 text-blue-400" />
                    )}
                  </button>
                </div>
              </Paper>
            );
          })
        )}
      </main>
    </div>
  );
}
