'use client';

import { useState, useMemo } from 'react';
import { SimpleGrid, Loader, Center, Paper, Text } from '@mantine/core';
import { Header } from '@/components/Header';
import { ChartGridItem } from '@/components/ChartGridItem';
import { SymbolSearch } from '@/components/SymbolSearch';
import { StatsRow } from '@/components/StatsRow';
import { Legend } from '@/components/Legend';
import { useTickers } from '@/hooks/useBinance';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Mode, Interval, GridSize, PriceRange, Ticker } from '@/types';

// Популярные пары по умолчанию
const DEFAULT_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT',
  'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'LTCUSDT',
  'AVAXUSDT', 'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT',
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT', 'SUIUSDT',
];

export default function HomePage() {
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

  // Filter and sort tickers
  const filteredTickers = useMemo(() => {
    return tickers
      .filter((t) => selectedSymbols.includes(t.symbol))
      .sort((a, b) => {
        // Сортировка по изменению цены
        return b.priceChangePercent - a.priceChangePercent;
      });
  }, [tickers, selectedSymbols]);

  // Get top movers
  const topMovers = useMemo(() => {
    return [...tickers]
      .sort((a, b) => Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent))
      .slice(0, gridSize);
  }, [tickers, gridSize]);

  // Use top movers for display if no specific selection
  const displayTickers = filteredTickers.length > 0 ? filteredTickers : topMovers;

  // Available symbols for search (all USDT pairs)
  const availableSymbols = useMemo(() => {
    return tickers.map((t) => t.symbol).sort();
  }, [tickers]);

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
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" color="green" />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0e1117',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Header
        exchange={exchange}
        setExchange={setExchange}
        mode={mode}
        setMode={setMode}
        interval={interval}
        setInterval={setInterval}
        gridSize={gridSize}
        setGridSize={setGridSize}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        tickers={tickers}
      />

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          padding: '1rem',
          overflow: 'auto',
        }}
      >
        {error && (
          <Paper
            p="md"
            mb="md"
            style={{ backgroundColor: '#ff416c', color: 'white' }}
          >
            <Text>{error}</Text>
          </Paper>
        )}

        {/* Symbol Search */}
        <SymbolSearch
          availableSymbols={availableSymbols}
          selectedSymbols={selectedSymbols}
          onAddSymbol={handleAddSymbol}
          onRemoveSymbol={handleRemoveSymbol}
        />

        {/* Stats Row */}
        <StatsRow tickers={tickers} />

        {/* Charts Grid */}
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
            />
          ))}
        </SimpleGrid>

        {/* Bottom Legend */}
        <Legend />
      </main>
    </div>
  );
}
