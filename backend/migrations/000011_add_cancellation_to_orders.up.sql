ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN ('received', 'in_progress', 'ready', 'delivered', 'cancelled'));

ALTER TABLE orders DROP CONSTRAINT orders_payment_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('paid', 'unpaid', 'refunded'));

ALTER TABLE orders
    ADD COLUMN cancelled_at TIMESTAMPTZ NULL,
    ADD COLUMN cancelled_by UUID NULL REFERENCES users(id),
    ADD COLUMN cancellation_reason TEXT NULL;

CREATE INDEX idx_orders_cancelled_at ON orders(cancelled_at);
