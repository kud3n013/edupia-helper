-- 1. Create public.lessons table to store session logs (drafts) for the lesson page
-- This table is keyed by user_id, allowing each user to have one active draft.
DROP TABLE IF EXISTS public.lessons;

CREATE TABLE public.lessons (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Session Data
  class_id TEXT,
  grade INTEGER,
  level TEXT,
  lesson_content TEXT,
  
  -- Checklist States
  atmosphere_checked BOOLEAN DEFAULT TRUE,
  atmosphere_value TEXT,
  progress_checked BOOLEAN DEFAULT TRUE,
  progress_value TEXT,
  
  -- Student & Configuration
  student_count INTEGER DEFAULT 4,
  school_level TEXT,
  knowledge_mode TEXT, -- 'bulk' | 'individual'
  attitude_mode TEXT, -- 'bulk' | 'individual'
  
  -- JSONB columns for arrays/objects
  included_criteria JSONB DEFAULT '["Từ vựng", "Ngữ pháp", "Phản xạ"]'::jsonb,
  included_attitude_categories JSONB,
  students JSONB, -- Stores the entire array of student objects (scores, attitudes, etc.)
  
  -- Reminders & Meta
  session_number INTEGER DEFAULT 1,
  reminders JSONB DEFAULT '[]'::jsonb
);

-- 2. Add 'absent' column to public.records is NO LONGER needed here as it was part of the old schema idea.
-- However, if the user still wanted 'absent' on records, we should preserve it or move it. 
-- The user request specifically asked to "check for schema on every pages to re-create the required columns from public.lessons table".
-- So I will focus on public.lessons. 
-- Existing migrations might have handled 'absent' on records? 
-- The previous file content had: 
-- ALTER TABLE public.records ADD COLUMN IF NOT EXISTS absent BOOLEAN DEFAULT FALSE;
-- I will keep this part to ensure we don't regress if it was needed, but usually migrations should be atomic. 
-- Since I am REPLACING this migration file, I should keep the record modification if it's still relevant to the PROJECT, 
-- but this file seems to be named `create_lessons_table`.
-- I'll keep the records modification as a safety measure, assuming this migration handles both.

ALTER TABLE public.records 
ADD COLUMN IF NOT EXISTS absent BOOLEAN DEFAULT FALSE;

-- 3. Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own session logs"
ON public.lessons
FOR ALL
USING (auth.uid() = user_id);
