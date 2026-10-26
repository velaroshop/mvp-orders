-- WhatsApp order confirmation (Twilio). Additive only: new nullable/defaulted columns.

-- Master switch per organization (UI shown only to superadmin org)
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS whatsapp_confirmation_enabled BOOLEAN NOT NULL DEFAULT false;

-- Per landing page switch
ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS whatsapp_confirmation_enabled BOOLEAN NOT NULL DEFAULT false;

-- Per order delivery + confirmation state
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS whatsapp_message_sid TEXT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_sent_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_confirmed_at TIMESTAMPTZ NULL;

-- Webhook looks up the order by the Twilio message SID
CREATE INDEX IF NOT EXISTS idx_orders_whatsapp_message_sid
  ON orders (whatsapp_message_sid)
  WHERE whatsapp_message_sid IS NOT NULL;
