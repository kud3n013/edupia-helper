`-- Function to delete old records for the same class and user before inserting a new one
CREATE OR REPLACE FUNCTION delete_old_records_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete any existing records for the same class_id and user_id
  -- This ensures that we only have the latest feedback for a given class
  DELETE FROM public.records
  WHERE class_id = NEW.class_id
    AND user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid conflicts during development/re-runs
DROP TRIGGER IF EXISTS trigger_delete_old_records ON public.records;

-- Create the trigger
CREATE TRIGGER trigger_delete_old_records
BEFORE INSERT ON public.records
FOR EACH ROW
EXECUTE FUNCTION delete_old_records_before_insert();
`