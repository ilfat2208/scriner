# 🎯 Pump & Dump + OI Screener - Финальная версия

## ✅ Все детекторы работают

### Типы алертов

| Тип | Порог | Окно | Статус |
|-----|-------|------|--------|
| 🐋 **WHALE** | $50,000+ | - | ✅ Работает |
| 📈 **MOMENTUM** | +300% объём | 60 сек | ✅ Работает |
| 🟢 **PUMP** | +3% цена | 3 мин | ✅ Работает |
| 🔴 **DUMP** | -3% цена | 3 мин | ✅ Работает |
| 📈 **OI_INCREASE** | +3% OI | 5 мин | ✅ Работает |
| 📉 **OI_DECREASE** | -3% OI | 5 мин | ✅ Работает |

---

## 📊 Примеры алертов

### Whale
```
🟢 🐋 КИТОВАЯ СДЕЛКА 🟢

Тикер: BTC/USDT
Биржа: BINANCE
Тип: BUY
Объём: $127,491.83
```

### Pump
```
🟢 RAVE Binance
Pump: +7.02% (0.281 → 0.30072)
📡 Сигнал: 13
```

### Dump
```
🔴 RAVE Binance
Dump: -7.21% (0.31669 → 0.29386)
📡 Сигнал: 15
```

### OI Change
```
📟 Binance — ⌚️15m — #BTC
📉 OI decreased by 3.5%
💱 Price change: -0.67%
```

---

## 🔧 Настройки (снижены для частых алертов)

### Pump/Dump
- **Порог:** 3% (было 5%)
- **Окно:** 3 минуты (было 5)
- **Cooldown:** 30 секунд

### OI Detector
- **Порог:** 3% (было 5%)
- **Окно:** 5 минут (было 15)
- **Проверка:** каждые 60 секунд

---

## 🚀 Запуск

```bash
python main.py
```

### Что происходит:

1. **Подключение к Binance WebSocket**
   - Получение трейдов в реальном времени
   - Проверка Whale ($50k+)
   - Проверка Momentum (+300%)
   - Проверка Pump/Dump (+3%)

2. **Проверка OI каждые 60 секунд**
   - Запрос Open Interest API
   - Сравнение с 5 минутами назад
   - Алерт при изменении на 3%+

---

## 📁 Изменения

### Обновлённые файлы:
- `exchanges/cex.py` - Интеграция OI проверки
- `main.py` - Снижены пороги детекторов
- `detectors/pump_dump_detector.py` - Новый
- `detectors/open_interest_detector.py` - Новый
- `models/alert.py` - Новые типы алертов

---

## ⚠️ Важно

### Pump/Dump не срабатывает сразу
Нужно **накопление данных** за 3 минуты:
- Первая цена: $100
- Текущая цена: $103
- Изменение: +3% → **PUMP алерт**

### OI не срабатывает сразу
Нужно **накопление данных** за 5 минут:
- Первый OI: 1,000,000
- Текущий OI: 970,000
- Изменение: -3% → **OI_DECREASE алерт**

---

## 🎯 Тестирование

### Быстрая проверка Pump:
```python
from detectors.pump_dump_detector import PumpDumpDetector
from datetime import datetime

detector = PumpDumpDetector(pump_threshold=3.0, window_seconds=180)

# Симуляция цены
for i in range(10):
    price = 100 * (1 + i * 0.005)  # +0.5% каждый раз
    result = detector.check_price_change('BTC/USDT', price)
    if result:
        print(f"PUMP detected: +{result['price_change']:.2f}%")
```

### Проверка OI:
```python
from detectors.open_interest_detector import OpenInterestDetector

detector = OpenInterestDetector(oi_change_threshold=3.0, window_minutes=5)

# Симуляция OI
for i in range(10):
    oi = 1000000 * (1 - i * 0.005)  # -0.5% каждый раз
    result = detector.check_oi_change('BTC/USDT', oi, price=50000)
    if result:
        print(f"OI_DECREASE detected: {result['oi_change']:.2f}%")
```

---

## 📊 Статистика детекторов

```python
# В main.py добавить в _handle_alert:
if alert.alert_type in [AlertType.PUMP, AlertType.DUMP]:
    stats = self.pump_dump_detector.get_stats()
    logger.info(f"Pump/Dump stats: {stats}")

if alert.alert_type in [AlertType.OI_INCREASE, AlertType.OI_DECREASE]:
    stats = self.oi_detector.get_stats()
    logger.info(f"OI stats: {stats}")
```

---

## 🔍 Troubleshooting

### Нет Pump/Dump алертов
1. Подождите 3 минуты для накопления данных
2. Проверьте волатильность (нужно движение 3%+)
3. Уменьшите порог до 2% в main.py

### Нет OI алертов
1. Подождите 5 минут для накопления данных
2. Проверьте API Binance (OI endpoint)
3. Уменьшите порог до 2% в main.py

### Частые алерты
Увеличьте пороги:
```python
# main.py
self.pump_dump_detector = PumpDumpDetector(
    pump_threshold_percent=5.0,  # Увеличить
    window_seconds=300,  # Увеличить
)
```

---

## 📈 Архитектура

```
┌─────────────────────────────────────────────────┐
│           Binance WebSocket Stream              │
│  wss://fstream.binance.com/ws                   │
│  └─ BTCUSDT@aggTrade                            │
│  └─ ETHUSDT@aggTrade                            │
│  └─ ...                                         │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│           CEXMonitor._process_binance_trade     │
│  ┌─────────────────────────────────────────┐   │
│  │ Whale Detector ($50k+)                  │   │
│  │ Momentum Detector (+300%)               │   │
│  │ Pump/Dump Detector (+3%)                │   │
│  └─────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│           Alert Handler                         │
│  └─ Telegram Bot                                │
│  └─ Logger                                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│      OI Checker (каждые 60 сек)                 │
│  https://fapi.binance.com/fapi/v1/openInterest  │
│  └─ BTCUSDT → 1,234,567                         │
│  └─ ETHUSDT → 987,654                           │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│           OI Detector (+3%/-3%)                 │
│  └─ Alert Handler                               │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Рекомендации

1. **Для продакшена:**
   - Увеличьте пороги (5-7% для Pump/Dump)
   - Увеличьте окно (5-10 минут)
   - Добавьте базу данных для истории

2. **Для тестирования:**
   - Запустите `python main.py`
   - Подождите 3-5 минут
   - Наблюдайте логи

3. **Оптимизация:**
   - Кэшируйте OI данные
   - Фильтруйте по объёму ($10k+)
   - Добавьте whitelist пар

---

**Дата:** 2026-02-23  
**Версия:** 2.2.0  
**Статус:** ✅ ВСЕ ДЕТЕКТОРЫ РАБОТАЮТ
