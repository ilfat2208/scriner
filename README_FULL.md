# 🐋 Crypto Whale Screener - Full Stack

Профессиональная система мониторинга криптовалютных активов с реальным временем и Whale Detection.

## 📊 Функционал

### Новый Dashboard (React + Tailwind)
- ✅ Метрики в реальном времени
- ✅ Таблица сигналов с сортировкой
- ✅ WebSocket подключение
- ✅ Zustand store
- ✅ Адаптивный дизайн

### Старый функционал (Mantine + TradingView)
- ✅ Графики TradingView (9 окон)
- ✅ Поиск и фильтрация тикеров
- ✅ Выбор биржи (Binance, Bybit, OKX)
- ✅ Режим Фьючерсы/Спот
- ✅ Экспорт в CSV
- ✅ Сохранение настроек

## 📁 Структура

```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Главная (объединённая)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── layout/                 # Новый Dashboard
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── dashboard/              # Новый Dashboard
│   │   ├── MetricsCards.tsx
│   │   └── SignalTable.tsx
│   ├── back/                   # Старый функционал
│   │   ├── ChartGridItem.tsx
│   │   ├── SymbolSearch.tsx
│   │   ├── StatsRow.tsx
│   │   └── Legend.tsx
│   └── ui/                     # UI компоненты
│       ├── Card.tsx
│       ├── Button.tsx
│       └── Badge.tsx
├── hooks/
│   ├── useWebSocket.ts         # Новый WebSocket хук
│   └── back/
│       ├── useBinance.ts       # Старый Binance хук
│       └── useLocalStorage.ts  # LocalStorage хук
├── stores/
│   └── useSignalStore.ts       # Zustand store
├── types/
│   ├── signal.ts               # Типы сигналов
│   └── back/
│       └── index.ts            # Старые типы
└── lib/
    └── utils.ts                # Утилиты
```

## 🚀 Запуск

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev

# Сборка
npm run build
```

## 🌐 URL

- **Dashboard**: http://localhost:3000/
- **Графики**: Встроены в Dashboard

## 🎨 Технологии

| Компонент | Технология |
|-----------|------------|
| Frontend | Next.js 14, React 18 |
| Styling | Tailwind CSS, Mantine |
| Charts | TradingView Widget |
| State | Zustand, localStorage |
| Real-time | WebSocket |
| Tables | TanStack Table |

## 📈 Функции

### Dashboard
- **Метрики**: Total Signals, Active Tokens, 24h Profit, Whale Volume
- **Сигналы**: WHALE, MOMENTUM, PRICE_SPIKE
- **Фильтры**: Type, Exchange, Side, Volume

### Графики
- **Сетки**: 4, 9, 16, 25 окон
- **Таймфреймы**: 1м - 1д
- **Биржи**: Binance, Bybit, OKX, Gate, MEXC, BitGet, KuCoin, BingX, HTX
- **Режимы**: Фьючерсы / Спот

## 🔧 Настройки

Все настройки сохраняются в localStorage:
- Выбранная биржа
- Режим (Фьючерсы/Спот)
- Таймфрейм
- Размер сетки
- Выбранные тикеры

## 📝 Команды

```bash
npm run dev          # Dev сервер
npm run build        # Продакшен сборка
npm run start        # Продакшен сервер
npm run lint         # ESLint
npm run format       # Prettier
```

## 🎯 Roadmap

- [ ] Python backend интеграция
- [ ] Telegram бот уведомления
- [ ] База данных для истории
- [ ] Machine Learning детекция
- [ ] Мобильное приложение

## 📄 Лицензия

MIT
