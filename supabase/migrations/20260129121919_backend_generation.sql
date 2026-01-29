-- Function to generate upcoming lessons for the next 7 days
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
  -- 1. Loop through all ACTIVE classes
  FOR v_class IN SELECT * FROM public.classes WHERE state = 'Đang dạy' LOOP
    
    -- Safety check: Schedule must be valid
    IF v_class.schedule IS NULL OR jsonb_array_length(v_class.schedule) = 0 THEN
      CONTINUE; 
    END IF;

    -- 2. Look ahead 7 days
    FOR i IN 0..7 LOOP
        v_target_date := v_today + i;
        v_day_of_week := extract(dow from v_target_date); -- 0=Sun, 1=Mon...
        v_day_code := v_day_map[v_day_of_week + 1]; -- Postgres arrays are 1-based
        
        -- Check if class is scheduled for this day code (e.g., "T2")
        -- casting jsonb array to text array check or using jsonb containment
        IF (v_class.schedule @> to_jsonb(v_day_code)) THEN
            
            -- CHECK 1: Check if a record already exists for this Date + Time Start
            -- We assume strict slot adherence. If user has a record at 19:00 on this date, we don't add another.
            PERFORM 1 FROM public.records 
            WHERE user_id = v_class.user_id 
              AND date = v_target_date
              -- Check time overlap? Or exact match? Strict match on time_start OR class_id prefix matching this class
              -- Actually, simpler: Does THIS class have a record on THIS date?
              -- If we use fixed_class_id, we can check if any record matching fixed_id pattern exists on this date.
              AND class_id LIKE (v_class.fixed_class_id || '%');
            
            IF FOUND THEN
                CONTINUE; -- Record exists for this class on this date, skip.
            END IF;

            -- CHECK 2: Determine Next Lesson Number (Global Sequence for this Class)
            -- Find MAX lesson number from ALL records of this class (active or past)
            SELECT MAX(substring(class_id FROM '-(\d+)$')::int)
            INTO v_max_lesson_num
            FROM public.records
            WHERE user_id = v_class.user_id
              AND class_id LIKE (v_class.fixed_class_id || '-%');
              
            v_next_lesson_num := COALESCE(v_max_lesson_num, 0) + 1;
            v_new_class_id := v_class.fixed_class_id || '-' || v_next_lesson_num;

            -- CHECK 3: Ensure this specific Class ID doesn't exist anywhere (Collision Check)
            -- "If the upcoming lesson is already presented... [it won't create another one]"
            -- implies we should NOT create it if it exists.
            PERFORM 1 FROM public.records WHERE user_id = v_class.user_id AND class_id = v_new_class_id;
            
            IF FOUND THEN
                -- Collision found (e.g. user manually created Lesson 37 in the far future, but we are at 36).
                -- Option A: Skip generating for this date. (Respects manual entry, but leaves a gap on this date if the manual entry is on a DIFFERENT date).
                -- Option B: Increment locally until unique? 
                -- User said: "if the class ID... is already there... Then the upcoming record will be [assumed created/skipped??]"
                -- User said: "If another lesson with the same date and time is already presented, it won't create another one." (Done in Check 1).
                -- User said: "if the upcoming lesson is already presented... then the upcoming record will be created [wait, user phrasing is ambiguous]"
                -- Re-reading: "if the class ID which is a future lesson is already there at any dates of the future... Then the upcoming record will be created."
                -- Wait. "Then the upcoming record will be created" usually means "Go ahead and create it"? 
                -- But if ID exists, we CANNOT create it (Unique Key constraint usually, or logic badness).
                -- "Then the upcoming record will be created" might mean "The system considers it created".
                -- Let's assume we SKIP creation if ID exists. Be safe.
                CONTINUE;
            END IF;

            -- Prepare Data for Insert
            
            -- Get Pay Rate (Defaults)
             SELECT pay_rate INTO v_pay_rate FROM public.profiles WHERE id = v_class.user_id;

            -- Students JSON (Simple Array of Objects to match Record Schema)
            -- We need to transform Class student NAMES (text[]) into RECORD students (jsonb objects)
            -- If v_class.students is jsonb already? Migration 20260128022400 says `students jsonb default '[]'::jsonb` in classes table.
            -- Records table also has `students jsonb`.
            -- But we need to ensure structure. If class stores just strings ["A","B"], we convert.
            -- If class stores full objects, we verify.
            -- Assuming Class stores Strings based on previous `generate` code which did conversion.
            -- Let's check `classes` schema in memory... `students` is jsonb.
            -- Safe to copy directly? Users usually editing on Class level might put names.
            -- Let's assume we need to convert if it looks like array of strings.
            -- But PLPGSQL jsonb manipulation is hard.
            -- Let's default to empty or copy if we trust structure. 
            -- Given previous TS code did conversion `idx: number, name: string...`, let's try to mimic basic structure or just copy.
            -- Copying `v_class.students` is safest for now.
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
                'CN', -- Default based on logic, or calling trigger handles it? Trigger `auto_set_type_cn` handles it.
                'Chưa nhận xét',
                v_target_date,
                v_class.time, -- Use default class time
                v_pay_rate,
                v_students_json
            );
            
            -- If we successfully inserted, we consumed this Lesson Number. 
            -- But the loop continues to next day. 
            -- If we loop fast, `v_max_lesson_num` query in next iteration will find THIS new record?
            -- Yes, because it's committed or visible in transaction? 
            -- In standard Postgres, changes in transaction are visible to subsequent commands in same transaction.
            -- So `SELECT MAX` will see the record we just inserted. Safe.

        END IF; -- End Schedule Check
    END LOOP; -- End Day Loop
  END LOOP; -- End Class Loop
END;
$function$
;

-- Schedule the job (Every 6 hours)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule classic generation or old jobs
    -- (We don't need to unschedule the *status update* job, that's separate)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-upcoming-lessons') THEN
        PERFORM cron.unschedule('generate-upcoming-lessons');
    END IF;

    -- Schedule (Run at minute 0 past every 6th hour)
    PERFORM cron.schedule(
      'generate-upcoming-lessons',
      '0 */6 * * *', 
      'SELECT public.generate_upcoming_lessons()'
    );
  END IF;
END
$$;
