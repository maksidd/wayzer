-- Разделить поле date_time на date и time в таблице trips
ALTER TABLE trips ADD COLUMN date date;
ALTER TABLE trips ADD COLUMN time time;

-- Перенести существующие значения
UPDATE trips SET date = CAST(date_time AS date), time = CAST(date_time AS time) WHERE date_time IS NOT NULL;

-- Сделать новые поля nullable (по умолчанию)
-- Удалить старое поле
ALTER TABLE trips DROP COLUMN date_time;
