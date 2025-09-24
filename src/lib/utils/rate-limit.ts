// Rate Limiting Utilities for Oracle Migration Testing
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// In-memory store for testing (in production, this should use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // If no entry exists or window has expired, create new entry
  if (!entry || now - entry.windowStart >= windowMs) {
    rateLimitStore.set(key, {
      count: 1,
      windowStart: now,
    });

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // Increment count and check if limit exceeded
  entry.count++;

  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetTime = entry.windowStart + windowMs;

  return {
    allowed,
    remaining,
    resetTime,
  };
}

export function rateLimitResponse(message = 'Too Many Requests') {
  return new Response(
    JSON.stringify({
      success: false,
      message,
      errorCode: 'RATE_LIMIT_EXCEEDED',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
      },
    }
  );
}

// Clear rate limit entries (useful for testing)
export function clearRateLimit(key?: string) {
  if (key) {
    rateLimitStore.delete(key);
  } else {
    rateLimitStore.clear();
  }
}
