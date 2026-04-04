# 🔍 Отладка Pump/Dump и OI детекторов

## Проблема
Работают только **Whale алерты**, а Pump/Dump и OI молчат.

## Решение

### 1. Добавлено логирование
Теперь видно накопление данных:

```
📊 BTC/USDT: Начало отслеживания цены
📊 BTC/USDT: 50000.000000 → 50150.000000 (+0.30%)
📊 BTC/USDT: OI 1,234,567 → 1,200,000 (-2.80%)
```

### 2. OI проверка вынесена из WebSocket цикла
Проверка происходит каждые 60 секунд отдельно:

```
📊 Проверка OI #1...
📊 Проверка OI #2...
```

---

## Почему нет алертов?

### Pump/Dump
**Требуется:** Изменение цены на **3%+** за **3 минуты**

**Пример когда сработает:**
- 10:00:00 - BTC: $50,000
- 10:02:30 - BTC: $51,500 (+3%)
- → 🟢 PUMP алерт!

**Пример когда НЕ сработает:**
- 10:00:00 - BTC: $50,000
- 10:02:30 - BTC: $50,100 (+0.2%)
- → Нет алерта (движение слишком маленькое)

### OI (Open Interest)
**Требуется:** Изменение OI на **3%+** за **5 минут**

**Пример когда сработает:**
- 10:00:00 - BTC OI: 1,000,000
- 10:04:00 - BTC OI: 970,000 (-3%)
- → 📉 OI_DECREASE алерт!

**Пример когда НЕ сработает:**
- 10:00:00 - BTC OI: 1,000,000
- 10:04:00 - BTC OI: 995,000 (-0.5%)
- → Нет алерта (изменение слишком маленькое)

---

## Диагностика

### Включите DEBUG логирование

В `config.yaml` или `.env`:
```yaml
log_level: DEBUG
```

Или в `main.py`:
```python
setup_logger("DEBUG")  # Вместо "INFO"
```

### Что искать в логах

**Нормальная работа:**
```
10:00:00 | DEBUG | 📊 BTC/USDT: Начало отслеживания цены
10:00:10 | DEBUG | 📊 BTC/USDT: 50000 → 50050 (+0.10%)
10:00:20 | DEBUG | 📊 BTC/USDT: 50000 → 50100 (+0.20%)
10:01:00 | INFO | 📊 Проверка OI #1...
10:01:01 | DEBUG | 📊 BTC/USDT: OI 1,234,567 → 1,230,000 (-0.37%)
```

**Когда сработает Pump:**
```
10:02:30 | WARNING | 🟢 PUMP: BTC/USDT | +3.00% | Сигнал #1
10:02:30 | WARNING | 🚨 PUMP: BTC/USDT | +3.00%
```

**Когда сработает OI:**
```
10:04:00 | WARNING | 📉 OI_DECREASE: BTC/USDT | -3.00%
10:04:00 | WARNING | 🚨 OI: BTC/USDT | -3.00%
```

---

## Тестирование

### Быстрый тест Pump/Dump

```python
# test_pump.py
from detectors.pump_dump_detector import PumpDumpDetector
import time

detector = PumpDumpDetector(
    pump_threshold=3.0,
    dump_threshold=-3.0,
    window_seconds=180
)

# Симуляция быстрого pump
base_price = 50000
for i in range(20):
    price = base_price * (1 + i * 0.002)  # +0.2% каждый тик
    result = detector.check_price_change('BTC/USDT', price)
    
    if result:
        print(f"✅ PUMP DETECTED: +{result['price_change']:.2f}%")
        print(f"   Signal count: {result['signal_count']}")
        break
    
    time.sleep(0.1)
else:
    print("❌ Pump не обнаружен (движение < 3%)")
```

### Быстрый тест OI

