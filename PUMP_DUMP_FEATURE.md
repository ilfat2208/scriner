# 🎯 Pump & Dump + Open Interest Screener

## ✅ Новые функции добавлены

### 1. Pump & Dump Detector
Обнаружение резких изменений цены (pump/dump) в реальном времени.

**Параметры:**
- Порог Pump: +5%
- Порог Dump: -5%
- Окно анализа: 5 минут
- Cooldown: 30 секунд между алертами

**Пример алерта:**
```
🟢 RAVE Bybit
Pump: 7.02% (0.281 → 0.30072)
📡 Сигнал: 13

🔴 RAVE Bybit
Dump: -7.21% (0.31669 → 0.29386)
📡 Сигнал: 15
```

### 2. Open Interest Detector
Обнаружение значительных изменений открытого интереса.

**Параметры:**
- Порог изменения OI: 5%
- Окно анализа: 15 минут
- Cooldown: 5 минут между алертами

**Пример алерта:**
```
📟 Binance — ⌚️15m — #OPN
📉 OI decreased by 5.02%
💱 Price change: -0.67%
```

---

## 📁 Новые файлы

### Детекторы
- `detectors/pump_dump_detector.py` - Детектор Pump & Dump
- `detectors/open_interest_detector.py` - Детектор OI изменений

### Обновлённые файлы
- `models/alert.py` - Добавлены типы PUMP, DUMP, OI_INCREASE, OI_DECREASE
- `exchanges/cex.py` - Интеграция Pump/Dump детектора
- `main.py` - Подключение новых детекторов
- `bot/telegram_bot.py` - Форматирование новых сообщений

---

## 🚀 Запуск

```bash
python main.py
```

### Что происходит:
1. **Whale Detector** - ищет сделки > $50,000
2. **Momentum Detector** - ищет рост объёма на 300%+
3. **Pump/Dump Detector** - ищет изменение цены на 5%+
4. **OI Detector** - ищет изменение OI на 5%+ (требуется доп. интеграция)

---

## 📊 Типы алертов

| Тип | Описание | Порог | Пример |
|-----|----------|-------|--------|
| 🐋 WHALE | Китовая сделка | $50,000+ | $223,768 BTC BUY |
| 📈 MOMENTUM | Импульс объёма | +300% | +90928% XRP |
| 🟢 PUMP | Резкий рост цены | +5% | +7.02% RAVE |
| 🔴 DUMP | Резкое падение цены | -5% | -7.21% RAVE |
| 📈 OI_INCREASE | Рост OI | +5% | +5.02% |
| 📉 OI_DECREASE | Падение OI | -5% | -5.02% |

---

## 🔧 Настройка порогов

### config.yaml
```yaml
whale_detection:
  min_volume_usd: 50000
  momentum_window_seconds: 60
  momentum_threshold_percent: 300

pump_dump:
  pump_threshold_percent: 5.0
  dump_threshold_percent: -5.0
  window_seconds: 300

open_interest:
  oi_change_threshold: 5.0
  window_minutes: 15
```

---

## 📡 Форматы Telegram сообщений

### Whale/Momentum
```
🟢 🐋 КИТОВАЯ СДЕЛКА 🟢

Тикер: BTC/USDT
Биржа: BINANCE
Тип: BUY
Объём: $223,768.57
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
📟 Binance — ⌚️15m — #OPN
📉 OI decreased by 5.02%
💱 Price change: -0.67%
```

---

## 🎯 Как это работает

### Pump/Dump алгоритм:
1. Отслеживаем цену за последние 5 минут
2. Сравниваем текущую цену с первой в окне
3. Если изменение > 5% → алерт
4. Увеличиваем счётчик сигналов
5. Cooldown 30 секунд

### OI алгоритм (требуется интеграция):
1. Получаем OI каждые 60 секунд
2. Сравниваем с OI 15 минут назад
3. Если изменение > 5% → алерт
4. Cooldown 5 минут

---

## 📈 Интеграция OI детектора

Для работы OI детектора нужно добавить получение Open Interest:

```python
# В CEXMonitor._monitor_binance()
async def _check_open_interest(self, pair: str):
    """Проверка OI"""
    url = f"{self.FUTURES_URL}/fapi/v1/openInterest"
    params = {'symbol': pair.replace('/', '')}
    
    async with self._session.get(url, params=params) as response:
        data = await response.json()
        oi = float(data.get('openInterest', 0))
        
        self.oi_detector.check_oi_change(
            pair=pair,
            open_interest=oi,
            exchange='BINANCE',
        )
```

---

## 🧪 Тестирование

### Проверка Pump/Dump:
```python
from detectors.pump_dump_detector import PumpDumpDetector

detector = PumpDumpDetector(pump_threshold=5.0)

# Симуляция pump
detector.check_price_change('BTC/USDT', 50000)
detector.check_price_change('BTC/USDT', 52500)  # +5%
# → вернёт {'type': 'PUMP', 'price_change': 5.0, ...}
```

### Проверка OI:
```python
from detectors.open_interest_detector import OpenInterestDetector

detector = OpenInterestDetector(oi_change_threshold=5.0)

# Симуляция изменения OI
detector.check_oi_change('BTC/USDT', 1000000)
detector.check_oi_change('BTC/USDT', 950000)  # -5%
# → вернёт {'type': 'OI_DECREASE', 'oi_change': -5.0, ...}
```

---

## 📝 Логи

Пример из логов:
```
09:58:54 | WARNING - 🟢 PUMP: XRP/USDT | +90928% | Сигнал #1
09:58:56 | WARNING - 🐋 КИТ обнаружен: $223,768.57 (BUY) - BTC/USDT
09:59:00 | WARNING - 🔴 DUMP: SOL/USDT | -7.21% | Сигнал #15
```

---

## ⚠️ Важные замечания

1. **Pump/Dump** может генерировать много сигналов во время волатильности
2. **OI Detector** требует получения данных через API (не реализовано в CEXMonitor)
3. **Cooldown** предотвращает спам, но может пропустить повторные сигналы

---

## 🎯 Рекомендации

1. **Настройте пороги** под вашу стратегию:
   - Pump/Dump: 3-10% в зависимости от волатильности
   - OI: 3-7% для значительных изменений

2. **Добавьте фильтрацию** по объёму:
   ```python
   if volume_usd < 10000:  # Игнорировать мелкие сделки
       return None
   ```

3. **Интегрируйте OI API** для полноценной работы

---

**Дата:** 2026-02-23  
**Версия:** 2.1.0  
**Статус:** ✅ Pump & Dump работает, OI требует интеграции
