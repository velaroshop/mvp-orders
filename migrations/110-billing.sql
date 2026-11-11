-- Migration 110: billing of organizations (superadmin only)
-- org_billing: invoicing data + subscription settings, one row per organization.
-- billing_invoices: invoices issued to organizations (manual records for now; SmartBill later).
-- Nothing is invoiced automatically: billing_enabled defaults to false for every organization.
-- An invoice is overdue when status = 'issued' and due_date < today (computed when read, not stored).

CREATE TABLE IF NOT EXISTS org_billing (
  organization_id  UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,

  -- Invoicing data (the company we invoice)
  company_name     TEXT,
  cui              TEXT,
  is_vat_payer     BOOLEAN NOT NULL DEFAULT false,
  address          TEXT,
  city             TEXT,
  county           TEXT,
  postal_code      TEXT,
  billing_email    TEXT,
  contact_name     TEXT,
  contact_phone    TEXT,

  -- Subscription
  invoice_plan     TEXT NOT NULL DEFAULT 'pro' CHECK (invoice_plan IN ('pro', 'ultra')), -- informative only, printed on the invoice
  monthly_price    NUMERIC(10, 2),
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  vat_rate         NUMERIC(5, 2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'RON',

  -- Billing schedule
  billing_enabled  BOOLEAN NOT NULL DEFAULT false,
  billing_mode     TEXT NOT NULL DEFAULT 'manual' CHECK (billing_mode IN ('manual', 'auto')),
  billing_timing   TEXT NOT NULL DEFAULT 'end' CHECK (billing_timing IN ('end', 'start')),  -- end = invoice after the period (post-paid)
  billing_start_date DATE,          -- start of the first period; NULL = organization creation date
  billing_day      INTEGER CHECK (billing_day IS NULL OR (billing_day >= 0 AND billing_day <= 28)), -- NULL = day before the start day, 0 = last day of month
  free_until       DATE,            -- no invoice for periods ending on or before this date
  paused           BOOLEAN NOT NULL DEFAULT false,
  notes            TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  series           TEXT,
  number           TEXT,
  period_start     DATE,
  period_end       DATE,
  amount           NUMERIC(10, 2) NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'RON',
  issued_at        DATE NOT NULL,
  due_date         DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'cancelled')),
  paid_at          DATE,
  paid_method      TEXT,
  source           TEXT NOT NULL DEFAULT 'manual',  -- 'manual' or 'smartbill'
  external_id      TEXT,                            -- id of the invoice in the invoicing app
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_org ON billing_invoices(organization_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_open ON billing_invoices(due_date) WHERE status = 'issued';

-- One invoice per organization and period (cancelled ones do not count)
CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_invoices_period
  ON billing_invoices(organization_id, period_start)
  WHERE status <> 'cancelled' AND period_start IS NOT NULL;

-- Access only through the server (service role), like the other superadmin data
ALTER TABLE org_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_billing TO service_role;
GRANT SELECT ON public.org_billing TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_invoices TO service_role;
GRANT SELECT ON public.billing_invoices TO authenticated;
