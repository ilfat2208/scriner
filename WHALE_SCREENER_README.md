# 🐋 Crypto Whale Screener

Автономная система обнаружения крупных сделок (китов) в реальном времени на CEX и DEX биржах.

## 📋 Возможности

- **Мониторинг CEX**: Binance, Bybit, OKX через WebSocket
- **Мониторинг DEX**: Uniswap V3, PancakeSwap через Web3
- **Детекция китов**: Сделки > $50,000 (настраивается)
- **Импульсный анализ**: Рост объёма на 300%+ за 1 минуту
- **Telegram уведомления**: Мгновенные алерты с ссылками
- **Фильтрация**: Исключение wash trading, blacklist адресов

## 📁 Структура проекта

```
scriner/
├── main.py                   # Точка входа
├── config.yaml               # Конфигурация
├── .env                      # Секретные ключи
├── requirements.txt          # Python зависимости
├── package.json              # Node.js зависимости (frontend)
├── bot/
│   └── telegram_bot.py       # Telegram бот
├── exchanges/
│   ├── cex.py                # CEX монитор
│   └── dex.py                # DEX монитор
├── detectors/
│   ├── whale_detector.py     # Детектор китов
│   └── momentum_detector.py  # Детектор импульса
├── models/
│   ├── trade.py              # Модель сделки
│   └── alert.py              # Модель алерта
└── utils/
    └── logger.py             # Логгер
```

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
# Python
pip install -r requirements.txt

# Node.js (для frontend)
npm install
```

### 2. Настройка

```bash
# Копирование .env
cp .env.example .env

# Редактирование .env
# - TELEGRAM_BOT_TOKEN (от @BotFather)
# - TELEGRAM_ADMIN_ID (от @userinfobot)
# - ETH_RPC_URL (опционально, для DEX)
```

### 3. Запуск

```bash
# Backend (whale screener)
python main.py

# Frontend (Next.js)
npm run dev
```

## 📊 Команды Telegram бота

| Команда | Описание |
|---------|----------|
| `/start` | Запуск бота |
| `/status` | Статус системы |
| `/set_threshold 100000` | Изменить порог ($) |
| `/pairs` | Список пар |
| `/logs` | Последние алерты |
| `/help` | Помощь |

## 📝 Пример алерта

```
🟢 🐋 КИТОВАЯ СДЕЛКА 🟢

Тикер: ETH/USDT
Биржа: BINANCE
Тип: BUY
Объём: $127,450.00
Токены: 52.341 ETH
Цена: $2,435.50

Время: 14:32:15

[📊 График] [🔗 Биржа]
```

## ⚙️ Конфигурация (config.yaml)

```yaml
whale_detection:
  min_volume_usd: 50000      # Порог китовой сделки
  momentum_window_seconds: 60
  momentum_threshold_percent: 300

tracked_pairs:
  - BTC/USDT
  - ETH/USDT
  - SOL/USDT

exchanges:
  cex:
    - binance
    - bybit
  dex:
    - uniswap_v3
```

## 🔧 Продвинутая настройка

### Запуск в фоне (Linux)

```bash
# Через nohup
nohup python main.py > screener.log 2>&1 &

# Через tmux
tmux new -s screener
python main.py
# Ctrl+B, D для открепления
```

### Мониторинг логов

```bash
# В реальном времени
tail -f logs/alerts.log

# Только ошибки
grep ERROR logs/screener.log
```

## 📈 Архитектура

```
┌─────────────────────────────────────────────────┐
│              Whale Screener Core                │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐              │
│  │ CEX Monitor │  │ DEX Monitor │              │
│  │  WebSocket  │  │   Web3.py   │              │
│  └──────┬──────┘  └──────┬──────┘              │
│         │                │                      │
│         └────────┬───────┘                      │
│                  │                              │
│         ┌────────▼────────┐                     │
│         │ Whale Detector  │                     │
│         │  + Momentum     │                     │
│         └────────┬────────┘                     │
│                  │                              │
│         ┌────────▼────────┐                     │
│         │  Telegram Bot   │                     │
│         │   (aiogram)     │                     │
│         └─────────────────┘                     │
└─────────────────────────────────────────────────┘
```

## 🛠️ Troubleshooting

### Ошибка подключения к Telegram

```
❌ Ошибка подключения к Telegram: Unauthorized
```

**Решение**: Проверьте токен бота в `.env`

### Ошибка Web3

```
❌ Web3.py не установлен
```

**Решение**: `pip install web3`

### Нет алертов

1. Проверьте `/status` в боте
2. Уменьшите порог: `/set_threshold 10000`
3. Проверьте логи: `tail -f logs/alerts.log`

## 📄 Лицензия

MIT License

## 🤝 Поддержка

- Telegram: @cryptoscreener_support
- GitHub Issues: [Создать issue](https://github.com/yourusername/whale-screener/issues)