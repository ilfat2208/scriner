# 🚀 Деплой на Railway + Telegram Mini App

Полная инструкция по развертыванию Whale Screener как Telegram Mini App на Railway.

---

## 📋 Что получится

После деплоя вы получите:
- ✅ **Единый URL** на Railway (например, `https://whale-screener.railway.app`)
- ✅ **Telegram Mini App**, открывающееся внутри Telegram
- ✅ **API и фронтенд** работают на одном домене
- ✅ **Автоматический деплой** при push в GitHub

---

## 🎯 Шаг 1: Подготовка проекта

### 1.1. Убедитесь что всё собрано локально

```bash
# Установка зависимостей
npm install
pip install -r requirements.txt

# Тестовая сборка фронтенда
npm run build

# Проверка что папка out создана
ls out/
```

### 1.2. Закоммитьте изменения

```bash
git add .
git commit -m "feat: prepare for Railway deployment with Telegram Mini App"
git push origin main
```

---

## 🚀 Шаг 2: Деплой на Railway

### Вариант A: Через GitHub (Рекомендуется)

1. **Зайдите на [railway.app](https://railway.app)**
2. **Нажмите "New Project"**
3. **Выберите "Deploy from GitHub repo"**
4. **Выберите репозиторий** с вашим проектом
5. **Railway автоматически:**
   - Определит Python проект
   - Прочитает `railway.json`
   - Установит зависимости
   - Запустит приложение

### Вариант B: Через Railway CLI

```bash
# Установка Railway CLI
npm i -g @railway/cli

# Логин
railway login

# Инициализация проекта
railway init

# Деплой
railway up
```

---

## ⚙️ Шаг 3: Настройка переменных окружения

В панели Railway перейдите в **Variables** и добавьте:

### Обязательные:

```bash
# Telegram Bot Token (получите от @BotFather)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz

# Ваш Telegram ID (для админки)
TELEGRAM_ADMIN_ID=123456789

# Environment
NODE_ENV=production
RAILWAY_ENVIRONMENT=production
```

### Опциональные:

```bash
# Binance API (если используете)
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret

# Database (Railway создаст автоматически)
DATABASE_URL=sqlite+aiosqlite:///./whale_screener.db

# Logging
LOG_LEVEL=INFO
```

---

## 🌐 Шаг 4: Настройка домена

1. В панели Railway скопируйте ваш URL: `https://your-project.railway.app`
2. Этот URL будет использоваться для:
   - Telegram Mini App
   - API endpoints
   - WebSocket подключений

---

## 📱 Шаг 5: Настройка Telegram Mini App

### 5.1. Создайте бота (если ещё не создан)

1. Откройте **@BotFather** в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. **Скопируйте токен**

### 5.2. Создайте Mini App

1. В @BotFather отправьте `/newapp`
2. Выберите вашего бота
3. Введите название приложения (например, "Whale Screener")
4. Введите описание
5. **Вставьте URL вашего приложения:**
   ```
   https://your-project.railway.app
   ```
6. BotFather создаст **прямую ссылку** на приложение

### 5.3. Настройте кнопку меню (опционально)

```bash
# В @BotFather отправьте:
/mybots → Выберите бота → Bot Settings → Menu Button

# Установите URL:
https://your-project.railway.app

# Установите текст кнопки:
🐋 Whale Screener
```

### 5.4. Добавьте в описание бота

```bash
# В @BotFather:
/setdescription → Выберите бота → Введите описание

Пример:
🐋 Whale Screener - мониторинг китовых сделок

Откройте приложение: /app
```

---

## 🔧 Шаг 6: Обновление переменных для production

После получения URL от Railway, обновите переменные:

### В Railway Variables добавьте:

```bash
# Замените на ваш реальный URL
NEXT_PUBLIC_WS_URL=wss://your-project.railway.app/api/signals/ws
NEXT_PUBLIC_API_URL=https://your-project.railway.app/api
```

**Или** обновите код, чтобы использовать относительные URL:

В `src/hooks/useSignalWebSocket.ts`:
```typescript
const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
  (typeof window !== 'undefined' 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/signals/ws`
    : 'ws://localhost:8000/api/signals/ws');
