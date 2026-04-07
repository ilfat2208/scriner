'use client';

import { useState, useEffect } from 'react';
import { Paper, Text, Badge, Button, Modal, TextInput, NumberInput, Select, Loader, PasswordInput } from '@mantine/core';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { formatVolume, cn } from '@/lib/utils';

interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usd_value: number;
}

interface PriceData {
  [symbol: string]: number;
}

export default function WalletPage() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [prices, setPrices] = useState<PriceData>({});
  const [loading, setLoading] = useState(true);
  const [totalUsd, setTotalUsd] = useState(0);
  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [orderModal, setOrderModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderSymbol, setOrderSymbol] = useState('BTC/USDT');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderMode, setOrderMode] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [copied, setCopied] = useState(false);
  const [keysSaved, setKeysSaved] = useState(false);

  const depositAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wallet/balances', {
        headers: {
          // Telegram User ID из window.Telegram.WebApp.initDataUnsafe.user?.id
          'X-Telegram-User-ID': '1221745483', // Заменить на динамический
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBalances(data.balances);
        setTotalUsd(data.total_usd);
      }
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    try {
      const response = await fetch('/api/wallet/prices');
      if (response.ok) {
        const data = await response.json();
        setPrices(data.prices);
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  };

  const saveApiKeys = async () => {
    try {
      const response = await fetch('/api/wallet/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-User-ID': '1221745483',
        },
        body: JSON.stringify({
          api_key: apiKey,
          api_secret: apiSecret,
          exchange: 'BINANCE',
          market_type: 'FUTURES',
        }),
      });

      if (response.ok) {
        setKeysSaved(true);
        setApiKeyModal(false);
        fetchBalances();
      }
    } catch (error) {
      console.error('Failed to save API keys:', error);
    }
  };

  const createOrder = async () => {
    try {
      const response = await fetch('/api/wallet/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-User-ID': '1221745483',
        },
        body: JSON.stringify({
          symbol: orderSymbol.replace('/', ''),
          side: orderType,
          order_type: orderMode,
          quantity: parseFloat(orderQuantity),
          price: orderMode === 'LIMIT' ? parseFloat(orderPrice) : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`✅ Ордер создан!\nID: ${data.order_id}\nСтатус: ${data.status}`);
        setOrderModal(false);
        fetchBalances();
      } else {
        alert(`❌ Ошибка: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('❌ Ошибка создания ордера');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    fetchBalances();
    fetchPrices();
  }, []);

  const getAssetIcon = (asset: string) => {
    const icons: { [key: string]: string } = {
      'BTC': '₿',
      'ETH': 'Ξ',
      'USDT': '💵',
      'BNB': '🔶',
      'SOL': '◎',
      'XRP': '✕',
    };
    return icons[asset] || '💰';
  };

  if (loading && balances.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader size="lg" color="blue" />
          <Text className="text-gray-400 mt-4">Загрузка балансов...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0e1a]/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">💰 Кошелёк</h1>
              <Text className="text-xs text-gray-400">Binance Futures</Text>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setApiKeyModal(true)}
                className="p-2 rounded-lg bg-gray-800 active:scale-95 transition-transform"
              >
                <Key className="w-5 h-5 text-yellow-400" />
              </button>
              <button
                onClick={fetchBalances}
                className="p-2 rounded-lg bg-gray-800 active:scale-95 transition-transform"
              >
                <RefreshCw className="w-5 h-5 text-blue-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Total Balance Card */}
        <Paper className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-4">
          <Text className="text-gray-400 text-xs mb-1">Общий баланс</Text>
          <Text className="text-3xl font-bold text-white mb-2">
            ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <div className="flex items-center gap-2">
            <Badge color="blue" size="sm">Futures</Badge>
            <Badge color="green" size="sm">{balances.length} активов</Badge>
          </div>
        </Paper>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setOrderType('BUY');
              setOrderModal(true);
            }}
            className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 active:scale-95 transition-transform"
          >
            <ArrowDownRight className="w-6 h-6 mx-auto mb-1 text-green-400" />
            <Text className="text-sm font-medium text-green-400">Купить</Text>
          </button>
          <button
            onClick={() => {
              setOrderType('SELL');
              setOrderModal(true);
            }}
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 active:scale-95 transition-transform"
          >
            <ArrowUpRight className="w-6 h-6 mx-auto mb-1 text-red-400" />
            <Text className="text-sm font-medium text-red-400">Продать</Text>
          </button>
        </div>

        {/* Balances */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Wallet className="w-5 h-5 text-blue-400" />
            <Text className="text-base font-bold">Балансы</Text>
          </div>
          
          {balances.length === 0 ? (
            <Paper className="bg-[#111827] border border-gray-800 rounded-lg p-6 text-center">
              <Text className="text-gray-400 mb-2">Нет балансов</Text>
              <Text className="text-xs text-gray-500 mb-4">
                Добавьте API ключи Binance для отображения балансов
              </Text>
              <Button
                onClick={() => setApiKeyModal(true)}
                size="sm"
                variant="outline"
              >
                <Key className="w-4 h-4 mr-2" />
                Добавить API ключи
              </Button>
            </Paper>
          ) : (
            <div className="space-y-2">
              {balances.map((balance) => (
                <Paper
                  key={balance.asset}
                  className="bg-[#111827] border border-gray-800 rounded-lg p-3 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Text className="text-lg">
                          {getAssetIcon(balance.asset)}
                        </Text>
                      </div>
                      <div>
                        <Text fw={600}>{balance.asset}</Text>
                        <Text className="text-xs text-gray-400 font-mono">
                          {balance.total.toFixed(6)}
                        </Text>
                      </div>
                    </div>
                    <div className="text-right">
                      <Text fw={600}>
                        ${balance.usd_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      {balance.locked > 0 && (
                        <Badge color="yellow" size="xs" variant="outline">
                          {balance.locked.toFixed(4)} locked
                        </Badge>
                      )}
                    </div>
                  </div>
                </Paper>
              ))}
            </div>
          )}
        </div>

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
      </main>

      {/* API Keys Modal */}
      <Modal
        opened={apiKeyModal}
        onClose={() => setApiKeyModal(false)}
        title="🔑 API ключи Binance"
        centered
      >
        <div className="space-y-4">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <Text className="text-xs text-yellow-400">
              ⚠️ Используйте API ключи только для торговли. НЕ включайте разрешение на вывод средств!
            </Text>
          </div>
          
          <TextInput
            label="API Key"
            placeholder="Введите API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          
          <PasswordInput
            label="API Secret"
            placeholder="Введите API Secret"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            visibilityToggle
          />
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setApiKeyModal(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={saveApiKeys}
              disabled={!apiKey || !apiSecret}
            >
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Order Modal */}
      <Modal
        opened={orderModal}
        onClose={() => setOrderModal(false)}
        title={orderType === 'BUY' ? '🟢 Купить' : '🔴 Продать'}
        centered
      >
        <div className="space-y-4">
          {/* Buy/Sell Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOrderType('BUY')}
              className={cn(
                'p-2 rounded-lg text-sm font-medium transition-colors',
                orderType === 'BUY'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-gray-800 text-gray-400'
              )}
            >
              Купить
            </button>
            <button
              onClick={() => setOrderType('SELL')}
              className={cn(
                'p-2 rounded-lg text-sm font-medium transition-colors',
                orderType === 'SELL'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-gray-800 text-gray-400'
              )}
            >
              Продать
            </button>
          </div>

          {/* Symbol */}
          <Select
            label="Торговая пара"
            value={orderSymbol}
            onChange={(value) => value && setOrderSymbol(value)}
            data={[
              { value: 'BTC/USDT', label: 'BTC/USDT' },
              { value: 'ETH/USDT', label: 'ETH/USDT' },
              { value: 'SOL/USDT', label: 'SOL/USDT' },
              { value: 'BNB/USDT', label: 'BNB/USDT' },
              { value: 'XRP/USDT', label: 'XRP/USDT' },
            ]}
          />

          {/* Order Type */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOrderMode('MARKET')}
              className={cn(
                'p-2 rounded-lg text-sm font-medium transition-colors',
                orderMode === 'MARKET'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-800 text-gray-400'
              )}
            >
              Market
            </button>
            <button
              onClick={() => setOrderMode('LIMIT')}
              className={cn(
                'p-2 rounded-lg text-sm font-medium transition-colors',
                orderMode === 'LIMIT'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-800 text-gray-400'
              )}
            >
              Limit
            </button>
          </div>

          {/* Quantity */}
          <NumberInput
            label="Количество"
            placeholder="0.00"
            value={orderQuantity}
            onChange={(value) => setOrderQuantity(value?.toString() || '')}
            min={0}
            step={0.001}
          />

          {/* Price (for Limit orders) */}
          {orderMode === 'LIMIT' && (
            <NumberInput
              label="Цена (USDT)"
              placeholder="0.00"
              value={orderPrice}
              onChange={(value) => setOrderPrice(value?.toString() || '')}
              min={0}
              step={0.01}
            />
          )}

          {/* Submit */}
          <Button
            fullWidth
            color={orderType === 'BUY' ? 'green' : 'red'}
            onClick={createOrder}
            disabled={!orderQuantity || (orderMode === 'LIMIT' && !orderPrice)}
          >
            {orderType === 'BUY' ? 'Купить' : 'Продать'} {orderSymbol}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
