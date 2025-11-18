# Wayzer - REST API for Finding Travel Companions

REST API for a travel companion service with full authentication, trip management, and a comments system.

## 🚀 Features

- **User Authentication** - registration, login, JWT tokens
- **Trip Management** - create, view, filter trips
- **Participant System** - join and leave trips
- **Comments** - discuss trips
- **Trip Categories** - various types of travel
- **Full Data Validation** - strict input validation

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens, bcrypt for passwords
- **Validation**: Zod schemas
- **Testing**: Jest, Supertest
- **Deployment**: Docker ready

## ⚙️ Environment Variables

1. Скопируй файл `example.env` в `.env` и подставь реальные значения:
   ```bash
   cp example.env .env
   ```
2. Обязательно задай `ADMIN_EMAIL` и `ADMIN_PASSWORD`. При запуске сервера (`npm run dev` или `npm run start`) код в `server/routes.ts` проверит наличие этих переменных и создаст админа с указанными учётными данными, если такого пользователя ещё нет.
3. (Опционально) `UNIVERSAL_PASSWORD` — дев-бэкдор. Если переменная задана, любой пользователь сможет зайти, указав этот пароль. Используй только на локалке/стейдже.

### Как проверить, что bootstrap работает

```bash
# 1. Запускаем сервер
npm run dev

# 2. Логинимся созданным админом
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"strong-admin-password"}'

# 3. Полученный accessToken можно использовать для доступа к админским маршрутам
curl http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer <accessToken>"
```

Если токен получился и админские маршруты отвечают 200-м, значит переменные заданы корректно и bootstrap админа сработал.

### Проверка универсального пароля

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"любой@пользователь","password":"dev-everyone-pass"}'
```

Если ответ 200 и выдаётся токен, значит `UNIVERSAL_PASSWORD` активен. Никогда не включай эту переменную в production `.env`.

## 📁 Project Structure

