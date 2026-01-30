CREATE OR REPLACE FUNCTION public.sync_lesson_students()
 RETURNS trigger
 LANGUAGE plpgsql
 AS $function$
 DECLARE
   v_fixed_class_id text;
   v_class_record record;
   v_students_json jsonb;
   v_criteria_list text[] := ARRAY['Từ vựng', 'Ngữ pháp', 'Ngữ âm', 'Đọc hiểu', 'Nghe hiểu', 'Phản xạ', 'Phát âm'];
   v_student_name text;
   v_idx int;
   v_student_obj jsonb;
 BEGIN
    -- Only proceed if class_id has changed (and is not null)
   IF (NEW.class_id IS DISTINCT FROM OLD.class_id) AND (NEW.class_id IS NOT NULL AND NEW.class_id <> '') THEN
     
     -- 1. Extract Fixed Class ID (Relaxed Logic)
     -- Try hyphen pattern first: ID-Suffix
     v_fixed_class_id := substring(NEW.class_id FROM '^(.*)-.+$');
     
     -- If no hyphen, look for exact match or use whole string as fallback
     IF v_fixed_class_id IS NULL THEN
        v_fixed_class_id := NEW.class_id;
     END IF;

     -- 2. Fetch Class Data
     SELECT * INTO v_class_record
     FROM public.classes
     WHERE fixed_class_id ILIKE v_fixed_class_id
       AND user_id = NEW.user_id
     LIMIT 1;

     -- 3. If Class Found, Populate Students
     IF FOUND THEN
        v_students_json := '[]'::jsonb;
        
        -- Iterate through the names in the class record
        -- Assuming v_class_record.students is a JSONB array of strings ["Name 1", "Name 2"]
        IF jsonb_typeof(v_class_record.students) = 'array' THEN
           v_idx := 0;
           FOR v_student_name IN SELECT * FROM jsonb_array_elements_text(v_class_record.students)
           LOOP
              -- Construct Student Object
              v_student_obj := jsonb_build_object(
                 'id', v_idx,
                 'name', v_student_name,
                 'attitudes', '[]'::jsonb,
                 'isAbsent', false
              );
              
              v_students_json := v_students_json || v_student_obj;
              v_idx := v_idx + 1;
           END LOOP;
        END IF;

        -- Update NEW record
        -- Only update if we actually generated students, otherwise keep existing (or empty)
        IF jsonb_array_length(v_students_json) > 0 THEN
            NEW.students := v_students_json;
            NEW.student_count := jsonb_array_length(v_students_json);
        ELSE
             -- Fallback if class exists but has no students? 
             -- Maybe set to num_students if available?
             NEW.student_count := COALESCE(v_class_record.num_students, 4);
             -- We don't overwrite students if empty, effectively clearing it? 
             -- Let's say we clear it to match the class.
             NEW.students := '[]'::jsonb; 
        END IF;

     END IF;
   END IF;
   
   RETURN NEW;
 END;
 $function$;
