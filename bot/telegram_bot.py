"""
Telegram бот для уведомлений о китовых сделках
Управление через Reply кнопки
"""

import asyncio
import time
import json
from pathlib import Path
from typing import Optional, Set, Dict
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum

from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command, StateFilter
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from loguru import logger

from models.alert import Alert, AlertType


# Файл для хранения подписчиков
SUBSCRIBERS_FILE = Path("data/subscribers.json")
USER_SETTINGS_FILE = Path("data/user_settings.json")

# URL Mini App (берём из env или используем default)
import os
MINI_APP_URL = os.environ.get("MINI_APP_URL", "https://scriner-production.up.railway.app")


def get_main_reply_keyboard() -> ReplyKeyboardMarkup:
    """Создание главного меню с Reply кнопками + Mini App кнопка"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            # Кнопка Mini App - открывается прямо в Telegram
            [KeyboardButton(
                text="🐋 Открыть Whale Screener",
                web_app=WebAppInfo(url=MINI_APP_URL)
            )],
            [KeyboardButton(text="📊 Статус"), KeyboardButton(text="⚙️ Настройки")],
            [KeyboardButton(text="🪙 Биржи"), KeyboardButton(text="🔐 Доступ")],
            [KeyboardButton(text="📈 PUMP конфиг"), KeyboardButton(text="📉 Настройка LONG")],
            [KeyboardButton(text="🔴 Настройка SHORT"), KeyboardButton(text="👥 Подписчики")],
            [KeyboardButton(text="📝 Логи"), KeyboardButton(text="ℹ️ Помощь")]
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
        input_field_placeholder="Выберите действие..."
    )
    return keyboard


def get_settings_keyboard() -> ReplyKeyboardMarkup:
    """Создание меню настроек"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="⏱️ Интервал мониторинга"), KeyboardButton(text="📊 Порог изменения цены")],
            [KeyboardButton(text="📈 RSI"), KeyboardButton(text="📊 Рост/Падение 24ч")],
            [KeyboardButton(text="🔔 Типы сигналов"), KeyboardButton(text="🔙 Назад")]
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
        input_field_placeholder="Выберите настройку..."
    )
    return keyboard


def get_interval_keyboard() -> ReplyKeyboardMarkup:
    """Создание меню выбора интервала"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="1 мин"), KeyboardButton(text="5 мин")],
            [KeyboardButton(text="15 мин"), KeyboardButton(text="30 мин")],
            [KeyboardButton(text="🔙 Назад")]
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
        input_field_placeholder="Выберите интервал..."
    )
    return keyboard


def get_threshold_keyboard() -> ReplyKeyboardMarkup:
    """Создание меню выбора порога"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="0.5%"), KeyboardButton(text="1%"), KeyboardButton(text="2%")],
            [KeyboardButton(text="3%"), KeyboardButton(text="5%"), KeyboardButton(text="10%")],
            [KeyboardButton(text="🔙 Назад")]
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
        input_field_placeholder="Выберите порог..."
    )
    return keyboard


def get_rsi_keyboard() -> ReplyKeyboardMarkup:
    """Создание меню настройки RSI"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="RSI Вкл"), KeyboardButton(text="RSI Выкл")],
            [KeyboardButton(text="🔙 Назад")]
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
        input_field_placeholder="Включить/выключить RSI..."
    )
    return keyboard


def get_24h_keyboard() -> ReplyKeyboardMarkup:
    """Создание меню настройки 24ч"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="24ч Вкл"), KeyboardButton(text="24ч Выкл")],
            [KeyboardButton(text="🔙 Назад")]
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
        input_field_placeholder="Включить/выключить 24ч фильтр..."
    )
    return keyboard


def get_signals_keyboard() -> ReplyKeyboardMarkup:
    """Создание меню выбора типов сигналов"""
    keyboard = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📈 Только PUMP"), KeyboardButton(text="📉 Только DUMP")],
            [KeyboardButton(text="⚡️ PUMP и DUMP"), KeyboardButton(text="🔙 Назад")]
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
        input_field_placeholder="Выберите типы сигналов..."
    )
    return keyboard


class SubscriptionLevel(Enum):
    """Уровни подписки"""
    FREE = "free"
    PREMIUM = "premium"
    VIP = "vip"


