-- Migration 070: Create Refund Module
-- Creates refund_requests table and adds refund settings columns to settings table

-- 1. Create refund_requests table
CREATE TABLE IF NOT EXISTS refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  order_number TEXT,
  product_name TEXT NOT NULL,
  motive TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_refund_requests_org_id ON refund_requests(organization_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(organization_id, status);
CREATE INDEX idx_refund_requests_created_at ON refund_requests(organization_id, created_at DESC);
CREATE UNIQUE INDEX idx_refund_requests_ticket ON refund_requests(organization_id, ticket_number);

-- 2. Add refund settings columns to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS resend_api_key TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_notification_email TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_from_email TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_from_name TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_ticket_prefix TEXT DEFAULT 'RET';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_ticket_counter INTEGER DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_form_title TEXT DEFAULT 'Formular Returnare Produs';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_form_subtitle TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_motives TEXT[] DEFAULT ARRAY['Produs defect', 'Produs gresit livrat', 'Nu corespunde descrierii', 'M-am razgandit']::TEXT[];
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_terms_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_primary_color TEXT DEFAULT '#000000';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_logo_url TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_email_client_subject TEXT DEFAULT 'Cererea ta de returnare a fost inregistrata';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_email_client_body TEXT DEFAULT 'Buna ziua {{full_name}},

Cererea ta de returnare a fost inregistrata cu succes.

Numar tichet: {{ticket_number}}
Produs: {{product_name}}
Motiv: {{motive}}

Te vom contacta in cel mai scurt timp cu informatii suplimentare.

Cu stima,
{{from_name}}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_email_admin_subject TEXT DEFAULT 'Cerere noua de returnare - {{full_name}}';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS refund_email_admin_body TEXT DEFAULT 'O noua cerere de returnare a fost primita:

Tichet: {{ticket_number}}
Nume: {{full_name}}
Email: {{email}}
Telefon: {{phone}}
Numar comanda: {{order_number}}
Produs: {{product_name}}
Motiv: {{motive}}
Descriere: {{description}}

Data: {{created_at}}';

-- 3. Enable RLS on refund_requests
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies (service role bypasses, these are for anon/authenticated)
CREATE POLICY "refund_requests_select" ON refund_requests
  FOR SELECT USING (true);

CREATE POLICY "refund_requests_insert" ON refund_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "refund_requests_update" ON refund_requests
  FOR UPDATE USING (true);

-- 4. Grant permissions to authenticated and anon roles
GRANT SELECT, INSERT ON refund_requests TO authenticated;
GRANT SELECT, INSERT ON refund_requests TO anon;
GRANT UPDATE ON refund_requests TO authenticated;
