'use client';

import { ChartCard } from './ChartCard';
import { useKlines } from '@/hooks/useBinance';
import { Ticker, Interval } from '@/types';

interface ChartGridItemProps {
  ticker: Ticker;
  interval: Interval;
  isFutures: boolean;
}

export function ChartGridItem({ ticker, interval, isFutures }: ChartGridItemProps) {
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
        isLoading={chartLoading}
        error={chartError}
      />
    </div>
  );
}
