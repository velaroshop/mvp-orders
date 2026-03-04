-- Migration 059: Extend customers phone column from VARCHAR(10) to VARCHAR(20)
-- Fix: "value too long for type character varying(10)" error when phone numbers
-- include country code prefix (e.g. "40740123456" = 11 digits)

ALTER TABLE customers ALTER COLUMN phone TYPE VARCHAR(20);
