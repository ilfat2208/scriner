/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,  // Игнорировать ESLint ошибки при сборке
  },
  // Статический экспорт для Telegram Mini App
  output: 'export',
  // Директория для статических файлов
  distDir: 'out',
  // Отключаем image optimization для статического экспорта
  images: {
    unoptimized: true,
  },
  // Базовый путь (можно изменить для Telegram Mini App)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
}

module.exports = nextConfig
