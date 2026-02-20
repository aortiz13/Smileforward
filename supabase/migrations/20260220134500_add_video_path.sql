-- Agrega la columna video_path a leads si no existe
ALTER TABLE leads ADD COLUMN IF NOT EXISTS video_path TEXT;
