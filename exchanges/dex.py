"""
Мониторинг децентрализованных бирж (DEX)

Примечание: Для работы требуется Web3.py и Ethereum RPC URL
"""

import asyncio
from typing import List, Dict, Callable, Optional
from datetime import datetime
from loguru import logger

try:
    from web3 import Web3
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    logger.warning("⚠️  Web3.py не установлен. DEX мониторинг отключен.")

from models.alert import Alert, AlertType


# Адреса контрактов Uniswap V3
UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564'


class DEXMonitor:
    """
    Асинхронный монитор DEX бирж

    Поддерживает:
    - Uniswap V3 (Ethereum)
    - PancakeSwap V3 (BSC) - TODO
    """

    def __init__(
        self,
        exchanges: List[str],
        rpc_url: str,
        whale_detector,
        on_alert: Callable
    ):
        self.exchange_names = exchanges
        self.rpc_url = rpc_url
        self.whale_detector = whale_detector
        self.on_alert = on_alert

        self.w3: Optional[Web3] = None
        self._running = False
        self._tasks: List[asyncio.Task] = []

    async def initialize(self):
        """Инициализация Web3 подключения"""
        if not WEB3_AVAILABLE:
            logger.error("❌ Web3.py не доступен. DEX мониторинг отключен.")
            return

        if not self.rpc_url or self.rpc_url == "YOUR_RPC_URL":
            logger.warning("⚠️  RPC URL не настроен. DEX мониторинг отключен.")
            return

        try:
            self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))

            if not self.w3.is_connected():
                raise ConnectionError("Не удалось подключиться к RPC узлу")

            self._last_block = self.w3.eth.block_number

            logger.info(f"✅ Web3 подключен к {self.rpc_url}")
            logger.info(f"📦 Последний блок: {self._last_block}")

        except Exception as e:
            logger.error(f"❌ Ошибка Web3: {e}")
            self.w3 = None

    async def start(self):
        """Запуск мониторинга"""
        if not WEB3_AVAILABLE or not self.w3:
            logger.info("⏭️  DEX мониторинг пропущен (нет Web3)")
            return

        logger.info("📡 Запуск DEX мониторинга...")
        self._running = True

        await self.initialize()

        if self.w3:
            task = asyncio.create_task(self._monitor_swaps())
            self._tasks.append(task)

            await asyncio.gather(*self._tasks, return_exceptions=True)

    async def _monitor_swaps(self):
        """Мониторинг свапов на Uniswap V3"""
        logger.info("🔍 Мониторинг Uniswap V3 свапов...")

        while self._running:
            try:
                current_block = self.w3.eth.block_number

                if current_block > self._last_block:
                    for block_num in range(self._last_block + 1, current_block + 1):
                        await self._process_block(block_num)

                    self._last_block = current_block

                await asyncio.sleep(1)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"❌ Ошибка DEX мониторинга: {e}")
                await asyncio.sleep(5)

    async def _process_block(self, block_num: int):
        """Обработка блока"""
        try:
            block = self.w3.eth.get_block(block_num, full_transactions=True)

            for tx in block['transactions']:
                await self._analyze_transaction(tx)

        except Exception as e:
            logger.debug(f"⚠️ Ошибка обработки блока {block_num}: {e}")

    async def _analyze_transaction(self, tx: dict):
        """Анализ транзакции на предмет китовых сделок"""
        try:
            # Проверка на взаимодействие с Uniswap Router
            if tx.get('to') and tx['to'].upper() == UNISWAP_V3_ROUTER.upper():
                tx_receipt = self.w3.eth.get_transaction_receipt(tx['hash'])

                # Получение ETH объёма
                volume_eth = self.w3.from_wei(tx['value'], 'ether')
                
                # Примерная цена ETH (нужно получать из оракула)
                eth_price_usd = 2000
                volume_usd = float(volume_eth) * eth_price_usd

                # Проверка на китовую сделку
                if self.whale_detector.check_whale(
                    volume_usd=volume_usd,
                    side='BUY',
                    exchange='UNISWAP_V3',
                    pair='ETH/USDC',
                    price=eth_price_usd,
                    amount=float(volume_eth),
                    address=tx['from'],
                ):
                    alert = Alert(
                        alert_type=AlertType.WHALE,
                        exchange='UNISWAP_V3',
                        pair='ETH/USDC',
                        side='BUY',
                        volume_usd=volume_usd,
                        amount=float(volume_eth),
                        price=eth_price_usd,
                        timestamp=datetime.fromtimestamp(tx['blockTimestamp']),
                        tx_hash=tx['hash'].hex(),
                    )
                    await self.on_alert(alert)

        except Exception as e:
            logger.debug(f"⚠️ Ошибка анализа транзакции: {e}")

    async def stop(self):
        """Остановка мониторинга"""
        self._running = False

        for task in self._tasks:
            if not task.done():
                task.cancel()

        if self.w3:
            self.w3.provider.close()

        logger.info("🛑 DEX мониторинг остановлен")
