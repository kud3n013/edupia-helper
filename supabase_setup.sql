-- 1. Add 'finished_lessons' column to 'classes' table
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS finished_lessons TEXT[] DEFAULT '{}';

-- 2. Create the function to calculate finished lessons
CREATE OR REPLACE FUNCTION public.update_finished_lessons_on_record_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger on 'records' table
DROP TRIGGER IF EXISTS on_record_change_update_class_lessons ON public.records;

CREATE TRIGGER on_record_change_update_class_lessons
AFTER INSERT OR UPDATE OR DELETE ON public.records
FOR EACH ROW EXECUTE FUNCTION public.update_finished_lessons_on_record_change();

-- 4. Backfill existing data
DO $$
DECLARE
    c RECORD;
BEGIN
    FOR c IN SELECT * FROM public.classes LOOP
        -- For each class, simulate the calculation
        WITH relevant_records AS (
            SELECT class_id
            FROM public.records
            WHERE user_id = c.user_id
              AND class_id LIKE (c.fixed_class_id || '-%')
              AND status = 'Hoàn thành'
        ),
        lessons AS (
            SELECT right(class_id, position('-' in reverse(class_id)) - 1) as lesson_name
            FROM relevant_records
        )
        UPDATE public.classes
        SET finished_lessons = ARRAY(SELECT lesson_name FROM lessons ORDER BY lesson_name)
        WHERE id = c.id;
    END LOOP;
END $$;
