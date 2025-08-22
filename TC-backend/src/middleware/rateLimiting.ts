import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import Redis from 'ioredis'

interface RateLimitOptions {
  max: number
  window: number
  keyGenerator?: (req: FastifyRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  customResponse?: (req: FastifyRequest, reply: FastifyReply) => void
}

interface RateLimitStore {
  increment(key: string, window: number): Promise<{ count: number; ttl: number }>
  reset(key: string): Promise<void>
}

class RedisStore implements RateLimitStore {
  private redis: Redis

  constructor(redis: Redis) {
    this.redis = redis
  }

  async increment(key: string, window: number): Promise<{ count: number; ttl: number }> {
    const multi = this.redis.multi()
    const redisKey = `ratelimit:${key}`
    
    multi.incr(redisKey)
    multi.expire(redisKey, window)
    multi.ttl(redisKey)
    
    const results = await multi.exec()
    
    if (!results) {
      throw new Error('Redis transaction failed')
    }
    
    const count = (results[0]?.[1] as number) || 0
    const ttl = (results[2]?.[1] as number) || window
    
    return { count, ttl: ttl > 0 ? ttl : window }
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`ratelimit:${key}`)
  }
}

class MemoryStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetAt: number }>()

  async increment(key: string, window: number): Promise<{ count: number; ttl: number }> {
    const now = Date.now()
    const windowMs = window * 1000
    const resetAt = now + windowMs

    const existing = this.store.get(key)
    
    if (existing && existing.resetAt > now) {
      existing.count++
      const ttl = Math.ceil((existing.resetAt - now) / 1000)
      return { count: existing.count, ttl }
    }
    
    this.store.set(key, { count: 1, resetAt })
    
    setTimeout(() => {
      this.store.delete(key)
    }, windowMs)
    
    return { count: 1, ttl: window }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key)
  }
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    max,
    window,
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = true,
    customResponse,
  } = options

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_URL
  const store: RateLimitStore = redisUrl
    ? new RedisStore(new Redis(redisUrl))
    : new MemoryStore()

  return async function rateLimiter(
    req: FastifyRequest,
    reply: FastifyReply
  ) {
    // Skip rate limiting in development mode
    if (process.env.DISABLE_RATE_LIMITING === 'true' || process.env.DEV_MODE === 'true') {
      return
    }
    
    const key = keyGenerator(req)
    
    try {
      const { count, ttl } = await store.increment(key, window)
      
      reply.header('X-RateLimit-Limit', max.toString())
      reply.header('X-RateLimit-Remaining', Math.max(0, max - count).toString())
      reply.header('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString())
      
      if (count > max) {
        reply.header('Retry-After', ttl.toString())
        
        if (customResponse) {
          customResponse(req, reply)
        } else {
          reply.code(429).send({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${ttl} seconds.`,
            retryAfter: ttl,
          })
        }
        
        return
      }
      
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = reply.send.bind(reply)
        reply.send = function(payload: any) {
          const statusCode = reply.statusCode
          
          if (
            (skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400)
          ) {
            store.reset(key)
          }
          
          return originalSend(payload)
        }
      }
    } catch (error) {
      req.log.error({ error }, 'Rate limit error')
    }
  }
}

export const rateLimiters = {
  strict: createRateLimiter({
    max: 5,
    window: 60,
  }),
  
  standard: createRateLimiter({
    max: 30,
    window: 60,
  }),
  
  relaxed: createRateLimiter({
    max: 100,
    window: 60,
  }),
  
  search: createRateLimiter({
    max: 20,
    window: 60,
    keyGenerator: (req) => {
      const userId = (req as any).userId || req.ip
      return `search:${userId}`
    },
  }),
  
  auth: createRateLimiter({
    max: 5,
    window: 900, // 15 minutes
    keyGenerator: (req) => `auth:${req.ip}`,
    skipSuccessfulRequests: true,
  }),

  // More specific auth rate limiters
  authLogin: createRateLimiter({
    max: 5,
    window: 900, // 15 minutes
    keyGenerator: (req) => `auth:login:${req.ip}`,
    skipSuccessfulRequests: true,
    customResponse: (_req, reply) => {
      reply.code(429).send({
        error: 'Too Many Login Attempts',
        message: 'Too many login attempts. Please try again in 15 minutes.',
        retryAfter: 900,
        securityNote: 'This is to protect your account from brute force attacks.',
      });
    },
  }),

  authRegister: createRateLimiter({
    max: 3,
    window: 3600, // 1 hour
    keyGenerator: (req) => `auth:register:${req.ip}`,
    skipSuccessfulRequests: true,
    customResponse: (_req, reply) => {
      reply.code(429).send({
        error: 'Too Many Registration Attempts',
        message: 'Too many registration attempts. Please try again in 1 hour.',
        retryAfter: 3600,
      });
    },
  }),

  authPasswordReset: createRateLimiter({
    max: 3,
    window: 3600, // 1 hour
    keyGenerator: (req) => `auth:password-reset:${req.ip}`,
    skipSuccessfulRequests: false, // Always count password reset attempts
    customResponse: (_req, reply) => {
      reply.code(429).send({
        error: 'Too Many Password Reset Attempts',
        message: 'Too many password reset attempts. Please try again in 1 hour.',
        retryAfter: 3600,
      });
    },
  }),

  authVerification: createRateLimiter({
    max: 5,
    window: 3600, // 1 hour
    keyGenerator: (req) => `auth:verification:${req.ip}`,
    skipSuccessfulRequests: true,
    customResponse: (_req, reply) => {
      reply.code(429).send({
        error: 'Too Many Verification Attempts',
        message: 'Too many email verification attempts. Please try again in 1 hour.',
        retryAfter: 3600,
      });
    },
  }),

  authRefresh: createRateLimiter({
    max: 20,
    window: 3600, // 1 hour
    keyGenerator: (req) => {
      // Extract user ID from token if available, fallback to IP
      const userId = (req as any).userId || req.ip;
      return `auth:refresh:${userId}`;
    },
    skipSuccessfulRequests: true,
    customResponse: (_req, reply) => {
      reply.code(429).send({
        error: 'Too Many Token Refresh Attempts',
        message: 'Too many token refresh attempts. Please sign in again.',
        retryAfter: 3600,
      });
    },
  }),
  
  streaming: createRateLimiter({
    max: 10,
    window: 60,
    keyGenerator: (req) => {
      const userId = (req as any).userId || req.ip
      return `streaming:${userId}`
    },
    customResponse: (_req, reply) => {
      reply.code(429).send({
        error: 'Too Many Requests',
        message: 'Streaming API rate limit exceeded. This endpoint is expensive to call.',
        upgradeMessage: 'Consider upgrading to premium for higher limits.',
      })
    },
  }),
  
  write: createRateLimiter({
    max: 20,
    window: 60,
    keyGenerator: (req) => {
      const userId = (req as any).userId || req.ip
      return `write:${userId}`
    },
  }),
}

export function applyRateLimiting(fastify: FastifyInstance) {
  fastify.addHook('onRoute', (routeOptions) => {
    const { method, url } = routeOptions
    
    if (method === 'GET') {
      if (url.includes('/search')) {
        routeOptions.preHandler = [
          ...(Array.isArray(routeOptions.preHandler) ? routeOptions.preHandler : []),
          rateLimiters.search,
        ]
      } else if (url.includes('/api/content')) {
        routeOptions.preHandler = [
          ...(Array.isArray(routeOptions.preHandler) ? routeOptions.preHandler : []),
          rateLimiters.standard,
        ]
      }
    }
    
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      if (url.includes('/auth')) {
        routeOptions.preHandler = [
          ...(Array.isArray(routeOptions.preHandler) ? routeOptions.preHandler : []),
          rateLimiters.auth,
        ]
      } else {
        routeOptions.preHandler = [
          ...(Array.isArray(routeOptions.preHandler) ? routeOptions.preHandler : []),
          rateLimiters.write,
        ]
      }
    }
    
    if (url.includes('/streaming') || url.includes('/platform')) {
      routeOptions.preHandler = [
        ...(Array.isArray(routeOptions.preHandler) ? routeOptions.preHandler : []),
        rateLimiters.streaming,
      ]
    }
  })
}

export function createDynamicRateLimiter(_fastify: FastifyInstance) {
  return async function dynamicRateLimiter(req: FastifyRequest, reply: FastifyReply) {
    const userTier = (req as any).userTier || 'free'
    
    const limits = {
      free: { max: 100, window: 3600 },
      pro: { max: 1000, window: 3600 },
      enterprise: { max: 10000, window: 3600 },
    }
    
    const limit = limits[userTier as keyof typeof limits] || limits.free
    const limiter = createRateLimiter({
      ...limit,
      keyGenerator: (req) => {
        const userId = (req as any).userId || req.ip
        return `dynamic:${userTier}:${userId}`
      },
    })
    
    await limiter(req, reply)
  }
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: Date
}

export async function getRateLimitInfo(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitInfo> {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_URL
  
  if (!redisUrl) {
    return {
      limit: options.max,
      remaining: options.max,
      reset: new Date(Date.now() + options.window * 1000),
    }
  }
  
  const redis = new Redis(redisUrl)
  const redisKey = `ratelimit:${key}`
  
  try {
    const count = await redis.get(redisKey)
    const ttl = await redis.ttl(redisKey)
    
    const currentCount = count ? parseInt(count, 10) : 0
    const remaining = Math.max(0, options.max - currentCount)
    const resetTime = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + options.window * 1000
    
    return {
      limit: options.max,
      remaining,
      reset: new Date(resetTime),
    }
  } finally {
    await redis.quit()
  }
}