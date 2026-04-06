'use client';

import { BottomNav } from '@/components/layout/BottomNav';
import { useTelegramApp } from '@/hooks/useTelegramApp';
import { ReactNode, useEffect } from 'react';

export function ClientLayout({ children }: { children: ReactNode }) {
  const { isTelegram, expand } = useTelegramApp();

  useEffect(() => {
    // Разворачиваем Mini App на весь экран
    if (isTelegram) {
      expand();
      console.log('📱 Telegram Mini App mode');
    }
  }, [isTelegram, expand]);

  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
