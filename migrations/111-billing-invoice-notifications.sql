-- Migration 111: notification tracking on billing invoices
-- emailed_at: when the invoice email was last sent to the client.
-- overdue_notified_at: when the internal "invoice is overdue" email was sent (once per invoice).

ALTER TABLE billing_invoices
  ADD COLUMN IF NOT EXISTS emailed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;
