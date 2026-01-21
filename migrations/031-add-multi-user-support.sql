-- Migration 031: Add multi-user support
-- Extends organization_members table to support Owner, Admin, and Store Manager roles

-- Update the role check constraint to support new roles
ALTER TABLE organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE organization_members ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'store_manager'));

-- Add created_by field to track who created this user
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Add is_active field to allow deactivating users
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organization_members_created_by ON organization_members(created_by);
CREATE INDEX IF NOT EXISTS idx_organization_members_is_active ON organization_members(is_active);

-- Update RLS policies for Store Manager role
-- Store Managers can view but not modify products, stores, landing pages, settings

-- Drop old policy and create new one for products (read-only for store_manager)
DROP POLICY IF EXISTS "Users can access their organization products" ON products;

CREATE POLICY "Owners and Admins can manage products"
  ON products FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "Store Managers can view products"
  ON products FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'store_manager' AND is_active = true
    )
  );

-- Drop old policy and create new one for stores (read-only for store_manager)
DROP POLICY IF EXISTS "Users can access their organization stores" ON stores;

CREATE POLICY "Owners and Admins can manage stores"
  ON stores FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "Store Managers can view stores"
  ON stores FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'store_manager' AND is_active = true
    )
  );

-- Drop old policy and create new one for landing_pages (read-only for store_manager)
DROP POLICY IF EXISTS "Users can access their organization landing pages" ON landing_pages;

CREATE POLICY "Owners and Admins can manage landing pages"
  ON landing_pages FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

CREATE POLICY "Store Managers can view landing pages"
  ON landing_pages FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'store_manager' AND is_active = true
    )
  );

-- Drop old policy and create new one for settings (owner and admin only)
DROP POLICY IF EXISTS "Users can access their organization settings" ON settings;

CREATE POLICY "Owners and Admins can manage settings"
  ON settings FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- Update policy for organization_members to ensure only active users can manage
DROP POLICY IF EXISTS "Owners and admins can manage members" ON organization_members;

CREATE POLICY "Only Owners can manage members"
  ON organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
    )
  );

-- All users can view members of their organization (for UI display)
CREATE POLICY "Users can view organization members"
  ON organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Orders: All roles can manage (owners, admins, store_managers)
DROP POLICY IF EXISTS "Users can access their organization orders" ON orders;

CREATE POLICY "Active users can manage orders"
  ON orders FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Add customers table policies
DROP POLICY IF EXISTS "Active users can view customers" ON customers;
DROP POLICY IF EXISTS "Owners and Admins can manage customers" ON customers;

CREATE POLICY "Active users can view customers"
  ON customers FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Owners and Admins can manage customers"
  ON customers FOR INSERT, UPDATE, DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- Add partial_orders table policies
DROP POLICY IF EXISTS "Active users can manage partial orders" ON partial_orders;

CREATE POLICY "Active users can manage partial orders"
  ON partial_orders FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
