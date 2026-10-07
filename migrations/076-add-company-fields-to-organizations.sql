-- Migration 076: Adaugă CUI și adresă sediu la tabela organizations
-- Necesare pentru colectarea datelor firmei la înregistrare.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS cui     TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;
