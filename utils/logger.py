"""
Настройка логирования
"""

import sys
from pathlib import Path
from loguru import logger


def setup_logger(log_level: str = "INFO"):
    """
    Настройка логгера
    
    - Вывод в консоль с цветами
    - Запись в файл
    - Форматирование
    """
    # Создание директории для логов
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Удаление стандартного обработчика
    logger.remove()
    
    # Консоль
    logger.add(
        sys.stderr,
        level=log_level,
        format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True
    )
    
    # Файл
    logger.add(
        log_dir / "screener.log",
        level="DEBUG",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        rotation="1 day",
        retention="7 days",
        compression="zip"
    )
    
    # Файл для алертов (только важные события)
    logger.add(
        log_dir / "alerts.log",
        level="WARNING",
        format="{time:YYYY-MM-DD HH:mm:ss} | {message}",
        rotation="10 MB",
        retention="30 days"
    )
    
    logger.info("📝 Логгер инициализирован")