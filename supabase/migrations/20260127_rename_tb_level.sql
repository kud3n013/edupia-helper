-- Migration to rename "Trung bình" to "TB"

-- 1. Update the function logic to use 'TB' instead of 'Trung bình'
CREATE OR REPLACE FUNCTION public.calculate_record_fields()
RETURNS TRIGGER AS $$
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
      WHEN 'C' THEN NEW.level := 'TB'; -- CHANGED from 'Trung bình'
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
  
  IF v_student_count = 1 THEN
    CASE v_pay_rate
      WHEN 'S+' THEN v_base_rate := 85000;
      WHEN 'A+' THEN v_base_rate := 80000;
      WHEN 'B+' THEN v_base_rate := 60000;
      WHEN 'C+' THEN v_base_rate := 50000;
      ELSE v_base_rate := 40000;
    END CASE;
  ELSIF v_student_count <= 4 THEN
    CASE v_pay_rate
      WHEN 'S+' THEN v_base_rate := 100000;
      WHEN 'A+' THEN v_base_rate := 95000;
      WHEN 'B+' THEN v_base_rate := 75000;
      WHEN 'C+' THEN v_base_rate := 65000;
      ELSE v_base_rate := 55000;
    END CASE;
  ELSE -- > 4 (Group 6)
    CASE v_pay_rate
      WHEN 'S+' THEN v_base_rate := 115000;
      WHEN 'A+' THEN v_base_rate := 110000;
      WHEN 'B+' THEN v_base_rate := 90000;
      WHEN 'C+' THEN v_base_rate := 90000;
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
$$ LANGUAGE plpgsql;

-- 2. Update existing records
UPDATE public.records
SET updated_at = now()
WHERE level = 'Trung bình';
