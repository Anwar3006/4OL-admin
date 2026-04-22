-- Migration: Synchronized Marketing Campaign Deletion
-- Description: Deletes a marketing profile and its associated storage asset.

CREATE OR REPLACE FUNCTION delete_marketing_campaign(
    campaign_id UUID,
    media_path TEXT,
    storage_bucket TEXT
)
RETURNS VOID AS $$
BEGIN
    -- 1. Delete from marketing_profile
    DELETE FROM public.marketing_profile
    WHERE id = campaign_id;

    -- 2. Delete from storage.objects
    -- This assumes Supabase Storage permissions allow this or it's run with appropriate role.
    -- The media_path in our DB is the filename or relative path within the bucket.
    DELETE FROM storage.objects
    WHERE bucket_id = storage_bucket
      AND name = media_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
