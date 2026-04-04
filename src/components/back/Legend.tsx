'use client';

import { Paper, Text } from '@mantine/core';

export function Legend() {
  return (
    <Paper
      p="md"
      mt="md"
      style={{
        backgroundColor: '#1a1b1e',
        border: '1px solid #2d2d2d',
      }}
    >
      <Text size="sm" c="dimmed">
        <Text component="span" fw="bold">
          📖 Легенда:
        </Text>{' '}
        🟢 <Text component="span" c="green">Bids</Text> - заявки на покупку | 🔴{' '}
        <Text component="span" c="red">Asks</Text> - заявки на продажу | 📊{' '}
        <Text component="span">Volume</Text> - объём торгов за 24ч | 💰{' '}
        <Text component="span">Funding</Text> - ставка финансирования | 📈{' '}
        <Text component="span">OI</Text> - открытый интерес | 🐋{' '}
        <Text component="span">Whale</Text> - сделки крупнее порога
      </Text>
    </Paper>
  );
}
