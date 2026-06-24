/**
 * Bot Detection for Order Submissions
 *
 * Detects suspected bot traffic based on multiple signals.
 * Orders from suspected bots are still created (no impact on functionality)
 * but marked in tracking_data so CAPI events are NOT sent to Meta
 * (prevents poisoning Meta's algorithm with fake conversions).
 */

// Known bot/headless browser patterns in User-Agent
const BOT_UA_PATTERNS = [
  /headless/i,
  /phantom/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /crawler/i,
  /spider/i,
  /bot\b/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /node-fetch/i,
  /axios\//i,
  /go-http-client/i,
  /java\//i,
  /libwww/i,
  /httpclient/i,
  /okhttp/i,
  /scrapy/i,
];

// Known datacenter/cloud IP ranges (simplified — first octets)
// These are NOT residential IPs
const DATACENTER_IP_PREFIXES = [
  '34.', '35.', // Google Cloud
  '52.', '54.', '18.', '3.', // AWS
  '20.', '40.', '13.', '104.', // Azure
  '162.158.', '172.64.', '141.101.', // Cloudflare Workers
  '169.254.', // Link-local
];

interface BotCheckResult {
  isSuspectedBot: boolean;
  reasons: string[];
}

export function detectBot(params: {
  userAgent: string | null;
  clientIP: string | null;
  formSubmittedAt?: number; // timestamp from widget
  phone?: string;
}): BotCheckResult {
  const reasons: string[] = [];

  // Check 1: Missing or empty User-Agent
  if (!params.userAgent || params.userAgent.trim().length < 10) {
    reasons.push('missing_or_short_ua');
  }

  // Check 2: Known bot User-Agent patterns
  if (params.userAgent) {
    for (const pattern of BOT_UA_PATTERNS) {
      if (pattern.test(params.userAgent)) {
        reasons.push(`bot_ua_pattern:${pattern.source}`);
        break;
      }
    }
  }

  // Check 3: Datacenter IP (not residential)
  if (params.clientIP) {
    for (const prefix of DATACENTER_IP_PREFIXES) {
      if (params.clientIP.startsWith(prefix)) {
        reasons.push(`datacenter_ip:${prefix}`);
        break;
      }
    }
  }

  // Check 4: Form submitted too fast (< 5 seconds from page load to submit)
  // A human can't realistically fill phone + name + county + city + address in under 5 seconds
  if (params.formSubmittedAt) {
    // formSubmittedAt is a client timestamp — compare with server time
    // Allow up to 30 seconds clock drift
    const now = Date.now();
    const elapsed = now - params.formSubmittedAt;
    // If elapsed is negative (client clock ahead) or very small, it's suspicious
    // But we can't reliably measure fill time server-side, so we only flag extreme cases
    if (elapsed < -60000) {
      // Client timestamp is more than 1 minute in the future — clock manipulation
      reasons.push('clock_manipulation');
    }
  }

  // Check 5: Phone number patterns that bots commonly use
  if (params.phone) {
    const digits = params.phone.replace(/\D/g, '');
    // All same digits (0700000000, 0711111111)
    if (/^(\d)\1+$/.test(digits)) {
      reasons.push('fake_phone_all_same');
    }
    // Sequential digits (0712345678)
    if (/^07[0-9]?12345/.test(digits)) {
      reasons.push('fake_phone_sequential');
    }
  }

  return {
    isSuspectedBot: reasons.length >= 2, // Require at least 2 signals to flag as bot
    reasons,
  };
}
