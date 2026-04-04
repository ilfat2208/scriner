# 🎯 Фильтр мелких объёмов

## Проблема
Momentum детектор срабатывал на сделках по **$500-$800**, что создавало много шума.

```
❌ BAN/USDT BUY | +344% | $823  (слишком мелко)
❌ ALT/USDT SELL | +500% | $512  (спам)
```

## Решение

### Добавлен минимальный порог объёма

**Momentum Detector:**
```python
min_volume_usd=10000  # Минимум $10k для алерта
```

**Whale Detector:**
```python
min_volume_usd=300000  # Минимум $300k для алерта
```

---

## Обновлённые пороги

| Детектор | Мин. объём | Порог срабатывания |
|----------|------------|-------------------|
| 🐋 **WHALE** | $300,000 | Любая сделка > $300k |
| 📈 **MOMENTUM** | $10,000 | Рост объёма на 300%+ |
| 🟢 **PUMP** | Любая | Движение цены 3%+ |
| 🔴 **DUMP** | Любая | Движение цены -3%+ |
| 📈 **OI** | Любая | Изменение OI 3%+ |

---

## Примеры

### До изменений (спам):
```
📈 IMPULSE: BAN/USDT BUY | +344% | $823
📈 IMPULSE: ALT/USDT SELL | +500% | $512
📈 IMPULSE: MEME/USDT BUY | +1000% | $234
```

### После изменений (только значимые):
```
📈 IMPULSE: BTC/USDT BUY | +350% | $45,230  ✅
📈 IMPULSE: ETH/USDT SELL | +420% | $78,450  ✅
📈 IMPULSE: SOL/USDT BUY | +380% | $23,890  ✅
```

---

## Настройка порогов

### main.py

```python
# Whale Detector
self.whale_detector = WhaleDetector(
    min_volume_usd=300000,  # $300k
)

# Momentum Detector
self.momentum_detector = MomentumDetector(
    min_volume_usd=10000,  # $10k
    threshold_percent=300,  # 300% рост
)

# Pump/Dump (без мин. объёма, только % движения)
self.pump_dump_detector = PumpDumpDetector(
    pump_threshold_percent=3.0,
)
```

### Увеличить пороги (для ещё меньшего шума):

```python
# Только крупные алерты
self.momentum_detector = MomentumDetector(
    min_volume_usd=50000,  # $50k вместо $10k
    threshold_percent=500,  # 500% вместо 300%
)
```

### Уменьшить пороги (для большего количества алертов):

```python
# Больше алертов
self.momentum_detector = MomentumDetector(
    min_volume_usd=5000,  # $5k вместо $10k
    threshold_percent=200,  # 200% вместо 300%
)
```

---

## Статистика (ожидаемая)

### До фильтрации:
- Whale: 100 в день
- Momentum: **500 в день** (много шума)
- Pump/Dump: 20 в день

### После фильтрации:
- Whale: 100 в день
- Momentum: **20-50 в день** (только значимые)
- Pump/Dump: 20 в день

---

## Проверка работы

### Тест Momentum детектора:

```python
from detectors.momentum_detector import MomentumDetector

detector = MomentumDetector(
    min_volume_usd=10000,  # $10k
    threshold_percent=300
)

# Мелкая сделка - будет проигнорирована
result = detector.check_momentum(
    pair='BTC/USDT',
    volume_usd=500,  # $500 < $10k
    side='BUY'
)
print(result)  # False ❌

# Крупная сделка - сработает
result = detector.check_momentum(
    pair='BTC/USDT',
    volume_usd=50000,  # $50k > $10k
    side='BUY'
)
print(result)  # True ✅ (если рост объёма 300%+)
```

---

## Логи

### До изменений:
```
09:26:04 | WARNING | 📈 IMPULSE: BAN/USDT BUY | +344% | $823
09:26:04 | WARNING | 🚨 ALERT: BAN/USDT | BUY | $511.73
09:26:05 | WARNING | 📈 IMPULSE: MEME/USDT SELL | +512% | $234
```

### После изменений:
```
09:30:00 | DEBUG | BAN/USDT: Объём $823 < $10000 - пропущено
09:30:01 | DEBUG | MEME/USDT: Объём $234 < $10000 - пропущено
09:30:05 | WARNING | 📈 IMPULSE: BTC/USDT BUY | +350% | $45,230 ✅
09:30:06 | WARNING | 🚨 ALERT: BTC/USDT | BUY | $45,230
```

---

## Рекомендации

### Для спокойного рынка:
```python
min_volume_usd=10000   # $10k
threshold_percent=300  # 300%
```

### Для волатильного рынка:
```python
min_volume_usd=25000   # $25k
threshold_percent=400  # 400%
```

### Для максимального качества (только крупные):
```python
min_volume_usd=100000  # $100k
threshold_percent=500  # 500%
```

---

## Фильтрация по парам

### Исключить "мусорные" пары:

```python
# В main.py добавить:
exclude_pairs = ['BAN/USDT', 'MEME/USDT', 'ALT/USDT']

if pair in exclude_pairs:
    return False  # Пропустить эти пары
```

### Только топ-50 пар:

```yaml
# config.yaml
tracked_pairs:
  - BTC/USDT
  - ETH/USDT
  - SOL/USDT
  - BNB/USDT
  - XRP/USDT
  # ... только топ-50
```

---

## Вывод

✅ **Мелкие объёмы отфильтрованы**  
✅ **Только значимые алерты**  
✅ **Меньше шума в Telegram**  
✅ **Выше качество сигналов**

**Дата:** 2026-02-23  
**Версия:** 2.4.0
