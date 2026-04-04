import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import datetime, timedelta
from binance import Client
from typing import Dict, List, Optional
import requests
import json
import time
import warnings
warnings.filterwarnings('ignore')

# Настройка страницы
st.set_page_config(
    page_title="🐋 CRYPTO WHALE SCREENER",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Стили CSS
st.markdown("""
<style>
    .stApp { background-color: #0e1117; }
    .main { background-color: #0e1117; }
    [data-testid="stMetricValue"] {
        font-size: 20px !important;
        font-weight: bold !important;
    }
    .stDataFrame {
        background-color: #1a1d24;
        border-radius: 10px;
    }
    div[data-testid="stDataFrame"] {
        border: 1px solid #2d2d2d;
    }
    .big-number {
        font-size: 28px;
        font-weight: bold;
    }
    .price-up { color: #00ff88; }
    .price-down { color: #ff416c; }
    
    /* Скрыть меню Streamlit */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
</style>
""", unsafe_allow_html=True)


class BinanceAPI:
    """API клиент для Binance"""
    
    BASE_URL = "https://api.binance.com"
    FUTURES_URL = "https://fapi.binance.com"
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'Mozilla/5.0'})
    
    def get_all_tickers(self) -> List[Dict]:
        """Получение всех фьючерсных тикеров"""
        try:
            url = f"{self.FUTURES_URL}/fapi/v1/ticker/24hr"
            response = self.session.get(url, timeout=10)
            data = response.json()
            
            if isinstance(data, list):
                return [t for t in data if t.get('symbol', '').endswith('USDT')]
            return []
        except Exception as e:
            print(f"Error getting tickers: {e}")
            return []
    
    def get_orderbook(self, symbol: str, limit: int = 100) -> Dict:
        """Получение стакана"""
        try:
            url = f"{self.FUTURES_URL}/fapi/v1/depth"
            params = {'symbol': symbol, 'limit': limit}
            response = self.session.get(url, params=params, timeout=5)
            return response.json() if response.status_code == 200 else {}
        except Exception as e:
            return {}
    
    def get_klines(self, symbol: str, interval: str = '1h', limit: int = 500) -> List:
        """Получение свечей"""
        try:
            url = f"{self.FUTURES_URL}/fapi/v1/klines"
            params = {'symbol': symbol, 'interval': interval, 'limit': limit}
            response = self.session.get(url, params=params, timeout=10)
            return response.json() if response.status_code == 200 else []
        except Exception as e:
            return []
    
    def get_trades(self, symbol: str, limit: int = 100) -> List:
        """Получение последних сделок"""
        try:
            url = f"{self.FUTURES_URL}/fapi/v1/trades"
            params = {'symbol': symbol, 'limit': limit}
            response = self.session.get(url, params=params, timeout=5)
            return response.json() if response.status_code == 200 else []
        except Exception as e:
            return []
    
    def get_aggregated_trades(self, symbol: str, limit: int = 100) -> List:
        """Получение агрегированных сделок"""
        try:
            url = f"{self.FUTURES_URL}/fapi/v1/aggTrades"
            params = {'symbol': symbol, 'limit': limit}
            response = self.session.get(url, params=params, timeout=5)
            return response.json() if response.status_code == 200 else []
        except Exception as e:
            return []
    
    def get_open_interest(self, symbol: str) -> Dict:
        """Получение открытого интереса"""
        try:
            url = f"{self.FUTURES_URL}/fapi/v1/openInterest"
            params = {'symbol': symbol}
            response = self.session.get(url, params=params, timeout=5)
            return response.json() if response.status_code == 200 else {}
        except Exception as e:
            return {}
    
    def get_funding_rate(self, symbol: str, limit: int = 10) -> List:
        """Получение funding rate"""
        try:
            url = f"{self.FUTURES_URL}/fapi/v1/fundingRate"
            params = {'symbol': symbol, 'limit': limit}
            response = self.session.get(url, params=params, timeout=5)
            return response.json() if response.status_code == 200 else []
        except Exception as e:
            return []
    
    def get_open_interest_history(self, symbol: str, period: str = '1h', limit: int = 100) -> List:
        """Получение истории открытого интереса"""
        try:
            url = f"{self.FUTURES_URL}/fapi/v1/openInterestHist"
            params = {'symbol': symbol, 'period': period, 'limit': limit}
            response = self.session.get(url, params=params, timeout=10)
            return response.json() if response.status_code == 200 else []
        except Exception as e:
            return []
    
    def get_taker_long_short_ratio(self, symbol: str, limit: int = 100) -> List:
        """Получение соотношения лонгов/шортов"""
        try:
            url = f"{self.FUTURES_URL}/fapi/v1/takerlongshortRatio"
            params = {'symbol': symbol, 'limit': limit}
            response = self.session.get(url, params=params, timeout=5)
            return response.json() if response.status_code == 200 else []
        except Exception as e:
            return []


