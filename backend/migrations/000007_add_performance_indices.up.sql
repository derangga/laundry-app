-- Migration: Add Performance Indices
-- Purpose: Improve query performance for common operations

-- Customers table indices
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- Orders table indices
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Order items table indices
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Refresh tokens table indices
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
