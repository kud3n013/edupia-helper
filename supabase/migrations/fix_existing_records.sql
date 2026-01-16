-- Run this ONCE in Supabase SQL Editor to fix your existing data
-- It will find all "BU" records that actually have a matching "CN" class and update them.

UPDATE public.records r
SET class_type = 'CN'
FROM public.classes c
WHERE r.user_id = c.user_id
  -- Match logic: Record ID starts with Class ID + '-'
  AND r.class_id LIKE c.fixed_class_id || '-%'
  AND r.class_type = 'BU';
