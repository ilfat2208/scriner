# 🐋 Crypto Whale Screener v2.0

Профессиональная система мониторинга криптовалютных активов с детекцией китовых сделок в реальном времени.

## 📊 Возможности

### Backend (FastAPI + Python)
- ✅ **REST API** для получения сигналов и тикеров
- ✅ **WebSocket** для push-уведомлений в реальном времени
- ✅ **SQLite база данных** для хранения истории
- ✅ **Детекция китов** (сделки > $50,000)
- ✅ **Импульсный анализ** (рост объёма на 300%+)
- ✅ **Интеграция с Binance** (CEX) и **Uniswap** (DEX)
- ✅ **Telegram бот** для уведомлений
- ✅ **Unit-тесты** для всех компонентов

### Frontend (Next.js + React)
- ✅ **Dashboard** с метриками в реальном времени
- ✅ **Таблица сигналов** с фильтрами и сортировкой
- ✅ **Графики TradingView** (9 бирж, фьючерсы/спот)
- ✅ **WebSocket подключение** для мгновенных обновлений
- ✅ **Browser notifications** для новых сигналов
- ✅ **Сохранение настроек** в localStorage
- ✅ **Адаптивный дизайн** (Tailwind CSS + Mantine)

---

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
# Backend
pip install -r requirements.txt

# Frontend
npm install
```

### 2. Настройка

```bash
# Копирование .env файлов
cp .env.example .env
cp .env.example.frontend .env.local
```

**Заполните `.env`:**
```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ADMIN_ID=123456789
ETH_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
```

**Заполните `.env.local`:**
```env
NEXT_PUBLIC_WS_URL=ws://localhost:8000/api/signals/ws
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3. Запуск

**Terminal 1 - Backend:**
```bash
python launch_backend.py --reload
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Terminal 3 - Whale Detector (опционально):**
```bash
python main.py
```

---

## 📁 Структура проекта

```
scriner/
├── backend/                    # FastAPI backend
│   ├── main.py                 # Точка входа API
│   ├── api/
│   │   ├── routes/
│   │   │   ├── signals.py      # Маршруты сигналов
│   │   │   ├── tickers.py      # Маршруты тикеров
│   │   │   └── thresholds.py   # Управление порогами
│   │   └── schemas/            # Pydantic схемы
│   ├── db/
│   │   ├── database.py         # Настройки БД
│   │   └── models.py           # SQLAlchemy модели
│   └── services/
│       ├── binance_service.py  # Binance API клиент
│       └── signal_emitter.py   # Отправка сигналов
│
├── src/                        # Next.js frontend
│   ├── app/
│   │   ├── page.tsx            # Главная страница
│   │   └── layout.tsx          # Layout
│   ├── components/
│   │   ├── dashboard/          # Dashboard компоненты
│   │   ├── charts/             # Графики
│   │   └── layout/             # Layout компоненты
│   ├── hooks/
│   │   ├── useBinance.ts       # Binance хуки
│   │   └── useSignalWebSocket.ts # WebSocket хук
│   ├── stores/
│   │   └── useSignalStore.ts   # Zustand store
│   └── types/
│       └── signal.ts           # TypeScript типы
│
├── detectors/                  # Детекторы
│   ├── whale_detector.py       # Детектор китов
│   └── momentum_detector.py    # Детектор импульса
│
├── exchanges/                  # Мониторы бирж
│   ├── cex.py                  # CEX (Binance, Bybit)
│   └── dex.py                  # DEX (Uniswap)
│
├── bot/                        # Telegram бот
│   └── telegram_bot.py
│
├── tests/                      # Тесты
│   ├── api/                    # API тесты
│   ├── services/               # Сервис тесты
│   └── detectors/              # Детектор тесты
│
├── launch_backend.py           # Скрипт запуска backend
├── main.py                     # Whale detector (standalone)
└── requirements.txt            # Python зависимости
```

---

## 🔌 API Endpoints

### Signals

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/signals` | Список сигналов (пагинация) |
| GET | `/api/signals/stats` | Статистика сигналов |
| GET | `/api/signals/{id}` | Сигнал по ID |
| POST | `/api/signals` | Создать сигнал |
| PATCH | `/api/signals/{id}` | Обновить сигнал |
| DELETE | `/api/signals/{id}` | Удалить сигнал |
| WS | `/api/signals/ws` | WebSocket для real-time |

