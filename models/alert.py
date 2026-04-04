"""
Модель алерта
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from enum import Enum


class AlertType(Enum):
    """Тип алерта"""
    WHALE = "WHALE"
    MOMENTUM = "MOMENTUM"
    PRICE_SPIKE = "PRICE_SPIKE"
    PUMP = "PUMP"
    DUMP = "DUMP"
    OI_INCREASE = "OI_INCREASE"
    OI_DECREASE = "OI_DECREASE"
    ACCUMULATION = "ACCUMULATION"


@dataclass
class Alert:
    """
    Модель алерта о китовой сделке

    Attributes:
        alert_type: Тип алерта
        exchange: Название биржи
        pair: Торговая пара
        side: BUY или SELL
        volume_usd: Объём в долларах
        amount: Количество токенов
        price: Цена сделки
        timestamp: Время алерта
        tx_hash: Хэш транзакции (для DEX)
        # Для Pump/Dump и OI
        price_change: Процент изменения цены (или OI change для OI алертов)
        start_price: Начальная цена
        start_oi: Начальный OI
        current_oi: Текущий OI
        signal_count: Количество сигналов подряд
        oi_price_change: Изменение цены для OI алертов
        
        # Улучшенная информация о сигналах
        orderbook_imbalance: Дисбаланс стакана (0-100, >50 = больше покупок)
        volume_24h: Объём за 24 часа
        funding_rate: Текущий фандинг
        oi_change: Изменение Open Interest
        rsi: Текущее значение RSI
    """
    alert_type: AlertType
    exchange: str
    pair: str
    side: str = ""
    volume_usd: float = 0
    amount: float = 0
    price: float = 0
    timestamp: datetime = None
    tx_hash: Optional[str] = None
    # Дополнительные поля
    price_change: float = 0
    start_price: float = 0
    start_oi: float = 0
    current_oi: float = 0
    signal_count: int = 0
    oi_price_change: float = 0  # Изменение цены для OI алертов
    
    # Улучшенная информация о сигналах
    orderbook_imbalance: float = 50.0
    volume_24h: float = 0
    funding_rate: float = 0
    oi_change: float = 0
    rsi: Optional[float] = None
    
    # Дополнительные данные
    listing_date: Optional[str] = None  # Дата листинга монеты
    hashtag: Optional[str] = None  # Хэштег монеты
    price_24h_change: float = 0  # Изменение цены за 24 часа

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
    
    def to_dict(self) -> dict:
        """Конвертация в словарь для отправки в Telegram"""
        return {
            'ticker': self.pair,
            'exchange': self.exchange,
            'type': self.alert_type.value,
            'side': self.side.upper(),
            'volume_usd': self.volume_usd,
            'amount': self.amount,
            'price': self.price,
            'timestamp': self.timestamp,
            'tx_hash': self.tx_hash,
            'exchange_url': self._get_exchange_url(),
            # Улучшенная информация
            'orderbook_imbalance': self.orderbook_imbalance,
            'volume_24h': self.volume_24h,
            'funding_rate': self.funding_rate,
            'oi_change': self.oi_change,
            'rsi': self.rsi,
            # Дополнительные данные
            'listing_date': self.listing_date,
            'hashtag': self.hashtag,
            'price_24h_change': self.price_24h_change
        }
    
    def _get_orderbook_imbalance_text(self) -> str:
        """Получение текста о дисбалансе стакана"""
        if self.orderbook_imbalance >= 60:
            return f"📗 Покупки: {self.orderbook_imbalance:.0f}% (сильное давление покупателей)"
        elif self.orderbook_imbalance >= 55:
            return f"📙 Покупки: {self.orderbook_imbalance:.0f}% (лёгкое давление покупателей)"
        elif self.orderbook_imbalance <= 40:
            return f"📕 Продажи: {100-self.orderbook_imbalance:.0f}% (сильное давление продавцов)"
        elif self.orderbook_imbalance <= 45:
            return f"📙 Продажи: {100-self.orderbook_imbalance:.0f}% (лёгкое давление продавцов)"
        else:
            return "⚖️ Стакан сбалансирован"
    
    def _get_volume_text(self) -> str:
        """Получение текста об объёме"""
        if self.volume_24h >= 1e9:
            return f"📊 Volume 24h: ${self.volume_24h/1e9:.2f}B"
        elif self.volume_24h >= 1e6:
            return f"📊 Volume 24h: ${self.volume_24h/1e6:.2f}M"
        else:
            return f"📊 Volume 24h: ${self.volume_24h/1e3:.2f}K"
    
    def _get_funding_text(self) -> str:
        """Получение текста о фандинге"""
        if self.funding_rate > 0:
            return f"💰 Funding: +{self.funding_rate:.4f}% (лонги платят)"
        elif self.funding_rate < 0:
            return f"💰 Funding: {self.funding_rate:.4f}% (шорты платят)"
        else:
            return f"💰 Funding: {self.funding_rate:.4f}%"
    
    def _get_oi_text(self) -> str:
        """Получение текста об OI"""
        if self.oi_change != 0:
            return f"📈 OI: {self.oi_change:+.2f}%"
        return ""
    
    def _get_rsi_text(self) -> str:
        """Получение текста о RSI"""
        if self.rsi is not None:
            if self.rsi <= 30:
                return f"📉 RSI: {self.rsi:.1f} (перепроданность - сигнал к покупке)"
            elif self.rsi >= 70:
                return f"📈 RSI: {self.rsi:.1f} (перекупленность - сигнал к продаже)"
            else:
                return f"📊 RSI: {self.rsi:.1f}"
        return ""
    
    def _get_listing_date_text(self) -> str:
        """Получение текста о дате листинга"""
        if self.listing_date:
            return f"📅 Листинг: {self.listing_date}"
        return ""
    
    def _get_hashtag_text(self) -> str:
        """Получение текста о хэштеге"""
        if self.hashtag:
            return f"#️⃣ {self.hashtag}"
        return ""
    
    def _get_exchange_url(self) -> str:
        """Получение ссылки на биржу"""
        base_urls = {
            'binance': 'https://www.binance.com/en/trade/',
            'bybit': 'https://www.bybit.com/trade/usdt/',
            'uniswap_v3': 'https://app.uniswap.org/#/swap'
        }
        
        exchange_lower = self.exchange.lower()
        if exchange_lower in base_urls:
            symbol = self.pair.replace('/', '')
            return f"{base_urls[exchange_lower]}{symbol}"
        
        return '#'
    
    def format_message(self) -> str:
        """Форматирование сообщения для Telegram в стиле Pump and Dump Screener"""
        
        # Определяем тип сигнала
        side_upper = self.side.upper() if self.side else ''
        is_long = side_upper == 'LONG'
        is_short = side_upper == 'SHORT'
        
        # Определяем эмодзи для типа
        if self.alert_type == AlertType.PUMP:
            type_emoji = "🟢"
            type_text = "Pump"
        elif self.alert_type == AlertType.DUMP:
            type_emoji = "🔴"
            type_text = "Dump"
        else:
            type_emoji = "🟢" if self.price_change > 0 else "🔴"
            type_text = "Pump" if self.price_change > 0 else "Dump"
        
        # Дисбаланс стакана
        if self.orderbook_imbalance > 50:
            imbalance_emoji = "🟢"
            buyers_pct = self.orderbook_imbalance
            sellers_pct = 100 - self.orderbook_imbalance
        else:
            imbalance_emoji = "🔴"
            buyers_pct = self.orderbook_imbalance
            sellers_pct = 100 - self.orderbook_imbalance
        
        # RSI
        rsi_text = ""
        if self.rsi is not None:
            rsi_text = f"📊 RSI 15m: {self.rsi:.2f}"
        
        # Листинг
        listing_text = ""
        if self.listing_date:
            listing_text = f"📅 Листинг ({self.exchange}): {self.listing_date}"
        
        # Объём 24ч
        volume_text = ""
        if self.volume_24h > 0:
            if self.volume_24h >= 1e9:
                volume_text = f"📈 Объём 24ч: {self.volume_24h/1e9:.1f}B USDT"
            elif self.volume_24h >= 1e6:
                volume_text = f"📈 Объём 24ч: {self.volume_24h/1e6:.1f}M USDT"
            else:
                volume_text = f"📈 Объём 24ч: {self.volume_24h/1e3:.1f}K USDT"
        
        # Фандинг
        funding_text = ""
        if self.funding_rate != 0:
            funding_text = f"🧾 Фандинг: {self.funding_rate:+.2f}%"
        
        # Хэштег
        hashtag_text = ""
        if self.hashtag:
            hashtag_text = f"#{self.hashtag}"
        
        # Формируем сообщение
        message = f"Pump and Dump Screener:\n"
        message += f"{type_emoji} {self.pair} {self.exchange} {hashtag_text}\n"
        message += f"{type_text}: {self.price_change:.2f}% ({self.start_price:.6f} → {self.price:.6f})\n"
        
        # Цена за 24ч (если есть)
        if self.price_24h_change != 0:
            message += f"⏳ Цена за 24ч: {self.price_24h_change:+.2f}%\n"
        
        # Дисбаланс
        message += f"📉 Дисбаланс: {imbalance_emoji} ({buyers_pct:.1f}% / {sellers_pct:.1f}%)\n"
        
        # RSI
        if rsi_text:
            message += f"{rsi_text}\n"
        
        # Листинг
        if listing_text:
            message += f"{listing_text}\n"
        
        # Объём
        if volume_text:
            message += f"{volume_text}\n"
        
        # Фандинг
        if funding_text:
            message += f"{funding_text}\n"
        
        # Сигнал
        message += f"📡 Сигнал: {self.signal_count}"
        
        return message

        # Dump сообщения
        elif self.alert_type == AlertType.DUMP:
            return f"""
