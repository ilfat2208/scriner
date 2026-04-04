'use client';

import { ChartCard } from '@/components/charts/ChartCard';
import { useKlines } from '@/hooks/useBinance';
import { Ticker, Interval } from '@/types';
import { Signal } from '@/types/signal';

interface ChartGridItemProps {
  ticker: Ticker;
  interval: Interval;
  isFutures: boolean;
  whaleSignals?: Signal[];
}

export function ChartGridItem({ ticker, interval, isFutures, whaleSignals = [] }: ChartGridItemProps) {
  const { data: chartData, loading: chartLoading, error: chartError } = useKlines(
    ticker.symbol,
    interval,
    100,
    isFutures
  );

  return (
    <div
      style={{
        aspectRatio: '16/10',
        minHeight: '200px',
      }}
    >
      <ChartCard
        ticker={ticker}
        chartData={chartData}
        interval={interval}
        whaleSignals={whaleSignals}
        isLoading={chartLoading}
        error={chartError}
      />
    </div>
  );
}
