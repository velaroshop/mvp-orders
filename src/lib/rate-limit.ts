/**
 * Simple in-memory rate limiter
 * Pentru producție la scară mare, ar trebui folosit Redis
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store pentru rate limiting
// Key: identifier (IP sau combination), Value: { count, resetTime }
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup la fiecare 5 minute pentru a elibera memorie
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Numărul maxim de request-uri permise în fereastră */
  limit: number;
  /** Durata ferestrei în secunde */
  windowSeconds: number;
}

export interface RateLimitResult {
  /** Dacă request-ul este permis */
  allowed: boolean;
  /** Câte request-uri mai sunt disponibile */
  remaining: number;
  /** Timestamp când se resetează limita (Unix ms) */
  resetTime: number;
  /** Câte secunde până la reset */
  retryAfter: number;
}

/**
 * Verifică și actualizează rate limit pentru un identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = rateLimitStore.get(identifier);

  // Dacă nu există entry sau a expirat, creăm unul nou
  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetTime,
      retryAfter: 0,
    };
  }

  // Verificăm dacă am depășit limita
  if (entry.count >= config.limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // Incrementăm counter-ul
  entry.count++;
  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
    retryAfter: 0,
  };
}

/**
 * Extrage IP-ul din request
 * Verifică headerele comune pentru proxy/load balancer
 */
export function getClientIP(request: Request): string {
  // Vercel/Cloudflare headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for poate conține mai multe IP-uri, primul e clientul
    return forwardedFor.split(',')[0].trim();
  }

  // Cloudflare specific
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Vercel specific
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // Real IP header (nginx)
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback - nu ar trebui să ajungem aici în producție
  return 'unknown';
}

/**
 * Generează headers pentru rate limit response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.remaining + (result.allowed ? 1 : 0)),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetTime / 1000)),
    ...(result.retryAfter > 0 ? { 'Retry-After': String(result.retryAfter) } : {}),
  };
}
