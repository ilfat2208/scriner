'use client';

import Link from 'next/link';
import { Button, Text } from '@mantine/core';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <Text className="text-2xl mb-4">Страница не найдена</Text>
        <Text className="text-gray-400 mb-8">
          Страница, которую вы ищете, не существует.
        </Text>
        <Link href="/">
          <Button>Вернуться на главную</Button>
        </Link>
      </div>
    </div>
  );
}
