'use client';

import { Bell, User, Search, Menu, Zap, Settings, LogOut, Keyboard, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Mode, Interval, GridSize, PriceRange } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { Tooltip } from '@mantine/core';
import { formatTime } from '@/lib/utils';

interface MainHeaderProps {
  onMenuClick?: () => void;
  exchange: string;
  mode: Mode;
  interval: Interval;
  gridSize: GridSize;
  priceRange: PriceRange;
  onExchangeChange: (value: string) => void;
  onModeChange: (value: Mode) => void;
  onIntervalChange: (value: Interval) => void;
  onGridSizeChange: (value: GridSize) => void;
  onPriceRangeChange: (value: PriceRange) => void;
  onRefresh?: () => void;
}

const EXCHANGES = [
  { value: 'BINANCE', label: 'Binance', emoji: '🟡' },
  { value: 'BYBIT', label: 'ByBit', emoji: '🔵' },
  { value: 'OKX', label: 'OKX', emoji: '⚫' },
  { value: 'GATEIO', label: 'Gate', emoji: '🟢' },
  { value: 'MEXC', label: 'MEXC', emoji: '🔷' },
];

const MODES = [
  { value: 'FUTURES', label: 'Фьючерсы' },
  { value: 'SPOT', label: 'Спот' },
];

const INTERVALS = [
  { value: '1m', label: '1м' },
  { value: '5m', label: '5м' },
  { value: '15m', label: '15м' },
  { value: '1h', label: '1ч' },
  { value: '4h', label: '4ч' },
  { value: '1d', label: '1д' },
];

const GRID_SIZES = [
  { value: '4', label: '4 (2×2)' },
  { value: '9', label: '9 (3×3)' },
  { value: '16', label: '16 (4×4)' },
  { value: '25', label: '25 (5×5)' },
];

const PRICE_RANGES = [
  { value: 'priceRange1h', label: '1ч' },
  { value: 'priceRange4h', label: '4ч' },
  { value: 'priceRange24h', label: '24ч' },
];

// Keyboard shortcuts
const KEYBOARD_SHORTCUTS = [
  { key: 'R', action: 'Обновить данные' },
  { key: 'F', action: 'Поиск' },
  { key: '1-4', action: 'Размер сетки' },
  { key: 'M', action: 'Режим (Spot/Futures)' },
  { key: 'H', action: 'Справка' },
];

export function MainHeader({
  onMenuClick,
  exchange,
  mode,
  interval,
  gridSize,
  priceRange,
  onExchangeChange,
  onModeChange,
  onIntervalChange,
  onGridSizeChange,
  onPriceRangeChange,
  onRefresh,
}: MainHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'r':
          e.preventDefault();
          onRefresh?.();
          break;
        case 'f':
          e.preventDefault();
          // Focus search input
          break;
        case 'm':
          e.preventDefault();
          onModeChange(mode === 'FUTURES' ? 'SPOT' : 'FUTURES');
          break;
        case '1':
          e.preventDefault();
          onGridSizeChange(4);
          break;
        case '2':
          e.preventDefault();
          onGridSizeChange(9);
          break;
        case '3':
          e.preventDefault();
          onGridSizeChange(16);
          break;
        case '4':
          e.preventDefault();
          onGridSizeChange(25);
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, onModeChange, onGridSizeChange, onRefresh]);

  const handleExchangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onExchangeChange(e.target.value);
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onModeChange(e.target.value as Mode);
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onIntervalChange(e.target.value as Interval);
  };

  const handleGridSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onGridSizeChange(Number(e.target.value) as GridSize);
  };

  const handlePriceRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPriceRangeChange(e.target.value as PriceRange);
  };

  return (
    <header className="h-20 bg-surface/90 backdrop-blur border-b border-gray-800 fixed top-0 right-0 left-64 z-30 overflow-hidden">
      <div className="h-full flex items-center justify-between px-6 max-w-[100vw]">
        {/* Left - Logo & Controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-whale bg-clip-text text-transparent">
                Whale Screener
              </h1>
              <p className="text-xs text-gray-400">Real-time Market Analysis</p>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-700 mx-2" />

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Tooltip label="Биржа" withArrow>
              <Select
                value={exchange}
                onChange={handleExchangeChange}
                options={EXCHANGES}
                className="w-32"
              />
            </Tooltip>
            <Tooltip label="Режим" withArrow>
              <Select
                value={mode}
                onChange={handleModeChange}
                options={MODES}
                className="w-24"
              />
            </Tooltip>
            <Tooltip label="Таймфрейм" withArrow>
              <Select
                value={interval}
                onChange={handleIntervalChange}
                options={INTERVALS}
                className="w-20"
              />
            </Tooltip>
            <Tooltip label="Сетка" withArrow>
              <Select
                value={String(gridSize)}
                onChange={handleGridSizeChange}
                options={GRID_SIZES}
                className="w-24"
              />
            </Tooltip>
            <Tooltip label="Период" withArrow>
              <Select
                value={priceRange}
                onChange={handlePriceRangeChange}
                options={PRICE_RANGES}
                className="w-20"
              />
            </Tooltip>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <Tooltip label={isOnline ? 'Подключено' : 'Нет соединения'} withArrow>
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors',
                isOnline
                  ? 'bg-success/10 border-success/20'
                  : 'bg-danger/10 border-danger/20'
              )}
            >
              {isOnline ? (
                <Wifi className="w-3 h-3 text-success" />
              ) : (
                <WifiOff className="w-3 h-3 text-danger" />
              )}
              <span className={cn(
                'text-xs font-medium',
                isOnline ? 'text-success' : 'text-danger'
              )}>
                {isOnline ? 'Live' : 'Offline'}
              </span>
            </div>
          </Tooltip>

          {/* Current Time */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-surface2 rounded-lg border border-gray-700">
            <span className="text-xs text-gray-400">UTC:</span>
            <span className="text-sm font-mono text-gray-200">
              {formatTime(currentTime)}
            </span>
          </div>

          {/* Keyboard Shortcuts Button */}
          <Tooltip label="Горячие клавиши (?)" withArrow>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowShortcuts(!showShortcuts)}
              className={showShortcuts ? 'bg-primary/10 text-primary' : ''}
            >
              <Keyboard className="w-5 h-5" />
            </Button>
          </Tooltip>

          {/* Notifications */}
          <Tooltip label="Уведомления" withArrow>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <Badge
                  variant="danger"
                  className="absolute -top-1 -right-1 w-5 h-5 min-w-5 h-5 flex items-center justify-center p-0 text-xs"
                >
                  {notificationCount}
                </Badge>
              )}
            </Button>
          </Tooltip>

          {/* Settings */}
          <Tooltip label="Настройки" withArrow>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </Tooltip>

          <div className="h-6 w-px bg-gray-700" />

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">Admin</div>
              <div className="text-xs text-gray-400">Pro Plan</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-whale flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Горячие клавиши</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowShortcuts(false)}>
                <Menu className="w-4 h-4 rotate-45" />
              </Button>
            </div>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <span className="text-gray-400">{shortcut.action}</span>
                  <kbd className="px-2 py-1 bg-surface2 border border-gray-700 rounded text-sm font-mono">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              Нажмите любую клавишу для закрытия
            </p>
          </div>
        </div>
      )}
    </header>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
