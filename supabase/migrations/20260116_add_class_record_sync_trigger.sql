-- Trigger to update record types when a new class is inserted
-- Goal: When a class is added (e.g., fixed_class_id = 'C2.34'), find all records
-- where class_id matches the pattern 'C2.34-%' (e.g. 'C2.34-1') and set class_type = 'CN'.

CREATE OR REPLACE FUNCTION public.update_record_type_on_class_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Update existing records belonging to the same user
    -- matching the pattern [fixed_class_id]-[number]
    -- We use LIKE with '-%' to match the hyphen and suffix logic.
    UPDATE public.records
    SET class_type = 'CN'
    WHERE user_id = NEW.user_id 
      AND class_type = 'BU' -- Only update if it's currently 'BU' (default)
      AND class_id LIKE NEW.fixed_class_id || '-%';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow re-running migration
DROP TRIGGER IF EXISTS trigger_update_record_type_on_class_insert ON public.classes;

-- Create the trigger
CREATE TRIGGER trigger_update_record_type_on_class_insert
AFTER INSERT ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.update_record_type_on_class_insert();
