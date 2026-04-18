const config = require('../config');

let redis = null;
const memoryCache = new Map();

async function initRedis() {
  if (config.redis.host || config.redis.url) {
    try {
      const Redis = require('ioredis');
      redis = new Redis({
        host: config.redis.host || 'localhost',
        port: config.redis.port,
        password: config.redis.password,
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) {
            console.warn('[Cache] Redis connection failed, falling back to in-memory cache');
            redis = null;
            return null;
          }
          return Math.min(times * 200, 2000);
        },
      });

      redis.on('error', (err) => {
        console.warn('[Cache] Redis error:', err.message);
      });

      redis.on('connect', () => {
        console.log('[Cache] Redis connected');
      });
    } catch {
      console.log('[Cache] Redis not available, using in-memory cache');
      redis = null;
    }
  } else {
    console.log('[Cache] No REDIS_HOST configured, using in-memory cache');
  }
}

/**
 * Get cached value or compute and cache it
 * @param {string} key - Cache key
 * @param {number} ttlSeconds - TTL in seconds
 * @param {Function} computeFn - Async function to compute value if not cached
 */
async function getCachedOrCompute(key, ttlSeconds, computeFn) {
  // Try Redis first
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('[Cache] Redis get error:', err.message);
    }
  } else {
    // In-memory fallback
    const entry = memoryCache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.value;
    }
    if (entry) memoryCache.delete(key);
  }

  // Compute fresh value
  const fresh = await computeFn();

  // Store in cache
  if (redis) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(fresh));
    } catch (err) {
      console.warn('[Cache] Redis set error:', err.message);
    }
  } else {
    memoryCache.set(key, {
      value: fresh,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    // Prevent memory leak: cap at 5000 entries
    if (memoryCache.size > 5000) {
      const firstKey = memoryCache.keys().next().value;
      memoryCache.delete(firstKey);
    }
  }

  return fresh;
}

/**
 * Invalidate cache entries matching a pattern
 * @param {string} pattern - Glob pattern (e.g., "ctv:dashboard:*")
 */
async function invalidateCache(pattern) {
  if (redis) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`[Cache] Invalidated ${keys.length} Redis keys matching: ${pattern}`);
      }
    } catch (err) {
      console.warn('[Cache] Redis invalidate error:', err.message);
    }
  } else {
    // In-memory: convert glob pattern to simple prefix match
    const prefix = pattern.replace(/\*/g, '');
    let count = 0;
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix) || pattern === '*') {
        memoryCache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      console.log(`[Cache] Invalidated ${count} in-memory keys matching: ${pattern}`);
    }
  }
}

/**
 * Clear all cache
 */
async function clearAllCache() {
  if (redis) {
    try {
      await redis.flushdb();
    } catch (err) {
      console.warn('[Cache] Redis flush error:', err.message);
    }
  }
  memoryCache.clear();
  console.log('[Cache] All cache cleared');
}

function getRedisClient() {
  return redis;
}

module.exports = {
  initRedis,
  getRedisClient,
  getCachedOrCompute,
  invalidateCache,
  clearAllCache,
};
