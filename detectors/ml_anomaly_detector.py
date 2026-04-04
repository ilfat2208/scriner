"""
Machine Learning детектор аномалий

Использует Isolation Forest для обнаружения аномальных паттернов в торговле
"""

import asyncio
from collections import deque
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Awaitable
import numpy as np
from loguru import logger

try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    logger.warning("⚠️ Scikit-learn не установлен. ML детектор отключен.")


class MLAnomalyDetector:
    """
    ML детектор аномалий на основе Isolation Forest
    
    Обнаруживает:
    - Аномальные объёмы
    - Необычные движения цены
    - Подозрительную активность
    """

    def __init__(
        self,
        contamination: float = 0.01,
        n_estimators: int = 100,
        window_size: int = 100,
        min_samples: int = 50,
        min_severity: float = 1.5,  # Новый параметр
        on_anomaly_detected: Optional[Callable[[dict], Awaitable[None]]] = None,
    ):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.window_size = window_size
        self.min_samples = min_samples
        self.min_severity = min_severity
        self.on_anomaly_detected = on_anomaly_detected

        # Хранилище данных по парам
        self._pair_data: Dict[str, deque] = {}
        self._models: Dict[str, IsolationForest] = {}
        self._scalers: Dict[str, StandardScaler] = {}
        self._is_trained: Dict[str, bool] = {}
        self._train_counter: Dict[str, int] = {}  # Счётчик для переобучения
        
        # Статистика
        self._anomaly_count = 0

    def add_data_point(
        self,
        pair: str,
        price: float,
        volume: float,
        timestamp: datetime = None,
    ):
        """
        Добавление точки данных
        
        Args:
            pair: Торговая пара
            price: Цена
            volume: Объём
            timestamp: Время
        """
        if timestamp is None:
            timestamp = datetime.now()

        if pair not in self._pair_data:
            self._pair_data[pair] = deque(maxlen=self.window_size)

        self._pair_data[pair].append({
            'timestamp': timestamp,
            'price': price,
            'volume': volume,
            'log_volume': np.log1p(volume),
        })

    def check_anomaly(
        self,
        pair: str,
        price: float,
        volume: float,
        exchange: str = "BINANCE",
    ) -> Optional[dict]:
        """
        Проверка на аномалию
        
        Args:
            pair: Торговая пара
            price: Текущая цена
            volume: Текущий объём
            exchange: Биржа
            
        Returns:
            dict с данными аномалии или None
        """
        if not ML_AVAILABLE:
            return None

        # Добавляем точку
        self.add_data_point(pair, price, volume)

        # Нужно минимум min_samples для обучения
        if len(self._pair_data[pair]) < self.min_samples:
            return None

        # Подготовка данных
        data = list(self._pair_data[pair])
        features = np.array([
            [d['price'], d['log_volume']]
            for d in data
        ])

        # Обучение модели (если нужно)
        if not self._is_trained.get(pair, False):
            self._train_model(pair, features)
            return None  # Первая тренировка, не алертим

        # Предсказание
        model = self._models[pair]
        scaler = self._scalers[pair]

        # Последняя точка для проверки
        last_point = scaler.transform([[price, np.log1p(volume)]])
        prediction = model.predict(last_point)[0]
        score = model.score_samples(last_point)[0]

        # -1 = аномалия, 1 = норма
        if prediction == -1:
            # Вычисление severity из score (чем меньше score, тем выше аномалия)
            severity = abs(score) / 3.0  # Нормализация
            
            # Проверка severity - игнорируем слабые аномалии
            if severity < self.min_severity:
                return None

            self._anomaly_count += 1

            # Вычисление anomaly_type
            anomaly_type = self._classify_anomaly(price, volume, data)

            logger.warning(
                f"🤖 ML ANOMALY: {pair} | "
                f"Type: {anomaly_type} | "
                f"Severity: {severity:.2f}"
            )

            result = {
                'type': anomaly_type,
                'pair': pair,
                'exchange': exchange,
                'price': price,
                'volume': volume,
                'severity': severity,
                'score': score,
            }

            # Callback
            if self.on_anomaly_detected:
                try:
                    asyncio.create_task(self.on_anomaly_detected(result))
                except Exception as e:
                    logger.error(f"❌ Ошибка callback ML аномалии: {e}")

            return result

        # Переобучение каждые 100 новых точек
        self._train_counter[pair] = self._train_counter.get(pair, 0) + 1
        if self._train_counter[pair] >= 100:
            self._train_model(pair, features, silent=True)
            self._train_counter[pair] = 0

        return None

    def _train_model(self, pair: str, features: np.ndarray, silent: bool = False):
        """
        Обучение ML модели
        
        Args:
            pair: Торговая пара
            features: Признаки для обучения
            silent: Не логировать (для переобучения)
        """
        try:
            # Нормализация
            scaler = StandardScaler()
            scaled_features = scaler.fit_transform(features)

            # Isolation Forest
            model = IsolationForest(
                n_estimators=self.n_estimators,
                contamination=self.contamination,
                random_state=42,
                n_jobs=-1,
            )
            model.fit(scaled_features)

            # Сохранение
            self._models[pair] = model
            self._scalers[pair] = scaler
            self._is_trained[pair] = True

            if not silent:
                logger.info(f"✅ ML модель обучена для {pair}")

        except Exception as e:
            logger.error(f"❌ Ошибка обучения ML модели: {e}")
            self._is_trained[pair] = False

    def _classify_anomaly(self, price: float, volume: float, data: List) -> str:
        """
        Классификация типа аномалии
        
        Args:
            price: Текущая цена
            volume: Текущий объём
            data: Исторические данные
            
        Returns:
            Строка с типом аномалии
        """
        if not data:
            return "UNKNOWN"

        # Средние значения
        avg_price = np.mean([d['price'] for d in data])
        avg_volume = np.mean([d['volume'] for d in data])

        # Отклонения
        price_deviation = (price - avg_price) / avg_price * 100
        volume_deviation = (volume - avg_volume) / avg_volume * 100

        # Классификация
        if volume_deviation > 500:
            return "VOLUME_SPIKE"
        elif volume_deviation > 200:
            return "HIGH_VOLUME"
        elif abs(price_deviation) > 5:
            return "PRICE_ANOMALY"
        elif volume_deviation < -50:
            return "VOLUME_DROP"
        else:
            return "PATTERN_ANOMALY"

    def get_stats(self) -> dict:
        """Статистика детектора"""
        return {
            'anomaly_count': self._anomaly_count,
            'tracked_pairs': len(self._pair_data),
            'trained_models': sum(self._is_trained.values()),
            'ml_available': ML_AVAILABLE,
        }

    def reset(self, pair: str = None):
        """Сброс данных"""
        if pair:
            if pair in self._pair_data:
                del self._pair_data[pair]
            if pair in self._models:
                del self._models[pair]
            if pair in self._scalers:
                del self._scalers[pair]
            if pair in self._is_trained:
                del self._is_trained[pair]
            if pair in self._train_counter:
                del self._train_counter[pair]
        else:
            self._pair_data.clear()
            self._models.clear()
            self._scalers.clear()
            self._is_trained.clear()
            self._train_counter.clear()
