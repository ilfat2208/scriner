'use client';

import { ActionIcon, Menu } from '@mantine/core';
import { IconDownload, IconFileExport } from '@tabler/icons-react';
import { Ticker } from '@/types';

interface ExportCSVProps {
  tickers: Ticker[];
  filename?: string;
}

export function ExportCSV({ tickers, filename = 'whale-screener-data' }: ExportCSVProps) {
  const exportToCSV = () => {
    const headers = [
      'Symbol',
      'Price',
      '24h Change %',
      '24h High',
      '24h Low',
      'Volume (USDT)',
      'Open Interest',
    ];

    const rows = tickers.map((t) => [
      t.symbol,
      t.lastPrice,
      t.priceChangePercent.toFixed(2),
      t.highPrice,
      t.lowPrice,
      t.quoteVolume.toString(),
      (t.openInterest || 0).toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Menu withinPortal position="bottom-end" shadow="sm">
      <Menu.Target>
        <ActionIcon variant="subtle" size="lg" color="gray">
          <IconFileExport size={20} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconDownload size={14} />}
          onClick={exportToCSV}
        >
          Экспорт в CSV
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