def format_number(num: float) -> str:
    """Форматирование чисел"""
    if abs(num) >= 1e9:
        return f"{num/1e9:.2f}B"
    elif abs(num) >= 1e6:
        return f"{num/1e6:.2f}M"
    elif abs(num) >= 1e3:
        return f"{num/1e3:.2f}K"
    else:
        return f"{num:.2f}"


def format_price(num: float) -> str:
    """Форматирование цены"""
    if num >= 1000:
        return f"{num:,.2f}"
    elif num >= 1:
        return f"{num:,.4f}"
    else:
        return f"{num:,.8f}"


def create_candlestick_chart(df: pd.DataFrame, symbol: str, oi_data: pd.DataFrame = None) -> go.Figure:
    """Создание свечного графика с OI в стиле RSI"""
    fig = make_subplots(rows=3, cols=1, shared_xaxes=True, 
                       vertical_spacing=0.03,
                       row_heights=[0.5, 0.25, 0.25])
    
    # Свечи
    colors = np.where(df['close'] >= df['open'], '#00ff88', '#ff416c')
    
    fig.add_trace(go.Candlestick(
        x=df['timestamp'],
        open=df['open'],
        high=df['high'],
        low=df['low'],
        close=df['close'],
        name=symbol,
        increasing_line_color='#00ff88',
        decreasing_line_color='#ff416c',
        increasing_fillcolor='#00ff88',
        decreasing_fillcolor='#ff416c'
    ), row=1, col=1)
    
    # Объём
    colors_vol = ['#00ff88' if df['close'].iloc[i] >= df['open'].iloc[i] 
                  else '#ff416c' for i in range(len(df))]
    
    fig.add_trace(go.Bar(
        x=df['timestamp'],
        y=df['volume'],
        marker_color=colors_vol,
        name='Volume',
        opacity=0.5
    ), row=2, col=1)
    
    # Open Interest (в стиле RSI)
    if oi_data is not None and not oi_data.empty:
        # Нормализация OI от 0 до 100
        oi_values = oi_data['sumOpenInterest'].astype(float)
        oi_min = oi_values.min()
        oi_max = oi_values.max()
        
        if oi_max > oi_min:
            oi_normalized = ((oi_values - oi_min) / (oi_max - oi_min)) * 100
        else:
            oi_normalized = oi_values * 0 + 50
        
        # Изменение OI (Delta)
        oi_delta = oi_values.diff().fillna(0)
        
        # Цвета: зелёный если OI растёт, красный если падает
        oi_colors = ['#00ff88' if d >= 0 else '#ff416c' for d in oi_delta]
        
        fig.add_trace(go.Bar(
            x=oi_data['timestamp'],
            y=oi_delta,
            marker_color=oi_colors,
            name='OI Delta',
            opacity=0.7
        ), row=3, col=1)
        
        # Линия нормализованного OI
        fig.add_trace(go.Scatter(
            x=oi_data['timestamp'],
            y=oi_normalized,
            mode='lines',
            line=dict(color='#00d4ff', width=2),
            name='OI (normalized)',
            yaxis='y4'
        ), row=3, col=1)
    
    fig.update_layout(
        template='plotly_dark',
        paper_bgcolor='#0e1117',
        plot_bgcolor='#0e1117',
        font=dict(color='white'),
        xaxis_rangeslider_visible=False,
        height=600,
        margin=dict(l=50, r=50, t=50, b=50),
        legend=dict(orientation='h', y=1.02),
        # Добавляем yaxis4 для OI
        yaxis4=dict(
            title='OI',
            range=[0, 100],
            showgrid=True,
            gridcolor='#2d2d2d',
            side='right'
        )
    )
    
    fig.update_xaxes(gridcolor='#2d2d2d', showgrid=True, row=2, col=1)
    fig.update_xaxes(gridcolor='#2d2d2d', showgrid=True, row=3, col=1)
    fig.update_yaxes(gridcolor='#2d2d2d', showgrid=True, row=2, col=1)
    fig.update_yaxes(gridcolor='#2d2d2d', showgrid=True, row=3, col=1)
    
    return fig


