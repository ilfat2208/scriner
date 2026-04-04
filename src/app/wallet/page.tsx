'use client';

import { useState, useMemo } from 'react';
import {
  Paper,
  Text,
  Button,
  Group,
  Table,
  ScrollArea,
  Badge,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Divider,
  SimpleGrid,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { Sidebar } from '@/components/layout/Sidebar';
import {
  Wallet,
  CreditCard,
  Download,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingUp,
  History,
  Copy,
  Check,
  Plus,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { formatVolume, formatPrice, cn } from '@/lib/utils';

export default function WalletPage() {
  const [sidebarOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
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
    { id: 1, type: 'deposit', asset: 'USDT', amount: 5000, from: 'Bank Transfer', status: 'completed', time: new Date().toISOString() },
    { id: 2, type: 'withdraw', asset: 'BTC', amount: 0.05, to: 'External Wallet', status: 'completed', time: new Date(Date.now() - 86400000).toISOString() },
    { id: 3, type: 'trade', asset: 'ETH', amount: 1.5, pair: 'ETH/USDT', status: 'completed', time: new Date(Date.now() - 172800000).toISOString() },
    { id: 4, type: 'deposit', asset: 'BNB', amount: 10, from: 'Binance', status: 'pending', time: new Date(Date.now() - 259200000).toISOString() },
    { id: 5, type: 'trade', asset: 'SOL', amount: 20, pair: 'SOL/USDT', status: 'completed', time: new Date(Date.now() - 345600000).toISOString() },
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

  const StatCard = ({
    title,
    value,
    subValue,
    icon: Icon,
    color,
  }: {
    title: string;
    value: string;
    subValue?: string;
    icon: any;
    color: string;
  }) => (
    <Paper className="bg-surface border border-gray-800 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div>
          <Text className="text-gray-400 text-sm">{title}</Text>
          <Text className="text-2xl font-bold mt-1" style={{ color }}>{value}</Text>
          {subValue && (
            <Text className={`text-sm mt-1 ${totalChange >= 0 ? 'text-success' : 'text-danger'}`}>
              {subValue}
            </Text>
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
              <h1 className="text-xl font-bold">Кошелёк</h1>
              <p className="text-sm text-gray-400">Управление активами и балансом</p>
            </div>
            <Group>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Обновить
              </Button>
              <Button size="sm" onClick={() => setDepositModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Пополнить
              </Button>
              <Button size="sm" variant="filled" color="red" onClick={() => setWithdrawModalOpen(true)}>
                <Minus className="w-4 h-4 mr-2" />
                Вывести
              </Button>
            </Group>
          </div>
        </header>

        <main className="pt-20 pb-8 px-6">
          <div className="max-w-[1920px] space-y-6">
            {/* Stats */}
            <SimpleGrid cols={4} spacing="md">
              <StatCard
                title="Общий баланс"
                value={formatVolume(totalBalance)}
                subValue={`${totalChange >= 0 ? '+' : ''}${formatVolume(totalChange)} (${totalChangePercent.toFixed(2)}%)`}
                icon={Wallet}
                color="#3b82f6"
              />
              <StatCard
                title="Доступно"
                value={formatVolume(totalBalance * 0.85)}
                icon={DollarSign}
                color="#10b981"
              />
              <StatCard
                title="В ордерах"
                value={formatVolume(totalBalance * 0.15)}
                icon={TrendingUp}
                color="#f59e0b"
              />
              <StatCard
                title="Прибыль 24ч"
                value={`+${formatVolume(totalBalance * 0.025)}`}
                subValue="+2.5%"
                icon={ArrowUpRight}
                color="#10b981"
              />
            </SimpleGrid>

            {/* Main Balance Card */}
            <Paper className="bg-gradient-to-r from-primary/20 to-whale/20 border border-primary/30 rounded-lg p-8">
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-gray-400 text-sm mb-2">Общий баланс в USD</Text>
                  <Text className="text-4xl font-bold text-white">
                    {formatVolume(totalBalance)}
                  </Text>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge color="green" variant="filled">
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      +{totalChangePercent.toFixed(2)}%
                    </Badge>
                    <Text className="text-sm text-gray-400">
                      +{formatVolume(totalChange)} за 24ч
                    </Text>
                  </div>
                </div>
                <div className="text-right">
                  <Text className="text-gray-400 text-sm mb-2">Депозитный адрес (USDT ERC20)</Text>
                  <div className="flex items-center gap-2 bg-surface/50 rounded-lg p-3 border border-gray-700">
                    <code className="text-sm font-mono">{depositAddress.slice(0, 10)}...{depositAddress.slice(-8)}</code>
                    <Tooltip label={copied ? 'Скопировано!' : 'Копировать'} withArrow>
                      <ActionIcon variant="subtle" onClick={handleCopy}>
                        {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      </ActionIcon>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </Paper>

            {/* Balances */}
            <Paper className="bg-surface border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <Text className="text-lg font-bold">Балансы</Text>
                </div>
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Обновить
                </Button>
              </div>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Актив</Table.Th>
                    <Table.Th>Баланс</Table.Th>
                    <Table.Th>В USD</Table.Th>
                    <Table.Th>24ч</Table.Th>
                    <Table.Th>Действия</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {balances.map((balance) => (
                    <Table.Tr key={balance.asset}>
                      <Table.Td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Text className="text-xs font-bold">{balance.asset[0]}</Text>
                          </div>
                          <Text fw={500}>{balance.asset}</Text>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <Text className="font-mono">{balance.amount.toFixed(6)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>{formatVolume(balance.value)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={balance.change >= 0 ? 'green' : 'red'}
                          variant="filled"
                          size="sm"
                        >
                          {balance.change >= 0 ? '+' : ''}{balance.change}%
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <Button variant="outline" size="xs">
                            <ArrowDownRight className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="xs">
                            <ArrowUpRight className="w-3 h-3" />
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>

            {/* Transactions */}
            <Paper className="bg-surface border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  <Text className="text-lg font-bold">История транзакций</Text>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт
                </Button>
              </div>
              <ScrollArea className="h-80">
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Тип</Table.Th>
                      <Table.Th>Актив</Table.Th>
                      <Table.Th>Сумма</Table.Th>
                      <Table.Th>Детали</Table.Th>
                      <Table.Th>Статус</Table.Th>
                      <Table.Th>Время</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {transactions.map((tx) => (
                      <Table.Tr key={tx.id}>
                        <Table.Td>
                          <Badge
                            color={
                              tx.type === 'deposit'
                                ? 'green'
                                : tx.type === 'withdraw'
                                ? 'red'
                                : 'blue'
                            }
                            variant="filled"
                            size="sm"
                          >
                            {tx.type === 'deposit' && <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {tx.type === 'withdraw' && <ArrowUpRight className="w-3 h-3 mr-1" />}
                            {tx.type === 'trade' && <RefreshCw className="w-3 h-3 mr-1" />}
                            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>{tx.asset}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text className="font-mono">
                            {tx.type === 'withdraw' ? '-' : '+'}{tx.amount}
                          </Text>
                        </Table.Td>
                        <Table.Td className="text-gray-400 text-sm">
                          {tx.from || tx.to || tx.pair}
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={tx.status === 'completed' ? 'green' : 'yellow'}
                            variant="outline"
                            size="sm"
                          >
                            {tx.status === 'completed' ? '✓ Выполнено' : '⏳ В обработке'}
                          </Badge>
                        </Table.Td>
                        <Table.Td className="text-gray-400 text-sm">
                          {new Date(tx.time).toLocaleString()}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Paper>

            {/* Quick Actions */}
            <SimpleGrid cols={3} spacing="md">
              <Paper className="bg-surface border border-gray-800 rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                    <Download className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <Text className="font-medium">Пополнить</Text>
                    <Text className="text-sm text-gray-400">USDT, BTC, ETH</Text>
                  </div>
                </div>
              </Paper>
              <Paper className="bg-surface border border-gray-800 rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-danger/10 flex items-center justify-center group-hover:bg-danger/20 transition-colors">
                    <Upload className="w-6 h-6 text-danger" />
                  </div>
                  <div>
                    <Text className="font-medium">Вывести</Text>
                    <Text className="text-sm text-gray-400">На внешний кошелёк</Text>
                  </div>
                </div>
              </Paper>
              <Paper className="bg-surface border border-gray-800 rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <CreditCard className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <Text className="font-medium">Купить крипто</Text>
                    <Text className="text-sm text-gray-400">Банковской картой</Text>
                  </div>
                </div>
              </Paper>
            </SimpleGrid>
          </div>
        </main>
      </div>

      {/* Deposit Modal */}
      <Modal
        opened={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        title="Пополнение счёта"
        centered
      >
        <div className="space-y-4">
          <Select
            label="Выберите актив"
            data={[
              { value: 'USDT', label: 'USDT (ERC20)' },
              { value: 'USDT_TRC20', label: 'USDT (TRC20)' },
              { value: 'BTC', label: 'Bitcoin' },
              { value: 'ETH', label: 'Ethereum' },
            ]}
          />
          <TextInput
            label="Адрес кошелька"
            value={depositAddress}
            readOnly
            rightSection={
              <ActionIcon variant="subtle" onClick={handleCopy}>
                <Copy className="w-4 h-4" />
              </ActionIcon>
            }
          />
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <Text className="text-sm text-yellow-500">
              ⚠️ Отправляйте только {depositAddress.slice(0, 10)}... на этот адрес. 
              Отправка других активов может привести к потере средств.
            </Text>
          </div>
          <Button fullWidth onClick={() => setDepositModalOpen(false)}>
            Понятно
          </Button>
        </div>
      </Modal>

      {/* Withdraw Modal */}
      <Modal
        opened={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        title="Вывод средств"
        centered
      >
        <div className="space-y-4">
          <Select
            label="Актив"
            data={[
              { value: 'USDT', label: 'USDT' },
              { value: 'BTC', label: 'BTC' },
              { value: 'ETH', label: 'ETH' },
            ]}
          />
          <TextInput
            label="Адрес получателя"
            placeholder="Введите адрес кошелька"
          />
          <NumberInput
            label="Сумма"
            placeholder="0.00"
            min={0}
            rightSection={
              <Button variant="subtle" size="xs">MAX</Button>
            }
          />
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <Text className="text-sm text-blue-400">
              💡 Комиссия сети будет вычтена из суммы перевода.
              Проверьте адрес перед подтверждением.
            </Text>
          </div>
          <Group className="w-full">
            <Button variant="outline" fullWidth onClick={() => setWithdrawModalOpen(false)}>
              Отмена
            </Button>
            <Button fullWidth color="red">
              Вывести
            </Button>
          </Group>
        </div>
      </Modal>
    </div>
  );
}
