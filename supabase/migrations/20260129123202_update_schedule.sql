-- 1. Update Schedule to Hourly
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule old
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-upcoming-lessons') THEN
        PERFORM cron.unschedule('generate-upcoming-lessons');
    END IF;

    -- Schedule (Every Hour)
    PERFORM cron.schedule(
      'generate-upcoming-lessons',
      '0 * * * *', 
      'SELECT public.generate_upcoming_lessons()'
    );
  END IF;
END
$$;

-- 2. Force Immediate Run (so user sees data now)
SELECT public.generate_upcoming_lessons();
