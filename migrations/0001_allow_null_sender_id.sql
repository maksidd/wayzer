-- Изменяем поле sender_id в таблице chat_messages, чтобы разрешить NULL значения для системных сообщений
ALTER TABLE "chat_messages" ALTER COLUMN "sender_id" DROP NOT NULL; 