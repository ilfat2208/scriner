# 📱 Telegram Уведомления - Полный Список

## ✅ Все типы уведомлений работают

Теперь бот отправляет **красивые уведомления** для всех типов событий:

---

## 📊 Типы уведомлений

### 1. 🐋 Whale Alert (Китовая сделка)

```
🟢 🐋 КИТОВАЯ СДЕЛКА 🟢

Тикер: BTC/USDT
Биржа: BINANCE
Тип: BUY
Объём: $350,234.56
Токены: 7.012345 BTC
Цена: $49,950.00

Время: 15:30:45

[📊 График] [🔗 Биржа]
```

**Когда:** Сделка > $300,000

---

### 2. 📈 Momentum Alert (Импульс)

```
🔴 📈 КИТОВАЯ СДЕЛКА 🔴

Тикер: ETH/USDT
Биржа: BINANCE
Тип: SELL
Объём: $78,450.23
Токены: 45.678 ETH
Цена: $1,717.50

Время: 15:31:12

[📊 График] [🔗 Биржа]
```

**Когда:** Рост объёма на 300%+

---

### 3. 🟢 Pump Alert

```
🟢 PUMP & DUMP SCREENER

🟢 SOL/USDT BINANCE
Pump: +7.02% (0.281 → 0.30072)
📡 Сигнал: 13

💰 Возможна прибыльная торговля!

[📊 График] [🔗 Биржа]
```

**Когда:** Рост цены на 3%+ за 3 минуты

---

### 4. 🔴 Dump Alert

```
🟢 PUMP & DUMP SCREENER

🔴 AVAX/USDT BINANCE
Dump: -6.54% (35.21 → 32.91)
📡 Сигнал: 8

💰 Возможна прибыльная торговля!

[📊 График] [🔗 Биржа]
```

**Когда:** Падение цены на -3%+ за 3 минуты

---

### 5. 📈 Open Interest Increase

```
📟 OPEN INTEREST SCREENER

📈 BTC/USDT BINANCE
⌚️ 15:30 — 15m

🔥 OI increased by 5.23%
💱 Price change: +1.25%

📊 Приток денег в рынок - возможен тренд!

Данные:
• Start OI: 1,234,567
• Current OI: 1,298,890

[📊 TradingView] [📈 OI Data]
[🔗 Binance]    [📊 Funding]
```

**Когда:** Рост OI на 3%+ за 5 минут

---

### 6. 📉 Open Interest Decrease

```
📟 OPEN INTEREST SCREENER

📉 ETH/USDT BINANCE
⌚️ 15:45 — 15m

🔻 OI decreased by 4.87%
💱 Price change: -0.92%

📊 Отток денег - возможен разворот!

Данные:
• Start OI: 987,654
• Current OI: 939,567

[📊 TradingView] [📈 OI Data]
[🔗 Binance]    [📊 Funding]
```

**Когда:** Падение OI на -3%+ за 5 минут

---

### 7. 🤖 ML Anomaly Detection

```
🤖 ML ANOMALY DETECTOR

🔴 SOL/USDT BINANCE
Type: VOLUME_SPIKE
Severity: 3.42 (HIGH)

📊 Объём: $15,234,567
💰 Цена: $142.50

🤖 ML обнаружил аномальную активность!

[📊 TradingView] [🔍 Analytics]
```

**Когда:** ML обнаружил аномалию (Isolation Forest)

---

## 🎯 Кнопки действий

### Для Whale/Momentum:
- 📊 **График** - TradingView
- 🔗 **Биржа** - Binance Futures

### Для Pump/Dump:
- 📊 **График** - TradingView
- 🔗 **Биржа** - Binance Futures

### Для OI алертов:
- 📊 **TradingView** - график
- 📈 **OI Data** - Coinglass Open Interest
- 🔗 **Binance** - торговая страница
- 📊 **Funding** - funding rates

### Для ML аномалий:
- 📊 **TradingView** - график
- 🔍 **Analytics** - Coinglass аналитика