<b>🟢 PUMP & DUMP SCREENER</b>

🔴 {self.pair} {self.exchange}
Dump: {self.price_change:.2f}% ({self.start_price:.6f} → {self.price:.6f})
📡 Сигнал: {self.signal_count}

💰 <i>Возможна прибыльная торговля!</i>
"""

        # OI Increase - Рост открытого интереса
        elif self.alert_type == AlertType.OI_INCREASE:
            return f"""
<b>📟 OPEN INTEREST SCREENER</b>

📈 {self.pair} {self.exchange}
⌚️ {self.timestamp.strftime('%H:%M')} — 5m

<b>🔥 OI increased by {abs(self.price_change):.2f}%</b>
💱 Price change: {self.oi_price_change:+.2f}%
💰 Price: ${self.price:,.6f}

📊 <i>Приток денег в рынок - возможен тренд!</i>

📊 OI данные:
• Start: {self.start_oi:,.0f}
• Current: {self.current_oi:,.0f}
"""

        # OI Decrease - Падение открытого интереса
        elif self.alert_type == AlertType.OI_DECREASE:
            return f"""
<b>📟 OPEN INTEREST SCREENER</b>

📉 {self.pair} {self.exchange}
⌚️ {self.timestamp.strftime('%H:%M')} — 5m

