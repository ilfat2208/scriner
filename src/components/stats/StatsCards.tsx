'use client';

import { Paper, Text, SimpleGrid } from '@mantine/core';
import { Ticker } from '@/types';

interface StatsCardsProps {
  tickers: Ticker[];
}

export function StatsCards({ tickers }: StatsCardsProps) {
  const pumpCount = tickers.filter((t) => t.priceChangePercent > 5).length;
  const dumpCount = tickers.filter((t) => t.priceChangePercent < -5).length;
  const whaleCount = tickers.filter((t) => (t.quoteVolume || 0) > 100000000).length;
  
  const avgVolume = tickers.length > 0
    ? tickers.reduce((acc, t) => acc + (t.quoteVolume || 0), 0) / tickers.length
    : 0;

  const stats = [
    {
      label: '🚀 Рост >5%',
      value: pumpCount.toString(),
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
    },
    {
      label: '📉 Падение >5%',
      value: dumpCount.toString(),
      color: 'text-danger',
      bgColor: 'bg-danger/10',
      borderColor: 'border-danger/20',
    },
    {
      label: '🐋 High Activity',
      value: whaleCount.toString(),
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
    },
    {
      label: '📊 Avg Volume',
      value: `$${(avgVolume / 1000000).toFixed(1)}M`,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
    {
      label: '💰 Avg Funding',
      value: '0.01%',
      color: 'text-whale',
      bgColor: 'bg-whale/10',
      borderColor: 'border-whale/20',
    },
  ];

  return (
    <SimpleGrid cols={5} className="gap-4">
      {stats.map((stat) => (
        <Paper
          key={stat.label}
          className={`p-4 rounded-xl border ${stat.borderColor} ${stat.bgColor} transition-all hover:scale-105`}
        >
          <div className="text-sm text-gray-400 mb-1">{stat.label}</div>
          <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
