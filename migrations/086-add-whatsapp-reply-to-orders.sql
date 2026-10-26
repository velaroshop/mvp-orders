-- Free-text WhatsApp replies from the customer (shown to operators). Additive only.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS whatsapp_reply TEXT NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_reply_at TIMESTAMPTZ NULL;