def create_orderbook_chart(bids: List, asks: List, symbol: str) -> go.Figure:
    """Создание графика стакана"""
    bid_prices = [float(b[0]) for b in bids]
    bid_vols = [float(b[1]) for b in bids]
    ask_prices = [float(a[0]) for a in asks]
    ask_vols = [float(a[1]) for a in asks]
    
    # Расчёт кумулятивных объёмов
    bid_cumsum = np.cumsum(bid_vols[::-1])[::-1]
    ask_cumsum = np.cumsum(ask_vols)
    
    fig = make_subplots(rows=1, cols=2, 
                       subplot_titles=('Bids (Покупки)', 'Asks (Продажи)'),
                       horizontal_spacing=0.05)
    
    # Bids
    fig.add_trace(go.Bar(
        y=[f"#{i+1}" for i in range(len(bid_prices))],
        x=bid_cumsum,
        orientation='h',
        marker_color='#00ff88',
        name='Bids',
        text=[format_number(v) for v in bid_cumsum],
        textposition='outside'
    ), row=1, col=1)
    
    # Asks
    fig.add_trace(go.Bar(
        y=[f"#{i+1}" for i in range(len(ask_prices))],
        x=ask_cumsum,
        orientation='h',
        marker_color='#ff416c',
        name='Asks',
        text=[format_number(v) for v in ask_cumsum],
        textposition='outside'
    ), row=1, col=2)
    
    fig.update_layout(
        template='plotly_dark',
        paper_bgcolor='#0e1117',
        font=dict(color='white'),
        height=400,
        showlegend=False
    )
    
    return fig


def create_trades_chart(trades: List, symbol: str) -> go.Figure:
    """Создание графика последних сделок"""
    if not trades:
        return None
    
    df = pd.DataFrame(trades)
    df['price'] = pd.to_numeric(df['price'])
    df['qty'] = pd.to_numeric(df['qty'])
    df['time'] = pd.to_datetime(df['time'], unit='ms')
    df['volume'] = df['price'] * df['qty']
    df['isBuyerMaker'] = df['isBuyerMaker'].astype(bool)
    
    colors = ['#00ff88' if not m else '#ff416c' for m in df['isBuyerMaker']]
    sizes = np.log1p(df['volume']) * 5
    
    fig = go.Figure()
    
    fig.add_trace(go.Scatter(
        x=df['time'],
        y=df['price'],
        mode='markers',
        marker=dict(
            size=sizes,
            color=colors,
            line=dict(width=1, color='white'),
            opacity=0.7
        ),
        name='Trades',
        text=[f"${format_number(v)}" for v in df['volume']],
        hovertemplate='%{text}<br>%{y:.4f}<extra></extra>'
    ))
    
    fig.update_layout(
        template='plotly_dark',
        paper_bgcolor='#0e1117',
        font=dict(color='white'),
        height=300,
        xaxis_title='Time',
        yaxis_title='Price',
        showlegend=False
    )
    
    fig.update_xaxes(gridcolor='#2d2d2d')
    fig.update_yaxes(gridcolor='#2d2d2d')
    
    return fig


# Популярные пары
POPULAR_PAIRS = [
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT",
    "ADAUSDT", "DOGEUSDT", "MATICUSDT", "DOTUSDT", "LTCUSDT",
    "AVAXUSDT", "LINKUSDT", "UNIUSDT", "ATOMUSDT", "XMRUSDT",
    "NEARUSDT", "APTUSDT", "ARBUSDT", "OPUSDT", "INJUSDT",
    "SUIUSDT", "FTMUSDT", "ALGOUSDT", "AAVEUSDT", "MKRUSDT",
    "SNXUSDT", "COMPUSDT", "MANTLEUSDT", "FETUSDT", "RNDRUSDT",
    "GRTUSDT", "SANDUSDT", "MANAUSDT", "AXSUSDT", "EGLDUSDT",
    "MINAUSDT", "KASUSDT", "RUNEUSDT", "STXUSDT", "KSMUSDT",
    "DYMUSDT", "STRKUSDT", "SEIUSDT", "CFXUSDT", "FLOWUSDT",
    "XTZUSDT", "EOSUSDT", "THETAUSDT", "ENJUSDT", "CHZUSDT",
    "CRVUSDT", "YFIUSDT", "BALUSDT", "SUSHIUSDT", "1INCHUSDT"
]

INTERVALS = {
    "1m": "1 минута",
    "3m": "3 минуты",
    "5m": "5 минут",
    "15m": "15 минут",
    "30m": "30 минут",
    "1h": "1 час",
    "2h": "2 часа",
    "4h": "4 часа",
    "6h": "6 часов",
    "8h": "8 часов",
    "12h": "12 часов",
    "1d": "1 день"
}


