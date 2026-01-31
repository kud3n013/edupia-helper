-- Migration: Add applied_pay_rate for snapshotting

BEGIN;

-- 1. Add Column
ALTER TABLE public.records ADD COLUMN IF NOT EXISTS applied_pay_rate text;

-- 2. Populate existing data
-- We assume the current 'pay_rate' column holds the snapshot value for existing records
-- (Since we just renamed them, they are effectively snapshots of what they were).
UPDATE public.records SET applied_pay_rate = pay_rate WHERE applied_pay_rate IS NULL;

-- 3. Update Function Logic to use applied_pay_rate
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
  v_profile_rate text;
BEGIN
  -- 1. Parse Class ID
  NEW.grade := substring(NEW.class_id from '\.(\d+)[a-dA-D]')::int;
  
  -- Extract Level
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

  -- 2. Student Count
  IF (upper(NEW.class_id) LIKE '%DU%') OR (upper(NEW.class_id) LIKE '%R1%') OR (upper(NEW.class_id) LIKE '%1P%') THEN
    v_student_count := 1;
  ELSE
    v_student_count := 4;
  END IF;
  NEW.student_count := v_student_count;

  -- 3. Determine Rate (Snapshot Logic)
  
  -- Logic:
  -- IF NEW.applied_pay_rate IS NOT NULL -> Use it (Manual override or properly passed snapshot)
  -- IF NEW.applied_pay_rate IS NULL ->
  --    Try to get from NEW.pay_rate (Legacy/Fallback)
  --    IF NULL -> Fetch from Profiles (Auto-Snapshot)
  
  IF NEW.applied_pay_rate IS NULL THEN
     IF NEW.pay_rate IS NOT NULL THEN
        NEW.applied_pay_rate := NEW.pay_rate;
     ELSE
        -- Auto-fetch from profile
        SELECT pay_rate INTO v_profile_rate FROM public.profiles WHERE id = NEW.user_id;
        NEW.applied_pay_rate := COALESCE(v_profile_rate, 'B'); -- Default B
     END IF;
  END IF;
  
  -- Now calculate based on applied_pay_rate
  v_pay_rate := COALESCE(NEW.applied_pay_rate, 'B');

  IF v_student_count = 1 THEN
    CASE v_pay_rate
      WHEN 'A+' THEN v_base_rate := 85000;
      WHEN 'A'  THEN v_base_rate := 80000;
      WHEN 'B'  THEN v_base_rate := 60000;
      WHEN 'C'  THEN v_base_rate := 50000;
      ELSE v_base_rate := 40000;
    END CASE;
  ELSIF v_student_count <= 4 THEN
    CASE v_pay_rate
      WHEN 'A+' THEN v_base_rate := 100000;
      WHEN 'A'  THEN v_base_rate := 95000;
      WHEN 'B'  THEN v_base_rate := 75000;
      WHEN 'C'  THEN v_base_rate := 65000;
      ELSE v_base_rate := 55000;
    END CASE;
  ELSE -- > 4
    CASE v_pay_rate
      WHEN 'A+' THEN v_base_rate := 115000;
      WHEN 'A'  THEN v_base_rate := 110000;
      WHEN 'B'  THEN v_base_rate := 90000;
      WHEN 'C'  THEN v_base_rate := 90000;
      ELSE v_base_rate := 55000;
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

-- 4. Update Global Pay Rate Function (Decouple records)
CREATE OR REPLACE FUNCTION public.update_global_pay_rate(new_rate text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $function$
begin
  -- Only update profile (future default). Do NOT update existing records.
  update public.profiles set pay_rate = new_rate where id = auth.uid();
  -- update public.records set pay_rate = new_rate where user_id = auth.uid(); -- REMOVED
end;
$function$
;

COMMIT;
