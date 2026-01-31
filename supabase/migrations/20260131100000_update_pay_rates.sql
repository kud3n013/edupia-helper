-- Migration: Update Pay Rates (Grade Levels)
-- S+ -> A+
-- A+ -> A
-- B+ -> B
-- C+ -> C
-- D+ -> D

BEGIN;

-- 1. Update Profiles (Default Pay Rate)
-- Order matters to prevent conflicts if we were swapping, but here we are shifting down/renaming.
-- Safest is to do it in optimal order or temporarily map to intermediate if needed.
-- S+ -> A+ (Unique enough? S+ is distinct)
-- A+ -> A (A+ is distinct from A? A didn't exist before as a rate, so safe)
-- B+ -> B
-- C+ -> C
-- D+ -> D

-- We should probably do it in specific order to avoid 'A+' becoming 'A' then 'S+' becoming 'A+' in the same pass if we used a single UPDATE statement without careful WHERE clauses?
-- Individual statements are safer.

-- Handle A+ -> A first (so S+ can become A+ without conflict if A+ was a target)
-- Wait, if I change S+ -> A+, then I have two A+ groups? No.
-- If I change A+ -> A, then the old A+ are gone. Safe to move S+ to A+.
UPDATE public.profiles SET pay_rate = 'A' WHERE pay_rate = 'A+';
UPDATE public.records  SET pay_rate = 'A' WHERE pay_rate = 'A+';

UPDATE public.profiles SET pay_rate = 'A+' WHERE pay_rate = 'S+';
UPDATE public.records  SET pay_rate = 'A+' WHERE pay_rate = 'S+';

UPDATE public.profiles SET pay_rate = 'B' WHERE pay_rate = 'B+';
UPDATE public.records  SET pay_rate = 'B' WHERE pay_rate = 'B+';

UPDATE public.profiles SET pay_rate = 'C' WHERE pay_rate = 'C+';
UPDATE public.records  SET pay_rate = 'C' WHERE pay_rate = 'C+';

UPDATE public.profiles SET pay_rate = 'D' WHERE pay_rate = 'D+';
UPDATE public.records  SET pay_rate = 'D' WHERE pay_rate = 'D+';

-- 2. Update Default Value on Table
ALTER TABLE public.profiles ALTER COLUMN pay_rate SET DEFAULT 'B';
ALTER TABLE public.records ALTER COLUMN pay_rate SET DEFAULT 'D';

-- 3. Update Function Logic
CREATE OR REPLACE FUNCTION public.calculate_record_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 AS $function$
DECLARE
  v_grade_match text[];
  v_student_count int;
  v_base_rate numeric;
  v_multiplier numeric;
  v_pay_rate text;
BEGIN
  -- 1. Parse Class ID breakdown (Grade & Level)
  NEW.grade := substring(NEW.class_id from '\.(\d+)[a-dA-D]')::int;
  
  -- Extract Level (Letter A-D after grade)
  DECLARE
    v_level_char text;
  BEGIN
    v_level_char := upper(substring(NEW.class_id from '\.\d+([a-dA-D])'));
    CASE v_level_char
      WHEN 'A' THEN NEW.level := 'Giỏi';
      WHEN 'B' THEN NEW.level := 'Khá';
      WHEN 'C' THEN NEW.level := 'TB'; 
      WHEN 'D' THEN NEW.level := 'Yếu';
      ELSE
         NULL; 
    END CASE;
  END;

  -- 2. Determine Student Count (Class Type)
  IF (upper(NEW.class_id) LIKE '%DU%') OR (upper(NEW.class_id) LIKE '%R1%') OR (upper(NEW.class_id) LIKE '%1P%') THEN
    v_student_count := 1;
  ELSE
    v_student_count := 4;
  END IF;
  NEW.student_count := v_student_count;

  -- 3. Calculate Rate
  v_pay_rate := COALESCE(NEW.pay_rate, 'D');
  
  -- NEW RATES MAP (Previous S+ value is now A+, etc)
  -- S+ (old) -> A+ (new) : 85k/100k/115k
  -- A+ (old) -> A (new)  : 80k/95k/110k
  -- B+ (old) -> B (new)  : 60k/75k/90k
  -- C+ (old) -> C (new)  : 50k/65k/90k? (Wait, C+ >4 was 90k? Let's check original)
  
  -- Original C+ >4 was 90000? Let's re-read the detailed function from the view_file output.
  -- "WHEN 'C+' THEN v_base_rate := 90000;" for >4 students. Yes.
  
  IF v_student_count = 1 THEN
    CASE v_pay_rate
      WHEN 'A+' THEN v_base_rate := 85000; -- Was S+
      WHEN 'A'  THEN v_base_rate := 80000; -- Was A+
      WHEN 'B'  THEN v_base_rate := 60000; -- Was B+
      WHEN 'C'  THEN v_base_rate := 50000; -- Was C+
      ELSE v_base_rate := 40000;           -- D/Others
    END CASE;
  ELSIF v_student_count <= 4 THEN
    CASE v_pay_rate
      WHEN 'A+' THEN v_base_rate := 100000; -- Was S+
      WHEN 'A'  THEN v_base_rate := 95000;  -- Was A+
      WHEN 'B'  THEN v_base_rate := 75000;  -- Was B+
      WHEN 'C'  THEN v_base_rate := 65000;  -- Was C+
      ELSE v_base_rate := 55000;            -- D/Others
    END CASE;
  ELSE -- > 4 (Group 6)
    CASE v_pay_rate
      WHEN 'A+' THEN v_base_rate := 115000; -- Was S+
      WHEN 'A'  THEN v_base_rate := 110000; -- Was A+
      WHEN 'B'  THEN v_base_rate := 90000;  -- Was B+
      WHEN 'C'  THEN v_base_rate := 90000;  -- Was C+ (Kept same as B+ in original? Yes seems so)
      ELSE v_base_rate := 55000;            -- D/Others
    END CASE;
  END IF;

  -- Multiplier
  CASE NEW.status
    WHEN 'Hoàn thành' THEN v_multiplier := 1;
    WHEN 'HS vắng mặt' THEN v_multiplier := 0.3;
    WHEN 'GS vắng mặt' THEN v_multiplier := -2;
    WHEN 'Hủy' THEN v_multiplier := 0;
    WHEN 'Chưa mở lớp' THEN v_multiplier := 0;
    WHEN 'Feedback trễ' THEN v_multiplier := 1;
    ELSE v_multiplier := 1;
  END CASE;

  NEW.rate := v_base_rate * v_multiplier;

  RETURN NEW;
END;
$function$
;

COMMIT;
