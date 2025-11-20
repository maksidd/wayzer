import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Serve uploaded photos statically
app.use('/uploads', express.static(path.join(process.cwd(), 'server/uploads')));

// Список чувствительных полей, которые не должны попадать в логи
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'accessToken',
  'token',
  'authToken',
  'refreshToken',
  'email',
  'phone',
  'avatarUrl',
  'avatarThumbnailUrl',
  'additionalPhotos',
  'messengers',
]);

// Функция для очистки чувствительных данных из ответа перед логированием
function sanitizeResponse(data: any, maxDepth: number = 3): any {
  if (maxDepth <= 0 || data === null || data === undefined) {
    return '[filtered]';
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    // Для массивов ограничиваем размер и рекурсивно обрабатываем элементы
    return data.slice(0, 3).map(item => sanitizeResponse(item, maxDepth - 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    // Пропускаем чувствительные поля
    if (SENSITIVE_FIELDS.has(lowerKey)) {
      sanitized[key] = '[filtered]';
    } else if (typeof value === 'object' && value !== null) {
      // Рекурсивно обрабатываем вложенные объекты
      sanitized[key] = sanitizeResponse(value, maxDepth - 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Логируем только структуру ответа без чувствительных данных
      if (capturedJsonResponse) {
        const sanitized = sanitizeResponse(capturedJsonResponse);
        const sanitizedStr = JSON.stringify(sanitized);
        
        // Ограничиваем длину лога, но не обрезаем посередине JSON
        if (sanitizedStr.length > 200) {
          logLine += ` :: ${sanitizedStr.slice(0, 197)}...`;
        } else {
          logLine += ` :: ${sanitizedStr}`;
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Если ответ уже отправлен, просто передаем ошибку дальше
    if (res.headersSent) {
      return _next(err);
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Логируем только серверные ошибки (5xx), чтобы не засорять логи клиентскими ошибками
    if (status >= 500) {
      console.error(`[ERROR] ${_req.method} ${_req.path} - ${status}:`, err);
    }

    res.status(status).json({ message });
    // НЕ выбрасываем ошибку после отправки ответа - это приведет к крашу процесса
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
