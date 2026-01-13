import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

const MAX_TOKENS = parseInt(process.env.CLAUDE_RATE_LIMIT_PER_USER || '10');
const REFILL_RATE = 1;
const REFILL_INTERVAL = 6000; // 6 seconds

function getTokens(userId: string): number {
  const now = Date.now();
  let entry = rateLimits.get(userId);

  if (!entry) {
    entry = { tokens: MAX_TOKENS, lastRefill: now };
    rateLimits.set(userId, entry);
    return entry.tokens;
  }

  const timePassed = now - entry.lastRefill;
  const tokensToAdd = Math.floor(timePassed / REFILL_INTERVAL) * REFILL_RATE;

  if (tokensToAdd > 0) {
    entry.tokens = Math.min(MAX_TOKENS, entry.tokens + tokensToAdd);
    entry.lastRefill = now;
  }

  return entry.tokens;
}

function consumeToken(userId: string): boolean {
  const tokens = getTokens(userId);
  if (tokens <= 0) return false;

  const entry = rateLimits.get(userId)!;
  entry.tokens -= 1;
  return true;
}

export function planningRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', code: 'NO_USER' });
    return;
  }

  const tokens = getTokens(userId);

  res.setHeader('X-RateLimit-Limit', MAX_TOKENS.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, tokens - 1).toString());
  res.setHeader('X-RateLimit-Reset', (Date.now() + REFILL_INTERVAL).toString());

  if (!consumeToken(userId)) {
    res.status(429).json({
      error: 'Rate limit exceeded. Please wait before making more planning requests.',
      code: 'RATE_LIMITED',
      retryAfter: REFILL_INTERVAL / 1000,
    });
    return;
  }

  next();
}

setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000;

  for (const [userId, entry] of rateLimits.entries()) {
    if (now - entry.lastRefill > maxAge) {
      rateLimits.delete(userId);
    }
  }
}, 60 * 60 * 1000);
