-- Migration 072: Add default offer selection to landing pages
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS default_offer TEXT DEFAULT 'offer_1';