# Главное приложение
st.markdown("""
<div style="text-align: center; padding: 10px;">
    <h1 style="color: #00ff88; margin: 0;">🐋 CRYPTO WHALE SCREENER</h1>
    <p style="color: #888; margin: 5px 0;">Binance Futures | Real-time Market Analysis</p>
</div>
""", unsafe_allow_html=True)

# Боковая панель
with st.sidebar:
    st.header("⚙️ Настройки")
    
    # API Keys
    st.subheader("🔑 API Keys")
    api_key = st.text_input("API Key", type="password")
    api_secret = st.text_input("Secret", type="password")
    
    st.divider()
    
    # Режим
    st.subheader("📊 Режим")
    mode = st.selectbox("Режим", 
                        ["📈 Скринер", "📊 График", "📋 Стакан", "🐋 Сделки китов", "📉 OI & Funding"])
    
    # Интервал
    st.subheader("📅 Таймфрейм")
    interval = st.selectbox("Интервал", list(INTERVALS.keys()), 
                           index=5, format_func=lambda x: INTERVALS[x])
    
    # Символы
    st.subheader("🔥 Символы")
    selected_symbols = st.multiselect(
        "Отслеживаемые пары",
        POPULAR_PAIRS,
        default=["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT", 
                 "ADAUSDT", "DOGEUSDT", "ARBUSDT", "OPUSDT", "NEARUSDT"]
    )
    
    # Фильтры
    st.subheader("🔍 Фильтры")
    min_volume = st.number_input("Мин. объём 24h (USDT)", value=10000000)
    min_price = st.number_input("Мин. цена (USDT)", value=0.001)
    max_price = st.number_input("Макс. цена (USDT)", value=1000000.0)
    min_change = st.slider("Мин. изменение %", -50, 50, -50)
    max_change = st.slider("Макс. изменение %", -50, 50, 50)
    
    # Сортировка
    st.subheader("📊 Сортировка")
    sort_by = st.selectbox("Сортировать по", 
                          ["Volume", "Price Change", "Price", "Symbol"])
    sort_order = st.radio("Порядок", ["⬆️ По убыванию", "⬇️ По возрастанию"])

# Инициализация API
api = BinanceAPI()

# Получение данных
with st.spinner('Загрузка данных с Binance...'):
    tickers = api.get_all_tickers()


