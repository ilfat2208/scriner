'use client';

import { useState } from 'react';
import {
  Paper,
  Text,
  Switch,
  Select,
  Slider,
  Group,
  Divider,
  Badge,
} from '@mantine/core';
import {
  Bell,
  Moon,
  Globe,
  Shield,
  Palette,
  Database,
  Terminal,
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  // Notification settings
  const [pushNotifications, setPushNotifications] = useLocalStorage('settings-push-notifications', true);
  const [telegramNotifications, setTelegramNotifications] = useLocalStorage('settings-telegram-notifications', false);
  const [soundEnabled, setSoundEnabled] = useLocalStorage('settings-sound-enabled', true);
  const [whaleAlerts, setWhaleAlerts] = useLocalStorage('settings-whale-alerts', true);
  const [momentumAlerts, setMomentumAlerts] = useLocalStorage('settings-momentum-alerts', true);
  const [priceSpikeAlerts, setPriceSpikeAlerts] = useLocalStorage('settings-price-spike-alerts', true);

  // Appearance
  const [darkMode, setDarkMode] = useLocalStorage('settings-dark-mode', true);
  const [language, setLanguage] = useLocalStorage('settings-language', 'ru');

  // Trading
  const [defaultExchange, setDefaultExchange] = useLocalStorage('settings-default-exchange', 'BINANCE');
  const [defaultMode, setDefaultMode] = useLocalStorage<'FUTURES' | 'SPOT'>('settings-default-mode', 'FUTURES');

  // PUMP settings
  const [longEnabled, setLongEnabled] = useLocalStorage('pump-long-enabled', true);
  const [longPercent, setLongPercent] = useLocalStorage('pump-long-percent', 1.0);
  const [longMinutes, setLongMinutes] = useLocalStorage('pump-long-minutes', 1);
  const [shortEnabled, setShortEnabled] = useLocalStorage('pump-short-enabled', true);
  const [shortPercent, setShortPercent] = useLocalStorage('pump-short-percent', 10.0);
  const [shortMinutes, setShortMinutes] = useLocalStorage('pump-short-minutes', 5);

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
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <Text className="text-sm font-medium truncate">{title}</Text>
          {description && <Text className="text-xs text-gray-400 truncate">{description}</Text>}
        </div>
      </div>
      <div className="flex-shrink-0 ml-2">
        {children}
      </div>
    </div>
  );

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon className="w-5 h-5 text-blue-400" />
        <Text className="text-base font-bold">{title}</Text>
      </div>
      <Paper className="bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
        {children}
      </Paper>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0e1a]/95 backdrop-blur-md border-b border-gray-800">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold">⚙️ Настройки</h1>
          <p className="text-xs text-gray-400">Управление параметрами</p>
        </div>
      </header>

      {/* Settings */}
      <main className="px-4 py-4 space-y-6">
        {/* Notifications */}
        <Section title="Уведомления" icon={Bell}>
          <SettingRow icon={Bell} title="Push-уведомления">
            <Switch
              checked={pushNotifications}
              onChange={(event) => setPushNotifications(event.currentTarget.checked)}
              size="sm"
            />
          </SettingRow>
          <Divider className="border-gray-800" />
          <SettingRow icon={Bell} title="Telegram">
            <Switch
              checked={telegramNotifications}
              onChange={(event) => setTelegramNotifications(event.currentTarget.checked)}
              size="sm"
            />
          </SettingRow>
          <Divider className="border-gray-800" />
          <SettingRow icon={Bell} title="Звук">
            <Switch
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.currentTarget.checked)}
              size="sm"
            />
          </SettingRow>
        </Section>

        {/* Signal Types */}
        <Section title="Типы сигналов" icon={Bell}>
          <SettingRow icon={Bell} title="🐋 Киты">
            <Switch
              checked={whaleAlerts}
              onChange={(event) => setWhaleAlerts(event.currentTarget.checked)}
              size="sm"
              color="violet"
            />
          </SettingRow>
          <Divider className="border-gray-800" />
          <SettingRow icon={Bell} title="📈 Моментум">
            <Switch
              checked={momentumAlerts}
              onChange={(event) => setMomentumAlerts(event.currentTarget.checked)}
              size="sm"
              color="green"
            />
          </SettingRow>
          <Divider className="border-gray-800" />
          <SettingRow icon={Bell} title="📉 Скачки цены">
            <Switch
              checked={priceSpikeAlerts}
              onChange={(event) => setPriceSpikeAlerts(event.currentTarget.checked)}
              size="sm"
              color="red"
            />
          </SettingRow>
        </Section>

        {/* Appearance */}
        <Section title="Внешний вид" icon={Palette}>
          <SettingRow icon={Moon} title="Тёмная тема">
            <Switch
              checked={darkMode}
              onChange={(event) => setDarkMode(event.currentTarget.checked)}
              size="sm"
            />
          </SettingRow>
          <Divider className="border-gray-800" />
          <SettingRow icon={Globe} title="Язык">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-[#1f2937] border border-gray-700 rounded-lg px-2 py-1 text-xs text-white"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </SettingRow>
        </Section>

        {/* Trading */}
        <Section title="Торговля" icon={Database}>
          <SettingRow icon={Database} title="Биржа">
            <select
              value={defaultExchange}
              onChange={(e) => setDefaultExchange(e.target.value)}
              className="bg-[#1f2937] border border-gray-700 rounded-lg px-2 py-1 text-xs text-white"
            >
              <option value="BINANCE">Binance</option>
              <option value="BYBIT">ByBit</option>
            </select>
          </SettingRow>
          <Divider className="border-gray-800" />
          <SettingRow icon={Database} title="Режим">
            <select
              value={defaultMode}
              onChange={(e) => setDefaultMode(e.target.value as any)}
              className="bg-[#1f2937] border border-gray-700 rounded-lg px-2 py-1 text-xs text-white"
            >
              <option value="FUTURES">Фьючерсы</option>
              <option value="SPOT">Спот</option>
            </select>
          </SettingRow>
        </Section>

        {/* PUMP Screener */}
        <Section title="PUMP Скринер" icon={Terminal}>
          {/* LONG */}
          <div className="p-3 bg-green-900/10">
            <div className="flex items-center justify-between mb-3">
              <Text className="text-sm font-bold text-green-400">🟢 LONG</Text>
              <Switch
                checked={longEnabled}
                onChange={(event) => setLongEnabled(event.currentTarget.checked)}
                size="sm"
                color="green"
              />
            </div>
            {longEnabled && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Text className="text-gray-400">Процент</Text>
                    <Text className="text-green-400 font-mono">{longPercent.toFixed(1)}%</Text>
                  </div>
                  <Slider
                    value={longPercent}
                    onChange={(value) => setLongPercent(value)}
                    min={0.1}
                    max={50}
                    step={0.1}
                    size="sm"
                    color="green"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Text className="text-gray-400">Время</Text>
                    <Text className="text-green-400 font-mono">{longMinutes} мин</Text>
                  </div>
                  <Slider
                    value={longMinutes}
                    onChange={(value) => setLongMinutes(value)}
                    min={1}
                    max={30}
                    step={1}
                    size="sm"
                    color="green"
                  />
                </div>
              </div>
            )}
          </div>

          <Divider className="border-gray-800" />

          {/* SHORT */}
          <div className="p-3 bg-red-900/10">
            <div className="flex items-center justify-between mb-3">
              <Text className="text-sm font-bold text-red-400">🔴 SHORT</Text>
              <Switch
                checked={shortEnabled}
                onChange={(event) => setShortEnabled(event.currentTarget.checked)}
                size="sm"
                color="red"
              />
            </div>
            {shortEnabled && (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Text className="text-gray-400">Процент</Text>
                    <Text className="text-red-400 font-mono">{shortPercent.toFixed(1)}%</Text>
                  </div>
                  <Slider
                    value={shortPercent}
                    onChange={(value) => setShortPercent(value)}
                    min={0.1}
                    max={50}
                    step={0.1}
                    size="sm"
                    color="red"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Text className="text-gray-400">Время</Text>
                    <Text className="text-red-400 font-mono">{shortMinutes} мин</Text>
                  </div>
                  <Slider
                    value={shortMinutes}
                    onChange={(value) => setShortMinutes(value)}
                    min={1}
                    max={30}
                    step={1}
                    size="sm"
                    color="red"
                  />
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Bot Commands */}
        <Section title="Команды бота" icon={Terminal}>
          <div className="p-3 space-y-2">
            {[
              { cmd: '/start', desc: 'Запустить бота' },
              { cmd: '/set_interval', desc: 'Интервал мониторинга' },
              { cmd: '/set_threshold', desc: 'Порог изменения цены' },
              { cmd: '/set_rsi', desc: 'Настройка RSI' },
              { cmd: '/set_signals', desc: 'Типы сигналов' },
            ].map((item) => (
              <div key={item.cmd} className="flex items-start gap-2">
                <Badge variant="outline" size="sm" className="font-mono flex-shrink-0">
                  {item.cmd}
                </Badge>
                <Text className="text-xs text-gray-400">{item.desc}</Text>
              </div>
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}
