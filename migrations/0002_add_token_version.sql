-- Add a version column to track session validity
ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1;