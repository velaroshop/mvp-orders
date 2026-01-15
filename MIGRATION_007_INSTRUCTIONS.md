# Migration 007: Thank You Page Redirect

## What This Does

Adds `thank_you_slug` field to the `stores` table and implements automatic redirect to the thank you page after order placement.

## How It Works

After a customer places an order through the widget form:
1. The form redirects to: `{store.url}/{thank_you_slug}`
2. If the widget is in an iframe, it redirects the parent window
3. Falls back to "multumim" if no `thank_you_slug` is configured

## Apply Migration

1. Go to Supabase SQL Editor: https://bgstbrpxpncrnxchijzs.supabase.co
2. Click "SQL Editor" → "New Query"
3. Copy and paste:

```sql
-- Add thank_you_slug to stores table

ALTER TABLE stores ADD COLUMN IF NOT EXISTS thank_you_slug TEXT;

COMMENT ON COLUMN stores.thank_you_slug IS 'Slug for the thank you page (e.g., "multumim", "thank-you")';
```

4. Click "Run" or press Ctrl+Enter

## Configure Thank You Slug

After applying the migration, update your store's `thank_you_slug`:

```sql
-- Example: Set thank you slug for your store
UPDATE stores
SET thank_you_slug = 'multumim'
WHERE id = 'your-store-id';
```

Or leave it empty to use the default "multumim".

## Example

If your store URL is `https://example.com` and `thank_you_slug` is `multumim`:
- After order → Redirects to `https://example.com/multumim`

If `thank_you_slug` is not set:
- After order → Redirects to `https://example.com/multumim` (default)
