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
            AND r.status = 'Hoàn thành'
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
            AND r.status = 'Hoàn thành'
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
                AND r.status = 'Hoàn thành'
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
            AND r.status = 'Hoàn thành'
            AND r.class_id ~ ('^' || regexp_replace(c.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d+$')
        )
        WHERE c.user_id = _user_id
        AND _class_id_str LIKE (c.fixed_class_id || '-%');
    END IF;

    RETURN NULL;
END;
$function$
;

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
    AND r.status = 'Hoàn thành'
    -- Match class_id pattern: [fixed_class_id]-[2 digits]
    AND r.class_id ~ ('^' || regexp_replace(cls.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d{2}$')
  );
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
        RETURN NULL;
    END IF;

    -- Find ANY classes that match this fixed_class_id
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
