-- 1. Add column to classes table
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS finished_lesson INTEGER DEFAULT 0;

-- 2. Create function to recalculate finished_lesson for a specific class (or classes)
-- This function will be called by the trigger.
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
        SET finished_lesson = (
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
        SET finished_lesson = (
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
            SET finished_lesson = (
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
        SET finished_lesson = (
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

-- 3. Create Trigger
DROP TRIGGER IF EXISTS trigger_update_finished_lesson ON public.records;

CREATE TRIGGER trigger_update_finished_lesson
AFTER INSERT OR UPDATE OR DELETE ON public.records
FOR EACH ROW
EXECUTE FUNCTION public.update_class_finished_count();

-- 4. Backfill existing data
UPDATE public.classes c
SET finished_lesson = (
    SELECT COUNT(*)::integer
    FROM public.records r
    WHERE r.user_id = c.user_id
    AND r.class_id ~ ('^' || regexp_replace(c.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d+$')
);
