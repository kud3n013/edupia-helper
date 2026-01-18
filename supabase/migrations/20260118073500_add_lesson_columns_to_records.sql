-- Add missing columns to records table to match lesson data
ALTER TABLE public.records
ADD COLUMN IF NOT EXISTS lesson_content TEXT,
ADD COLUMN IF NOT EXISTS atmosphere_value TEXT,
ADD COLUMN IF NOT EXISTS progress_value TEXT,
ADD COLUMN IF NOT EXISTS students JSONB,
ADD COLUMN IF NOT EXISTS reminders JSONB,
ADD COLUMN IF NOT EXISTS session_number INTEGER,
ADD COLUMN IF NOT EXISTS atmosphere_checked BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS progress_checked BOOLEAN DEFAULT true;
