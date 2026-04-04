'use client';

import { Modal, ActionIcon } from '@mantine/core';
import { IconX, IconMaximize } from '@tabler/icons-react';

interface ChartModalProps {
  opened: boolean;
  onClose: () => void;
  symbol: string;
  interval: string;
}

export function ChartModal({ opened, onClose, symbol, interval }: ChartModalProps) {
  const iframeSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_full_${symbol}&symbol=BINANCE:${symbol}&interval=${interval}&hidetopbar=0&hidebottomtoolbar=0&hideideas=0&hide_side_toolbar=0&allow_symbol_change=1&save_image=1&style=1&theme=dark&toolbar_bg=%231a1b1e&enable_publishing=1&withdateranges=1&hidevolume=0&showpopupmenu=1&calendar=1`;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="90vw"
      centered
      closeOnClickOutside={false}
      closeOnEscape
      withCloseButton={false}
      styles={{
        content: {
          backgroundColor: '#1a1b1e',
          border: '1px solid #2d2d2d',
        },
        header: {
          backgroundColor: '#25262b',
          borderBottom: '1px solid #2d2d2d',
          padding: '12px 16px',
        },
        title: {
          color: 'white',
          fontSize: '16px',
          fontWeight: 600,
        },
        body: {
          padding: 0,
          backgroundColor: '#1a1b1e',
        },
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span>📊 {symbol} — TradingView</span>
          <ActionIcon
            variant="subtle"
            size="lg"
            color="gray"
            onClick={onClose}
            style={{ marginLeft: 'auto' }}
          >
            <IconX size={20} />
          </ActionIcon>
        </div>
      }
    >
      <div style={{ width: '100%', height: '70vh' }}>
        <iframe
          src={iframeSrc}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title={`Full Chart ${symbol}`}
        />
      </div>
    </Modal>
  );
}