---

## 📈 Частота уведомлений

| Тип | В день (спокойный) | В день (волатильный) |
|-----|-------------------|---------------------|
| 🐋 WHALE | 50-100 | 100-200 |
| 📈 MOMENTUM | 20-50 | 50-100 |
| 🟢 PUMP | 5-15 | 10-30 |
| 🔴 DUMP | 5-15 | 10-30 |
| 📈 OI_INCREASE | 5-20 | 10-40 |
| 📉 OI_DECREASE | 5-20 | 10-40 |
| 🤖 ML_ANOMALY | 5-15 | 20-50 |

**Всего:** 95-235 уведомлений в день

---

## 🔧 Настройки

### Cooldown (защита от спама)

```python
# bot/telegram_bot.py
self._cooldown_seconds = 5  # 5 секунд между алертами
```

### Фильтры

```python
# main.py
self.whale_detector = WhaleDetector(
    min_volume_usd=300000,  # $300k
)

self.momentum_detector = MomentumDetector(
    min_volume_usd=10000,  # $10k
    threshold_percent=300,  # 300%
)
```

---

## 💡 Примеры использования

### Сценарий 1: Приток денег (OI ↑ + Price ↑)

```
15:30 - 📈 OI increased by 5.23%
15:31 - 🟢 PUMP +3.5%
15:32 - 🐋 WHALE $450k BUY

💡 Действие: Лонг с подтверждением
```

### Сценарий 2: Отток денег (OI ↓ + Price ↓)

```
16:00 - 📉 OI decreased by 4.87%
16:01 - 🔴 DUMP -2.8%
16:02 - 🐋 WHALE $380k SELL

💡 Действие: Шорт или выход из лонга
```

### Сценарий 3: ML аномалия

```
17:00 - 🤖 ML ANOMALY VOLUME_SPIKE
17:01 - 📈 MOMENTUM +450%
17:02 - 🟢 PUMP +5.2%

💡 Действие: Проверить новости, возможен pump
```

---

## 🎁 Бонус: Команды бота

### `/start`
```
🐋 Whale Screener Bot

Команды:
/status - Статус системы
/set_threshold <amount> - Порог ($)
/pairs - Отслеживаемые пары
/logs - Последние логи
/help - Помощь
```

### `/status`
```
📊 Статус системы

✅ Бот активен
📈 Пар: 250
💰 Порог: $300,000
🐋 Китов найдено: 45
💵 Общий объём: $12,345,678
🤖 ML аномалий: 12
```

---

## 📊 Статистика

### Форматы сообщений:

| Тип | Формат | Эмодзи |
|-----|--------|--------|
| WHALE | HTML | 🐋🟢🔴 |
| MOMENTUM | HTML | 📈🟢🔴 |
| PUMP | HTML | 🟢💰 |
| DUMP | HTML | 🔴💰 |
| OI_INCREASE | HTML | 📟📈🔥 |
| OI_DECREASE | HTML | 📟📉🔻 |
| ML_ANOMALY | HTML | 🤖🔴 |

### Parse mode: HTML

```python
await self.bot.send_message(
    text=message,
    parse_mode="HTML",
    reply_markup=keyboard
)
```

---

## 🔍 Troubleshooting

### Уведомления не приходят

**Проблема:** Бот не активен

**Решение:**
1. Проверьте `/start` в Telegram
2. Проверьте токен в `.env`
3. Проверьте admin_id

### Слишком много уведомлений

**Проблема:** Спам

**Решение:**
1. Увеличьте `cooldown_seconds` до 10
2. Увеличьте пороги детекторов
3. Фильтруйте пары

### Кнопки не работают

**Проблема:** URL не открываются

**Решение:**
1. Проверьте формат URL
2. Используйте https://
3. Обновите Telegram

---

**Дата:** 2026-02-23  
**Версия:** 2.7.0  
**Статус:** ✅ Все уведомления работают
