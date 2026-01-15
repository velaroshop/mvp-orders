# Migration 009: Fix SKU and Quantity System

## What This Does

Fixes the SKU system to use a **single SKU** with **different quantities** for each offer, instead of separate SKUs.

This migration:
- Removes the 3 separate SKU fields (sku_offer_1, sku_offer_2, sku_offer_3)
- Adds 1 product SKU field (same for all offers)
- Adds 3 quantity fields (how many pieces in each offer)

## How It Works

**Before (Wrong):**
- offer_1 → SKU: "PRODUCT-1PC"
- offer_2 → SKU: "PRODUCT-2PC"
- offer_3 → SKU: "PRODUCT-3PC"

**After (Correct):**
- All offers → SKU: "PRODUCT-ABC"
- offer_1 → Quantity: 1
- offer_2 → Quantity: 2
- offer_3 → Quantity: 3

When a customer selects an offer:
1. System uses the same `product_sku` for all offers
2. System sends the quantity from `quantity_offer_1/2/3` based on selected offer
3. Helpship receives: `externalSku: "PRODUCT-ABC"` with `quantity: 2` (for offer_2)

## Apply Migration

1. Go to Supabase SQL Editor: https://bgstbrpxpncrnxchijzs.supabase.co
2. Click "SQL Editor" → "New Query"
3. Copy and paste:

```sql
-- Fix SKU system: Use single SKU with different quantities per offer
-- Remove the 3 separate SKU fields and add 1 SKU field + 3 quantity fields

-- Remove old SKU fields (from migration 008)
ALTER TABLE landing_pages DROP COLUMN IF EXISTS sku_offer_1;
ALTER TABLE landing_pages DROP COLUMN IF EXISTS sku_offer_2;
ALTER TABLE landing_pages DROP COLUMN IF EXISTS sku_offer_3;

-- Add single SKU field for the product
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS product_sku TEXT;

-- Add quantity fields for each offer (how many pieces in each offer)
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS quantity_offer_1 INTEGER DEFAULT 1;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS quantity_offer_2 INTEGER DEFAULT 2;
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS quantity_offer_3 INTEGER DEFAULT 3;

COMMENT ON COLUMN landing_pages.product_sku IS 'SKU of the product to be sent to Helpship (same for all offers)';
COMMENT ON COLUMN landing_pages.quantity_offer_1 IS 'Quantity for offer 1 (e.g., 1 piece)';
COMMENT ON COLUMN landing_pages.quantity_offer_2 IS 'Quantity for offer 2 (e.g., 2 pieces)';
COMMENT ON COLUMN landing_pages.quantity_offer_3 IS 'Quantity for offer 3 (e.g., 3 pieces)';
```

4. Click "Run" or press Ctrl+Enter

## Configure Product SKU and Quantities

After applying the migration, update your landing pages:

```sql
-- Example: Set SKU and quantities for a landing page
UPDATE landing_pages
SET
  product_sku = 'CREMA-OCHI-ABC',  -- Same SKU for all offers
  quantity_offer_1 = 1,             -- Offer 1: 1 piece
  quantity_offer_2 = 2,             -- Offer 2: 2 pieces
  quantity_offer_3 = 3              -- Offer 3: 3 pieces
WHERE slug = 'crema-ochi';
```

Or customize quantities:
```sql
-- Example: Different quantities (1, 3, 5)
UPDATE landing_pages
SET
  product_sku = 'PRODUCT-XYZ',
  quantity_offer_1 = 1,
  quantity_offer_2 = 3,
  quantity_offer_3 = 5
WHERE slug = 'your-landing-page';
```

## Example Flow

1. Customer selects "Două bucăți" (offer_2)
2. System retrieves:
   - `product_sku = "CREMA-OCHI-ABC"`
   - `quantity_offer_2 = 2`
3. Helpship receives:
   ```json
   {
     "orderLines": [{
       "externalSku": "CREMA-OCHI-ABC",
       "quantity": 2,
       "price": 90.00
     }]
   }
   ```

## Important Notes

- The `product_sku` is the same for all offers
- Only the quantity changes based on which offer is selected
- Default quantities are 1, 2, 3 but can be customized
- Make sure the SKU matches your Helpship product catalog