if mode == "📈 Скринер":
    st.subheader("📈 Рыночный скринер")
    
    # Фильтрация данных
    filtered = []
    for t in tickers:
        symbol = t.get('symbol', '')
        if symbol not in selected_symbols:
            continue
        
        price = float(t.get('lastPrice', 0))
        volume = float(t.get('quoteVolume', 0))
        change = float(t.get('priceChangePercent', 0))
        
        if (volume >= min_volume and 
            min_price <= price <= max_price and
            min_change <= change <= max_change):
            
            # Получаем дополнительные данные
            oi = api.get_open_interest(symbol)
            orderbook = api.get_orderbook(symbol, 20)
            
            bids = orderbook.get('bids', [])[:10]
            asks = orderbook.get('asks', [])[:10]
            
            # Анализ плотностей
            total_bid_vol = sum(float(b[1]) for b in bids)
            total_ask_vol = sum(float(a[1]) for a in asks)
            
            best_bid = float(bids[0][0]) if bids else price
            best_ask = float(asks[0][0]) if asks else price
            spread = (best_ask - best_bid) / best_bid * 100 if best_bid > 0 else 0
            
            # Funding rate
            funding = api.get_funding_rate(symbol, 1)
            funding_rate = float(funding[0].get('fundingRate', 0)) * 100 if funding else 0
            
            filtered.append({
                'Symbol': symbol,
                'Price': price,
                '24h %': change,
                'Volume 24h': volume,
                'High 24h': float(t.get('highPrice', 0)),
                'Low 24h': float(t.get('lowPrice', 0)),
                'Open Interest': float(oi.get('openInterest', 0)),
                'Funding %': funding_rate,
                'Bid Vol': total_bid_vol * best_bid,
                'Ask Vol': total_ask_vol * best_ask,
                'Spread %': spread
            })
    
    if filtered:
        df = pd.DataFrame(filtered)
        
        # Сортировка
        sort_map = {
            'Volume': 'Volume 24h',
            'Price Change': '24h %',
            'Price': 'Price',
            'Symbol': 'Symbol'
        }
        sort_col = sort_map.get(sort_by, 'Volume 24h')
        ascending = sort_order.startswith("⬇")
        if sort_col in df.columns:
            df = df.sort_values(sort_col, ascending=ascending)
        else:
            df = df.sort_values('Volume 24h', ascending=False)
        
        # Метрики
        col1, col2, col3, col4, col5 = st.columns(5)
        with col1:
            pump = len(df[df['24h %'] > 5])
            st.metric("🚀 Рост >5%", f"{pump}", delta_color="normal")
        with col2:
            dump = len(df[df['24h %'] < -5])
            st.metric("📉 Падение >5%", f"{dump}", delta_color="inverse")
        with col3:
            whale = len(df[(df['Bid Vol'] > 100000) | (df['Ask Vol'] > 100000)])
            st.metric("🐋 High Activity", f"{whale}")
        with col4:
            avg_vol = df['Volume 24h'].mean()
            st.metric("📊 Avg Volume", format_number(avg_vol))
        with col5:
            avg_funding = df['Funding %'].mean()
            st.metric("💰 Avg Funding", f"{avg_funding:.4f}%")
        
        # Таблица
        st.dataframe(
            df.style.format({
                'Price': lambda x: f"${format_price(x)}",
                '24h %': lambda x: f"{x:+.2f}%",
                'Volume 24h': format_number,
                'High 24h': lambda x: f"${format_price(x)}",
                'Low 24h': lambda x: f"${format_price(x)}",
                'Open Interest': format_number,
                'Funding %': lambda x: f"{x:.4f}%",
                'Bid Vol': format_number,
                'Ask Vol': format_number,
                'Spread %': lambda x: f"{x:.4f}%"
            }).applymap(
                lambda x: 'color: #00ff88' if isinstance(x, (int, float)) and x > 5 
                else 'color: #ff416c' if isinstance(x, (int, float)) and x < -5 
                else '',
                subset=['24h %']
            ).background_gradient(
                subset=['Volume 24h', 'Open Interest'],
                cmap='Greens'
            ),
            width='stretch',
            height=500,
            hide_index=True
        )
        
        # Графики
        col_g1, col_g2 = st.columns(2)
        
        with col_g1:
            st.subheader("📊 Топ по объёму")
            top_vol = df.nlargest(10, 'Volume 24h')
            fig = go.Figure(go.Bar(
                y=top_vol['Symbol'],
                x=top_vol['Volume 24h'],
                orientation='h',
                marker_color='#00ff88',
                text=[format_number(v) for v in top_vol['Volume 24h']],
                textposition='outside'
            ))
            fig.update_layout(
                template='plotly_dark',
                paper_bgcolor='#0e1117',
                font=dict(color='white'),
                height=300,
                margin=dict(l=50, r=50, t=30, b=30),
                xaxis_title='Volume (USDT)'
            )
            st.plotly_chart(fig, width='stretch', height=300)
        
        with col_g2:
            st.subheader("📈 Топ по изменению")
            top_change = df.nlargest(5, '24h %')
            colors = ['#00ff88' if x > 0 else '#ff416c' for x in top_change['24h %']]
            fig = go.Figure(go.Bar(
                y=top_change['Symbol'],
                x=top_change['24h %'],
                orientation='h',
                marker_color=colors,
                text=[f"{x:+.2f}%" for x in top_change['24h %']],
                textposition='outside'
            ))
            fig.update_layout(
                template='plotly_dark',
                paper_bgcolor='#0e1117',
                font=dict(color='white'),
                height=300,
                margin=dict(l=50, r=50, t=30, b=30),
                xaxis_title='Change %'
            )
            st.plotly_chart(fig, width='stretch', height=300)
    
    else:
        st.warning("Нет данных для отображения. Попробуйте изменить фильтры.")


