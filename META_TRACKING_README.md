# Meta Conversion Tracking Implementation Guide

This document explains how to set up and use Meta (Facebook) Conversion Tracking with your order management system.

## Overview

The system tracks conversions using Meta's Conversions API (CAPI), sending server-side Purchase events when orders are finalized. This provides more reliable tracking than browser-only pixels, especially with ad blockers and privacy features.

## Features

- ✅ **Server-side tracking** via Meta Conversions API (CAPI)
- ✅ **Cross-domain iframe tracking** with parameter propagation
- ✅ **Event deduplication** using unique event IDs
- ✅ **Automatic retry** with exponential backoff for failed events
- ✅ **Test mode** support for validating events before production
- ✅ **Privacy-compliant** with SHA256 hashing of PII data
- ✅ **Detailed product tracking** including main product + upsells

## Architecture

```
Landing Page (Domain A)
  ↓ (includes embed.js script)
  ↓ (extracts fbclid, utm params, etc.)
  ↓
Widget Iframe (Domain B: mvp-orders.vercel.app)
  ↓ (receives tracking params via URL)
  ↓ (user submits form)
  ↓
POST /api/orders
  ↓ (saves tracking data to DB)
  ↓ (creates order with status "queue")
  ↓
Postsale Decision
  ↓ (accept or decline/timeout)
  ↓
POST /api/orders/[id]/finalize OR /api/orders/[id]/add-postsale-upsell
  ↓ (syncs to Helpship)
  ↓ (sends Meta CAPI Purchase event)
  ↓
Meta Conversions API
```

## Setup Instructions

### 1. Run Database Migrations

Run these SQL migrations in your Supabase SQL Editor:

```bash
# Migration 033: Add tracking fields to orders and landing_pages
migrations/033-add-meta-tracking-fields.sql

# Migration 034: Create outbox table for retry mechanism
migrations/034-create-meta-events-outbox.sql
```

### 2. Configure Landing Page

For each landing page that should use Meta tracking, configure these fields in the `landing_pages` table:

```sql
UPDATE landing_pages
SET
  fb_pixel_id = 'YOUR_PIXEL_ID',                    -- Required
  fb_conversion_token = 'YOUR_CONVERSION_API_TOKEN', -- Required
  meta_test_mode = false,                            -- Set true for testing
  meta_test_event_code = 'TEST12345'                 -- Only needed if test mode
WHERE slug = 'your-landing-page-slug';
```

**Getting Your Credentials:**
1. **Pixel ID**: Found in Meta Events Manager → Data Sources → Your Pixel
2. **Conversion API Token**: Generate in Meta Events Manager → Settings → Conversions API → Generate Access Token

### 3. Update Landing Page HTML

Replace the current iframe embed code with the new embed script:

#### Old Method (Manual iframe):
```html
<iframe
  id="velaro-widget-crema-ochi"
  src="https://mvp-orders.vercel.app/widget?slug=crema-ochi"
  width="100%"
  style="border: none; display: block; min-height: 600px;"
  scrolling="no">
</iframe>
```

#### New Method (With Tracking):
```html
<!-- Include the embed script -->
<script src="https://mvp-orders.vercel.app/embed.js"></script>

<!-- Create a container div with the pattern: velaro-widget-{slug} -->
<div id="velaro-widget-crema-ochi"></div>
```

The embed script will:
- ✅ Extract tracking parameters from the landing page URL (fbclid, utm_*, gclid, ttclid)
- ✅ Get Facebook cookies (_fbp, _fbc)
- ✅ Build the iframe URL with all tracking params
- ✅ Handle iframe height adjustment automatically
- ✅ Handle redirect to thank you page after purchase

## How It Works

### Step 1: User Clicks Ad
```
Facebook Ad → Landing Page
https://example.com/product?fbclid=abc123&utm_source=facebook&utm_campaign=summer-sale
```

### Step 2: Embed Script Captures Tracking Data
The `embed.js` script extracts:
- `fbclid` from URL
- `_fbp` cookie from browser
- UTM parameters
- Google/TikTok click IDs
- Landing page URL

### Step 3: Widget Receives Tracking Data
```
https://mvp-orders.vercel.app/widget?slug=crema-ochi&fbclid=abc123&fbp=fb.1.123...&utm_campaign=summer-sale
```

The widget captures these params and includes them when creating the order.

### Step 4: Order is Created
Tracking data is saved to the `orders` table:
- `fbclid`, `fbc`, `gclid`, `ttclid`, `utm_campaign` (dedicated columns)
- `tracking_data` (JSONB for other params)
- `landing_url` (original landing page)
- `event_source_url` (widget iframe URL)

### Step 5: Order is Finalized
When the order is finalized (via `/finalize` or `/add-postsale-upsell`):
1. Order syncs to Helpship
2. **Meta CAPI Purchase event is sent** with:
   - Customer data (hashed with SHA256)
   - Order total and products
   - Event ID for deduplication
   - Test event code (if in test mode)

### Step 6: Meta Receives Event
Event appears in Meta Events Manager → Test Events (if test mode) or Events (if production).

## Test Mode

### Enable Test Mode

```sql
UPDATE landing_pages
SET
  meta_test_mode = true,
  meta_test_event_code = 'TEST12345'  -- Use your test code from Events Manager
WHERE slug = 'your-landing-page-slug';
```

