'use client';

import { Paper, Text, SimpleGrid } from '@mantine/core';
import { Ticker } from '@/types';

interface StatsRowProps {
  tickers: Ticker[];
}

export function StatsRow({ tickers }: StatsRowProps) {
  const pumpCount = tickers.filter((t) => t.priceChangePercent > 5).length;
  const dumpCount = tickers.filter((t) => t.priceChangePercent < -5).length;
  const whaleCount = tickers.filter((t) => (t.quoteVolume || 0) > 100000000).length;
  
  const avgVolume = tickers.length > 0
    ? tickers.reduce((acc, t) => acc + (t.quoteVolume || 0), 0) / tickers.length
    : 0;

  const avgFunding = 0.01; // Заглушка, пока нет данных

  return (
    <SimpleGrid cols={5} mb="md">
      <Paper
        p="md"
        style={{
          backgroundColor: '#1a1b1e',
          border: '1px solid #2d2d2d',
        }}
      >
        <Text size="xs" c="dimmed">
          🚀 Рост {'>'}5%
        </Text>
        <Text size="xl" fw="bold" c="green">
          {pumpCount}
        </Text>
      </Paper>

      <Paper
        p="md"
        style={{
          backgroundColor: '#1a1b1e',
          border: '1px solid #2d2d2d',
        }}
      >
        <Text size="xs" c="dimmed">
          📉 Падение {'>'}5%
        </Text>
        <Text size="xl" fw="bold" c="red">
          {dumpCount}
        </Text>
      </Paper>

      <Paper
        p="md"
        style={{
          backgroundColor: '#1a1b1e',
          border: '1px solid #2d2d2d',
        }}
      >
        <Text size="xs" c="dimmed">
          🐋 High Activity
        </Text>
        <Text size="xl" fw="bold">
          {whaleCount}
        </Text>
      </Paper>

      <Paper
        p="md"
        style={{
          backgroundColor: '#1a1b1e',
          border: '1px solid #2d2d2d',
        }}
      >
        <Text size="xs" c="dimmed">
          📊 Avg Volume
        </Text>
        <Text size="xl" fw="bold">
          ${(avgVolume / 1000000).toFixed(1)}M
        </Text>
      </Paper>

      <Paper
        p="md"
        style={{
          backgroundColor: '#1a1b1e',
          border: '1px solid #2d2d2d',
        }}
      >
        <Text size="xs" c="dimmed">
          💰 Avg Funding
        </Text>
        <Text size="xl" fw="bold" c="green">
          {avgFunding.toFixed(4)}%
        </Text>
      </Paper>
    </SimpleGrid>
  );
}
