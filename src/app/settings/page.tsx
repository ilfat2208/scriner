'use client';

import { useState } from 'react';
import {
  Paper,
  Text,
  Switch,
  Select,
  Slider,
  Group,
  TextInput,
  PasswordInput,
  Button,
  Divider,
  Badge,
  Tooltip,
  ActionIcon,
  Box,
} from '@mantine/core';
import { Sidebar } from '@/components/layout/Sidebar';
import {
  Bell,
  Moon,
  Globe,
  Shield,
  Palette,
  Database,
  Trash2,
  Save,
  RotateCcw,
  Mail,
  Smartphone,
  Send,
  Eye,
  EyeOff,
  Check,
  X,
  Terminal,
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [sidebarOpen] = useState(false);

  // Notification settings
  const [pushNotifications, setPushNotifications] = useLocalStorage('settings-push-notifications', true);
  const [emailNotifications, setEmailNotifications] = useLocalStorage('settings-email-notifications', false);
  const [telegramNotifications, setTelegramNotifications] = useLocalStorage('settings-telegram-notifications', false);
  const [soundEnabled, setSoundEnabled] = useLocalStorage('settings-sound-enabled', true);
  const [whaleAlerts, setWhaleAlerts] = useLocalStorage('settings-whale-alerts', true);
  const [momentumAlerts, setMomentumAlerts] = useLocalStorage('settings-momentum-alerts', true);
  const [priceSpikeAlerts, setPriceSpikeAlerts] = useLocalStorage('settings-price-spike-alerts', true);

  // Appearance settings
  const [darkMode, setDarkMode] = useLocalStorage('settings-dark-mode', true);
  const [theme, setTheme] = useLocalStorage<'default' | 'ocean' | 'forest' | 'sunset'>('settings-theme', 'default');
  const [language, setLanguage] = useLocalStorage('settings-language', 'ru');
  const [timezone, setTimezone] = useLocalStorage('settings-timezone', 'UTC');

  // Trading settings
  const [defaultExchange, setDefaultExchange] = useLocalStorage('settings-default-exchange', 'BINANCE');
  const [defaultMode, setDefaultMode] = useLocalStorage<'FUTURES' | 'SPOT'>('settings-default-mode', 'FUTURES');
  const [defaultInterval, setDefaultInterval] = useLocalStorage('settings-default-interval', '15m');
  const [minVolume, setMinVolume] = useLocalStorage('settings-min-volume', 1000000);

  // Account settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('user@example.com');
  const [telegramId, setTelegramId] = useState('');

  // PUMP Detector settings
  const [longEnabled, setLongEnabled] = useLocalStorage('pump-long-enabled', true);
  const [longPercent, setLongPercent] = useLocalStorage('pump-long-percent', 1.0);
  const [longMinutes, setLongMinutes] = useLocalStorage('pump-long-minutes', 1);
  const [shortEnabled, setShortEnabled] = useLocalStorage('pump-short-enabled', true);
  const [shortPercent, setShortPercent] = useLocalStorage('pump-short-percent', 10.0);
  const [shortMinutes, setShortMinutes] = useLocalStorage('pump-short-minutes', 5);

  const themes = [
    { value: 'default', label: 'По умолчанию', color: '#1a1b1e' },
    { value: 'ocean', label: 'Океан', color: '#0c4a6e' },
    { value: 'forest', label: 'Лес', color: '#14532d' },
    { value: 'sunset', label: 'Закат', color: '#7c2d12' },
  ];

  const languages = [
    { value: 'ru', label: 'Русский' },
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
    { value: 'ja', label: '日本語' },
  ];

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
    { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
    { value: 'America/New_York', label: 'Нью-Йорк (UTC-5)' },
  ];

  const exchanges = [
    { value: 'BINANCE', label: 'Binance' },
    { value: 'BYBIT', label: 'ByBit' },
    { value: 'OKX', label: 'OKX' },
    { value: 'GATEIO', label: 'Gate' },
    { value: 'MEXC', label: 'MEXC' },
  ];

  const intervals = [
    { value: '1m', label: '1 минута' },
    { value: '5m', label: '5 минут' },
    { value: '15m', label: '15 минут' },
    { value: '1h', label: '1 час' },
    { value: '4h', label: '4 часа' },
    { value: '1d', label: '1 день' },
  ];

  const SettingRow = ({
    icon: Icon,
    title,
    description,
    children,
  }: {
    icon: any;
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <Text className="font-medium">{title}</Text>
          {description && <Text className="text-sm text-gray-400">{description}</Text>}
        </div>
      </div>
      {children}
    </div>
  );

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <Paper className="bg-surface border border-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Icon className="w-6 h-6 text-primary" />
        <Text className="text-lg font-bold">{title}</Text>
      </div>
      <div className="space-y-4">
        {children}
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
              <h1 className="text-xl font-bold">Настройки</h1>
              <p className="text-sm text-gray-400">Управление параметрами приложения</p>
            </div>
            <Group>
              <Button variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Сбросить
              </Button>
              <Button size="sm">
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>
            </Group>
          </div>
        </header>

        <main className="pt-20 pb-8 px-6">
          <div className="max-w-4xl space-y-6">
            {/* Notifications */}
            <Section title="Уведомления" icon={Bell}>
              <SettingRow
                icon={Bell}
                title="Push-уведомления"
                description="Получать уведомления в браузере"
              >
                <Switch
                  checked={pushNotifications}
                  onChange={(event) => setPushNotifications(event.currentTarget.checked)}
                  size="lg"
                />
              </SettingRow>
              <Divider />
              <SettingRow
                icon={Mail}
                title="Email-уведомления"
                description="Получать уведомления на почту"
              >
                <Switch
                  checked={emailNotifications}
                  onChange={(event) => setEmailNotifications(event.currentTarget.checked)}
                  size="lg"
                />
              </SettingRow>
              <Divider />
              <SettingRow
                icon={Send}
                title="Telegram-уведомления"
                description="Получать уведомления в Telegram"
              >
                <Switch
                  checked={telegramNotifications}
                  onChange={(event) => setTelegramNotifications(event.currentTarget.checked)}
                  size="lg"
                />
              </SettingRow>
              <Divider />
              <SettingRow
                icon={Bell}
                title="Звуковые сигналы"
                description="Воспроизводить звук при новых сигналах"
              >
                <Switch
                  checked={soundEnabled}
                  onChange={(event) => setSoundEnabled(event.currentTarget.checked)}
                  size="lg"
                />
              </SettingRow>
            </Section>

            {/* Alert Types */}
            <Section title="Типы сигналов" icon={Bell}>
              <SettingRow
                icon={Bell}
                title="Киты (WHALE)"
                description="Крупные сделки от китов"
              >
                <Switch
                  checked={whaleAlerts}
                  onChange={(event) => setWhaleAlerts(event.currentTarget.checked)}
                  size="lg"
                  color="violet"
                />
              </SettingRow>
              <Divider />
              <SettingRow
                icon={Bell}
                title="Моментум (MOMENTUM)"
                description="Сильное движение цены"
              >
                <Switch
                  checked={momentumAlerts}
                  onChange={(event) => setMomentumAlerts(event.currentTarget.checked)}
                  size="lg"
                  color="green"
                />
              </SettingRow>
              <Divider />
              <SettingRow
                icon={Bell}
                title="Скачки цены (PRICE_SPIKE)"
                description="Резкие изменения цены"
              >
                <Switch
                  checked={priceSpikeAlerts}
                  onChange={(event) => setPriceSpikeAlerts(event.currentTarget.checked)}
                  size="lg"
                  color="red"
                />
              </SettingRow>
            </Section>

            {/* Appearance */}
            <Section title="Внешний вид" icon={Palette}>
              <SettingRow
                icon={Moon}
                title="Тёмная тема"
                description="Использовать тёмную тему оформления"
              >
                <Switch
                  checked={darkMode}
                  onChange={(event) => setDarkMode(event.currentTarget.checked)}
                  size="lg"
                />
              </SettingRow>
              <Divider />
              <div className="py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Text className="font-medium">Цветовая схема</Text>
                    <Text className="text-sm text-gray-400">Выберите тему оформления</Text>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {themes.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value as any)}
                      className={cn(
                        'p-3 rounded-lg border-2 transition-all',
                        theme === t.value
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-700 hover:border-gray-600'
                      )}
                    >
                      <div
                        className="w-full h-8 rounded mb-2"
                        style={{ backgroundColor: t.color }}
                      />
                      <Text className="text-xs text-center">{t.label}</Text>
                    </button>
                  ))}
                </div>
              </div>
              <Divider />
              <SettingRow
                icon={Globe}
                title="Язык"
                description="Язык интерфейса"
              >
                <Select
                  value={language}
                  onChange={(value) => value && setLanguage(value)}
                  data={languages}
                  className="w-40"
                />
              </SettingRow>
              <Divider />
              <SettingRow
                icon={Globe}
                title="Часовой пояс"
                description="Отображение времени"
              >
                <Select
                  value={timezone}
                  onChange={(value) => value && setTimezone(value)}
                  data={timezones}
                  className="w-48"
                />
              </SettingRow>
            </Section>

            {/* Trading Settings */}
            <Section title="Торговые настройки" icon={Database}>
              <SettingRow
                icon={Database}
                title="Биржа по умолчанию"
                description="Биржа для отображения при запуске"
              >
                <Select
                  value={defaultExchange}
                  onChange={(value) => value && setDefaultExchange(value)}
                  data={exchanges}
                  className="w-40"
                />
              </SettingRow>
              <Divider />
              <SettingRow
                icon={Database}
                title="Режим по умолчанию"
                description="Фьючерсы или спот"
              >
                <Select
                  value={defaultMode}
                  onChange={(value) => value && setDefaultMode(value as any)}
                  data={[
                    { value: 'FUTURES', label: 'Фьючерсы' },
                    { value: 'SPOT', label: 'Спот' },
                  ]}
                  className="w-40"
                />
              </SettingRow>
              <Divider />
              <SettingRow
                icon={Database}
                title="Таймфрейм по умолчанию"
                description="Интервал свечей"
              >
                <Select
                  value={defaultInterval}
                  onChange={(value) => value && setDefaultInterval(value)}
                  data={intervals}
                  className="w-40"
                />
              </SettingRow>
              <Divider />
              <div className="py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Text className="font-medium">Минимальный объём</Text>
                    <Text className="text-sm text-gray-400">
                      Фильтр сигналов по объёму: ${minVolume.toLocaleString()}
                    </Text>
                  </div>
                </div>
                <Slider
                  value={minVolume}
                  onChange={(value) => setMinVolume(value)}
                  min={100000}
                  max={10000000}
                  step={100000}
                  marks={[
                    { value: 100000, label: '$100K' },
                    { value: 1000000, label: '$1M' },
                    { value: 5000000, label: '$5M' },
                    { value: 10000000, label: '$10M' },
                  ]}
                  className="mt-4"
                />
              </div>
            </Section>

            {/* Account */}
            <Section title="Аккаунт" icon={Shield}>
              <div className="py-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Text className="font-medium">Email</Text>
                    <Text className="text-sm text-gray-400">Используется для уведомлений</Text>
                  </div>
                </div>
                <TextInput
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="max-w-md"
                />
              </div>
              <Divider />
              <div className="py-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Send className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Text className="font-medium">Telegram ID</Text>
                    <Text className="text-sm text-gray-400">Для получения уведомлений</Text>
                  </div>
                </div>
                <TextInput
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  placeholder="@username или ID"
                  className="max-w-md"
                />
              </div>
              <Divider />
              <div className="py-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Text className="font-medium">Смена пароля</Text>
                    <Text className="text-sm text-gray-400">Обновите пароль для безопасности</Text>
                  </div>
                </div>
                <div className="space-y-3 max-w-md">
                  <PasswordInput
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Текущий пароль"
                  />
                  <PasswordInput
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Новый пароль"
                  />
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Подтвердите пароль"
                  />
                  <Group className="mt-4">
                    <Button variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Показать пароли
                    </Button>
                    <Button>
                      <Check className="w-4 h-4 mr-2" />
                      Обновить пароль
                    </Button>
                  </Group>
                </div>
              </div>
            </Section>

            {/* PUMP Screener Control Panel */}
            <Section title="Панель управления PUMP скринером" icon={Terminal}>
              <div className="space-y-6">
                {/* LONG Settings */}
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Text className="font-bold text-green-400">🟢 LONG комбинация</Text>
                    </div>
                    <Switch
                      checked={longEnabled}
                      onChange={(event) => setLongEnabled(event.currentTarget.checked)}
                      color="green"
                      size="lg"
                    />
                  </div>
                  {longEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Text className="text-sm text-gray-400 mb-2">Минимальный процент пампа</Text>
                        <Slider
                          value={longPercent}
                          onChange={(value) => setLongPercent(value)}
                          min={0.1}
                          max={100}
                          step={0.1}
                          marks={[
                            { value: 0.1, label: '0.1%' },
                            { value: 50, label: '50%' },
                            { value: 100, label: '100%' },
                          ]}
                        />
                        <Text className="text-center mt-2 font-mono text-green-400">{longPercent.toFixed(1)}%</Text>
                      </div>
                      <div>
                        <Text className="text-sm text-gray-400 mb-2">Время (минуты)</Text>
                        <Slider
                          value={longMinutes}
                          onChange={(value) => setLongMinutes(value)}
                          min={1}
                          max={30}
                          step={1}
                          marks={[
                            { value: 1, label: '1 мин' },
                            { value: 15, label: '15 мин' },
                            { value: 30, label: '30 мин' },
                          ]}
                        />
                        <Text className="text-center mt-2 font-mono text-green-400">{longMinutes} мин</Text>
                      </div>
                    </div>
                  )}
                </div>

                {/* SHORT Settings */}
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Text className="font-bold text-red-400">🔴 SHORT комбинация</Text>
                    </div>
                    <Switch
                      checked={shortEnabled}
                      onChange={(event) => setShortEnabled(event.currentTarget.checked)}
                      color="red"
                      size="lg"
                    />
                  </div>
                  {shortEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Text className="text-sm text-gray-400 mb-2">Минимальный процент пампа</Text>
                        <Slider
                          value={shortPercent}
                          onChange={(value) => setShortPercent(value)}
                          min={0.1}
                          max={100}
                          step={0.1}
                          marks={[
                            { value: 0.1, label: '0.1%' },
                            { value: 50, label: '50%' },
                            { value: 100, label: '100%' },
                          ]}
                        />
                        <Text className="text-center mt-2 font-mono text-red-400">{shortPercent.toFixed(1)}%</Text>
                      </div>
                      <div>
                        <Text className="text-sm text-gray-400 mb-2">Время (минуты)</Text>
                        <Slider
                          value={shortMinutes}
                          onChange={(value) => setShortMinutes(value)}
                          min={1}
                          max={30}
                          step={1}
                          marks={[
                            { value: 1, label: '1 мин' },
                            { value: 15, label: '15 мин' },
                            { value: 30, label: '30 мин' },
                          ]}
                        />
                        <Text className="text-center mt-2 font-mono text-red-400">{shortMinutes} мин</Text>
                      </div>
                    </div>
                  )}
                </div>

                {/* Apply Button */}
                <div className="flex justify-center">
                  <Button 
                    size="lg" 
                    color="green"
                    className="w-full md:w-auto"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Применить настройки
                  </Button>
                </div>

                <Text className="text-xs text-gray-500 text-center">
                  Настройки сохраняются в браузере. Для применения на сервере используйте команды Telegram.
                </Text>
              </div>
            </Section>

            {/* Telegram Bot Commands */}
            <Section title="Команды Telegram бота" icon={Terminal}>
              <div className="py-2">
                <Text className="text-sm text-gray-400 mb-4">
                  Доступные команды для настройки PUMP скринера в Telegram:
                </Text>
                <div className="space-y-3">
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <Text className="font-mono text-green-400 font-bold">/pump_config</Text>
                    <Text className="text-sm text-gray-400">Показать текущие настройки PUMP детектора</Text>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <Text className="font-mono text-green-400 font-bold">/set_long &lt;процент&gt; &lt;минуты&gt;</Text>
                    <Text className="text-sm text-gray-400">Настроить LONG комбинацию (вход в лонг)</Text>
                    <Text className="text-xs text-gray-500 mt-1">Пример: /set_long 1 1 = 1% за 1 минуту</Text>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <Text className="font-mono text-red-400 font-bold">/set_short &lt;процент&gt; &lt;минуты&gt;</Text>
                    <Text className="text-sm text-gray-400">Настроить SHORT комбинацию (вход в шорт)</Text>
                    <Text className="text-xs text-gray-500 mt-1">Пример: /set_short 10 5 = 10% за 5 минут</Text>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <Text className="font-mono text-blue-400 font-bold">/set_long on</Text>
                    <Text className="text-sm text-gray-400">Включить LONG комбинацию</Text>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <Text className="font-mono text-blue-400 font-bold">/set_long off</Text>
                    <Text className="text-sm text-gray-400">Выключить LONG комбинацию</Text>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <Text className="font-mono text-blue-400 font-bold">/set_short on</Text>
                    <Text className="text-sm text-gray-400">Включить SHORT комбинацию</Text>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <Text className="font-mono text-blue-400 font-bold">/set_short off</Text>
                    <Text className="text-sm text-gray-400">Выключить SHORT комбинацию</Text>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <Text className="font-mono text-yellow-400 font-bold">/status</Text>
                    <Text className="text-sm text-gray-400">Показать статус системы</Text>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                    <Text className="font-mono text-yellow-400 font-bold">/logs</Text>
                    <Text className="text-sm text-gray-400">Показать последние алерты</Text>
                  </div>
                </div>
              </div>
            </Section>

            {/* Data Management */}
            <Section title="Управление данными" icon={Database}>
              <SettingRow
                icon={Database}
                title="Очистить кэш"
                description="Удалить все закэшированные данные"
              >
                <Button variant="outline" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Очистить
                </Button>
              </SettingRow>
              <Divider />
              <SettingRow
                icon={Database}
                title="Сброс настроек"
                description="Вернуть все настройки к значениям по умолчанию"
              >
                <Button variant="outline" color="red" size="sm">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Сбросить
                </Button>
              </SettingRow>
              <Divider />
              <SettingRow
                icon={Database}
                title="Экспорт данных"
                description="Скачать все данные в формате JSON"
              >
                <Button variant="outline" size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Экспорт
                </Button>
              </SettingRow>
            </Section>
          </div>
        </main>
      </div>
    </div>
  );
}