### Validate Events

1. Go to Meta Events Manager → Test Events
2. Enter your test event code
3. Place a test order
4. Check if the Purchase event appears with all expected data

### Disable Test Mode

```sql
UPDATE landing_pages
SET
  meta_test_mode = false,
  meta_test_event_code = NULL
WHERE slug = 'your-landing-page-slug';
```

## Event Data Sent to Meta

### User Data (Hashed with SHA256)
- Phone number (normalized to +40 format)
- First name / Last name (extracted from full name)
- City
- County
- Country (RO)
- Facebook browser ID (`fbp`)
- Facebook click ID (`fbc`)
- Client IP address
- Client user agent

### Custom Data
- `value`: Order total (including presale + postsale upsells)
- `currency`: RON
- `order_id`: Order UUID
- `contents`: Array of products
  - Main product (SKU, quantity, price)
  - Presale upsells (SKU, quantity, price)
  - Postsale upsells (SKU, quantity, price)
- `num_items`: Total quantity

### Event Metadata
- `event_name`: "Purchase"
- `event_time`: Order creation timestamp
- `event_id`: `purchase_{order_id}` (for deduplication)
- `event_source_url`: Widget iframe URL
- `action_source`: "website"

## Retry Mechanism

If a CAPI event fails to send, it's automatically handled:

1. Order `meta_purchase_status` is set to `'failed'`
2. Error is logged in `meta_purchase_last_error`
3. You can manually retry via API:

```bash
POST /api/meta/retry-outbox
Authorization: Bearer YOUR_SESSION_TOKEN
```

### Check Outbox Status

```bash
GET /api/meta/retry-outbox
Authorization: Bearer YOUR_SESSION_TOKEN

Response:
{
  "success": true,
  "stats": {
    "pending": 5,
    "sent": 120,
    "failed": 2,
    "total": 127
  }
}
```

## Troubleshooting

### No Events Appearing in Meta

1. **Check landing page configuration:**
   ```sql
   SELECT fb_pixel_id, fb_conversion_token, meta_test_mode, meta_test_event_code
   FROM landing_pages
   WHERE slug = 'your-slug';
   ```

2. **Check order tracking data:**
   ```sql
   SELECT fbclid, tracking_data, event_source_url, meta_purchase_status, meta_purchase_last_error
   FROM orders
   WHERE id = 'order-uuid';
   ```

3. **Check server logs** for `[Meta CAPI]` messages

### Events Marked as Failed

Check the error message:
```sql
SELECT meta_purchase_status, meta_purchase_last_error
FROM orders
WHERE meta_purchase_status = 'failed';
```

Common errors:
- **Invalid access token**: Regenerate in Events Manager
- **Invalid pixel ID**: Verify in Events Manager
- **Network timeout**: Will auto-retry via outbox

### Tracking Params Not Captured

1. **Verify embed.js is loaded:**
   - Open browser DevTools → Network
   - Look for `embed.js` request

2. **Check iframe URL:**
   - Inspect the iframe `src` attribute
   - Should include `fbclid`, `utm_campaign`, etc.

3. **Check widget state:**
   - Open DevTools Console
   - Look for errors related to `searchParams`

## Database Schema

### orders Table (New Fields)

```sql
-- Tracking parameters
fbclid TEXT,
fbc TEXT,
gclid TEXT,
ttclid TEXT,
utm_campaign TEXT,
tracking_data JSONB,
landing_url TEXT,
event_source_url TEXT,

-- Meta CAPI status
meta_purchase_status TEXT DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
meta_purchase_event_id TEXT,
meta_purchase_sent_at TIMESTAMP,
meta_purchase_last_error TEXT
```

### landing_pages Table (New Fields)

```sql
meta_test_mode BOOLEAN DEFAULT false,
meta_test_event_code TEXT
```

### meta_events_outbox Table (New)

```sql
CREATE TABLE meta_events_outbox (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders(id),
  event_name TEXT,
  payload JSONB,
  attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  last_attempt_at TIMESTAMP,
  next_retry_at TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### POST /api/meta/retry-outbox
Manually trigger retry of failed events.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "processed": 5,
  "succeeded": 4,
  "failed": 1
}
```

### GET /api/meta/retry-outbox
Get outbox statistics.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "stats": {
    "pending": 5,
    "sent": 120,
    "failed": 2,
    "total": 127
  }
}
```

## Security & Privacy

- ✅ **PII is hashed** with SHA256 before sending to Meta
- ✅ **Access tokens stored securely** in database (not exposed to client)
- ✅ **Origin verification** for iframe postMessage
- ✅ **Event deduplication** prevents double-counting
- ✅ **Server-side only** - CAPI tokens never exposed to browser

## Performance

- ✅ **Non-blocking** - CAPI calls don't delay order creation
- ✅ **Error handling** - Failures don't break checkout flow
- ✅ **Retry mechanism** - Failed events automatically retried with exponential backoff
- ✅ **Batch processing** - Outbox processes max 10 entries at a time

## Support

For issues or questions:
1. Check server logs for `[Meta CAPI]` messages
2. Verify configuration in landing_pages table
3. Check Meta Events Manager for event diagnostics
4. Review this README for troubleshooting steps
