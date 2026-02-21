-- Migration: Enable UUID v7 Support
-- PostgreSQL 18 has native uuidv7() function
-- This migration verifies the function is available

-- Verify uuidv7() function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'uuidv7'
  ) THEN
    RAISE EXCEPTION 'uuidv7() function not available. PostgreSQL 18+ is required.';
  END IF;
END $$;

-- Test UUID v7 generation
SELECT uuidv7() AS test_uuid_v7;