<b>🔻 OI decreased by {abs(self.price_change):.2f}%</b>
💱 Price change: {self.oi_price_change:+.2f}%
💰 Price: ${self.price:,.6f}

📊 <i>Отток денег - возможен разворот!</i>

📊 OI данные:
• Start: {self.start_oi:,.0f}
• Current: {self.current_oi:,.0f}
"""

        # ML Anomaly - Аномалии Machine Learning
        elif self.alert_type == AlertType.PRICE_SPIKE:
            severity_text = "HIGH" if self.price_change > 200 else "MEDIUM"
            return f"""
<b>🤖 ML ANOMALY DETECTOR</b>

🔴 {self.pair} {self.exchange}
Type: {self.side}
Severity: {self.price_change:.2f} ({severity_text})

📊 Объём: ${self.volume_usd:,.2f}
💰 Цена: ${self.price:,.2f}

🤖 <i>ML обнаружил аномальную активность!</i>
"""

        # Стандартные сообщения (WHALE, MOMENTUM)
        elif self.alert_type in [AlertType.WHALE, AlertType.MOMENTUM]:
            emoji = "🟢" if self.side == 'BUY' else "🔴"
            type_emoji = "🐋" if self.alert_type == AlertType.WHALE else "📈"

            return f"""
{emoji} <b>{type_emoji} КИТОВАЯ СДЕЛКА</b> {emoji}

<b>Тикер:</b> {self.pair}
<b>Биржа:</b> {self.exchange.upper()}
<b>Тип:</b> {self.side.upper()}
<b>Объём:</b> ${self.volume_usd:,.2f}
<b>Цена:</b> ${self.price:,.2f}

<b>Время:</b> {self.timestamp.strftime('%H:%M:%S')}
"""

        # Fallback для неизвестных типов
        return f"""
🚨 ALERT

{self.pair} {self.exchange}
Type: {self.alert_type.value}
Details: ${self.volume_usd:,.2f}
"""