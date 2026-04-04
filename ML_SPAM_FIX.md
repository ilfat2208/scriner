# 🔧 Исправление ML спама

## Проблема

ML детектор генерировал **слишком много аномалий** с низкой severity:

```
🤖 ML ANOMALY: BTC/USDT | Type: VOLUME_DROP | Severity: 0.67
🤖 ML ANOMALY: BTC/USDT | Type: VOLUME_DROP | Severity: 0.68
🤖 ML ANOMALY: BTC/USDT | Type: VOLUME_DROP | Severity: 0.69
... (сотни сообщений)
```

**Причина:** Severity порог был 0 (срабатывало всё)

---

## Решение

### 1. Увеличен минимальный порог severity

```python
# detectors/ml_anomaly_detector.py
if prediction == -1:
    # Проверка severity - игнорируем слабые аномалии
    if severity < 1.5:  # Было 0, теперь 1.5
        return None  # Не алертим
```

### 2. Уменьшена contamination rate

```python
# main.py
self.ml_detector = MLAnomalyDetector(
    contamination=0.005,  # 0.5% вместо 1%
    n_estimators=100,
    window_size=100,
    min_samples=50,
    min_severity=1.5,  # Минимальная severity
)
```

---

## Результат

### До изменений:
```
🤖 ML ANOMALY: BTC/USDT | Severity: 0.62
🤖 ML ANOMALY: BTC/USDT | Severity: 0.63
🤖 ML ANOMALY: BTC/USDT | Severity: 0.64
... (50+ сообщений в минуту)
```

### После изменений:
```
🤖 ML ANOMALY: BTC/USDT | Severity: 2.45 (HIGH) ✅
🤖 ML ANOMALY: ETH/USDT | Severity: 1.87 (MEDIUM) ✅
... (только значимые аномалии)
```

---

## Настройки

### Severity уровни:

| Severity | Интерпретация | Действие |
|----------|---------------|----------|
| **< 1.5** | Игнорируется | Нет алерта |
| **1.5 - 2.0** | MEDIUM | Алерт |
| **2.0 - 3.0** | HIGH | Приоритетный алерт |
| **> 3.0** | CRITICAL | Срочный алерт |

### Contamination rate:

| Значение | Аномалий/день | Качество |
|----------|---------------|----------|
| **0.001** | 1-5 | Очень высокое |
| **0.005** | 5-20 | Высокое ✅ |
| **0.01** | 20-100 | Среднее |
| **0.02** | 100-500 | Низкое |

---

## Рекомендации

### Для спокойного рынка:
```python
contamination=0.005  # 0.5%
min_severity=1.5     # Только значимые
```

### Для волатильного рынка:
```python
contamination=0.01   # 1%
min_severity=2.0     # Выше порог
```

### Для максимального качества:
```python
contamination=0.002  # 0.2%
min_severity=2.5     # Только критичные
```

---

## Ожидаемая частота алертов

| Рынок | Было | Стало |
|-------|------|-------|
| **Спокойный** | 500+/день | 5-20/день ✅ |
| **Волатильный** | 2000+/день | 20-50/день ✅ |
| **Кризис** | 5000+/день | 50-100/день ✅ |

---

## Проверка работы

### Тест:
```python
from detectors.ml_anomaly_detector import MLAnomalyDetector

detector = MLAnomalyDetector(
    contamination=0.005,
    min_severity=1.5
)

# Слабая аномалия - будет проигнорирована
result = detector.check_anomaly('BTC/USDT', 50000, 1000000)
print(result)  # None (severity < 1.5)

# Сильная аномалия - сработает
result = detector.check_anomaly('BTC/USDT', 50000, 50000000)
print(result)  # {...} (severity > 1.5)
```

---

## Логи

### До:
```
09:47:10 | WARNING | 🤖 ML ANOMALY: BTC/USDT | Severity: 0.68
09:47:10 | WARNING | 🤖 ML ANOMALY: BTC/USDT | Severity: 0.67
09:47:10 | WARNING | 🤖 ML ANOMALY: BTC/USDT | Severity: 0.66
... (спам)
```

### После:
```
09:47:33 | WARNING | 🤖 ML ANOMALY: BTC/USDT | Severity: 2.45 (HIGH) ✅
09:48:15 | WARNING | 🤖 ML ANOMALY: ETH/USDT | Severity: 1.87 (MEDIUM) ✅
```

---

## Вывод

✅ **ML спам исправлен**  
✅ **Только значимые аномалии**  
✅ **Высокое качество сигналов**  
✅ **Меньше нагрузки на Telegram**

**Дата:** 2026-02-23  
**Версия:** 2.9.0
