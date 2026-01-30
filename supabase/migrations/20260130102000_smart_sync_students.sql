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
   v_student_item jsonb;
   v_student_obj jsonb;
   v_roster_names text[];
   v_processed_names text[];
 BEGIN
    -- Only proceed if class_id has changed (and is not null)
   IF (NEW.class_id IS DISTINCT FROM OLD.class_id) AND (NEW.class_id IS NOT NULL AND NEW.class_id <> '') THEN
     
     -- 1. Extract Fixed Class ID (Relaxed Logic)
     v_fixed_class_id := substring(NEW.class_id FROM '^(.*)-.+$');
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
        v_processed_names := ARRAY[]::text[];
        v_roster_names := ARRAY[]::text[];
        v_idx := 0;

        -- Extract roster names for easy lookup
        IF jsonb_typeof(v_class_record.students) = 'array' THEN
            SELECT array_agg(value) INTO v_roster_names
            FROM jsonb_array_elements_text(v_class_record.students);
        END IF;

        -- A. Process Incoming Payload (Preserve User's Data & Order)
        -- We only keep students that are actually in the class roster (syncing)
        IF jsonb_typeof(NEW.students) = 'array' THEN
           FOR v_student_item IN SELECT * FROM jsonb_array_elements(NEW.students)
           LOOP
              v_student_name := v_student_item->>'name';
              
              -- Check if this student is in the official roster
              IF v_student_name = ANY(v_roster_names) THEN
                  -- Update ID to match new sequential order
                  v_student_item := jsonb_set(v_student_item, '{id}', to_jsonb(v_idx));
                  
                  v_students_json := v_students_json || v_student_item;
                  v_processed_names := array_append(v_processed_names, v_student_name);
                  v_idx := v_idx + 1;
              END IF;
           END LOOP;
        END IF;

        -- B. Append Missing Roster Students (New members or fresh class)
        IF array_length(v_roster_names, 1) > 0 THEN
            FOREACH v_student_name IN ARRAY v_roster_names
            LOOP
                -- If not already processed (added via payload)
                IF NOT (v_student_name = ANY(v_processed_names)) OR v_processed_names IS NULL THEN
                    v_student_obj := jsonb_build_object(
                        'id', v_idx,
                        'name', v_student_name,
                        'attitudes', '[]'::jsonb,
                        'isAbsent', false
                        -- Scores are omitted, let UI handle default
                    );
                    v_students_json := v_students_json || v_student_obj;
                    v_idx := v_idx + 1;
                END IF;
            END LOOP;
        END IF;

        -- Update NEW record
        IF jsonb_array_length(v_students_json) > 0 THEN
            NEW.students := v_students_json;
            NEW.student_count := jsonb_array_length(v_students_json);
        ELSE
             NEW.student_count := COALESCE(v_class_record.num_students, 4);
             NEW.students := '[]'::jsonb; 
        END IF;

     END IF;
   END IF;
   
   RETURN NEW;
 END;
 $function$;
