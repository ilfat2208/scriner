'use client';

import { useState, useMemo, useEffect } from 'react';
import { SimpleGrid, Loader, Paper, Text, Badge, Group } from '@mantine/core';
import { IconWifi, IconWifiOff } from '@tabler/icons-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MainHeader } from '@/components/shared/MainHeader';
import { MetricsCards } from '@/components/dashboard/MetricsCards';
import { SignalTable } from '@/components/dashboard/SignalTable';
import { ChartGridItem } from '@/components/charts/ChartGridItem';
import { SymbolFilter } from '@/components/filters/SymbolFilter';
import { StatsCards } from '@/components/stats/StatsCards';
import { InfoLegend } from '@/components/shared/InfoLegend';
import { useTickers } from '@/hooks/useBinance';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSignalWebSocket } from '@/hooks/useSignalWebSocket';
import { useSignalStore } from '@/stores/useSignalStore';
import { Signal, SignalStats } from '@/types/signal';
import { Mode, Interval, GridSize, PriceRange } from '@/types';

const DEFAULT_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT',
  'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'LTCUSDT',
  'AVAXUSDT', 'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT',
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT', 'SUIUSDT',
];

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State
  const [exchange, setExchange] = useLocalStorage('whale-screener-exchange', 'BINANCE');
  const [mode, setMode] = useLocalStorage<Mode>('whale-screener-mode', 'FUTURES');
  const [interval, setInterval] = useLocalStorage<Interval>('whale-screener-interval', '1m');
  const [gridSize, setGridSize] = useLocalStorage<GridSize>('whale-screener-grid', 9);
  const [priceRange, setPriceRange] = useLocalStorage<PriceRange>('whale-screener-range', 'priceRange1h');
  const [selectedSymbols, setSelectedSymbols] = useLocalStorage<string[]>(
    'whale-screener-symbols',
    DEFAULT_PAIRS.slice(0, 9)
  );

  const { tickers, loading, error } = useTickers(exchange, mode === 'FUTURES');
  const { signals, addSignal } = useSignalStore();
  
  // WebSocket подключение
  const { isConnected, lastMessage } = useSignalWebSocket({
    enabled: true,
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/signals/ws',
  });

  // Memos
  const filteredTickers = useMemo(() => {
    return tickers
      .filter((t) => selectedSymbols.includes(t.symbol))
      .sort((a, b) => b.priceChangePercent - a.priceChangePercent);
  }, [tickers, selectedSymbols]);

  const topMovers = useMemo(() => {
    return [...tickers]
      .sort((a, b) => Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent))
      .slice(0, gridSize);
  }, [tickers, gridSize]);

  const displayTickers = filteredTickers.length > 0 ? filteredTickers : topMovers;
  
  const availableSymbols = useMemo(() => {
    return tickers.map((t) => t.symbol).sort();
  }, [tickers]);

  // Stats
  const mockStats: SignalStats = {
    totalSignals: signals.length || displayTickers.length,
    activeTokens: displayTickers.length,
    profit24h: 5.67,
    whaleCount: tickers.filter((t) => t.quoteVolume > 100000000).length,
    momentumCount: tickers.filter((t) => Math.abs(t.priceChangePercent) > 5).length,
  };

  // Signals from tickers
  const mockSignals: Signal[] = tickers.slice(0, 10).map((t, i) => ({
    id: `signal-${i}`,
    type: t.priceChangePercent > 5 ? 'MOMENTUM' : t.priceChangePercent < -5 ? 'PRICE_SPIKE' : 'WHALE',
    exchange: exchange as any,
    pair: t.symbol.replace('USDT', '/USDT'),
    side: t.priceChangePercent > 0 ? 'BUY' : 'SELL',
    volumeUsd: t.quoteVolume,
    amount: parseFloat(t.lastPrice),
    price: parseFloat(t.lastPrice),
    timestamp: new Date().toISOString(),
    isRead: false,
  }));

  const displaySignals = signals.length > 0 ? signals : mockSignals;

  // Handlers
  const handleAddSymbol = (symbol: string) => {
    if (!selectedSymbols.includes(symbol)) {
      setSelectedSymbols([...selectedSymbols, symbol]);
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    setSelectedSymbols(selectedSymbols.filter((s) => s !== symbol));
  };

  if (loading && !displayTickers.length) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader size="lg" color="#3b82f6" />
          <p className="mt-4 text-gray-400">Загрузка данных...</p>
        </div>
      </div>
    );
  }

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
        <MainHeader 
          onMenuClick={() => setSidebarOpen(true)}
          exchange={exchange}
          mode={mode}
          interval={interval}
          gridSize={gridSize}
          priceRange={priceRange}
          onExchangeChange={setExchange}
          onModeChange={setMode}
          onIntervalChange={setInterval}
          onGridSizeChange={setGridSize}
          onPriceRangeChange={setPriceRange}
        />

        <main className="pt-20 pb-8 px-6 overflow-x-hidden">
          <div className="space-y-6 max-w-[1920px]">
            {/* WebSocket Status */}
            <div className="flex items-center justify-between">
              <Group gap={8}>
                {isConnected ? (
                  <Badge
                    size="sm"
                    color="green"
                    variant="outline"
                    leftSection={<IconWifi size={14} />}
                  >
                    WebSocket Connected
                  </Badge>
                ) : (
                  <Badge
                    size="sm"
                    color="red"
                    variant="outline"
                    leftSection={<IconWifiOff size={14} />}
                  >
                    WebSocket Disconnected
                  </Badge>
                )}
                {lastMessage && (
                  <Text size="xs" className="text-gray-400">
                    Last signal: {new Date().toLocaleTimeString()}
                  </Text>
                )}
              </Group>
            </div>

            {/* Error Banner */}
            {error && (
              <Paper
                p="md"
                className="bg-danger/20 border border-danger/50 rounded-lg"
              >
                <Text className="text-danger">{error}</Text>
              </Paper>
            )}

            {/* Section 1: Metrics */}
            <section className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📊</span>
                <h1 className="text-xl font-bold">Обзор рынка</h1>
              </div>
              <MetricsCards stats={mockStats} />
            </section>

            {/* Section 2: Stats Cards */}
            <section className="animate-fade-in">
              <StatsCards tickers={tickers} />
            </section>

            {/* Section 3: Signals Table */}
            <section className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🐋</span>
                  <h2 className="text-xl font-bold">Сигналы китов</h2>
                </div>
                <div className="text-sm text-gray-400">
                  {displaySignals.length} сигналов
                </div>
              </div>
              <SignalTable signals={displaySignals} />
            </section>

            {/* Section 4: Symbol Filter */}
            <section className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🔍</span>
                <h2 className="text-xl font-bold">Поиск и фильтрация</h2>
              </div>
              <SymbolFilter
                availableSymbols={availableSymbols}
                selectedSymbols={selectedSymbols}
                onAddSymbol={handleAddSymbol}
                onRemoveSymbol={handleRemoveSymbol}
              />
            </section>

            {/* Section 5: Charts Grid */}
            <section className="animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📈</span>
                  <h2 className="text-xl font-bold">
                    Графики {exchange} {mode === 'FUTURES' ? 'Фьючерсы' : 'Спот'}
                  </h2>
                </div>
                <div className="text-sm text-gray-400">
                  {displayTickers.length} графиков | {interval}
                </div>
              </div>
              <SimpleGrid
                cols={Math.ceil(Math.sqrt(gridSize))}
                spacing="md"
                style={{
                  gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(gridSize))}, 1fr)`,
                }}
              >
                {displayTickers.slice(0, gridSize).map((ticker) => (
                  <ChartGridItem
                    key={ticker.symbol}
                    ticker={ticker}
                    interval={interval}
                    isFutures={mode === 'FUTURES'}
                    whaleSignals={displaySignals}
                  />
                ))}
              </SimpleGrid>
            </section>

            {/* Section 6: Legend */}
            <InfoLegend />
          </div>
        </main>
      </div>
    </div>
  );
}
