DROP INDEX IF EXISTS idx_services_deleted_at;
ALTER TABLE services DROP COLUMN IF EXISTS deleted_at;