elif mode == "📊 График":
    st.subheader("📊 График и анализ")
    
    if selected_symbols:
        symbol = st.selectbox("Выберите символ", selected_symbols)
        
        # Загрузка данных
        klines = api.get_klines(symbol, interval, 200)
        
        # Получаем историю OI с Binance
        oi_history = api.get_open_interest_history(symbol, interval, 100)
        
        if klines:
            df = pd.DataFrame(klines, columns=[
                'timestamp', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_volume', 'trades', 'taker_buy_base',
                'taker_buy_quote', 'ignore'
            ])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df['open'] = pd.to_numeric(df['open'])
            df['close'] = pd.to_numeric(df['close'])
            df['high'] = pd.to_numeric(df['high'])
            df['low'] = pd.to_numeric(df['low'])
            df['volume'] = pd.to_numeric(df['volume'])
            
            # Конвертируем OI историю в DataFrame
            oi_df = None
            if oi_history and isinstance(oi_history, list) and len(oi_history) > 0:
                oi_df = pd.DataFrame(oi_history)
                if not oi_df.empty:
                    oi_df['timestamp'] = pd.to_datetime(oi_df['timestamp'], unit='ms')
                    if 'sumOpenInterest' in oi_df.columns:
                        oi_df['sumOpenInterest'] = pd.to_numeric(oi_df['sumOpenInterest'])
                    else:
                        oi_df['sumOpenInterest'] = pd.to_numeric(oi_df.get('openInterest', [0]*len(oi_df)))
            
            # Метрики
            ticker = next((t for t in tickers if t.get('symbol') == symbol), {})
            
            m1, m2, m3, m4, m5 = st.columns(5)
            m1.metric("Цена", f"${format_price(df['close'].iloc[-1])}")
            m2.metric("24h %", f"{float(ticker.get('priceChangePercent', 0)):+.2f}%")
            m3.metric("High 24h", f"${format_price(float(ticker.get('highPrice', 0)))}")
            m4.metric("Low 24h", f"${format_price(float(ticker.get('lowPrice', 0)))}")
            m5.metric("Volume", format_number(float(ticker.get('quoteVolume', 0))))
            
            # График
            fig = create_candlestick_chart(df, symbol, oi_df)
            st.plotly_chart(fig, width='stretch')
            
            # Дополнительная статистика
            col_s1, col_s2, col_s3, col_s4 = st.columns(4)
            with col_s1:
                change_24h = float(ticker.get('priceChangePercent', 0))
                st.metric("Изменение 24h", f"{change_24h:+.2f}%")
            with col_s2:
                avg_price = df['close'].mean()
                st.metric("Средняя цена", f"${format_price(avg_price)}")
            with col_s3:
                volatility = (df['high'].max() - df['low'].min()) / df['open'].iloc[0] * 100
                st.metric("Волатильность", f"{volatility:.2f}%")
            with col_s4:
                oi = api.get_open_interest(symbol)
                st.metric("Open Interest", format_number(float(oi.get('openInterest', 0))))


elif mode == "📋 Стакан":
    st.subheader("📋 Биржевой стакан")
    
    if selected_symbols:
        symbol = st.selectbox("Выберите символ", selected_symbols, key='orderbook_symbol')
        
        orderbook = api.get_orderbook(symbol, 50)
        bids = orderbook.get('bids', [])
        asks = orderbook.get('asks', [])
        
        if bids and asks:
            best_bid = float(bids[0][0])
            best_ask = float(asks[0][0])
            spread = (best_ask - best_bid) / best_bid * 100
            
            # Метрики
            m1, m2, m3, m4 = st.columns(4)
            m1.metric("Best Bid", f"${format_price(best_bid)}")
            m2.metric("Best Ask", f"${format_price(best_ask)}")
            m3.metric("Spread", f"${format_price(best_ask - best_bid)}")
            m4.metric("Spread %", f"{spread:.4f}%")
            
            # График стакана
            fig = create_orderbook_chart(bids[:15], asks[:15], symbol)
            st.plotly_chart(fig, width='stretch')
            
            # Таблица bids
            col_b, col_a = st.columns(2)
            
            with col_b:
                st.markdown("### 🟢 BIDS (Покупки)")
                bids_data = []
                for b in bids[:20]:
                    bids_data.append({
                        'Price': f"${format_price(float(b[0]))}",
                        'Qty': f"{float(b[1]):.4f}"
                    })
                bids_df = pd.DataFrame(bids_data)
                st.dataframe(bids_df, hide_index=True, width='stretch')
            
            with col_a:
                st.markdown("### 🔴 ASKS (Продажи)")
                asks_data = []
                for a in asks[:20]:
                    asks_data.append({
                        'Price': f"${format_price(float(a[0]))}",
                        'Qty': f"{float(a[1]):.4f}"
                    })
                asks_df = pd.DataFrame(asks_data)
                st.dataframe(asks_df, hide_index=True, width='stretch')
            
            # Анализ крупных заявок
            st.subheader("🐋 Крупные заявки (>100K USDT)")
            
            whale_bids = []
            for b in bids:
                vol = float(b[0]) * float(b[1])
                if vol >= 100000:
                    whale_bids.append({'Price': float(b[0]), 'Qty': float(b[1]), 'Volume': vol})
            
            whale_asks = []
            for a in asks:
                vol = float(a[0]) * float(a[1])
                if vol >= 100000:
                    whale_asks.append({'Price': float(a[0]), 'Qty': float(a[1]), 'Volume': vol})
            
            if whale_bids:
                wb_data = []
                for w in whale_bids:
                    wb_data.append({
                        'Price': f"${format_price(w['Price'])}",
                        'Qty': f"{w['Qty']:.4f}",
                        'Volume': format_number(w['Volume'])
                    })
                wb_df = pd.DataFrame(wb_data)
                st.markdown("**🟢 Крупные покупки:**")
                st.dataframe(wb_df, hide_index=True, width='stretch')
            else:
                st.info("Крупных покупок не обнаружено")
            
            if whale_asks:
                wa_data = []
                for w in whale_asks:
                    wa_data.append({
                        'Price': f"${format_price(w['Price'])}",
                        'Qty': f"{w['Qty']:.4f}",
                        'Volume': format_number(w['Volume'])
                    })
                wa_df = pd.DataFrame(wa_data)
                st.markdown("**🔴 Крупные продажи:**")
                st.dataframe(wa_df, hide_index=True, width='stretch')
            else:
                st.info("Крупных продаж не обнаружено")
        
        else:
            st.error("Не удалось загрузить стакан")