@dataclass
class UserSettings:
    """Настройки пользователя"""
    user_id: int
    min_volume: float = 10000.0
    alert_types: list = field(default_factory=lambda: ["PUMP", "DUMP", "WHALE", "OI_INCREASE", "OI_DECREASE"])
    pairs: list = field(default_factory=list)
    cooldown: int = 5
    subscription_level: str = "free"
    notify_pump: bool = True
    notify_dump: bool = True
    notify_whale: bool = True
    notify_oi: bool = True
    enabled: bool = True
    monitoring_interval: int = 5
    price_change_threshold: float = 1.0
    rsi_enabled: bool = False
    rsi_timeframe: str = "1h"
    rsi_levels: tuple = (30, 70)
    change_24h_enabled: bool = False
    change_24h_min: float = -10.0
    change_24h_max: float = 50.0
    signal_types: str = "BOTH"

    def to_dict(self) -> dict:
        return {
            'user_id': self.user_id,
            'min_volume': self.min_volume,
            'alert_types': self.alert_types,
            'pairs': self.pairs,
            'cooldown': self.cooldown,
            'subscription_level': self.subscription_level,
            'notify_pump': self.notify_pump,
            'notify_dump': self.notify_dump,
            'notify_whale': self.notify_whale,
            'notify_oi': self.notify_oi,
            'enabled': self.enabled,
            'monitoring_interval': self.monitoring_interval,
            'price_change_threshold': self.price_change_threshold,
            'rsi_enabled': self.rsi_enabled,
            'rsi_timeframe': self.rsi_timeframe,
            'rsi_levels': list(self.rsi_levels),
            'change_24h_enabled': self.change_24h_enabled,
            'change_24h_min': self.change_24h_min,
            'change_24h_max': self.change_24h_max,
            'signal_types': self.signal_types
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'UserSettings':
        rsi_levels = data.get('rsi_levels', [30, 70])
        if isinstance(rsi_levels, list):
            rsi_levels = tuple(rsi_levels)
        return cls(
            user_id=data.get('user_id', 0),
            min_volume=data.get('min_volume', 10000.0),
            alert_types=data.get('alert_types', ["PUMP", "DUMP", "WHALE", "OI_INCREASE", "OI_DECREASE"]),
            pairs=data.get('pairs', []),
            cooldown=data.get('cooldown', 5),
            subscription_level=data.get('subscription_level', 'free'),
            notify_pump=data.get('notify_pump', True),
            notify_dump=data.get('notify_dump', True),
            notify_whale=data.get('notify_whale', True),
            notify_oi=data.get('notify_oi', True),
            enabled=data.get('enabled', True),
            monitoring_interval=data.get('monitoring_interval', 5),
            price_change_threshold=data.get('price_change_threshold', 1.0),
            rsi_enabled=data.get('rsi_enabled', False),
            rsi_timeframe=data.get('rsi_timeframe', '1h'),
            rsi_levels=rsi_levels,
            change_24h_enabled=data.get('change_24h_enabled', False),
            change_24h_min=data.get('change_24h_min', -10.0),
            change_24h_max=data.get('change_24h_max', 50.0),
            signal_types=data.get('signal_types', 'BOTH')
        )


class WhaleAlertBot:
    """Telegram бот для отправки алертов"""
    
    def __init__(self, token: str, admin_id: int, screener=None):
        self.token = token
        self.admin_id = admin_id
        self.screener = screener
        
        self.bot: Optional[Bot] = None
        self.dispatcher: Optional[Dispatcher] = None
        self._running = False
        
        self._last_alert_time = {}
        self._cooldown_seconds = 5
        
        self._subscribers: Set[int] = self._load_subscribers()
        self._user_settings: Dict[int, UserSettings] = self._load_user_settings()
        
        self._subscribers.add(admin_id)
        self._save_subscribers()
    
    def _load_user_settings(self) -> Dict[int, UserSettings]:
        try:
            if USER_SETTINGS_FILE.exists():
                with open(USER_SETTINGS_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return {
                        int(user_id): UserSettings.from_dict(settings)
                        for user_id, settings in data.get('users', {}).items()
                    }
        except Exception as e:
            logger.warning(f"⚠️ Не удалось загрузить настройки пользователей: {e}")
        return {}
    
    def _save_user_settings(self):
        try:
            USER_SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
            data = {
                'users': {
                    str(user_id): settings.to_dict()
                    for user_id, settings in self._user_settings.items()
                }
            }
            with open(USER_SETTINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"❌ Ошибка сохранения настроек пользователей: {e}")
    
    def get_user_settings(self, user_id: int) -> UserSettings:
        if user_id not in self._user_settings:
            self._user_settings[user_id] = UserSettings(user_id=user_id)
            self._save_user_settings()
        return self._user_settings[user_id]
    
    def update_user_settings(self, user_id: int, **kwargs):
        settings = self.get_user_settings(user_id)
        for key, value in kwargs.items():
            if hasattr(settings, key):
                setattr(settings, key, value)
        self._save_user_settings()
    
    def _load_subscribers(self) -> Set[int]:
        try:
            if SUBSCRIBERS_FILE.exists():
                with open(SUBSCRIBERS_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return set(data.get('subscribers', []))
        except Exception as e:
            logger.warning(f"⚠️ Не удалось загрузить подписчиков: {e}")
        return set()
    
    def _save_subscribers(self):
        try:
            SUBSCRIBERS_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(SUBSCRIBERS_FILE, 'w', encoding='utf-8') as f:
                json.dump({'subscribers': list(self._subscribers)}, f)
        except Exception as e:
            logger.error(f"❌ Ошибка сохранения подписчиков: {e}")
    
    async def initialize(self):
        from aiogram.client.default import DefaultBotProperties
        from aiogram.enums import ParseMode
        
        self.bot = Bot(
            token=self.token,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML)
        )
        self.dispatcher = Dispatcher()
        self._register_handlers()
        
        try:
            await self.bot.get_me()
            logger.info(f"✅ Telegram бот подключен. Подписчиков: {len(self._subscribers)}")
        except Exception as e:
            logger.error(f"❌ Ошибка подключения к Telegram: {e}")
            raise
    
    def _register_handlers(self):
        """Регистрация обработчиков"""
        
        # /start - показывает меню
        @self.dispatcher.message(Command("start"))
        async def cmd_start(message: types.Message):
            user_id = message.from_user.id
            
            if user_id not in self._subscribers:
                self._subscribers.add(user_id)
                self._save_subscribers()
                await message.answer(
                    "🐋 <b>Whale Screener Bot</b>\n\n"
                    "✅ Вы подписаны на алерты!\n\n"
                    "Используйте кнопки меню внизу для управления ботом.",
                    reply_markup=get_main_reply_keyboard()
                )
                return
            
            await message.answer(
                "🐋 <b>Whale Screener Bot</b>\n\n"
                "Выберите действие через кнопки внизу:",
                reply_markup=get_main_reply_keyboard()
            )
        
        # Обработчик ВСЕХ текстовых сообщений через кнопки
        @self.dispatcher.message(F.text)
        async def handle_buttons(message: types.Message):
            user_id = message.from_user.id
            text = message.text
            
            # Проверка подписки
            if user_id not in self._subscribers:
                await message.answer(
                    "❌ Подпишитесь на алерты сначала.\nОтправьте /start",
                    reply_markup=get_main_reply_keyboard()
                )
                return
            
            is_admin = user_id == self.admin_id
            
            if text == "📊 Статус":
                await self._handle_status(message)
            elif text == "⚙️ Настройки":
                await self._handle_settings(message)
            elif text == "⏱️ Интервал мониторинга":
                await self._handle_interval_settings(message)
            elif text == "📊 Порог изменения цены":
                await self._handle_threshold_settings(message)
            elif text == "📈 RSI":
                await self._handle_rsi_settings(message)
            elif text == "📊 Рост/Падение 24ч":
                await self._handle_24h_settings(message)
            elif text == "🔔 Типы сигналов":
                await self._handle_signals_settings(message)
            elif text == "🔙 Назад":
                await message.answer(
                    "Главное меню:",
                    reply_markup=get_main_reply_keyboard()
                )
            # Обработка выбора интервала
            elif text in ["1 мин", "5 мин", "15 мин", "30 мин"]:
                await self._set_interval(message, text)
            # Обработка выбора порога
            elif text in ["0.5%", "1%", "2%", "3%", "5%", "10%"]:
                await self._set_threshold(message, text)
            # Обработка RSI
            elif text == "RSI Вкл":
                await self._set_rsi(message, True)
            elif text == "RSI Выкл":
                await self._set_rsi(message, False)
            # Обработка 24ч
            elif text == "24ч Вкл":
                await self._set_24h(message, True)
            elif text == "24ч Выкл":
                await self._set_24h(message, False)
            # Обработка типов сигналов
            elif text == "📈 Только PUMP":
                await self._set_signals(message, "PUMP")
            elif text == "📉 Только DUMP":
                await self._set_signals(message, "DUMP")
            elif text == "⚡️ PUMP и DUMP":
                await self._set_signals(message, "BOTH")
            elif text == "🪙 Биржи":
                await self._handle_exchanges(message)
            elif text == "🔐 Доступ":
                await self._handle_access(message)
            elif text == "📈 PUMP конфиг":
                if not is_admin:
                    await message.answer("❌ Команда доступна только администратору")
                    return
                await self._handle_pump_config(message)
            elif text == "📉 Настройка LONG":
                if not is_admin:
                    await message.answer("❌ Команда доступна только администратору")
                    return
                await self._handle_long_config(message)
            elif text == "🔴 Настройка SHORT":
                if not is_admin:
                    await message.answer("❌ Команда доступна только администратору")
                    return
                await self._handle_short_config(message)
            elif text == "👥 Подписчики":
                if not is_admin:
                    await message.answer("❌ Команда доступна только администратору")
                    return
                await self._handle_subscribers(message)
            elif text == "📝 Логи":
                if not is_admin:
                    await message.answer("❌ Команда доступна только администратору")
                    return
                await self._handle_logs(message)
            elif text == "ℹ️ Помощь":
                await self._handle_help(message)
            # Обработка текстовых команд для настройки
            elif text.startswith("/set_interval"):
                await self._cmd_set_interval(message)
            elif text.startswith("/set_threshold"):
                await self._cmd_set_threshold(message)
            elif text.startswith("/set_rsi"):
                await self._cmd_set_rsi(message)
            elif text.startswith("/set_24h"):
                await self._cmd_set_24h(message)
            elif text.startswith("/set_signals"):
                await self._cmd_set_signals(message)
            elif text.startswith("/set_long"):
                await self._cmd_set_long(message)
            elif text.startswith("/set_short"):
                await self._cmd_set_short(message)
            elif text.startswith("/set_volume"):
                await self._cmd_set_volume(message)
            else:
                # Любой другой текст - напоминание использовать кнопки
                await message.answer(
                    "👆 Пожалуйста, используйте кнопки меню внизу экрана.\n\n"
                    "Для настройки параметров используйте команды:\n"
                    "/set_interval минуты\n"
                    "/set_threshold процент\n"
                    "/set_rsi on/off\n"
                    "/set_24h on/off\n"
                    "/set_signals pump/dump/both",
                    reply_markup=get_main_reply_keyboard()
                )
    
    # Обработчики кнопок
    async def _handle_status(self, message: types.Message):
        try:
            user_id = message.from_user.id
            settings = self.get_user_settings(user_id)
            
            if self.screener and hasattr(self.screener, 'pump_dump_detector'):
                pairs_count = "ALL" if self.screener.config.get('tracked_pairs') == 'ALL' else len(self.screener.config.get('tracked_pairs', []))
            else:
                pairs_count = 0

            await message.answer(
                "📊 <b>Статус системы</b>\n\n"
                f"✅ Бот активен\n"
                f"👥 Подписчиков: {len(self._subscribers)}\n"
                f"📌 Пар: {pairs_count}\n\n"
                f"<b>Ваши настройки:</b>\n"
                f"⏱️ Интервал: {settings.monitoring_interval} мин\n"
                f"📊 Порог: {settings.price_change_threshold}%\n"
                f"📈 RSI: {'Вкл' if settings.rsi_enabled else 'Выкл'}\n"
                f"📊 24ч: {'Вкл' if settings.change_24h_enabled else 'Выкл'}\n"
                f"🔔 Сигналы: {settings.signal_types}",
                reply_markup=get_main_reply_keyboard()
            )
        except Exception as e:
            logger.error(f"❌ Ошибка status: {e}")
            await message.answer("❌ Ошибка получения статуса", reply_markup=get_main_reply_keyboard())
    
    async def _handle_settings(self, message: types.Message):
        """Показать меню настроек"""
        user_id = message.from_user.id
        settings = self.get_user_settings(user_id)
        
        text = (
            f"⚙️ <b>Настройки</b>\n\n"
            f"💡 <i>Выберите параметр для настройки:</i>\n\n"
            f"1. ⏱️ Интервал мониторинга: {settings.monitoring_interval} мин\n"
            f"2. 📊 Порог изменения цены: {settings.price_change_threshold}%\n"
            f"3. 📈 RSI: {'Вкл' if settings.rsi_enabled else 'Выкл'}\n"
            f"4. 📊 Рост/Падение 24ч: {'Вкл' if settings.change_24h_enabled else 'Выкл'}\n"
            f"5. 🔔 Типы сигналов: {settings.signal_types}"
        )
        
        await message.answer(text, reply_markup=get_settings_keyboard())
    
    async def _handle_interval_settings(self, message: types.Message):
        """Настройка интервала мониторинга"""
        user_id = message.from_user.id
        settings = self.get_user_settings(user_id)
        
        text = (
            f"⏱️ <b>Интервал мониторинга</b>\n\n"
            f"Текущий интервал: {settings.monitoring_interval} мин\n\n"
            f"💡 <i>Период, за который бот отслеживает изменение цены.\n"
            f"Чем меньше интервал, тем быстрее бот реагирует на изменения.</i>\n\n"
            f"Выберите интервал:"
        )
        
        await message.answer(text, reply_markup=get_interval_keyboard())
    
    async def _handle_threshold_settings(self, message: types.Message):
        """Настройка порога изменения цены"""
        user_id = message.from_user.id
        settings = self.get_user_settings(user_id)
        
        text = (
            f"📊 <b>Порог изменения цены</b>\n\n"
            f"Текущий порог: {settings.price_change_threshold}%\n\n"
            f"💡 <i>Процент изменения цены за выбранный период.\n"
            f"Чем выше порог, тем меньше сигналов, но выше точность.\n"
            f"При резком пампе в 9 из 10 случаев идёт откат.</i>\n\n"
            f"Выберите порог:"
        )
        
        await message.answer(text, reply_markup=get_threshold_keyboard())
    
    async def _handle_rsi_settings(self, message: types.Message):
        """Настройка RSI фильтра"""
        user_id = message.from_user.id
        settings = self.get_user_settings(user_id)
        
        text = (
            f"📈 <b>RSI фильтр</b>\n\n"
            f"Статус: {'✅ Включён' if settings.rsi_enabled else '❌ Выключен'}\n\n"
            f"💡 <i>RSI (Индекс Относительной Силы) показывает,\n"
            f"перекуплен или перепродан актив.\n"
            f"Значения выше 70 — перекупленность (сигнал к продаже).\n"
            f"Значения ниже 30 — перепроданность (сигнал к покупке).</i>\n\n"
            f"Выберите действие:"
        )
        
        await message.answer(text, reply_markup=get_rsi_keyboard())
    
    async def _handle_24h_settings(self, message: types.Message):
        """Настройка 24ч фильтра"""
        user_id = message.from_user.id
        settings = self.get_user_settings(user_id)
        
        text = (
            f"📊 <b>Рост/Падение 24ч</b>\n\n"
            f"Статус: {'✅ Включён' if settings.change_24h_enabled else '❌ Выключен'}\n\n"
            f"💡 <i>Показывает изменение цены за последние 24 часа.\n"
            f"Помогает отфильтровать сигналы по глобальному тренду.</i>\n\n"
            f"Выберите действие:"
        )
        
        await message.answer(text, reply_markup=get_24h_keyboard())
    
    async def _handle_signals_settings(self, message: types.Message):
        """Настройка типов сигналов"""
        user_id = message.from_user.id
        settings = self.get_user_settings(user_id)
        
        text = (
            f"🔔 <b>Типы сигналов</b>\n\n"
            f"Текущий режим: {settings.signal_types}\n\n"
            f"💡 <i>Выберите, какие сигналы вы хотите получать:\n"
            f"• Только PUMP — только рост цены\n"
            f"• Только DUMP — только падение цены\n"
            f"• PUMP и DUMP — все сигналы</i>\n\n"
            f"Выберите типы сигналов:"
        )
        
        await message.answer(text, reply_markup=get_signals_keyboard())
    
    async def _set_interval(self, message: types.Message, text: str):
        """Установить интервал мониторинга"""
        user_id = message.from_user.id
        interval = int(text.replace(" мин", ""))
        self.update_user_settings(user_id, monitoring_interval=interval)
        
        await message.answer(
            f"✅ Интервал мониторинга установлен: {interval} мин",
            reply_markup=get_settings_keyboard()
        )
    
    async def _set_threshold(self, message: types.Message, text: str):
        """Установить порог изменения цены"""
        user_id = message.from_user.id
        threshold = float(text.replace("%", ""))
        self.update_user_settings(user_id, price_change_threshold=threshold)
        
        await message.answer(
            f"✅ Порог изменения цены установлен: {threshold}%",
            reply_markup=get_settings_keyboard()
        )
    
    async def _set_rsi(self, message: types.Message, enabled: bool):
        """Установить RSI фильтр"""
        user_id = message.from_user.id
        self.update_user_settings(user_id, rsi_enabled=enabled)
        
        status = "включён" if enabled else "выключен"
        await message.answer(
            f"✅ RSI фильтр {status}",
            reply_markup=get_settings_keyboard()
        )
    
    async def _set_24h(self, message: types.Message, enabled: bool):
        """Установить 24ч фильтр"""
        user_id = message.from_user.id
        self.update_user_settings(user_id, change_24h_enabled=enabled)
        
        status = "включён" if enabled else "выключен"
        await message.answer(
            f"✅ Фильтр рост/падение 24ч {status}",
            reply_markup=get_settings_keyboard()
        )
    
    async def _set_signals(self, message: types.Message, signal_type: str):
        """Установить типы сигналов"""
        user_id = message.from_user.id
        self.update_user_settings(user_id, signal_types=signal_type)
        
        type_names = {
            "PUMP": "только PUMP",
            "DUMP": "только DUMP",
            "BOTH": "PUMP и DUMP"
        }
        
        await message.answer(
            f"✅ Типы сигналов: {type_names.get(signal_type, signal_type)}",
            reply_markup=get_settings_keyboard()
        )
    
    async def _handle_exchanges(self, message: types.Message):
        text = (
            "🪙 <b>Биржи</b>\n\n"
            "Мониторинг ведётся на:\n\n"
            "• <b>Binance</b> - Фьючерсы (USDT-M)\n"
            "• <b>Bybit</b> - Фьючерсы (USDT)\n"
            "• <b>OKX</b> - Фьючерсы (USDT)"
        )
        await message.answer(text, reply_markup=get_main_reply_keyboard())
    
    async def _handle_access(self, message: types.Message):
        user_id = message.from_user.id
        settings = self.get_user_settings(user_id)
        
        # Определяем оставшееся время подписки (пример)
        subscription_text = ""
        if settings.subscription_level == "free":
            subscription_text = "🆓 Бесплатный тариф"
        elif settings.subscription_level == "premium":
            subscription_text = "⭐ Premium подписка активна"
        elif settings.subscription_level == "vip":
            subscription_text = "💎 VIP подписка активна"
        
        text = (
            f"💰 <b>Доступ</b>\n\n"
            f"{'✅ Доступ активен!' if settings.enabled else '❌ Доступ неактивен'}\n"
            f"Ваш ID: {user_id}\n"
            f"Текущий тариф: {subscription_text}\n\n"
            "💳 <b>Стоимость подписки:</b>\n\n"
            "• 1 месяц — 20 USDT\n"
            "• 6 месяцев — 80 USDT\n"
            "   (экономия 40 USDT по сравнению с оплатой 6×20 = 120 USDT)\n"
            "• 12 месяцев — 135 USDT\n"
            "   (экономия 105 USDT по сравнению с оплатой 12×20 = 240 USDT)\n\n"
            "— При помесячной оплате выходит дороже.\n"
            "— Подписка на 6 месяцев дешевле почти в полтора раза.\n"
            "— Подписка на 12 месяцев самая выгодная: экономия более 100 USDT.\n\n"
            "🔥 Пока у Вас есть доступ к боту, Вам доступна скидка 25% на продление."
        )
        
        await message.answer(text, reply_markup=get_main_reply_keyboard())
    
    async def _handle_pump_config(self, message: types.Message):
        try:
            if self.screener and hasattr(self.screener, 'pump_dump_detector'):
                config = self.screener.pump_dump_detector.get_config()
                
                rsi_long = f"RSI: {config['long']['rsi_min']}-{config['long']['rsi_max']}" if config['long'].get('rsi_enabled') else "RSI: выкл"
                change_24h_long = f"24h: {config['long']['change_24h_min']:+.1f}% to {config['long']['change_24h_max']:+.1f}%" if config['long'].get('change_24h_enabled') else "24h: выкл"
                
                rsi_short = f"RSI: {config['short']['rsi_min']}-{config['short']['rsi_max']}" if config['short'].get('rsi_enabled') else "RSI: выкл"
                change_24h_short = f"24h: {config['short']['change_24h_min']:+.1f}% to {config['short']['change_24h_max']:+.1f}%" if config['short'].get('change_24h_enabled') else "24h: выкл"
                
                text = (
                    "⚙️ <b>Конфигурация PUMP Screener</b>\n\n"
                    "🟢 <b>LONG (для входа в лонг):</b>\n"
                    f"   Включено: {'Да' if config['long']['enabled'] else 'Нет'}\n"
                    f"   Мин. процент: {config['long']['min_percent']}%\n"
                    f"   Время: {config['long']['window_minutes']} мин\n"
                    f"   {rsi_long}\n"
                    f"   {change_24h_long}\n\n"
                    "🔴 <b>SHORT (для входа в шорт):</b>\n"
                    f"   Включено: {'Да' if config['short']['enabled'] else 'Нет'}\n"
                    f"   Мин. процент: {config['short']['min_percent']}%\n"
                    f"   Время: {config['short']['window_minutes']} мин\n"
                    f"   {rsi_short}\n"
                    f"   {change_24h_short}"
                )
                await message.answer(text, reply_markup=get_main_reply_keyboard())
            else:
                await message.answer("❌ Детектор не найден", reply_markup=get_main_reply_keyboard())
        except Exception as e:
            logger.error(f"❌ Ошибка pump_config: {e}")
            await message.answer("❌ Ошибка получения конфигурации", reply_markup=get_main_reply_keyboard())
    
    async def _handle_long_config(self, message: types.Message):
        text = (
            "📉 <b>Настройка LONG</b>\n\n"
            "Для настройки LONG комбинации используйте текстовую команду:\n\n"
            "<code>/set_long процент минуты [rsi] [24h]</code>\n\n"
            "Примеры:\n"
            "• /set_long 1 1 - 1% за 1 мин\n"
            "• /set_long 0.7 1 rsi - с RSI фильтром\n"
            "• /set_long 2 2 24h - с 24h фильтром\n\n"
            "Для вкл/выкл: /set_long on или /set_long off"
        )
        await message.answer(text, reply_markup=get_main_reply_keyboard())
    
    async def _handle_short_config(self, message: types.Message):
        text = (
            "🔴 <b>Настройка SHORT</b>\n\n"
            "Для настройки SHORT комбинации используйте текстовую команду:\n\n"
            "<code>/set_short процент минуты [rsi] [24h]</code>\n\n"
            "Примеры:\n"
            "• /set_short 10 5 - 10% за 5 мин\n"
            "• /set_short 10 5 rsi - с RSI фильтром\n\n"
            "Для вкл/выкл: /set_short on или /set_short off"
        )
        await message.answer(text, reply_markup=get_main_reply_keyboard())
    
    async def _handle_subscribers(self, message: types.Message):
        if not self._subscribers:
            await message.answer("📝 Нет подписчиков", reply_markup=get_main_reply_keyboard())
            return
        
        text = f"👥 <b>Подписчики ({len(self._subscribers)}):</b>\n\n"
        for user_id in self._subscribers:
            if user_id == self.admin_id:
                text += f"• {user_id} (админ) ✅\n"
            else:
                text += f"• {user_id}\n"
        
        await message.answer(text, reply_markup=get_main_reply_keyboard())
    
    async def _handle_logs(self, message: types.Message):
        try:
            with open('logs/alerts.log', 'r', encoding='utf-8') as f:
                lines = f.readlines()[-10:]

            if lines:
                logs = ''.join(lines).strip()
                await message.answer(f"📝 <b>Последние алерты:</b>\n\n<code>{logs}</code>", reply_markup=get_main_reply_keyboard())
            else:
                await message.answer("📝 Алёртов пока нет", reply_markup=get_main_reply_keyboard())
        except FileNotFoundError:
            await message.answer("📝 Файл логов не найден\nЗапустите скринер для записи логов", reply_markup=get_main_reply_keyboard())
        except Exception as e:
            logger.error(f"❌ Ошибка logs: {e}")
            await message.answer("❌ Ошибка чтения логов", reply_markup=get_main_reply_keyboard())
    
    async def _handle_help(self, message: types.Message):
        user_id = message.from_user.id
        is_admin = user_id == self.admin_id
        
        text = (
            "📚 <b>Помощь</b>\n\n"
            "Используйте кнопки меню внизу экрана:\n\n"
            "• 📊 Статус - статус системы\n"
            "• ⚙️ Настройки - ваши настройки\n"
            "• 🪙 Биржи - список бирж\n"
            "• 🔐 Доступ - информация о подписке\n"
            "• ℹ️ Помощь - эта справка\n\n"
            "<b>Команды настройки:</b>\n"
            "• /set_interval <мин> - интервал мониторинга (1, 5, 15, 30)\n"
            "• /set_threshold <%> - порог изменения цены (0.1-100)\n"
            "• /set_rsi on/off - вкл/выкл RSI фильтр\n"
            "• /set_24h on/off - вкл/выкл 24ч фильтр\n"
            "• /set_signals pump/dump/both - типы сигналов\n"
            "• /set_volume <сумма> - мин. объём в USD\n\n"
        )
        
        if is_admin:
            text += (
                "<b>Команды администратора:</b>\n"
                "• /set_long <%> <мин> - настроить LONG\n"
                "• /set_short <%> <мин> - настроить SHORT\n"
                "• /set_threshold <сумма> - порог кита в USD"
            )
        
        await message.answer(text, reply_markup=get_main_reply_keyboard())
    
    async def _cmd_set_interval(self, message: types.Message):
        """Установить интервал мониторинга"""
        user_id = message.from_user.id
        try:
            parts = message.text.split()
            if len(parts) < 2:
                await message.answer("❌ Использование: /set_interval <минуты>\nДоступно: 1, 5, 15, 30")
                return
            
            interval = int(parts[1])
            if interval not in [1, 5, 15, 30]:
                await message.answer("❌ Доступные значения: 1, 5, 15, 30 минут")
                return
            
            self.update_user_settings(user_id, monitoring_interval=interval)
            await message.answer(f"✅ Интервал мониторинга: {interval} мин", reply_markup=get_main_reply_keyboard())
        except (IndexError, ValueError):
            await message.answer("❌ Использование: /set_interval <минуты>\nДоступно: 1, 5, 15, 30")
    
    async def _cmd_set_threshold(self, message: types.Message):
        """Установить порог изменения цены"""
        user_id = message.from_user.id
        try:
            parts = message.text.split()
            if len(parts) < 2:
                await message.answer("❌ Использование: /set_threshold <процент>\nДоступно: 0.1 - 100")
                return
            
            threshold = float(parts[1])
            if threshold < 0.1 or threshold > 100:
                await message.answer("❌ Порог должен быть от 0.1 до 100%")
                return
            
            self.update_user_settings(user_id, price_change_threshold=threshold)
            await message.answer(f"✅ Порог изменения цены: {threshold}%", reply_markup=get_main_reply_keyboard())
        except (IndexError, ValueError):
            await message.answer("❌ Использование: /set_threshold <процент>\nДоступно: 0.1 - 100")
    
    async def _cmd_set_rsi(self, message: types.Message):
        """Включить/выключить RSI фильтр"""
        user_id = message.from_user.id
        try:
            parts = message.text.split()
            if len(parts) < 2:
                await message.answer("❌ Использование: /set_rsi on|off")
                return
            
            action = parts[1].lower()
            if action == "on":
                self.update_user_settings(user_id, rsi_enabled=True)
                await message.answer("✅ RSI фильтр включён", reply_markup=get_main_reply_keyboard())
            elif action == "off":
                self.update_user_settings(user_id, rsi_enabled=False)
                await message.answer("✅ RSI фильтр выключен", reply_markup=get_main_reply_keyboard())
            else:
                await message.answer("❌ Использование: /set_rsi on|off")
        except (IndexError, ValueError):
            await message.answer("❌ Использование: /set_rsi on|off")
    
    async def _cmd_set_24h(self, message: types.Message):
        """Включить/выключить 24ч фильтр"""
        user_id = message.from_user.id
        try:
            parts = message.text.split()
            if len(parts) < 2:
                await message.answer("❌ Использование: /set_24h on|off")
                return
            
            action = parts[1].lower()
            if action == "on":
                self.update_user_settings(user_id, change_24h_enabled=True)
                await message.answer("✅ 24ч фильтр включён", reply_markup=get_main_reply_keyboard())
            elif action == "off":
                self.update_user_settings(user_id, change_24h_enabled=False)
                await message.answer("✅ 24ч фильтр выключен", reply_markup=get_main_reply_keyboard())
            else:
                await message.answer("❌ Использование: /set_24h on|off")
        except (IndexError, ValueError):
            await message.answer("❌ Использование: /set_24h on|off")
    
    async def _cmd_set_signals(self, message: types.Message):
        """Установить типы сигналов"""
        user_id = message.from_user.id
        try:
            parts = message.text.split()
            if len(parts) < 2:
                await message.answer("❌ Использование: /set_signals pump|dump|both")
                return
            
            signal_type = parts[1].upper()
            if signal_type not in ["PUMP", "DUMP", "BOTH"]:
                await message.answer("❌ Доступные значения: pump, dump, both")
                return
            
            self.update_user_settings(user_id, signal_types=signal_type)
            await message.answer(f"✅ Типы сигналов: {signal_type}", reply_markup=get_main_reply_keyboard())
        except (IndexError, ValueError):
            await message.answer("❌ Использование: /set_signals pump|dump|both")
    
    async def _cmd_set_long(self, message: types.Message):
        """Настроить LONG комбинацию (админ)"""
        user_id = message.from_user.id
        if user_id != self.admin_id:
            await message.answer("❌ Команда доступна только администратору")
            return
        
        try:
            parts = message.text.split()
            
            if len(parts) == 2 and parts[1] == 'on':
                if self.screener and hasattr(self.screener, 'pump_dump_detector'):
                    self.screener.pump_dump_detector.update_config('long', enabled=True)
                await message.answer("🟢 LONG комбинация включена", reply_markup=get_main_reply_keyboard())
                return
            elif len(parts) == 2 and parts[1] == 'off':
                if self.screener and hasattr(self.screener, 'pump_dump_detector'):
                    self.screener.pump_dump_detector.update_config('long', enabled=False)
                await message.answer("🔴 LONG комбинация выключена", reply_markup=get_main_reply_keyboard())
                return
            elif len(parts) >= 3:
                percent = float(parts[1])
                minutes = int(parts[2])
                
                if percent < 0.1 or percent > 100:
                    await message.answer("❌ Процент должен быть от 0.1 до 100")
                    return
                if minutes < 1 or minutes > 30:
                    await message.answer("❌ Время должно быть от 1 до 30 минут")
                    return
                
                window_seconds = minutes * 60
                rsi_enabled = 'rsi' in parts
                change_24h_enabled = '24h' in parts
                
                if self.screener and hasattr(self.screener, 'pump_dump_detector'):
                    self.screener.pump_dump_detector.update_config(
                        'long',
                        min_percent=percent,
                        window_seconds=window_seconds,
                        enabled=True,
                        rsi_enabled=rsi_enabled,
                        change_24h_enabled=change_24h_enabled
                    )
                
                await message.answer(
                    f"🟢 <b>LONG настройки обновлены:</b>\n"
                    f"   Процент: {percent}%\n"
                    f"   Время: {minutes} мин\n"
                    f"   RSI фильтр: {'Вкл' if rsi_enabled else 'Выкл'}\n"
                    f"   24h фильтр: {'Вкл' if change_24h_enabled else 'Выкл'}",
                    reply_markup=get_main_reply_keyboard()
                )
            else:
                await message.answer(
                    "Использование: /set_long процент минуты [rsi] [24h]\n\n"
                    "Примеры:\n"
                    "   /set_long 1 1 - 1% за 1 мин\n"
                    "   /set_long 0.7 1 rsi - с RSI фильтром\n"
                    "   /set_long 2 2 24h - с 24h фильтром"
                )
        except (IndexError, ValueError):
            await message.answer("Ошибка. Использование: /set_long процент минуты")
        except Exception as e:
            logger.error(f"❌ Ошибка /set_long: {e}")
            await message.answer("❌ Ошибка настройки LONG")
    
    async def _cmd_set_short(self, message: types.Message):
        """Настроить SHORT комбинацию (админ)"""
        user_id = message.from_user.id
        if user_id != self.admin_id:
            await message.answer("❌ Команда доступна только администратору")
            return
        
        try:
            parts = message.text.split()
            
            if len(parts) == 2 and parts[1] == 'on':
                if self.screener and hasattr(self.screener, 'pump_dump_detector'):
                    self.screener.pump_dump_detector.update_config('short', enabled=True)
                await message.answer("🔴 SHORT комбинация включена", reply_markup=get_main_reply_keyboard())
                return
            elif len(parts) == 2 and parts[1] == 'off':
                if self.screener and hasattr(self.screener, 'pump_dump_detector'):
                    self.screener.pump_dump_detector.update_config('short', enabled=False)
                await message.answer("🔴 SHORT комбинация выключена", reply_markup=get_main_reply_keyboard())
                return
            elif len(parts) >= 3:
                percent = float(parts[1])
                minutes = int(parts[2])
                
                if percent < 0.1 or percent > 100:
                    await message.answer("❌ Процент должен быть от 0.1 до 100")
                    return
                if minutes < 1 or minutes > 30:
                    await message.answer("❌ Время должно быть от 1 до 30 минут")
                    return
                
                window_seconds = minutes * 60
                rsi_enabled = 'rsi' in parts
                change_24h_enabled = '24h' in parts
                
                if self.screener and hasattr(self.screener, 'pump_dump_detector'):
                    self.screener.pump_dump_detector.update_config(
                        'short',
                        min_percent=percent,
                        window_seconds=window_seconds,
                        enabled=True,
                        rsi_enabled=rsi_enabled,
                        change_24h_enabled=change_24h_enabled
                    )
                
                await message.answer(
                    f"🔴 <b>SHORT настройки обновлены:</b>\n"
                    f"   Процент: {percent}%\n"
                    f"   Время: {minutes} мин\n"
                    f"   RSI фильтр: {'Вкл' if rsi_enabled else 'Выкл'}\n"
                    f"   24h фильтр: {'Вкл' if change_24h_enabled else 'Выкл'}",
                    reply_markup=get_main_reply_keyboard()
                )
            else:
                await message.answer(
                    "Использование: /set_short процент минуты [rsi] [24h]\n\n"
                    "Примеры:\n"
                    "   /set_short 10 5 - 10% за 5 мин\n"
                    "   /set_short 10 5 rsi - с RSI фильтром"
                )
        except (IndexError, ValueError):
            await message.answer("Ошибка. Использование: /set_short процент минуты")
        except Exception as e:
            logger.error(f"❌ Ошибка /set_short: {e}")
            await message.answer("❌ Ошибка настройки SHORT")
    
    async def _cmd_set_volume(self, message: types.Message):
        """Установить минимальный объём"""
        user_id = message.from_user.id
        try:
            parts = message.text.split()
            if len(parts) < 2:
                await message.answer("❌ Использование: /set_volume <сумма>\nМинимум: $100")
                return
            
            amount = float(parts[1].replace('$', '').replace(',', ''))
            if amount < 100:
                await message.answer("❌ Минимальный объём: $100")
                return
            
            self.update_user_settings(user_id, min_volume=amount)
            await message.answer(f"✅ Минимальный объём: ${amount:,.0f}", reply_markup=get_main_reply_keyboard())
        except (IndexError, ValueError):
            await message.answer("❌ Использование: /set_volume <сумма>\nМинимум: $100")
    
    def _filter_alert_for_user(self, alert: Alert, settings: UserSettings) -> bool:
        """Фильтрация алерта по настройкам пользователя"""
        
        # Фильтр по типу сигнала
        if settings.signal_types == "PUMP" and alert.alert_type != AlertType.PUMP:
            return False
        if settings.signal_types == "DUMP" and alert.alert_type != AlertType.DUMP:
            return False
        
        # Фильтр по объёму
        if alert.volume_usd > 0 and alert.volume_usd < settings.min_volume:
            return False
        
        # Фильтр по парам
        if settings.pairs and alert.pair not in settings.pairs:
            return False
        
        # Фильтр по RSI (если включён)
        if settings.rsi_enabled and alert.rsi is None:
            return False
        
        # Фильтр по 24ч изменению (если включён)
        if settings.change_24h_enabled:
            if hasattr(alert, 'price_24h_change'):
                if alert.price_24h_change < settings.change_24h_min or alert.price_24h_change > settings.change_24h_max:
                    return False
        
        return True

    async def send_alert(self, alert: Alert):
        """Отправка алерта подписчикам с учётом пользовательских настроек"""
        ticker = alert.pair
        now = time.time()

        if ticker in self._last_alert_time:
            delta = now - self._last_alert_time[ticker]
            if 0 < delta < self._cooldown_seconds:
                logger.debug(f"⏱️ Пропуск алерта для {ticker} (cooldown: {delta:.1f}с)")
                return

        self._last_alert_time[ticker] = now
        message = alert.format_message()

        sent_count = 0
        failed_count = 0
        skipped_count = 0
        
        for user_id in self._subscribers:
            try:
                settings = self.get_user_settings(user_id)
                
                if not settings.enabled:
                    skipped_count += 1
                    continue
                
                # Проверяем, включены ли уведомления для данного типа алерта
                alert_enabled = True
                if alert.alert_type == AlertType.PUMP and not settings.notify_pump:
                    alert_enabled = False
                elif alert.alert_type == AlertType.DUMP and not settings.notify_dump:
                    alert_enabled = False
                elif alert.alert_type in [AlertType.WHALE, AlertType.MOMENTUM] and not settings.notify_whale:
                    alert_enabled = False
                elif alert.alert_type in [AlertType.OI_INCREASE, AlertType.OI_DECREASE] and not settings.notify_oi:
                    alert_enabled = False
                
                if not alert_enabled:
                    skipped_count += 1
                    continue
                
                # Фильтруем алерт по настройкам пользователя
                if not self._filter_alert_for_user(alert, settings):
                    skipped_count += 1
                    continue
                
                # Проверяем кулдаун для пользователя
                user_key = f"{user_id}_{ticker}"
                if user_key in self._last_alert_time:
                    user_delta = now - self._last_alert_time[user_key]
                    if 0 < user_delta < settings.cooldown:
                        skipped_count += 1
                        continue
                self._last_alert_time[user_key] = now
                
                await self.bot.send_message(
                    chat_id=user_id,
                    text=message,
                    parse_mode="HTML"
                )
                sent_count += 1
            except Exception as e:
                error_msg = str(e)
                failed_count += 1
                
                if "bot was blocked" in error_msg:
                    logger.warning(f"👤 Пользователь {user_id} заблокировал бота")
                    self._subscribers.discard(user_id)
                    self._save_subscribers()
                elif "chat not found" in error_msg:
                    logger.debug(f"⚠️ Чат {user_id} не найден")
                else:
                    logger.error(f"❌ Ошибка отправки алерта {user_id}: {error_msg}")
        
        logger.info(f"✅ Алерт: {alert.pair} | Отправлено: {sent_count}, Пропущено: {skipped_count}, Ошибок: {failed_count}")
    
    async def start(self):
        """Запуск бота"""
        logger.info("🤖 Запуск Telegram бота...")
        self._running = True
        await self.dispatcher.start_polling(self.bot)
    
    async def stop(self):
        """Остановка бота"""
        self._running = False
        if self.bot:
            await self.bot.session.close()
            await self.bot.close()
        logger.info("🛑 Telegram бот остановлен")
