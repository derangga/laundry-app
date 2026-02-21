CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    unit_type VARCHAR(10) NOT NULL CHECK (unit_type IN ('kg', 'set')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_is_active ON services(is_active);
