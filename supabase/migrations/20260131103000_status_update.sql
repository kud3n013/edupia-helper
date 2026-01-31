-- Migration: Update Status Multipliers
-- Hoàn thành: 1
-- HS vắng mặt: 0.3
-- GS vắng mặt: -2
-- Hủy: 0
-- Chưa mở lớp: 0
-- Đã mở lớp: 0 (NEW)
-- Feedback trễ: 0.5 (was 1)

BEGIN;

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
  IF NEW.applied_pay_rate IS NULL THEN
     IF NEW.pay_rate IS NOT NULL THEN
        NEW.applied_pay_rate := NEW.pay_rate;
     ELSE
        -- Auto-fetch from profile
        SELECT pay_rate INTO v_profile_rate FROM public.profiles WHERE id = NEW.user_id;
        NEW.applied_pay_rate := COALESCE(v_profile_rate, 'B'); -- Default B
     END IF;
  END IF;
  
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

  -- Multiplier (UPDATED)
  CASE NEW.status
    WHEN 'Hoàn thành' THEN v_multiplier := 1;
    WHEN 'HS vắng mặt' THEN v_multiplier := 0.3;
    WHEN 'GS vắng mặt' THEN v_multiplier := -2;
    WHEN 'Hủy' THEN v_multiplier := 0;
    WHEN 'Chưa mở lớp' THEN v_multiplier := 0;
    WHEN 'Đã mở lớp' THEN v_multiplier := 0; -- NEW
    WHEN 'Feedback trễ' THEN v_multiplier := 0.5; -- CHANGED from 1
    ELSE v_multiplier := 1;
  END CASE;

  NEW.rate := v_base_rate * v_multiplier;

  RETURN NEW;
END;
$function$
;

COMMIT;
