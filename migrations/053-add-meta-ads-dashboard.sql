-- Migration 053: Add Meta Ads Dashboard support
-- Adds settings columns for Meta Ads access token and account ID
-- Creates ad_campaign_insights cache table for storing campaign-level metrics

-- Settings table: add Meta Ads columns
ALTER TABLE settings ADD COLUMN IF NOT EXISTS meta_ads_access_token TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS meta_ads_account_id TEXT;

-- Cache table for campaign insights pulled from Meta Marketing API
CREATE TABLE IF NOT EXISTS ad_campaign_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  campaign_status TEXT,
  campaign_objective TEXT,
  date DATE NOT NULL,
  spend DECIMAL(10,2) NOT NULL DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  link_clicks BIGINT DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,
  ctr DECIMAL(8,4) DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  meta_purchases INTEGER DEFAULT 0,
  meta_purchase_value DECIMAL(10,2) DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, ad_account_id, campaign_id, date)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_aci_org_date ON ad_campaign_insights(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_aci_org_account ON ad_campaign_insights(organization_id, ad_account_id);

-- Enable RLS
ALTER TABLE ad_campaign_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view ad campaign insights for their organization" ON ad_campaign_insights
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert ad campaign insights for their organization" ON ad_campaign_insights
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update ad campaign insights for their organization" ON ad_campaign_insights
  FOR UPDATE USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete ad campaign insights for their organization" ON ad_campaign_insights
  FOR DELETE USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));
