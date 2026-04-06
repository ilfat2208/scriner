'use client';

import { useState, useMemo } from 'react';
import { Paper, Text, Badge, Group } from '@mantine/core';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Copy,
  Check,
  History,
} from 'lucide-react';
import { formatVolume, cn } from '@/lib/utils';

export default function WalletPage() {
  const [copied, setCopied] = useState(false);

  // Mock data
  const balances = useMemo(() => [
    { asset: 'USDT', amount: 12458.32, value: 12458.32, change: 2.5 },
    { asset: 'BTC', amount: 0.15234, value: 9847.21, change: 5.2 },
    { asset: 'ETH', amount: 2.4521, value: 5632.18, change: -1.3 },
    { asset: 'BNB', amount: 12.5, value: 3875.00, change: 3.8 },
    { asset: 'SOL', amount: 45.2, value: 4521.60, change: 8.4 },
  ], []);

  const transactions = useMemo(() => [
    { id: 1, type: 'deposit', asset: 'USDT', amount: 5000, status: 'completed', time: new Date().toISOString() },
    { id: 2, type: 'withdraw', asset: 'BTC', amount: 0.05, status: 'completed', time: new Date(Date.now() - 86400000).toISOString() },
    { id: 3, type: 'trade', asset: 'ETH', amount: 1.5, pair: 'ETH/USDT', status: 'completed', time: new Date(Date.now() - 172800000).toISOString() },
    { id: 4, type: 'deposit', asset: 'BNB', amount: 10, status: 'pending', time: new Date(Date.now() - 259200000).toISOString() },
  ], []);

  const totalBalance = balances.reduce((sum, b) => sum + b.value, 0);
  const totalChange = balances.reduce((sum, b) => sum + (b.value * b.change / 100), 0);
  const totalChangePercent = (totalChange / totalBalance) * 100;

  const depositAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  const handleCopy = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit': return { icon: ArrowDownRight, color: 'text-green-400', bg: 'bg-green-500/10' };
      case 'withdraw': return { icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/10' };
      case 'trade': return { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10' };
      default: return { icon: Wallet, color: 'text-gray-400', bg: 'bg-gray-500/10' };
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0e1a]/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold">💰 Кошелёк</h1>
          <p className="text-xs text-gray-400">Управление активами</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Balance Card */}
        <Paper className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-4">
          <Text className="text-gray-400 text-xs mb-1">Общий баланс</Text>
          <Text className="text-3xl font-bold text-white mb-2">
            {formatVolume(totalBalance)}
          </Text>
          <div className="flex items-center gap-2">
            <Badge color="green" size="sm">
              +{totalChangePercent.toFixed(2)}%
            </Badge>
            <Text className="text-xs text-gray-400">
              +{formatVolume(totalChange)} за 24ч
            </Text>
          </div>
        </Paper>

        {/* Deposit Address */}
        <Paper className="bg-[#111827] border border-gray-800 rounded-lg p-3">
          <Text className="text-xs text-gray-400 mb-2">Депозитный адрес (USDT ERC20)</Text>
          <div className="flex items-center gap-2 bg-[#0a0e1a] rounded-lg p-2.5 border border-gray-700">
            <code className="text-xs font-mono flex-1 truncate">
              {depositAddress.slice(0, 8)}...{depositAddress.slice(-6)}
            </code>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-gray-800 active:scale-90 transition-transform"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        </Paper>

        {/* Balances */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Wallet className="w-5 h-5 text-blue-400" />
            <Text className="text-base font-bold">Балансы</Text>
          </div>
          <div className="space-y-2">
            {balances.map((balance) => (
              <Paper
                key={balance.asset}
                className="bg-[#111827] border border-gray-800 rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Text className="text-sm font-bold text-blue-400">
                        {balance.asset[0]}
                      </Text>
                    </div>
                    <div>
                      <Text fw={600}>{balance.asset}</Text>
                      <Text className="text-xs text-gray-400 font-mono">
                        {balance.amount.toFixed(6)}
                      </Text>
                    </div>
                  </div>
                  <div className="text-right">
                    <Text fw={600}>{formatVolume(balance.value)}</Text>
                    <Badge
                      color={balance.change >= 0 ? 'green' : 'red'}
                      size="xs"
                    >
                      {balance.change >= 0 ? '+' : ''}{balance.change}%
                    </Badge>
                  </div>
                </div>
              </Paper>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <History className="w-5 h-5 text-blue-400" />
            <Text className="text-base font-bold">История</Text>
          </div>
          <div className="space-y-2">
            {transactions.map((tx) => {
              const { icon: Icon, color, bg } = getTransactionIcon(tx.type);
              
              return (
                <Paper
                  key={tx.id}
                  className="bg-[#111827] border border-gray-800 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', bg)}>
                      <Icon className={cn('w-5 h-5', color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <Text fw={500} className="capitalize">
                          {tx.type === 'deposit' ? 'Пополнение' : tx.type === 'withdraw' ? 'Вывод' : 'Торговля'}
                        </Text>
                        <Text className={cn(
                          'font-mono',
                          tx.type === 'deposit' ? 'text-green-400' : tx.type === 'withdraw' ? 'text-red-400' : ''
                        )}>
                          {tx.type === 'withdraw' ? '-' : '+'}{tx.amount} {tx.asset}
                        </Text>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <Text className="text-xs text-gray-400">
                          {tx.pair || ''}
                        </Text>
                        <div className="flex items-center gap-2">
                          <Badge
                            color={tx.status === 'completed' ? 'green' : 'yellow'}
                            size="xs"
                            variant="outline"
                          >
                            {tx.status === 'completed' ? '✓' : '⏳'}
                          </Badge>
                          <Text className="text-xs text-gray-500">
                            {new Date(tx.time).toLocaleDateString('ru-RU')}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </div>
                </Paper>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
