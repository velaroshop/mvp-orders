-- Migration 075: Tabelă pentru dovada acceptării Termenilor și Condițiilor
-- Stochează o înregistrare imuabilă la fiecare acceptare.
-- Nu marchează retroactiv conturile existente.

CREATE TABLE IF NOT EXISTS terms_acceptance (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id             UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Versiunea termenilor acceptați (stabilită server-side, nu de browser)
  terms_version               TEXT NOT NULL,
  -- SHA-256 al conținutului integral al termenilor la momentul acceptării
  terms_content_hash          TEXT NOT NULL,

  -- Momentul acceptării, stocat în UTC
  accepted_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Confirmarea că utilizatorul era autorizat să reprezinte firma
  is_authorized_representative BOOLEAN NOT NULL DEFAULT TRUE,

  -- Snapshot al datelor la momentul acceptării (pentru audit)
  user_email                  TEXT NOT NULL,
  user_name                   TEXT,
  organization_name           TEXT,
  organization_cui            TEXT
);

-- Indexuri pentru interogări de audit
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_user ON terms_acceptance(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_org  ON terms_acceptance(organization_id);
CREATE INDEX IF NOT EXISTS idx_terms_acceptance_ver  ON terms_acceptance(terms_version);

-- GRANTs pentru service role
GRANT SELECT, INSERT ON terms_acceptance TO service_role;

-- RLS: activat fără politici publice (acces exclusiv prin service_role)
ALTER TABLE terms_acceptance ENABLE ROW LEVEL SECURITY;
