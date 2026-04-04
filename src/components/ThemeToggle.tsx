'use client';

import { ActionIcon, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [savedScheme, setSavedScheme] = useLocalStorage<'light' | 'dark'>('whale-screener-theme', 'dark');

  const handleToggle = () => {
    toggleColorScheme();
    setSavedScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ActionIcon
      variant="subtle"
      size="lg"
      color="gray"
      onClick={handleToggle}
      title={colorScheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
    >
      {colorScheme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
    </ActionIcon>
  );
}
