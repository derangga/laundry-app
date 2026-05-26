ALTER TABLE services ADD COLUMN deleted_at TIMESTAMPTZ NULL;
CREATE INDEX idx_services_deleted_at ON services(deleted_at);
