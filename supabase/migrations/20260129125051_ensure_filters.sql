-- Function to generate upcoming lessons
-- UPDATED: Strictly enforces state = 'Đang dạy' and fixed schedule existence
CREATE OR REPLACE FUNCTION public.generate_upcoming_lessons()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_class RECORD;
  v_today date := CURRENT_DATE;
  v_target_date date;
  v_day_code text;
  v_day_of_week int;
  
  -- Maps for day conversion
  v_day_map text[] := ARRAY['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  
  v_existing_record_id uuid;
  v_max_lesson_num int;
  v_next_lesson_num int;
  v_new_class_id text;
  v_pay_rate text;
  v_student_count int;
  v_students_json jsonb;
  
  -- Loop variables
  i int;
BEGIN
  -- 1. Loop through all classes filtering by State AND Schedule existence
  -- FILTER: Only classes with state 'Đang dạy'
  -- FILTER: Only classes that have a schedule/fixed_class_id implication (handled by schedule check)
  FOR v_class IN SELECT * FROM public.classes WHERE state = 'Đang dạy' LOOP
    
    -- Safety/Logic check: Schedule must be valid and non-empty
    -- This ensures we only process "Fixed Classes" with a defined schedule
    IF v_class.schedule IS NULL OR jsonb_array_length(v_class.schedule) = 0 THEN
      CONTINUE; 
    END IF;

    -- 2. Look ahead 7 days
    FOR i IN 0..7 LOOP
        v_target_date := v_today + i;
        v_day_of_week := extract(dow from v_target_date); -- 0=Sun, 1=Mon...
        v_day_code := v_day_map[v_day_of_week + 1]; -- Postgres arrays are 1-based
        
        -- Check if class is scheduled for this day code (e.g., "T2")
        IF (v_class.schedule @> to_jsonb(v_day_code)) THEN
            
            -- CHECK 1: Check if a record already exists for this Date + Time + Class
            PERFORM 1 FROM public.records 
            WHERE user_id = v_class.user_id 
              AND date = v_target_date
              AND class_id LIKE (v_class.fixed_class_id || '%');
            
            IF FOUND THEN
                CONTINUE; -- Record exists, skip.
            END IF;

            -- CHECK 2: Determine Next Lesson Number (Global Sequence for this Class)
            SELECT MAX(substring(class_id FROM '-(\d+)$')::int)
            INTO v_max_lesson_num
            FROM public.records
            WHERE user_id = v_class.user_id
              AND class_id LIKE (v_class.fixed_class_id || '-%');
              
            v_next_lesson_num := COALESCE(v_max_lesson_num, 0) + 1;
            v_new_class_id := v_class.fixed_class_id || '-' || v_next_lesson_num;

            -- CHECK 3: Collision Check (Ensure ID is unique globally)
            PERFORM 1 FROM public.records WHERE user_id = v_class.user_id AND class_id = v_new_class_id;
            
            IF FOUND THEN
                CONTINUE; -- ID Collision, skip.
            END IF;

            -- Prepare Data for Insert
             SELECT pay_rate INTO v_pay_rate FROM public.profiles WHERE id = v_class.user_id;

             -- Use students from class
             v_students_json := v_class.students;

             INSERT INTO public.records (
                user_id,
                class_id,
                grade,
                level,
                student_count,
                rate, -- 0 for Auto/Chưa mở lớp
                status,
                class_type,
                feedback_status,
                date,
                time_start,
                pay_rate,
                students
            ) VALUES (
                v_class.user_id,
                v_new_class_id,
                v_class.grade,
                v_class.level,
                v_class.num_students,
                0, -- Rate 0
                'Chưa mở lớp',
                'CN', -- Default to CN (Fixed Class)
                'Chưa nhận xét',
                v_target_date,
                v_class.time, 
                v_pay_rate,
                v_students_json
            );

        END IF; -- End Schedule Check
    END LOOP; -- End Day Loop
  END LOOP; -- End Class Loop
END;
$function$
;
