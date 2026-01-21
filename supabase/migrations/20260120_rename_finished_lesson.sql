-- Rename the column
ALTER TABLE public.classes 
RENAME COLUMN finished_lesson TO num_finished_lessons;

-- Update the function to use the new column name
CREATE OR REPLACE FUNCTION public.update_class_finished_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;
