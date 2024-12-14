import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import config from '../config';

// Initialize Redis client
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  enableOfflineQueue: false,
});

// Define rate limit tiers
const rateLimitTiers = {
  // Unauthenticated users
  default: {
    points: 30, // Number of requests
    duration: 60, // Per 60 seconds
  },
  // Authenticated users
  authenticated: {
    points: 60,
    duration: 60,
  },
  // Premium users
  premium: {
    points: 120,
    duration: 60,
  },
  // Function execution limits
  functionExecution: {
    points: 10,
    duration: 60,
  },
  // Agent creation limits
  agentCreation: {
    points: 5,
    duration: 3600, // Per hour
  },
  // Marketplace interaction limits
  marketplace: {
    points: 50,
    duration: 60,
  },
  // Search limits
  search: {
    points: 20,
    duration: 60,
  },
};

// Create rate limiters for different tiers
const rateLimiters = {
  default: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rlflx:default',
    points: rateLimitTiers.default.points,
    duration: rateLimitTiers.default.duration,
  }),
  authenticated: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rlflx:auth',
    points: rateLimitTiers.authenticated.points,
    duration: rateLimitTiers.authenticated.duration,
  }),
  premium: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rlflx:premium',
    points: rateLimitTiers.premium.points,
    duration: rateLimitTiers.premium.duration,
  }),
  functionExecution: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rlflx:func',
    points: rateLimitTiers.functionExecution.points,
    duration: rateLimitTiers.functionExecution.duration,
  }),
  agentCreation: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rlflx:agent',
    points: rateLimitTiers.agentCreation.points,
    duration: rateLimitTiers.agentCreation.duration,
  }),
  marketplace: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rlflx:market',
    points: rateLimitTiers.marketplace.points,
    duration: rateLimitTiers.marketplace.duration,
  }),
  search: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rlflx:search',
    points: rateLimitTiers.search.points,
    duration: rateLimitTiers.search.duration,
  }),
};

// Helper function to get client IP
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
  }
  return req.socket.remoteAddress || '';
};

// Helper function to get rate limiter key
const getRateLimiterKey = (req: Request): string => {
  const clientIp = getClientIp(req);
  const userAddress = req.user?.address || 'anonymous';
  return `${clientIp}:${userAddress}`;
};

// Helper function to get user tier
const getUserTier = (req: Request): 'default' | 'authenticated' | 'premium' => {
  if (!req.user) {
    return 'default';
  }
  return req.user.isPremium ? 'premium' : 'authenticated';
};

// Create middleware for different rate limit types
export const createRateLimiter = (type: keyof typeof rateLimiters) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = getRateLimiterKey(req);
      const rateLimiter = rateLimiters[type];

      const result = await rateLimiter.consume(key);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': rateLimiter.points,
        'X-RateLimit-Remaining': result.remainingPoints,
        'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString(),
      });

      next();
    } catch (error) {
      if (error instanceof Error) {
        const resetTime = new Date(Date.now() + (error as any).msBeforeNext).toISOString();
        res.set({
          'X-RateLimit-Reset': resetTime,
        });
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again after ${resetTime}`,
          tier: getUserTier(req),
          limits: rateLimitTiers[getUserTier(req)],
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Rate limiting system error',
        });
      }
    }
  };
};

// Middleware for dynamic rate limiting based on user tier
export const dynamicRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tier = getUserTier(req);
    const key = getRateLimiterKey(req);
    const rateLimiter = rateLimiters[tier];

    const result = await rateLimiter.consume(key);

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': rateLimiter.points,
      'X-RateLimit-Remaining': result.remainingPoints,
      'X-RateLimit-Reset': new Date(Date.now() + result.msBeforeNext).toISOString(),
      'X-RateLimit-Tier': tier,
    });

    next();
  } catch (error) {
    if (error instanceof Error) {
      const resetTime = new Date(Date.now() + (error as any).msBeforeNext).toISOString();
      res.set({
        'X-RateLimit-Reset': resetTime,
      });
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again after ${resetTime}`,
        tier: getUserTier(req),
        limits: rateLimitTiers[getUserTier(req)],
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Rate limiting system error',
      });
    }
  }
};

// Middleware for monitoring and logging rate limit events
export const rateLimitMonitor = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const tier = getUserTier(req);
  const key = getRateLimiterKey(req);

  // Continue with request
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;

    // Log rate limit event
    console.log({
      timestamp: new Date().toISOString(),
      type: 'rate_limit',
      tier,
      key,
      duration,
      status,
      path: req.path,
      method: req.method,
      headers: {
        'x-ratelimit-remaining': res.getHeader('x-ratelimit-remaining'),
        'x-ratelimit-reset': res.getHeader('x-ratelimit-reset'),
      },
    });

    // If this was a rate limit violation, increment violation counter
    if (status === 429) {
      redisClient.incr(`rlflx:violations:${key}`).then((violations) => {
        // If user has too many violations, they might need to be blocked
        if (violations > 100) {
          console.warn(`User ${key} has exceeded violation threshold`);
        }
      });
    }
  });

  next();
};

export default {
  createRateLimiter,
  dynamicRateLimit,
  rateLimitMonitor,
};