elif mode == "🐋 Сделки китов":
    st.subheader("� Whale Watch - Отслеживание крупных сделок")
    
    if selected_symbols:
        symbol = st.selectbox("Выберите символ", selected_symbols, key='trades_symbol')
        
        # Параметры
        col_p1, col_p2 = st.columns(2)
        with col_p1:
            whale_threshold = st.number_input("Мин. объём кита (USDT)", value=50000)
        with col_p2:
            limit_trades = st.slider("Количество сделок", 50, 500, 200)
        
        # Загрузка сделок
        trades = api.get_aggregated_trades(symbol, limit_trades)
        
        if trades:
            df = pd.DataFrame(trades)
            df['price'] = pd.to_numeric(df['p'])
            df['qty'] = pd.to_numeric(df['q'])
            df['time'] = pd.to_datetime(df['T'], unit='ms')
            df['volume'] = df['price'] * df['qty']
            df['isBuyerMaker'] = df['m'].astype(bool)
            
            # Фильтр китов
            whale_trades = df[df['volume'] >= whale_threshold].copy()
            whale_trades = whale_trades.sort_values('volume', ascending=False)
            
            # Метрики
            m1, m2, m3, m4 = st.columns(4)
            m1.metric("Всего сделок", len(df))
            m2.metric("Сделок китов", len(whale_trades))
            m3.metric("Объём китов", format_number(whale_trades['volume'].sum()))
            m4.metric("Средний объём", format_number(whale_trades['volume'].mean() if len(whale_trades) > 0 else 0))
            
            # График сделок
            if not df.empty:
                fig = go.Figure()
                
                # Покупки (зелёные)
                buys = df[~df['isBuyerMaker']]
                fig.add_trace(go.Scatter(
                    x=df['time'],
                    y=df['price'],
                    mode='markers',
                    marker=dict(
                        size=np.log1p(df['volume']) * 8,
                        color=['#00ff88' if not m else '#ff416c' for m in df['isBuyerMaker']],
                        line=dict(width=1, color='white'),
                        opacity=0.7
                    ),
                    text=[f"${format_number(v)}" for v in df['volume']],
                    hovertemplate='%{text}<br>%{y:.4f}<extra></extra>',
                    name='All Trades'
                ))
                
                fig.update_layout(
                    template='plotly_dark',
                    paper_bgcolor='#0e1117',
                    font=dict(color='white'),
                    height=350,
                    xaxis_title='Time',
                    yaxis_title='Price',
                    showlegend=False
                )
                fig.update_xaxes(gridcolor='#2d2d2d')
                fig.update_yaxes(gridcolor='#2d2d2d')
                
                st.plotly_chart(fig, width='stretch')
            
            # Таблица китов
            if not whale_trades.empty:
                st.subheader("🐋 Крупнейшие сделки")
                
                trades_data = []
                for _, row in whale_trades.head(50).iterrows():
                    trades_data.append({
                        'Time': row['time'].strftime('%H:%M:%S'),
                        'Price': f"${format_price(row['price'])}",
                        'Qty': f"{row['qty']:.4f}",
                        'Volume': format_number(row['volume']),
                        'Type': '🟢 Buy' if not row['isBuyerMaker'] else '🔴 Sell'
                    })
                
                display_cols = pd.DataFrame(trades_data)
                st.dataframe(
                    display_cols.style.format({
                        'Volume': lambda x: f"${x}"
                    }).applymap(
                        lambda x: 'color: #00ff88' if 'Buy' in str(x) else 'color: #ff416c' if 'Sell' in str(x) else '',
                        subset=['Type']
                    ),
                    hide_index=True,
                    width='stretch'
                )
            else:
                st.info(f"Нет сделок крупнее ${format_number(whale_threshold)}")
        
        else:
            st.error("Не удалось загрузить сделки")


