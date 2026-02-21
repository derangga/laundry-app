CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('received', 'in_progress', 'ready', 'delivered')) DEFAULT 'received',
    payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('paid', 'unpaid')) DEFAULT 'unpaid',
    total_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_order_number ON orders(order_number);
