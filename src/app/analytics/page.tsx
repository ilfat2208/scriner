'use client';

import { useState, useMemo } from 'react';
import { Paper, Text, Badge, Group, Progress } from '@mantine/core';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatPercent, getPercentColor, cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const stats = useMemo(() => ({
    totalProfit: 12.5,
    winRate: 68,
    avgROI: 3.2,
    lossRate: 32,
    totalTrades: 156,
    winningTrades: 106,
    losingTrades: 50,
    bestTrade: 24.8,
    worstTrade: -8.3,
    profitFactor: 2.34,
  }), []);

  const topPerformers = useMemo(() => [
    { symbol: 'BTC/USDT', profit: 18.5, trades: 24, winRate: 75 },
    { symbol: 'ETH/USDT', profit: 15.2, trades: 32, winRate: 72 },
    { symbol: 'SOL/USDT', profit: 12.8, trades: 28, winRate: 68 },
    { symbol: 'XRP/USDT', profit: 9.4, trades: 19, winRate: 63 },
    { symbol: 'BNB/USDT', profit: 7.6, trades: 15, winRate: 70 },
  ], []);

  const signalDistribution = useMemo(() => [
    { type: 'WHALE', count: 45, percentage: 35, color: 'violet' as const, icon: '🐋' },
    { type: 'MOMENTUM', count: 52, percentage: 42, color: 'green' as const, icon: '📈' },
    { type: 'PRICE_SPIKE', count: 28, percentage: 23, color: 'red' as const, icon: '📉' },
  ], []);

  const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    color,
  }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: number;
    color: string;
  }) => (
    <Paper className="bg-[#111827] border border-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Text className="text-gray-400 text-xs">{title}</Text>
          <Text className="text-xl font-bold mt-1" style={{ color }}>
            {typeof value === 'number' && title.includes('%') ? `${value}%` : value}
          </Text>
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 mt-1 text-xs', trend >= 0 ? 'text-green-400' : 'text-red-400')}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </Paper>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0e1a]/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-lg font-bold">📊 Аналитика</h1>
              <p className="text-xs text-gray-400">Статистика торговли</p>
            </div>
            <Group gap="xs">
              {(['24h', '7d', '30d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors active:scale-95',
                    timeRange === range
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  )}
                >
                  {range}
                </button>
              ))}
            </Group>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            title="Прибыль"
            value={`${stats.totalProfit}%`}
            icon={DollarSign}
            trend={2.3}
            color="#10b981"
          />
          <StatCard
            title="Win Rate"
            value={`${stats.winRate}%`}
            icon={Target}
            trend={5.1}
            color="#3b82f6"
          />
          <StatCard
            title="Средний ROI"
            value={`${stats.avgROI}%`}
            icon={Activity}
            trend={-0.4}
            color="#8b5cf6"
          />
          <StatCard
            title="Profit Factor"
            value={stats.profitFactor.toFixed(2)}
            icon={TrendingUp}
            color="#f59e0b"
          />
        </div>

        {/* Quick Stats */}
        <Paper className="bg-[#111827] border border-gray-800 rounded-lg p-4">
          <Text className="text-sm font-bold mb-3">Быстрая статистика</Text>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <Text className="text-2xl font-bold text-blue-400">{stats.totalTrades}</Text>
              <Text className="text-xs text-gray-400">Всего сделок</Text>
            </div>
            <div className="text-center">
              <Text className="text-2xl font-bold text-green-400">{stats.winningTrades}</Text>
              <Text className="text-xs text-gray-400">Прибыльных</Text>
            </div>
            <div className="text-center">
              <Text className="text-2xl font-bold text-red-400">{stats.losingTrades}</Text>
              <Text className="text-xs text-gray-400">Убыточных</Text>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-800">
            <div>
              <Text className="text-xs text-gray-400">Лучшая</Text>
              <Text className="text-lg font-bold text-green-400">+{stats.bestTrade}%</Text>
            </div>
            <div>
              <Text className="text-xs text-gray-400">Худшая</Text>
              <Text className="text-lg font-bold text-red-400">{stats.worstTrade}%</Text>
            </div>
          </div>
        </Paper>

        {/* Signal Distribution */}
        <Paper className="bg-[#111827] border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-blue-400" />
            <Text className="text-sm font-bold">Распределение сигналов</Text>
          </div>
          <div className="space-y-3">
            {signalDistribution.map((item) => (
              <div key={item.type}>
                <div className="flex items-center justify-between mb-1">
                  <Text className="text-sm">
                    {item.icon} {item.type}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {item.count} ({item.percentage}%)
                  </Text>
                </div>
                <Progress
                  value={item.percentage}
                  className="h-2"
                  color={item.color}
                />
              </div>
            ))}
          </div>

          {/* Win/Loss Bar */}
          <div className="mt-4 pt-4 border-t border-gray-800">
            <Text className="text-xs text-gray-400 mb-2">Победы / Поражения</Text>
            <div className="flex h-3 rounded-full overflow-hidden">
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${stats.winRate}%` }}
              />
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${stats.lossRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs">
              <Text className="text-green-400">{stats.winRate}%</Text>
              <Text className="text-red-400">{stats.lossRate}%</Text>
            </div>
          </div>
        </Paper>

        {/* Top Performers */}
        <Paper className="bg-[#111827] border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <Text className="text-sm font-bold">Лучшие активы</Text>
          </div>
          <div className="space-y-2">
            {topPerformers.map((item, index) => (
              <div
                key={item.symbol}
                className="flex items-center justify-between p-2.5 bg-[#0a0e1a] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Text className="text-sm font-bold text-blue-400">
                      {index + 1}
                    </Text>
                  </div>
                  <div>
                    <Text fw={600}>{item.symbol}</Text>
                    <Text className="text-xs text-gray-400">{item.trades} сделок</Text>
                  </div>
                </div>
                <div className="text-right">
                  <Text className={cn('font-bold', getPercentColor(item.profit))}>
                    +{item.profit}%
                  </Text>
                  <Badge
                    color={item.winRate >= 70 ? 'green' : item.winRate >= 60 ? 'yellow' : 'red'}
                    size="xs"
                  >
                    {item.winRate}% WR
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Paper>
      </main>
    </div>
  );
}
