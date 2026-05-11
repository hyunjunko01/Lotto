type RateLimitState = {
    count: number;
    windowStartMs: number;
};

type RateLimitResult = {
    allowed: boolean;
    retryAfterSec: number;
    remaining: number;
};

const memoryStore = new Map<string, RateLimitState>();

function nowMs(): number {
    return Date.now();
}

function buildKey(scope: string, key: string): string {
    return `${scope}:${key}`;
}

/**
 * Minimal in-memory fixed-window limiter (Phase 1).
 * Suitable for single-instance/local deployments.
 */
export function checkRateLimit(options: {
    scope: string;
    key: string;
    limit: number;
    windowMs: number;
}): RateLimitResult {
    const { scope, key, limit, windowMs } = options;
    const storageKey = buildKey(scope, key);
    const current = memoryStore.get(storageKey);
    const currentMs = nowMs();

    if (!current || currentMs - current.windowStartMs >= windowMs) {
        memoryStore.set(storageKey, { count: 1, windowStartMs: currentMs });
        return {
            allowed: true,
            retryAfterSec: 0,
            remaining: Math.max(limit - 1, 0),
        };
    }

    if (current.count >= limit) {
        const retryAfterMs = Math.max(windowMs - (currentMs - current.windowStartMs), 0);
        return {
            allowed: false,
            retryAfterSec: Math.ceil(retryAfterMs / 1000),
            remaining: 0,
        };
    }

    current.count += 1;
    memoryStore.set(storageKey, current);
    return {
        allowed: true,
        retryAfterSec: 0,
        remaining: Math.max(limit - current.count, 0),
    };
}

export function getClientIpFromHeaders(headers: Headers): string {
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) return first;
    }
    const realIp = headers.get('x-real-ip');
    if (realIp) return realIp;
    return 'unknown';
}
