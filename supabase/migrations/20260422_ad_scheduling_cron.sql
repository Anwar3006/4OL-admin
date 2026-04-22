-- Migration: Advertisement Scheduling Cron Job
-- Description: Automatically updates marketing campaign statuses based on start and end dates.
-- Dependency: Requires pg_cron extension to be enabled in Supabase.

-- 1. Create the status update function
CREATE OR REPLACE FUNCTION update_marketing_statuses()
RETURNS void AS $$
BEGIN
    -- Set 'scheduled' campaigns to 'live' if the current time is past or equal to the startDate
    -- Use NOW() to compare values. Since startDate and endDate are strings in the schema, 
    -- we cast them to timestamps.
    
    UPDATE marketing_profile
    SET status = 'live'
    WHERE status = 'scheduled'
      AND startDate::timestamp <= NOW();

    -- Set 'live' campaigns to 'ended' if the current time is past or equal to the endDate
    UPDATE marketing_profile
    SET status = 'ended'
    WHERE status = 'live'
      AND endDate::timestamp <= NOW();
END;
$$ LANGUAGE plpgsql;

-- 2. Schedule the Cron Job (Scheduled to run every 1 minute)
-- NOTE: The pg_cron extension must be enabled.
-- If running this via Supabase SQL Editor:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('update-marketing-profiles-job', '* * * * *', 'SELECT update_marketing_statuses()');

-- For the migration file, we can include the extension check but the cron.schedule might 
-- need manual execution if the cron schema isn't in the search path or initialized yet.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Schedule the job to run every minute
        PERFORM cron.schedule('update-marketing-profiles-job', '* * * * *', 'SELECT update_marketing_statuses()');
    END IF;
END $$;
