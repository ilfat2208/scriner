'use client';

import { useState, useMemo, useEffect } from 'react';
import { Paper, Text, Loader, Table, Badge, ScrollArea, Group, ActionIcon, Tooltip, Switch } from '@mantine/core';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSignalStore } from '@/stores/useSignalStore';
import { useTickers } from '@/hooks/useBinance';
import { Signal, SignalType } from '@/types/signal';
import {
  Bell,
  BellOff,
  Filter,
  Search,
  Download,
  RefreshCw,
  CheckCheck,
  Trash2,
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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

type SortField = 'timestamp' | 'volumeUsd' | 'price' | 'type';
type SortOrder = 'asc' | 'desc';

export default function SignalsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exchange] = useState('BINANCE');
  const [mode] = useState('FUTURES');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { signals, markAsRead, markAllAsRead, clearSignals, getUnreadCount } = useSignalStore();
  const { tickers, loading } = useTickers(exchange, mode === 'FUTURES');

  // Generate mock signals from tickers if no real signals
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

  // Filter and sort signals
  const filteredSignals = useMemo(() => {
    let result = [...displaySignals];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.pair.toLowerCase().includes(query) ||
          s.exchange.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((s) => s.type === typeFilter);
    }

    // Side filter
    if (sideFilter !== 'all') {
      result = result.filter((s) => s.side === sideFilter);
    }

    // Unread filter
    if (showOnlyUnread) {
      result = result.filter((s) => !s.isRead);
    }

    // Sort
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

  const unreadCount = getUnreadCount();

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      // Refresh will happen automatically via hooks
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExport = () => {
    const headers = ['Time', 'Type', 'Exchange', 'Pair', 'Side', 'Price', 'Volume'];
    const rows = filteredSignals.map((s) => [
      new Date(s.timestamp).toLocaleString(),
      s.type,
      s.exchange,
      s.pair,
      s.side,
      s.price,
      s.volumeUsd,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTypeColor = (type: SignalType) => {
    switch (type) {
      case 'WHALE':
        return 'violet';
      case 'MOMENTUM':
        return 'green';
      case 'PRICE_SPIKE':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getSideColor = (side: string) => {
    return side === 'BUY' ? 'green' : 'red';
  };

  const getTypeIcon = (type: SignalType) => {
    switch (type) {
      case 'WHALE':
        return '🐋';
      case 'MOMENTUM':
        return '📈';
      case 'PRICE_SPIKE':
        return '📉';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <Sidebar />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-md border-b border-gray-800 z-30 lg:left-64">
          <div className="h-full flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-surface2 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">Сигналы</h1>
                  {unreadCount > 0 && (
                    <Badge color="primary" variant="filled" size="sm">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  {filteredSignals.length} сигналов | {unreadCount} непрочитанных
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip label={autoRefresh ? 'Автообновление включено' : 'Автообновление выключено'} withArrow>
                <ActionIcon
                  variant={autoRefresh ? 'filled' : 'outline'}
                  color={autoRefresh ? 'green' : 'gray'}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <RefreshCw className={cn('w-4 h-4', autoRefresh && 'animate-spin')} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Отметить все как прочитанное" withArrow>
                <ActionIcon variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
                  <CheckCheck className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Экспорт CSV" withArrow>
                <ActionIcon variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Очистить все" withArrow>
                <ActionIcon variant="outline" color="red" onClick={clearSignals}>
                  <Trash2 className="w-4 h-4" />
                </ActionIcon>
              </Tooltip>
            </div>
          </div>
        </header>

        <main className="pt-20 pb-8 px-6">
          <div className="max-w-[1920px]">
            {/* Filters */}
            <Paper className="bg-surface border border-gray-800 rounded-lg p-4 mb-4">
              <div className="flex flex-wrap gap-3 items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Поиск пары, биржи..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Type Filter */}
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'Все типы' },
                    { value: 'WHALE', label: '🐋 Кит' },
                    { value: 'MOMENTUM', label: '📈 Моментум' },
                    { value: 'PRICE_SPIKE', label: '📉 Скачок' },
                  ]}
                  className="w-40"
                />

                {/* Side Filter */}
                <Select
                  value={sideFilter}
                  onChange={(e) => setSideFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'Все стороны' },
                    { value: 'BUY', label: '🟢 BUY' },
                    { value: 'SELL', label: '🔴 SELL' },
                  ]}
                  className="w-32"
                />

                {/* Unread Toggle */}
                <Group gap={2}>
                  <Switch
                    checked={showOnlyUnread}
                    onChange={(event) => setShowOnlyUnread(event.currentTarget.checked)}
                    size="sm"
                  />
                  <Text size="sm" className="text-gray-400">
                    Только непрочитанные
                  </Text>
                </Group>

                <div className="ml-auto flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                    setSideFilter('all');
                    setShowOnlyUnread(false);
                  }}>
                    <Filter className="w-4 h-4" />
                    Сброс
                  </Button>
                </div>
              </div>
            </Paper>

            {/* Table */}
            {loading && !displaySignals.length ? (
              <Paper className="bg-surface border border-gray-800 rounded-lg p-12">
                <div className="flex flex-col items-center justify-center">
                  <Loader size="lg" color="#3b82f6" />
                  <p className="mt-4 text-gray-400">Загрузка сигналов...</p>
                </div>
              </Paper>
            ) : filteredSignals.length === 0 ? (
              <Paper className="bg-surface border border-gray-800 rounded-lg p-12">
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <BellOff className="w-12 h-12 mb-4 opacity-50" />
                  <Text className="text-lg font-medium">Сигналы не найдены</Text>
                  <Text className="text-sm mt-2">
                    Попробуйте изменить параметры фильтрации
                  </Text>
                </div>
              </Paper>
            ) : (
              <Paper className="bg-surface border border-gray-800 rounded-lg overflow-hidden">
                <ScrollArea className="h-[calc(100vh-320px)]">
                  <Table verticalSpacing="md" highlightOnHover>
                    <Table.Thead>
                      <Table.Tr className="bg-surface2">
                        <Table.Th>
                          <button
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                            onClick={() => handleSort('timestamp')}
                          >
                            Время
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </Table.Th>
                        <Table.Th>Тип</Table.Th>
                        <Table.Th>Пара</Table.Th>
                        <Table.Th>Сторона</Table.Th>
                        <Table.Th>
                          <button
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                            onClick={() => handleSort('price')}
                          >
                            Цена
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </Table.Th>
                        <Table.Th>
                          <button
                            className="flex items-center gap-1 hover:text-primary transition-colors"
                            onClick={() => handleSort('volumeUsd')}
                          >
                            Объем (24ч)
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </Table.Th>
                        <Table.Th>Изменение (24ч)</Table.Th>
                        <Table.Th>Биржа</Table.Th>
                        <Table.Th className="w-10"></Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredSignals.map((signal) => {
                        const ticker = tickers.find((t) => t.symbol === signal.pair.replace('/USDT', ''));
                        const priceChange = ticker?.priceChangePercent || 0;

                        return (
                          <Table.Tr
                            key={signal.id}
                            className={cn(
                              'cursor-pointer transition-colors',
                              !signal.isRead && 'bg-primary/5'
                            )}
                            onClick={() => markAsRead(signal.id)}
                          >
                            <Table.Td>
                              <div className="flex items-center gap-2">
                                {!signal.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                )}
                                <Text size="sm" className="text-gray-400">
                                  {formatTime(signal.timestamp)}
                                </Text>
                              </div>
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                color={getTypeColor(signal.type)}
                                variant="filled"
                                size="sm"
                              >
                                {getTypeIcon(signal.type)} {signal.type}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text fw={500} className="text-primary">
                                {signal.pair}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                color={getSideColor(signal.side)}
                                variant="filled"
                                size="sm"
                              >
                                {signal.side === 'BUY' ? '🟢' : '🔴'} {signal.side}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text className="font-mono">
                                {formatPrice(signal.price)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text fw={500} className="text-success font-mono">
                                {formatVolume(signal.volumeUsd)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text className={cn('font-mono', getPercentColor(priceChange))}>
                                {formatPercent(priceChange)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{signal.exchange}</Text>
                            </Table.Td>
                            <Table.Td>
                              <ActionIcon
                                variant="subtle"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(signal.id);
                                }}
                              >
                                {signal.isRead ? (
                                  <BellOff className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <Bell className="w-4 h-4 text-primary" />
                                )}
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Paper>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