```

---

## 🔄 Шаг 7: Автоматический деплой

Теперь при каждом push в main ветку:

1. **GitHub** уведомит Railway
2. **Railway** запустит `build_for_deploy.py`
3. **Соберётся** Next.js фронтенд
4. **Запустится** FastAPI сервер
5. **Деплой** завершится автоматически

---

## 🧪 Шаг 8: Проверка

### 8.1. Проверьте API

```bash
# Health check
curl https://your-project.railway.app/health

# API docs
open https://your-project.railway.app/docs
```

### 8.2. Проверьте фронтенд

Откройте в браузере:
```
https://your-project.railway.app
```

### 8.3. Проверьте Telegram Mini App

1. Откройте ссылку от BotFather
2. Приложение должно загрузиться внутри Telegram
3. Проверьте что данные загружаются

---

## 🐛 Troubleshooting

### Ошибка: "Frontend not built"

**Причина:** Папка `out` не создана

**Решение:**
```bash
# Локально
npm run build

# На Railway проверьте логи
railway logs
```

### Ошибка: WebSocket не подключается

**Причина:** Неправильный URL или CORS

**Решение:**
1. Проверьте `NEXT_PUBLIC_WS_URL` в Railway Variables
2. Убедитесь что используется `wss://` (не `ws://`)
3. Проверьте что сервер запущен

### Ошибка: Telegram Web App не инициализируется

**Причина:** Приложение открыто в браузере, а не в Telegram

**Решение:** Это нормально! Приложение работает и в браузере, но Telegram функции доступны только внутри Telegram.

### Ошибка билда на Railway

**Причина:** Не хватает зависимостей или памяти

**Решение:**
```bash
# Проверьте логи
railway logs

# Увеличьте лимиты в Railway Dashboard
# Settings → Deploy → Memory Limit (увеличьте до 1GB)
```

---

## 📊 Архитектура после деплоя

```
┌─────────────────────────────────────────┐
│  Railway Server (:PORT)                 │
│                                         │
│  FastAPI (uvicorn)                      │
│  ├─ /api/*         → API endpoints     │
│  ├─ /api/signals/ws → WebSocket        │
│  ├─ /              → Frontend (static) │
│  ├─ /_next/*       → Next.js assets    │
│  └─ /health        → Health check      │
│                                         │
│  Static Files (out/)                   │
│  ├─ index.html                          │
│  ├─ _next/static/*                      │
│  └─ assets/*                            │
└─────────────────────────────────────────┘
           ↑
           │
    ┌──────┴───────┐
    │  Telegram    │
    │  Mini App    │
    └──────────────┘
```

---

## 🎨 Кастомизация Mini App

### Изменение цветов

В `src/app/layout.tsx` можно настроить тему:

```typescript
const theme = createTheme({
  primaryColor: '#0088cc', // Telegram blue
  // ...
});
```

### Использование нативных цветов Telegram

В хуке `useTelegramApp` доступны `themeParams`:

```typescript
const { themeParams } = useTelegramApp();

// Используйте в компонентах
const backgroundColor = themeParams.bg_color || '#1a1b1e';
```

---

## 📝 Полезные команды

```bash
# Локальная разработка
npm run dev              # Фронтенд
python launch_backend.py # Бэкенд

# Сборка для деплоя
python build_for_deploy.py

# Railway CLI
railway login            # Авторизация
railway init             # Инициализация
railway up               # Деплой
railway logs             # Логи
railway open             # Открыть dashboard
```

---

## ✅ Чеклист перед деплоем

- [ ] Все изменения закоммичены
- [ ] Код в main ветке
- [ ] Telegram бот создан и токен получен
- [ ] Railway проект создан
- [ ] Переменные окружения настроены
- [ ] Health check работает (`/health`)
- [ ] Telegram Mini App настроен через BotFather
- [ ] Протестировано в браузере
- [ ] Протестировано в Telegram

---

## 🎉 Готово!

Теперь ваш Whale Screener работает как Telegram Mini App!

**Пользователи могут:**
- Открыть через ссылку в боте
- Использовать кнопку меню
- Получить полный функционал внутри Telegram

**Вы можете:**
- Обновлять код через git push
- Мониторить логи в Railway
- Масштабировать ресурсы в Dashboard
