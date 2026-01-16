-- Function to calculate finished lessons for a class
-- This acts as a computed column 'finished' for the 'classes' table
CREATE OR REPLACE FUNCTION public.finished(cls public.classes)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM public.records r
    WHERE r.user_id = cls.user_id
    -- Match class_id pattern: [fixed_class_id]-[2 digits]
    -- We escape special regex characters in fixed_class_id just in case (though simple IDs are fine)
    -- Using simple concatenation for the pattern
    AND r.class_id ~ ('^' || regexp_replace(cls.fixed_class_id, '([.()\[\]\\])', '\\\1', 'g') || '-\d{2}$')
  );
END;
$$ LANGUAGE plpgsql STABLE;