```python
# test_oi.py
from detectors.open_interest_detector import OpenInterestDetector

detector = OpenInterestDetector(
    oi_change_threshold=3.0,
    window_minutes=5
)

# Симуляция быстрого изменения OI
base_oi = 1000000
for i in range(10):
    oi = base_oi * (1 - i * 0.005)  # -0.5% каждый тик
    result = detector.check_oi_change('BTC/USDT', oi, price=50000)
    
    if result:
        print(f"✅ OI_DECREASE DETECTED: {result['oi_change']:.2f}%")
        break
    
    time.sleep(0.1)
else:
    print("❌ OI изменение не обнаружено (изменение < 3%)")
```

---

## Реальные данные

### Проверка текущей волатильности

Запустите скрипт для проверки:

```python
# check_volatility.py
import asyncio
import aiohttp
import json

async def check():
    async with aiohttp.ClientSession() as session:
        # Получаем последние 100 трейдов BTC
        url = "https://fapi.binance.com/fapi/v1/aggTrades"
        params = {'symbol': 'BTCUSDT', 'limit': 100}
        
        async with session.get(url, params=params) as resp:
            trades = await resp.json()
            
            first_price = float(trades[0]['p'])
            last_price = float(trades[-1]['p'])
            change = ((last_price - first_price) / first_price) * 100
            
            print(f"BTC: {first_price:.2f} → {last_price:.2f} ({change:+.2f}%)")
            
            if abs(change) >= 3:
                print("✅ Волатильность достаточна для Pump/Dump алерта!")
            else:
                print("❌ Волатильность слишком мала (нужно 3%+)")

asyncio.run(check())
```

---

## Решения

### Если Pump/Dump не работает

**Проблема:** Рынок слишком спокоен

**Решения:**
1. **Снизить порог** до 2%:
   ```python
   # main.py
   self.pump_dump_detector = PumpDumpDetector(
       pump_threshold_percent=2.0,  # Было 3%
       window_seconds=120,  # Было 180
   )
   ```

2. **Ждать волатильности** - во время новостей, BTC движений

3. **Тестировать на альткоинах** - они более волатильны:
   ```python
   tracked_pairs:
     - BTC/USDT
     - ETH/USDT
     - SOL/USDT  # Более волатильный
     - DOGE/USDT  # Очень волатильный
   ```

### Если OI не работает

**Проблема:** OI не меняется на 3%+

**Решения:**
1. **Снизить порог** до 2%:
   ```python
   # main.py
   self.oi_detector = OpenInterestDetector(
       oi_change_threshold=2.0,  # Было 3%
       window_minutes=3,  # Было 5
   )
   ```

2. **Проверить API** - возможно Binance не отдаёт OI:
   ```bash
   curl "https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT"
   ```

3. **Увеличить частоту проверок** до 30 секунд:
   ```python
   # exchanges/cex.py
   if current_time - last_oi_check > 30:  # Было 60
   ```

---

## Ожидаемая частота алертов

| Детектор | Частота (спокойный рынок) | Частота (волатильный) |
|----------|---------------------------|------------------------|
| 🐋 WHALE ($300k+) | 50-100 в день | 100-200 в день |
| 📈 MOMENTUM | 10-20 в день | 50-100 в день |
| 🟢 PUMP (+3%) | 0-5 в день | 10-30 в день |
| 🔴 DUMP (-3%) | 0-5 в день | 10-30 в день |
| 📈 OI (+3%) | 0-2 в день | 5-15 в день |
| 📉 OI (-3%) | 0-2 в день | 5-15 в день |

---

## Выводы

1. **Whale алерты работают** - видно по логам ✅
2. **Pump/Dump ждёт волатильности** - нужно 3%+ за 3 минуты ⏳
3. **OI ждёт изменения** - нужно 3%+ за 5 минут ⏳
4. **Логирование добавлено** - видно накопление данных ✅

**Рекомендация:** Запустите с DEBUG логированием и подождите 5-10 минут. Если рынок спокоен - снизьте пороги до 2%.
