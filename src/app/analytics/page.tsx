'use client';

import { useState, useMemo } from 'react';
import { Paper, Text, Loader, SimpleGrid, Group, Badge, Progress, Table, ScrollArea } from '@mantine/core';
import { Sidebar } from '@/components/layout/Sidebar';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Target,
  Award,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatPercent, getPercentColor, formatVolume, cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const [sidebarOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  // Mock data for demonstration
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
    avgWin: 4.2,
    avgLoss: -2.1,
    profitFactor: 2.34,
    sharpeRatio: 1.87,
  }), []);

  const topPerformers = useMemo(() => [
    { symbol: 'BTC/USDT', profit: 18.5, trades: 24, winRate: 75 },
    { symbol: 'ETH/USDT', profit: 15.2, trades: 32, winRate: 72 },
    { symbol: 'SOL/USDT', profit: 12.8, trades: 28, winRate: 68 },
    { symbol: 'XRP/USDT', profit: 9.4, trades: 19, winRate: 63 },
    { symbol: 'BNB/USDT', profit: 7.6, trades: 15, winRate: 70 },
  ], []);

  const recentTrades = useMemo(() => [
    { id: 1, pair: 'BTC/USDT', side: 'BUY', profit: 5.2, time: new Date().toISOString(), status: 'closed' },
    { id: 2, pair: 'ETH/USDT', side: 'SELL', profit: -2.1, time: new Date(Date.now() - 3600000).toISOString(), status: 'closed' },
    { id: 3, pair: 'SOL/USDT', side: 'BUY', profit: 8.4, time: new Date(Date.now() - 7200000).toISOString(), status: 'closed' },
    { id: 4, pair: 'XRP/USDT', side: 'BUY', profit: 3.6, time: new Date(Date.now() - 14400000).toISOString(), status: 'closed' },
    { id: 5, pair: 'BNB/USDT', side: 'SELL', profit: -1.5, time: new Date(Date.now() - 28800000).toISOString(), status: 'closed' },
  ], []);

  const signalDistribution = useMemo(() => [
    { type: 'WHALE', count: 45, percentage: 35, color: 'violet' },
    { type: 'MOMENTUM', count: 52, percentage: 42, color: 'green' },
    { type: 'PRICE_SPIKE', count: 28, percentage: 23, color: 'red' },
  ], []);

  const hourlyPerformance = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      profit: Math.random() * 10 - 3,
      trades: Math.floor(Math.random() * 20),
    }));
    return hours;
  }, []);

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
    <Paper className="bg-surface border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <Text className="text-gray-400 text-sm">{title}</Text>
          <Text className="text-2xl font-bold mt-1" style={{ color }}>
            {typeof value === 'number' && title.includes('%') ? formatPercent(value) : value}
          </Text>
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 mt-2 text-sm', trend >= 0 ? 'text-success' : 'text-danger')}>
              {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{formatPercent(Math.abs(trend))}</span>
              <span className="text-gray-400">vs прошлой недели</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </Paper>
  );

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => {}} />
          <Sidebar />
        </div>
      )}

      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="lg:pl-64">
        <header className="fixed top-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-md border-b border-gray-800 z-30 lg:left-64">
          <div className="h-full flex items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold">Аналитика</h1>
              <p className="text-sm text-gray-400">Детальная статистика торговли</p>
            </div>
            <Group>
              {(['24h', '7d', '30d'] as const).map((range) => (
                <Badge
                  key={range}
                  variant={timeRange === range ? 'filled' : 'outline'}
                  onClick={() => setTimeRange(range)}
                  className="cursor-pointer"
                >
                  {range}
                </Badge>
              ))}
            </Group>
          </div>
        </header>

        <main className="pt-20 pb-8 px-6">
          <div className="max-w-[1920px] space-y-6">
            {/* Key Metrics */}
            <SimpleGrid cols={4} spacing="md">
              <StatCard
                title="Общая прибыль"
                value={`${stats.totalProfit}%`}
                icon={DollarSign}
                trend={2.3}
                color="#10b981"
              />
              <StatCard
                title="Успешных сделок"
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
                trend={0.12}
                color="#f59e0b"
              />
            </SimpleGrid>

            {/* Additional Stats */}
            <SimpleGrid cols={6} spacing="md">
              <Paper className="bg-surface border border-gray-800 rounded-lg p-4">
                <Text className="text-gray-400 text-xs">Всего сделок</Text>
                <Text className="text-xl font-bold mt-1">{stats.totalTrades}</Text>
              </Paper>
              <Paper className="bg-surface border border-gray-800 rounded-lg p-4">
                <Text className="text-gray-400 text-xs">Прибыльных</Text>
                <Text className="text-xl font-bold mt-1 text-success">{stats.winningTrades}</Text>
              </Paper>
              <Paper className="bg-surface border border-gray-800 rounded-lg p-4">
                <Text className="text-gray-400 text-xs">Убыточных</Text>
                <Text className="text-xl font-bold mt-1 text-danger">{stats.losingTrades}</Text>
              </Paper>
              <Paper className="bg-surface border border-gray-800 rounded-lg p-4">
                <Text className="text-gray-400 text-xs">Лучшая сделка</Text>
                <Text className="text-xl font-bold mt-1 text-success">+{stats.bestTrade}%</Text>
              </Paper>
              <Paper className="bg-surface border border-gray-800 rounded-lg p-4">
                <Text className="text-gray-400 text-xs">Худшая сделка</Text>
                <Text className="text-xl font-bold mt-1 text-danger">{stats.worstTrade}%</Text>
              </Paper>
              <Paper className="bg-surface border border-gray-800 rounded-lg p-4">
                <Text className="text-gray-400 text-xs">Sharpe Ratio</Text>
                <Text className="text-xl font-bold mt-1">{stats.sharpeRatio.toFixed(2)}</Text>
              </Paper>
            </SimpleGrid>

            {/* Charts Row */}
            <SimpleGrid cols={2} spacing="md">
              {/* Hourly Performance */}
              <Paper className="bg-surface border border-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-primary" />
                  <Text className="text-lg font-bold">Почасовая производительность</Text>
                </div>
                <div className="h-48 flex items-end gap-1">
                  {hourlyPerformance.map((hour, i) => (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                      title={`${hour.hour}: ${formatPercent(hour.profit)}`}
                    >
                      <div
                        className={cn(
                          'w-full rounded-t transition-all hover:opacity-80',
                          hour.profit >= 0 ? 'bg-success/60' : 'bg-danger/60'
                        )}
                        style={{
                          height: `${Math.min(Math.abs(hour.profit) * 10, 100)}%`,
                        }}
                      />
                      {i % 4 === 0 && (
                        <Text className="text-xs text-gray-500 -rotate-45 origin-top">
                          {hour.hour}
                        </Text>
                      )}
                    </div>
                  ))}
                </div>
              </Paper>

              {/* Signal Distribution */}
              <Paper className="bg-surface border border-gray-800 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-primary" />
                  <Text className="text-lg font-bold">Распределение сигналов</Text>
                </div>
                <div className="space-y-4">
                  {signalDistribution.map((item) => (
                    <div key={item.type}>
                      <div className="flex items-center justify-between mb-1">
                        <Text className="text-sm font-medium">{item.type}</Text>
                        <Text className="text-sm text-gray-400">
                          {item.count} ({item.percentage}%)
                        </Text>
                      </div>
                      <Progress
                        value={item.percentage}
                        className="h-2"
                        color={item.color as any}
                      />
                    </div>
                  ))}
                </div>

                {/* Win/Loss Ratio */}
                <div className="mt-6 pt-6 border-t border-gray-800">
                  <Text className="text-sm font-medium mb-3">Соотношение побед/поражений</Text>
                  <div className="flex h-4 rounded-full overflow-hidden">
                    <div
                      className="bg-success transition-all"
                      style={{ width: `${stats.winRate}%` }}
                    />
                    <div
                      className="bg-danger transition-all"
                      style={{ width: `${stats.lossRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <Text className="text-success">Победы: {stats.winRate}%</Text>
                    <Text className="text-danger">Поражения: {stats.lossRate}%</Text>
                  </div>
                </div>
              </Paper>
            </SimpleGrid>

            {/* Top Performers */}
            <Paper className="bg-surface border border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <Text className="text-lg font-bold">Лучшие активы</Text>
              </div>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Актив</Table.Th>
                    <Table.Th>Прибыль</Table.Th>
                    <Table.Th>Сделок</Table.Th>
                    <Table.Th>Win Rate</Table.Th>
                    <Table.Th>Средняя прибыль</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {topPerformers.map((item, index) => (
                    <Table.Tr key={item.symbol}>
                      <Table.Td>
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊'}</span>
                          <Text fw={500}>{item.symbol}</Text>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Text className={getPercentColor(item.profit)} fw={500}>
                          {formatPercent(item.profit)}
                        </Text>
                      </Table.Td>
                      <Table.Td>{item.trades}</Table.Td>
                      <Table.Td>
                        <Badge
                          color={item.winRate >= 70 ? 'green' : item.winRate >= 60 ? 'yellow' : 'red'}
                          variant="filled"
                          size="sm"
                        >
                          {item.winRate}%
                        </Badge>
                      </Table.Td>
                      <Table.Td className="text-success">
                        +{(item.profit / item.trades).toFixed(2)}%
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>

            {/* Recent Trades */}
            <Paper className="bg-surface border border-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <Text className="text-lg font-bold">Последние сделки</Text>
              </div>
              <ScrollArea className="h-64">
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Время</Table.Th>
                      <Table.Th>Пара</Table.Th>
                      <Table.Th>Сторона</Table.Th>
                      <Table.Th>Прибыль</Table.Th>
                      <Table.Th>Статус</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {recentTrades.map((trade) => (
                      <Table.Tr key={trade.id}>
                        <Table.Td className="text-gray-400 text-sm">
                          {new Date(trade.time).toLocaleTimeString()}
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>{trade.pair}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={trade.side === 'BUY' ? 'green' : 'red'}
                            variant="filled"
                            size="sm"
                          >
                            {trade.side}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text className={getPercentColor(trade.profit)} fw={500}>
                            {trade.profit >= 0 ? '+' : ''}{formatPercent(trade.profit)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={trade.status === 'closed' ? 'green' : 'yellow'}
                            variant="outline"
                            size="sm"
                          >
                            {trade.status === 'closed' ? 'Закрыта' : 'Открыта'}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>
          </div>
        </main>
      </div>
    </div>
  );
}
