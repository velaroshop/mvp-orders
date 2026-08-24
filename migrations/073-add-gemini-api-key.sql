-- Migration 073: Add Google Gemini API key to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