### Tickers

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/tickers` | Список тикеров |
| GET | `/api/tickers/{symbol}` | Тикер по символу |
| GET | `/api/tickers/{symbol}/klines` | Свечи |
| GET | `/api/tickers/{symbol}/orderbook` | Стакан |
| GET | `/api/tickers/{symbol}/funding` | Funding rate |

### Thresholds

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/thresholds` | Все пороги |
| GET | `/api/thresholds/{pair}` | Порог для пары |
| PUT | `/api/thresholds/{pair}` | Обновить порог |
| DELETE | `/api/thresholds/{pair}` | Удалить порог |

---

## 📡 WebSocket

### Подключение

```javascript
const ws = new WebSocket('ws://localhost:8000/api/signals/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.event === 'new_signal') {
    console.log('🐋 Новый сигнал:', message.data);
    // {
    //   id: 1,
    //   signal_type: 'WHALE',
    //   exchange: 'BINANCE',
    //   pair: 'BTC/USDT',
    //   side: 'BUY',
    //   volume_usd: 125000,
    //   ...
    // }
  }
};
```

### Frontend хук

```typescript
import { useSignalWebSocket } from '@/hooks/useSignalWebSocket';

function Dashboard() {
  const { isConnected, lastMessage } = useSignalWebSocket({
    enabled: true,
    url: 'ws://localhost:8000/api/signals/ws',
  });
  
  return (
    <div>
      {isConnected ? '✅ Connected' : '❌ Disconnected'}
    </div>
  );
}
```

---

## 🧪 Тесты

### Запуск тестов

```bash
# Все тесты
pytest

# С покрытием
pytest --cov=backend --cov=detectors --cov-report=html

# Конкретный файл
pytest tests/api/test_signals_api.py -v

# Детекторы
pytest tests/detectors/ -v
```

### Пример теста

```python
# tests/detectors/test_whale_detector.py
def test_whale_detection():
    detector = WhaleDetector(min_volume_usd=50000)
    
    result = detector.check_whale(
        volume_usd=100000,
        side='BUY',
        exchange='BINANCE',
        pair='BTC/USDT',
    )
    
    assert result is True
```

---

## 🤖 Telegram Бот

### Команды

| Команда | Описание |
|---------|----------|
| `/start` | Запуск бота |
| `/status` | Статус системы |
| `/set_threshold 100000` | Изменить порог ($) |
| `/pairs` | Список пар |
| `/logs` | Последние алерты |
| `/help` | Помощь |

### Пример алерта

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

---

## 🎯 Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  Dashboard   │  │   Charts     │  │  Signal Table   │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                 │                    │            │
│         └─────────────────┴────────────────────┘            │
│                           │                                 │
│                    WebSocket / REST                         │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   Backend (FastAPI)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  API Routes  │  │  WebSocket   │  │   SQLAlchemy    │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                 │                    │            │
│         └─────────────────┴────────────────────┘            │
│                           │                                 │
│                    SQLite Database                          │
└───────────────────────────┼─────────────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
┌────────▼───────┐  ┌──────▼──────┐  ┌────────▼────────┐
│  Binance API   │  │  Detectors  │  │  Telegram Bot   │
│  (WebSocket)   │  │  + Callback │  │  (aiogram)      │
└────────────────┘  └─────────────┘  └─────────────────┘
```

---

## 🔧 Конфигурация

### config.yaml

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

notifications:
  send_to_telegram: true
  cooldown_seconds: 5
```

---

## 🛠️ Troubleshooting

### Backend не запускается

```bash
# Проверка зависимостей
pip install -r requirements.txt --upgrade

# Проверка порта
netstat -ano | findstr :8000
```

### WebSocket не подключается

1. Убедитесь, что backend запущен
2. Проверьте URL в `.env.local`
3. Проверьте CORS настройки в `backend/main.py`

### Тесты не работают

```bash
# Установка тестовых зависимостей
pip install pytest pytest-asyncio pytest-cov

# Запуск с verbose
pytest -vvs
```

---

## 📈 Roadmap

- [ ] Machine Learning для детекции аномалий
- [ ] Поддержка дополнительных бирж (Kraken, Huobi)
- [ ] GraphQL API
- [ ] Мобильное приложение (React Native)
- [ ] Backtesting стратегий
- [ ] Интеграция с TradingView alerts

---

## 📄 Лицензия

MIT License

## 🤝 Поддержка

- GitHub Issues: [Создать issue](https://github.com/yourusername/whale-screener/issues)
- Telegram: @cryptoscreener_support
