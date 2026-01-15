# Apply Database Migrations

## Quick Fix for Settings Error

You're seeing this error because the database schema is not up to date. Follow these steps:

### 1. Open Supabase SQL Editor

1. Go to https://bgstbrpxpncrnxchijzs.supabase.co
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### 2. Run Migration 002 (Helpship Settings)

Copy and paste this SQL:

```sql
-- Update settings table structure for Helpship API credentials per organization

-- Drop existing settings table structure (if needed to start fresh)
-- This is safe because we'll recreate it properly
DROP TABLE IF EXISTS settings CASCADE;

-- Create new settings table with Helpship credentials per organization
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Helpship API Credentials
  helpship_client_id TEXT,
  helpship_client_secret TEXT,
  helpship_token_url TEXT DEFAULT 'https://helpship-auth-develop.azurewebsites.net/connect/token',
  helpship_api_base_url TEXT DEFAULT 'https://helpship-api-develop.azurewebsites.net',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One settings record per organization
  UNIQUE(organization_id)
);

-- Index for organization_id
CREATE INDEX idx_settings_organization_id ON settings(organization_id);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access settings from their organizations
CREATE POLICY "Users can access their organization settings"
  ON settings FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Click "Run" or press Ctrl+Enter

You should see a success message.

### 4. Verify

Run this query to verify the table was created correctly:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'settings'
ORDER BY ordinal_position;
```

You should see all the columns including:
- `helpship_client_id`
- `helpship_client_secret`
- `helpship_token_url`
- `helpship_api_base_url`

### 5. Test Settings Page

Now go back to `/admin/settings` and try saving your credentials again. It should work!

## Other Migrations to Apply

While you're at it, make sure these migrations are also applied:

### Migration 006 (Sync Error Status)

```sql
-- Add 'sync_error' status to orders table
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'hold', 'sync_error'));

COMMENT ON COLUMN orders.status IS 'Order status: pending (default), confirmed, cancelled, hold, sync_error (failed to sync with Helpship)';
```

## Troubleshooting

If you still get errors after applying the migration:

1. **Check if migration was applied**:
   ```sql
   \d settings
   ```

2. **Check for existing data**:
   ```sql
   SELECT * FROM settings;
   ```

3. **Clear Supabase cache** (in Supabase dashboard):
   - Settings → Database → Restart database (if available)

4. **Redeploy Vercel**:
   - The schema cache might be stale
   - Go to Vercel → Deployments → Latest → Redeploy
