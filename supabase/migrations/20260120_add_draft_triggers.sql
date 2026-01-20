-- 1. Function to clean up draft after record save
CREATE OR REPLACE FUNCTION public.handle_record_change_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the draft (session log) for the user who owns the record
  DELETE FROM public.lessons
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger on INSERT or UPDATE of public.records
DROP TRIGGER IF EXISTS on_record_save_cleanup_draft ON public.records;
CREATE TRIGGER on_record_save_cleanup_draft
AFTER INSERT OR UPDATE ON public.records
FOR EACH ROW
EXECUTE FUNCTION public.handle_record_change_cleanup();


-- 3. Function (RPC) to load a record into the draft (lessons) table
-- This is used when the user confirms "Load Old Feedback"
CREATE OR REPLACE FUNCTION public.load_record_to_draft(p_record_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_record public.records%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  
  -- Get the record
  SELECT * INTO v_record FROM public.records WHERE id = p_record_id;
  
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Record not found';
  END IF;
  
  -- Security check: Ensure record belongs to user
  IF v_record.user_id != v_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Delete existing draft
  DELETE FROM public.lessons WHERE user_id = v_user_id;

  -- Insert new draft from record data
  -- Mapping columns explicitly to ensure safety
  INSERT INTO public.lessons (
    user_id,
    class_id,
    grade,
    level,
    lesson_content,
    atmosphere_checked,
    atmosphere_value,
    progress_checked,
    progress_value,
    student_count,
    -- school_level: Not in records, inferred later or null
    -- knowledge_mode: Not in records
    -- attitude_mode: Not in records
    -- included_criteria: Not in records
    -- included_attitude_categories: Not in records
    students,
    session_number,
    reminders,
    updated_at
  ) VALUES (
    v_user_id,
    v_record.class_id,
    v_record.grade,
    v_record.level,
    v_record.lesson_content,
    v_record.atmosphere_checked,
    v_record.atmosphere_value,
    v_record.progress_checked,
    v_record.progress_value,
    v_record.student_count,
    v_record.students,
    v_record.session_number,
    v_record.reminders,
    NOW()
  );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
