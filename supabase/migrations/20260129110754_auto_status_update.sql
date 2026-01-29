-- 1. Enable pg_cron if not already enabled (Requires Database Superuser or valid privileges)
create extension if not exists pg_cron with schema extensions;

-- 2. Update calculate_record_fields to set rate to 0 for "Đã mở lớp"
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
    WHEN 'Đã mở lớp' THEN v_multiplier := 0; -- NEW: Auto-opened status has 0 rate
    WHEN 'Feedback trễ' THEN v_multiplier := 1;
    ELSE v_multiplier := 1;
  END CASE;

  NEW.rate := v_base_rate * v_multiplier;

  RETURN NEW;
END;
$function$
;

-- 3. Create function to check and update lesson status
CREATE OR REPLACE FUNCTION public.check_lesson_status()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Update records where status is 'Chưa mở lớp' AND current time has passed the lesson start time
  -- Construct timestamp from 'date' and 'time_start'
  UPDATE public.records
  SET status = 'Đã mở lớp'
  WHERE status = 'Chưa mở lớp'
    AND (
      -- Case 1: Date is in the past
      date < CURRENT_DATE
      OR 
      -- Case 2: Date is today AND time is passed
      (
        date = CURRENT_DATE 
        AND time_start IS NOT NULL 
        AND time_start != ''
        AND (
             -- Handle time format flexibility, though usually expected as HH:MM
             -- We attempt to cast or ensure it is comparable.
             -- Assuming time_start is text 'HH:MM'.
             -- We compare with current time in timezone 'Asia/Ho_Chi_Minh' (UTC+7) or just local/server time.
             -- Supabase `now()` is UTC. We need to be careful with timezones.
             -- The user said: "if a lesson start time is 21:00 29-01-2026, and current time is 21:12 29-11-2026..."
             -- This implies the stored date/time are essentially "Local Time" (Vietnam Time).
             -- So we should compare against Vietnam Time (UTC+7).
             
             (date || ' ' || time_start)::timestamp without time zone < (now() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::timestamp without time zone
        )
      )
    );
END;
$function$
;

-- 4. Schedule the job (Run every 10 minutes)
-- We use DO block to avoid error if job already exists or if pg_cron not available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule if exists to avoid duplicates
    -- Check if job exists first to avoid error on unschedule
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-update-lesson-status') THEN
        PERFORM cron.unschedule('auto-update-lesson-status');
    END IF;
    
    -- Schedule
    PERFORM cron.schedule(
      'auto-update-lesson-status', -- Job name
      '*/10 * * * *',              -- Cron schedule (every 10 minutes)
      'SELECT public.check_lesson_status()' -- Command
    );
  END IF;
END
$$;
