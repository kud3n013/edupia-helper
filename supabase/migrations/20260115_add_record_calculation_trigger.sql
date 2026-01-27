-- Function to calculate record fields (Grade, Level, Student Count, Rate)
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
  -- Regex: \.(\d+)([a-dA-D])  (Case insensitive handled by formatting or simple checks)
  -- We extract the FIRST match.
  -- substring(string from pattern) regex in Postgres.
  
  -- Extract Grade (Number after dot, before A-D)
  -- Example: .6A -> 6.  .4P (ignored).
  -- We use postgres substring with regex capture groups.
  NEW.grade := substring(NEW.class_id from '\.(\d+)[a-dA-D]')::int;
  
  -- Extract Level (Letter A-D after grade)
  -- We map A->Giỏi, B->Khá, C->Trung bình, D->Yếu
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
         -- Keep existing level if valid, or null? 
         -- If we failed to parse, maybe we leave it? 
         -- User wants auto-parse, so likely we overwrite.
         -- But if user manually entered "Lớp mới" without ID, we might not want to break it.
         -- Let's only overwrite if we found a match.
         NULL; 
    END CASE;
  END;

  -- 2. Determine Student Count (Class Type)
  -- 1 on 1: "DU", "R1", "1P"
  -- 1 on 4: "RMK", "R4", "4P" (Default)
  IF (upper(NEW.class_id) LIKE '%DU%') OR (upper(NEW.class_id) LIKE '%R1%') OR (upper(NEW.class_id) LIKE '%1P%') THEN
    v_student_count := 1;
  ELSE
    -- Default to 4 (Group)
    v_student_count := 4;
  END IF;
  NEW.student_count := v_student_count;

  -- 3. Calculate Rate
  -- Get Pay Rate (Default D if null/invalid)
  v_pay_rate := COALESCE(NEW.pay_rate, 'D');
  
  -- Base Rate Lookup
  -- 'S+': { single: 85000, group4: 100000, group6: 115000 }
  -- 'A+': { single: 80000, group4: 95000, group6: 110000 }
  -- 'B+': { single: 60000, group4: 75000, group6: 90000 }
  -- 'C+': { single: 50000, group4: 65000, group6: 90000 }
  -- 'D': { single: 40000, group4: 55000, group6: 55000 }
  
  IF v_student_count = 1 THEN
    CASE v_pay_rate
      WHEN 'S+' THEN v_base_rate := 85000;
      WHEN 'A+' THEN v_base_rate := 80000;
      WHEN 'B+' THEN v_base_rate := 60000;
      WHEN 'C+' THEN v_base_rate := 50000;
      ELSE v_base_rate := 40000; -- D
    END CASE;
  ELSIF v_student_count <= 4 THEN
    CASE v_pay_rate
      WHEN 'S+' THEN v_base_rate := 100000;
      WHEN 'A+' THEN v_base_rate := 95000;
      WHEN 'B+' THEN v_base_rate := 75000;
      WHEN 'C+' THEN v_base_rate := 65000;
      ELSE v_base_rate := 55000; -- D
    END CASE;
  ELSE -- > 4 (Group 6)
    CASE v_pay_rate
      WHEN 'S+' THEN v_base_rate := 115000;
      WHEN 'A+' THEN v_base_rate := 110000;
      WHEN 'B+' THEN v_base_rate := 90000;
      WHEN 'C+' THEN v_base_rate := 90000;
      ELSE v_base_rate := 55000; -- D (Same as group 4 in code?) 
      -- Checking code: 'D': { single: 40000, group4: 55000, group6: 55000 } -> Yes.
    END CASE;
  END IF;

  -- Multiplier
  -- 'Hoàn thành': 1
  -- 'HS vắng mặt': 0.3
  -- 'GS vắng mặt': -2
  -- 'Hủy': 0
  -- 'Chưa mở lớp': 0
  -- 'Feedback trễ': 1
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

-- Create Trigger
DROP TRIGGER IF EXISTS before_record_changes ON public.records;
CREATE TRIGGER before_record_changes
BEFORE INSERT OR UPDATE ON public.records
FOR EACH ROW
EXECUTE FUNCTION public.calculate_record_fields();

-- Update existing records to trigger the calculation
-- This will run the logic for every row currently in the DB.
UPDATE public.records SET updated_at = now();
