set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.finished(cls public.classes)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM public.records r
    WHERE r.user_id = cls.user_id
    -- Match class_id pattern: [fixed_class_id]-[2 digits]
    AND r.class_id ~ ('^' || regexp_replace(cls.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d{2}$')
  );
END;
$function$
;

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
                 'name', v_student_name
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
 $function$
;

CREATE OR REPLACE FUNCTION public.update_class_finished_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    _user_id uuid;
    _class_id_str text;
BEGIN
    -- Handle DELETE (use OLD)
    IF (TG_OP = 'DELETE') THEN
        _user_id := OLD.user_id;
        _class_id_str := OLD.class_id;
        
        -- Update the class(es) that this record belonged to
        UPDATE public.classes c
        SET num_finished_lessons = (
            SELECT COUNT(*)::integer
            FROM public.records r
            WHERE r.user_id = c.user_id
            AND r.class_id ~ ('^' || regexp_replace(c.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d+$')
        )
        WHERE c.user_id = _user_id
        AND _class_id_str LIKE (c.fixed_class_id || '-%');
    END IF;

    -- Handle INSERT (use NEW)
    IF (TG_OP = 'INSERT') THEN
        _user_id := NEW.user_id;
        _class_id_str := NEW.class_id;

        -- Update the class(es) that this record belongs to
        UPDATE public.classes c
        SET num_finished_lessons = (
            SELECT COUNT(*)::integer
            FROM public.records r
            WHERE r.user_id = c.user_id
            AND r.class_id ~ ('^' || regexp_replace(c.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d+$')
        )
        WHERE c.user_id = _user_id
        AND _class_id_str LIKE (c.fixed_class_id || '-%');
    END IF;

    -- Handle UPDATE (OLD and NEW could be different)
    IF (TG_OP = 'UPDATE') THEN
        -- 1. Handle OLD (if class_id or user_id changed)
        IF (OLD.class_id <> NEW.class_id OR OLD.user_id <> NEW.user_id) THEN
             _user_id := OLD.user_id;
            _class_id_str := OLD.class_id;
            
            UPDATE public.classes c
            SET num_finished_lessons = (
                SELECT COUNT(*)::integer
                FROM public.records r
                WHERE r.user_id = c.user_id
                AND r.class_id ~ ('^' || regexp_replace(c.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d+$')
            )
            WHERE c.user_id = _user_id
            AND _class_id_str LIKE (c.fixed_class_id || '-%');
        END IF;

        -- 2. Handle NEW
        _user_id := NEW.user_id;
        _class_id_str := NEW.class_id;

        UPDATE public.classes c
        SET num_finished_lessons = (
            SELECT COUNT(*)::integer
            FROM public.records r
            WHERE r.user_id = c.user_id
            AND r.class_id ~ ('^' || regexp_replace(c.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d+$')
        )
        WHERE c.user_id = _user_id
        AND _class_id_str LIKE (c.fixed_class_id || '-%');
    END IF;

    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_finished_lessons_on_record_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _class_id_str TEXT;
    _potential_fixed_id TEXT;
    _class_row_id UUID;
    _user_id UUID;
BEGIN
    -- Determine the operation and relevant record data
    IF (TG_OP = 'DELETE') THEN
        _class_id_str := OLD.class_id;
        _user_id := OLD.user_id;
    ELSE
        _class_id_str := NEW.class_id;
        _user_id := NEW.user_id;
    END IF;

    -- Extract Fixed Class ID (prefix). We split by the LAST hyphen.
    -- E.g., "R4.3C.01-10" -> "R4.3C.01"
    IF _class_id_str LIKE '%-%' THEN
        _potential_fixed_id := left(_class_id_str, length(_class_id_str) - position('-' in reverse(_class_id_str)));
    ELSE
        -- If no hyphen, we can't determine fixed_id from this logic, possibly return or ignore.
        -- Use the whole string as fallback or just return if it doesn't match pattern.
         RETURN NULL;
    END IF;

    -- Find ANY classes that match this fixed_class_id (could be multiple if user has dupes, but usually distinct)
    -- We assume one active class per fixed_id for the user.
    FOR _class_row_id IN 
        SELECT id FROM public.classes 
        WHERE fixed_class_id = _potential_fixed_id 
          AND user_id = _user_id
    LOOP
        -- Re-calculate finished lessons for this specific class
        -- We select 'lesson_name' (suffix) from records that:
        -- 1. Belong to this user
        -- 2. Have a class_id starting with 'fixed_id-'
        -- 3. Are marked 'Hoàn thành'
        WITH relevant_records AS (
            SELECT class_id
            FROM public.records
            WHERE user_id = _user_id
              AND class_id LIKE (_potential_fixed_id || '-%')
              AND status = 'Hoàn thành'
        ),
        lessons AS (
            SELECT right(class_id, position('-' in reverse(class_id)) - 1) as lesson_name
            FROM relevant_records
        )
        -- Update the specific class row
        UPDATE public.classes
        SET finished_lessons = ARRAY(SELECT lesson_name FROM lessons ORDER BY lesson_name)
        WHERE id = _class_row_id;
    END LOOP;

    RETURN NULL;
END;
$function$
;


