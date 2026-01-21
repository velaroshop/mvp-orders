# Meta Tracking Setup Checklist

Quick reference guide for implementing Meta conversion tracking.

## ✅ Implementation Checklist

### 1. Database Setup
- [ ] Run migration `033-add-meta-tracking-fields.sql` in Supabase
- [ ] Run migration `034-create-meta-events-outbox.sql` in Supabase
- [ ] Verify new columns exist in `orders` table
- [ ] Verify new columns exist in `landing_pages` table
- [ ] Verify `meta_events_outbox` table exists

### 2. Meta Configuration
- [ ] Get Facebook Pixel ID from Meta Events Manager
- [ ] Generate Conversion API Token from Meta Events Manager
- [ ] (Optional) Get Test Event Code for testing

### 3. Landing Page Configuration
For each landing page that needs tracking:

```sql
UPDATE landing_pages
SET
  fb_pixel_id = 'YOUR_PIXEL_ID',
  fb_conversion_token = 'YOUR_TOKEN',
  meta_test_mode = true,  -- Start with test mode
  meta_test_event_code = 'TEST12345'
WHERE slug = 'your-slug';
```

- [ ] Update `fb_pixel_id`
- [ ] Update `fb_conversion_token`
- [ ] Set `meta_test_mode = true` for initial testing
- [ ] Add `meta_test_event_code` if testing

### 4. Landing Page HTML Update
Replace iframe code with embed script:

```html
<!-- OLD: Remove this -->
<iframe id="velaro-widget-slug" src="https://mvp-orders.vercel.app/widget?slug=slug"></iframe>

<!-- NEW: Add this -->
<script src="https://mvp-orders.vercel.app/embed.js"></script>
<div id="velaro-widget-slug"></div>
```

- [ ] Add embed.js script tag
- [ ] Replace iframe with div container
- [ ] Verify container ID follows pattern: `velaro-widget-{slug}`

### 5. Testing
- [ ] Open Meta Events Manager → Test Events
- [ ] Enter your test event code
- [ ] Visit landing page with tracking params: `?fbclid=test123&utm_campaign=test`
- [ ] Complete a test order
- [ ] Check Meta Events Manager for Purchase event
- [ ] Verify event data is correct (value, products, customer info)
- [ ] Check order in database has `meta_purchase_status = 'sent'`

### 6. Production Deployment
Once testing is successful:

```sql
UPDATE landing_pages
SET
  meta_test_mode = false,
  meta_test_event_code = NULL
WHERE slug = 'your-slug';
```

- [ ] Disable test mode
- [ ] Remove test event code
- [ ] Place real test order
- [ ] Verify event appears in Meta Events Manager (not Test Events)

## 🔍 Verification Queries

### Check Landing Page Configuration
```sql
SELECT
  slug,
  fb_pixel_id,
  fb_conversion_token,
  meta_test_mode,
  meta_test_event_code
FROM landing_pages
WHERE slug = 'your-slug';
```

### Check Recent Order Tracking Data
```sql
SELECT
  id,
  created_at,
  fbclid,
  utm_campaign,
  tracking_data,
  event_source_url,
  meta_purchase_status,
  meta_purchase_event_id,
  meta_purchase_sent_at,
  meta_purchase_last_error
FROM orders
ORDER BY created_at DESC
LIMIT 10;
```

### Check Failed Events
```sql
SELECT
  id,
  created_at,
  phone,
  full_name,
  total,
  meta_purchase_status,
  meta_purchase_last_error
FROM orders
WHERE meta_purchase_status = 'failed'
ORDER BY created_at DESC;
```

### Check Outbox Status
```sql
SELECT
  status,
  COUNT(*) as count
FROM meta_events_outbox
GROUP BY status;
```

## 🚨 Troubleshooting

### No Events in Meta Events Manager

**Check 1:** Landing page has credentials
```sql
SELECT fb_pixel_id, fb_conversion_token
FROM landing_pages
WHERE slug = 'your-slug';
```

**Check 2:** Order has tracking data
```sql
SELECT fbclid, tracking_data, event_source_url
FROM orders
WHERE id = 'order-uuid';
```

**Check 3:** Check CAPI status
```sql
SELECT meta_purchase_status, meta_purchase_last_error
FROM orders
WHERE id = 'order-uuid';
```

### Tracking Params Not Captured

**Check 1:** Verify embed.js is loaded
- Open DevTools → Network tab
- Look for `embed.js` request

**Check 2:** Verify iframe has tracking params
- Inspect iframe element
- Check `src` attribute includes `fbclid`, `utm_campaign`, etc.

**Check 3:** Test with manual params
- Add `?fbclid=test123&utm_campaign=testcampaign` to landing page URL
- Check if params appear in iframe src

### Events Marked as Failed

**Check error message:**
```sql
SELECT meta_purchase_last_error
FROM orders
WHERE meta_purchase_status = 'failed';
```

**Common fixes:**
- Regenerate Conversion API Token
- Verify Pixel ID is correct
- Check Meta Events Manager for diagnostics

## 📊 Monitoring

### Daily Check
```sql
-- Orders created today with tracking status
SELECT
  meta_purchase_status,
  COUNT(*) as count
FROM orders
WHERE created_at >= CURRENT_DATE
GROUP BY meta_purchase_status;
```

### Weekly Stats
```sql
-- Purchase events sent this week
SELECT
  DATE(created_at) as date,
  COUNT(*) as orders,
  SUM(CASE WHEN meta_purchase_status = 'sent' THEN 1 ELSE 0 END) as events_sent,
  SUM(CASE WHEN meta_purchase_status = 'failed' THEN 1 ELSE 0 END) as events_failed
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🔄 Retry Failed Events

### Manual Retry via API
```bash
curl -X POST https://mvp-orders.vercel.app/api/meta/retry-outbox \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### Check Outbox Stats
```bash
curl https://mvp-orders.vercel.app/api/meta/retry-outbox \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## 📝 Next Steps After Setup

1. Monitor conversion attribution in Meta Ads Manager
2. Set up custom conversions for specific products/campaigns
3. Configure conversion optimization for ad sets
4. Review Meta Attribution Settings
5. Consider adding client-side Pixel for ViewContent/InitiateCheckout events (future enhancement)

## ⚠️ Important Notes

- ✅ Always test with `meta_test_mode = true` first
- ✅ Never commit access tokens to git
- ✅ CAPI tokens are stored in database only
- ✅ Failed events auto-retry with exponential backoff
- ✅ Tracking doesn't affect checkout functionality
- ✅ All PII is hashed before sending to Meta

## 📚 Resources

- [Meta Tracking README](./META_TRACKING_README.md) - Full documentation
- [Meta Conversions API Docs](https://developers.facebook.com/docs/marketing-api/conversions-api)
- [Meta Events Manager](https://business.facebook.com/events_manager2)
- [Test Events Tool](https://business.facebook.com/events_manager2/test_events)
