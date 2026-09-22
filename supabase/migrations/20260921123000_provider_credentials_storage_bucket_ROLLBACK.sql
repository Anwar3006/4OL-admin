-- Rollback for 20260921123000_provider_credentials_storage_bucket.sql
delete from storage.buckets where id = 'provider-credentials';