elif mode == "📉 OI & Funding":
    st.subheader("📉 Open Interest & Funding Rate")
    
    if selected_symbols:
        symbol = st.selectbox("Выберите символ", selected_symbols, key='oi_symbol')
        
        # Загрузка данных
        oi_history = api.get_funding_rate(symbol, 100)
        oi_current = api.get_open_interest(symbol)
        
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Текущий OI", format_number(float(oi_current.get('openInterest', 0))))
        
        if oi_history:
            current_funding = float(oi_history[0].get('fundingRate', 0)) * 100
            avg_funding = np.mean([float(f.get('fundingRate', 0)) * 100 for f in oi_history])
            
            col2.metric("Funding Rate", f"{current_funding:.4f}%")
            col3.metric("Avg Funding (100)", f"{avg_funding:.4f}%")
            
            # График Funding
            df_funding = pd.DataFrame(oi_history)
            df_funding['time'] = pd.to_datetime(df_funding['fundingTime'], unit='ms')
            df_funding['fundingRate'] = df_funding['fundingRate'].astype(float) * 100
            
            fig = go.Figure(go.Scatter(
                x=df_funding['time'],
                y=df_funding['fundingRate'],
                mode='lines+markers',
                marker=dict(size=8, color='#00ff88'),
                line=dict(color='#00ff88', width=2),
                fill='tozeroy',
                fillcolor='rgba(0, 255, 136, 0.2)'
            ))
            
            fig.update_layout(
                template='plotly_dark',
                paper_bgcolor='#0e1117',
                font=dict(color='white'),
                height=300,
                xaxis_title='Time',
                yaxis_title='Funding Rate %',
                showlegend=False
            )
            fig.update_xaxes(gridcolor='#2d2d2d')
            fig.update_yaxes(gridcolor='#2d2d2d')
            
            st.plotly_chart(fig, width='stretch')
            
            # Прогноз funding
            st.info(f"💡 Следующий Funding: ~{df_funding['fundingRate'].iloc[-1]:.4f}% " +
                   f"({df_funding['time'].iloc[-1].strftime('%d.%m %H:%M')})")
        
        # Taker Long/Short Ratio
        ratio_data = api.get_taker_long_short_ratio(symbol, 50)
        if ratio_data:
            df_ratio = pd.DataFrame(ratio_data)
            df_ratio['time'] = pd.to_datetime(df_ratio['timestamp'], unit='ms')
            df_ratio['longShortRatio'] = df_ratio['longShortRatio'].astype(float)
            df_ratio['buySellRatio'] = df_ratio['buySellRatio'].astype(float)
            
            st.subheader("📊 Taker Long/Short Ratio")
            
            fig2 = make_subplots(rows=1, cols=2, 
                                subtitles=('Long/Short Ratio', 'Buy/Sell Ratio'))
            
            fig2.add_trace(go.Scatter(
                x=df_ratio['time'],
                y=df_ratio['longShortRatio'],
                mode='lines',
                line=dict(color='#00ff88', width=2),
                name='Long/Short'
            ), row=1, col=1)
            
            fig2.add_trace(go.Scatter(
                x=df_ratio['time'],
                y=df_ratio['buySellRatio'],
                mode='lines',
                line=dict(color='#ff416c', width=2),
                name='Buy/Sell'
            ), row=1, col=2)
            
            fig2.update_layout(
                template='plotly_dark',
                paper_bgcolor='#0e1117',
                font=dict(color='white'),
                height=300,
                showlegend=False
            )
            
            fig2.update_xaxes(gridcolor='#2d2d2d')
            fig2.update_yaxes(gridcolor='#2d2d2d')
            
            st.plotly_chart(fig2, width='stretch')


# Легенда
st.divider()
st.markdown("""
**📖 Легенда:**
- 🟢 **Bids** - заявки на покупку
- 🔴 **Asks** - заявки на продажу  
- 📊 **Volume** - объём торгов за 24ч
- 💰 **Funding** - ставка финансирования
- 📈 **OI** - открытый интерес
- 🐋 **Whale** - сделки крупнее порога
""")
