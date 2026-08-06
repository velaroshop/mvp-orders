-- Migration 071: Add customer score thresholds to system_settings
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS score_threshold_good INTEGER DEFAULT 25;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS score_threshold_poor INTEGER DEFAULT 50;
