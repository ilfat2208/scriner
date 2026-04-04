'use client';

import { Paper, Text } from '@mantine/core';

export function InfoLegend() {
  return (
    <Paper className="bg-surface/50 border border-gray-800 rounded-xl p-4">
      <Text size="sm" className="text-gray-400">
        <Text component="span" className="font-bold text-gray-300">
          📖 Легенда:
        </Text>{' '}
        <span className="text-success">🟢 Bids</span> - заявки на покупку |{' '}
        <span className="text-danger">🔴 Asks</span> - заявки на продажу |{' '}
        <span className="text-primary">📊 Volume</span> - объём торгов за 24ч |{' '}
        <span className="text-whale">💰 Funding</span> - ставка финансирования |{' '}
        <span className="text-warning">📈 OI</span> - открытый интерес |{' '}
        <span className="text-gray-300">🐋 Whale</span> - сделки крупнее порога
      </Text>
    </Paper>
  );
}
