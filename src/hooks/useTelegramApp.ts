/**
 * Хук для интеграции с Telegram Web App
 * Предоставляет доступ к Telegram API и данным пользователя
 */

import { useEffect, useState, useCallback } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
}

interface TelegramWebApp {
  initDataUnsafe: {
    user?: TelegramUser;
    query_id?: string;
    hash?: string;
  };
  initData: string;
  expand: () => void;
  close: () => void;
  sendData: (data: string) => void;
  MainButton: {
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    setParams: (params: { color: string; text_color: string; is_active: boolean; is_visible: boolean }) => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
  };
  HeaderColor: string;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
  };
  isVersionAtLeast: (version: string) => boolean;
  ready: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface UseTelegramAppResult {
  /** Telegram Web App объект */
  tg: TelegramWebApp | null;
  /** Данные пользователя Telegram */
  user: TelegramUser | null;
  /** Запущено ли приложение внутри Telegram */
  isTelegram: boolean;
  /** Тема Telegram */
  themeParams: TelegramWebApp['themeParams'];
  /** Развернуть приложение на весь экран */
  expand: () => void;
  /** Закрыть приложение */
  close: () => void;
  /** Показать главную кнопку */
  showMainButton: (text: string, callback: () => void) => void;
  /** Скрыть главную кнопку */
  hideMainButton: () => void;
  /** Отправить данные боту */
  sendData: (data: string) => void;
}

export function useTelegramApp(): UseTelegramAppResult {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    // Проверяем, запущено ли приложение в Telegram
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      setTg(webApp);
      setIsTelegram(true);

      // Сообщаем Telegram, что приложение готово
      webApp.ready();

      // Разворачиваем на весь экран
      webApp.expand();

      // Получаем данные пользователя
      if (webApp.initDataUnsafe.user) {
        setUser(webApp.initDataUnsafe.user);
      }

      console.log('📱 Telegram Web App initialized');
      console.log('👤 User:', webApp.initDataUnsafe.user);
    } else {
      console.log('🌐 Running outside Telegram');
    }
  }, []);

  const expand = useCallback(() => {
    if (tg) {
      tg.expand();
    }
  }, [tg]);

  const close = useCallback(() => {
    if (tg) {
      tg.close();
    }
  }, [tg]);

  const showMainButton = useCallback(
    (text: string, callback: () => void) => {
      if (tg) {
        tg.MainButton.setText(text);
        tg.MainButton.setParams({
          color: '#3b82f6',
          text_color: '#ffffff',
          is_active: true,
          is_visible: true,
        });
        tg.MainButton.onClick(callback);
        tg.MainButton.show();
      }
    },
    [tg]
  );

  const hideMainButton = useCallback(() => {
    if (tg) {
      tg.MainButton.hide();
    }
  }, [tg]);

  const sendData = useCallback(
    (data: string) => {
      if (tg) {
        // Отправляем данные боту (максимум 4096 байт)
        tg.sendData(data);
      }
    },
    [tg]
  );

  return {
    tg,
    user,
    isTelegram,
    themeParams: tg?.themeParams || {},
    expand,
    close,
    showMainButton,
    hideMainButton,
    sendData,
  };
}
