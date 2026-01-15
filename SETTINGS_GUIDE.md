# Settings Configuration Guide

## Helpship Integration per Organization

Each organization can configure their own Helpship WMS credentials independently.

### How It Works

1. **Navigate to Settings**
   - Login to your admin dashboard
   - Go to `/admin/settings`

2. **Configure Helpship Credentials**
   - Enter your **Client ID** (e.g., `velaro-trading-dev`)
   - Enter your **Client Secret** (OAuth2 secret)
   - Click **Save Settings**

3. **How Credentials are Used**
   - When a customer places an order through your landing page widget, the system:
     1. Identifies the organization from the landing page
     2. Fetches Helpship credentials for that organization from the database
     3. Creates an order in your Helpship account using your credentials
   - Each organization's orders go to their own Helpship account

### Fallback Behavior

If an organization hasn't configured Helpship credentials yet:
- The system falls back to environment variables (`HELPSHIP_CLIENT_ID`, `HELPSHIP_CLIENT_SECRET`)
- This allows testing before configuring organization-specific credentials

### Security

- **Client Secret** is stored securely in the database
- The secret is never displayed in the UI after saving
- Leave the secret field empty when updating other settings if you don't want to change it

### Order Flow

```
Customer Order (Widget)
  → Landing Page (determines organization)
  → Fetch Organization's Helpship Credentials
  → Create Order in Organization's Helpship Account
  → Save Order in Database with organization_id
```

### Database Schema

The `settings` table stores organization-specific configuration:

```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  helpship_client_id TEXT,
  helpship_client_secret TEXT,
  helpship_token_url TEXT,
  helpship_api_base_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### API Endpoints

- **GET /api/settings** - Fetch settings for active organization
- **PUT /api/settings** - Update settings for active organization

Both endpoints require authentication and use the active organization from the user's session.
