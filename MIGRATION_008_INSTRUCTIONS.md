# Migration 008: Product SKUs for Helpship Integration

## What This Does

Adds SKU fields for each offer (offer_1, offer_2, offer_3) to the `landing_pages` table. These SKUs are sent to Helpship when creating orders, allowing proper inventory tracking.

## How It Works

When a customer selects an offer and places an order:
1. The system identifies which offer was selected (offer_1, offer_2, or offer_3)
2. It retrieves the corresponding SKU from the landing page (sku_offer_1, sku_offer_2, or sku_offer_3)
3. This SKU is sent to Helpship in the `orderLines[].externalSku` field
4. Helpship can then properly track inventory for the specific product variant

## Apply Migration

1. Go to Supabase SQL Editor: https://bgstbrpxpncrnxchijzs.supabase.co
2. Click "SQL Editor" → "New Query"
3. Copy and paste:

```sql
-- Add SKU fields for each offer to landing_pages table
-- These SKUs will be sent to Helpship when creating orders

ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS sku_offer_1 TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS sku_offer_2 TEXT;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS sku_offer_3 TEXT;

COMMENT ON COLUMN landing_pages.sku_offer_1 IS 'SKU for offer 1 (to be sent to Helpship)';
COMMENT ON COLUMN landing_pages.sku_offer_2 IS 'SKU for offer 2 (to be sent to Helpship)';
COMMENT ON COLUMN landing_pages.sku_offer_3 IS 'SKU for offer 3 (to be sent to Helpship)';
```

4. Click "Run" or press Ctrl+Enter

## Configure SKUs for Landing Pages

After applying the migration, update your landing pages with the correct SKUs:

```sql
-- Example: Set SKUs for a landing page
UPDATE landing_pages
SET
  sku_offer_1 = 'PRODUCT-SKU-1PC',  -- SKU for 1 piece
  sku_offer_2 = 'PRODUCT-SKU-2PC',  -- SKU for 2 pieces
  sku_offer_3 = 'PRODUCT-SKU-3PC'   -- SKU for 3 pieces
WHERE slug = 'your-landing-page-slug';
```

## Example Flow

1. Customer selects "Două bucăți" (offer_2) on the landing page
2. Order is created with `offer_code = "offer_2"`
3. System retrieves `sku_offer_2` from landing page
4. Helpship receives order with `orderLines[0].externalSku = "PRODUCT-SKU-2PC"`
5. Helpship tracks inventory for the 2-piece variant

## Important Notes

- SKUs are optional - if not configured, `externalSku` will be `undefined` in Helpship
- Make sure SKUs match exactly with your Helpship product catalog
- Different offers (1pc, 2pc, 3pc) should have different SKUs if they're tracked separately in Helpship
