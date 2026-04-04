/**
 * Компонент отображения статуса Telegram Web App
 */

'use client';

import { Group, Avatar, Text, Badge, Paper } from '@mantine/core';
import { IconBrandTelegram } from '@tabler/icons-react';
import { useTelegramApp } from '@/hooks/useTelegramApp';

export function TelegramStatus() {
  const { isTelegram, user, themeParams } = useTelegramApp();

  if (!isTelegram || !user) {
    return null;
  }

  return (
    <Paper p="xs" withBorder>
      <Group>
        <IconBrandTelegram size={20} color="#0088cc" />
        <Text size="sm" fw={500}>
          Telegram Mini App
        </Text>
        <Badge color="green" size="xs">
          Connected
        </Badge>
        {user && (
          <>
            <Avatar size="sm" color="blue" radius="sm">
              {user.first_name.charAt(0)}
            </Avatar>
            <Text size="sm">
              {user.first_name} {user.last_name}
            </Text>
            {user.username && (
              <Text size="xs" c="dimmed">
                @{user.username}
              </Text>
            )}
          </>
        )}
      </Group>
    </Paper>
  );
}
