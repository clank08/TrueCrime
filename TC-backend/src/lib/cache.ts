import Redis from 'ioredis'

type CacheOptions = {
  ttl?: number
  tags?: string[]
}

class CacheManager {
  private redis: Redis | null = null
  private defaultTTL = 3600
  private isEnabled = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_URL
    
    if (!redisUrl) {
      console.log('⚠️ Redis URL not configured - caching disabled')
      return
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('Redis connection failed after 3 retries')
            return null
          }
          return Math.min(times * 100, 2000)
        },
        reconnectOnError: (err) => {
          const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT']
          return targetErrors.some(e => err.message.includes(e))
        },
      })

      this.redis.on('connect', () => {
        console.log('✅ Redis connected')
        this.isEnabled = true
      })

      this.redis.on('error', (err) => {
        console.error('Redis error:', err.message)
        this.isEnabled = false
      })
    } catch (error) {
      console.error('Failed to initialize Redis:', error)
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.redis) return null

    try {
      const data = await this.redis.get(this.prefixKey(key))
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error(`Cache get error for ${key}:`, error)
      return null
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    if (!this.isEnabled || !this.redis) return

    const ttl = options.ttl || this.defaultTTL
    const prefixedKey = this.prefixKey(key)

    try {
      await this.redis.setex(prefixedKey, ttl, JSON.stringify(value))
      
      if (options.tags?.length) {
        await this.addToTags(prefixedKey, options.tags)
      }
    } catch (error) {
      console.error(`Cache set error for ${key}:`, error)
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isEnabled || !this.redis) return

    try {
      await this.redis.del(this.prefixKey(key))
    } catch (error) {
      console.error(`Cache delete error for ${key}:`, error)
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isEnabled || !this.redis) return

    try {
      const keys = await this.redis.keys(this.prefixKey(pattern))
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error(`Cache invalidate pattern error for ${pattern}:`, error)
    }
  }

  async invalidateTag(tag: string): Promise<void> {
    if (!this.isEnabled || !this.redis) return

    try {
      const tagKey = `tag:${tag}`
      const keys = await this.redis.smembers(tagKey)
      
      if (keys.length > 0) {
        await this.redis.del(...keys)
        await this.redis.del(tagKey)
      }
    } catch (error) {
      console.error(`Cache invalidate tag error for ${tag}:`, error)
    }
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isEnabled || !this.redis || keys.length === 0) {
      return keys.map(() => null)
    }

    try {
      const prefixedKeys = keys.map(k => this.prefixKey(k))
      const values = await this.redis.mget(...prefixedKeys)
      return values.map(v => v ? JSON.parse(v) : null)
    } catch (error) {
      console.error('Cache mget error:', error)
      return keys.map(() => null)
    }
  }

  async mset(items: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    if (!this.isEnabled || !this.redis || items.length === 0) return

    const pipeline = this.redis.pipeline()
    
    for (const item of items) {
      const ttl = item.ttl || this.defaultTTL
      pipeline.setex(this.prefixKey(item.key), ttl, JSON.stringify(item.value))
    }

    try {
      await pipeline.exec()
    } catch (error) {
      console.error('Cache mset error:', error)
    }
  }

  async remember<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) return cached

    const fresh = await fetcher()
    await this.set(key, fresh, options)
    return fresh
  }

  async flush(): Promise<void> {
    if (!this.isEnabled || !this.redis) return

    try {
      const keys = await this.redis.keys(this.prefixKey('*'))
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error('Cache flush error:', error)
    }
  }

  private prefixKey(key: string): string {
    const prefix = process.env.CACHE_PREFIX || 'tc'
    return `${prefix}:${key}`
  }

  private async addToTags(key: string, tags: string[]): Promise<void> {
    if (!this.redis) return

    const pipeline = this.redis.pipeline()
    
    for (const tag of tags) {
      pipeline.sadd(`tag:${tag}`, key)
    }

    try {
      await pipeline.exec()
    } catch (error) {
      console.error('Failed to add cache tags:', error)
    }
  }

  isConnected(): boolean {
    return this.isEnabled
  }

  async quit(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
    }
  }
}

export const cache = new CacheManager()

export const cacheDurations = {
  none: 0,
  short: 60,
  medium: 300,
  standard: 3600,
  long: 7200,
  day: 86400,
  week: 604800,
} as const

export const cacheKeyGenerators = {
  content: {
    detail: (id: string) => `content:${id}`,
    list: (page: number, limit: number) => `content:list:${page}:${limit}`,
    byCase: (caseId: string) => `content:case:${caseId}`,
    byKiller: (killerId: string) => `content:killer:${killerId}`,
    byPlatform: (platform: string) => `content:platform:${platform}`,
    availability: (contentId: string) => `content:${contentId}:availability`,
  },
  
  user: {
    profile: (userId: string) => `user:${userId}:profile`,
    watchlist: (userId: string) => `user:${userId}:watchlist`,
    progress: (userId: string, contentId?: string) => 
      contentId ? `user:${userId}:progress:${contentId}` : `user:${userId}:progress`,
    preferences: (userId: string) => `user:${userId}:preferences`,
  },
  
  search: {
    results: (query: string, filters: string) => `search:${query}:${filters}`,
    suggestions: (query: string) => `search:suggestions:${query}`,
  },
  
  platform: {
    all: () => 'platform:all',
    details: (platform: string) => `platform:${platform}`,
    pricing: () => 'platform:pricing',
  },
  
  stats: {
    trending: (period: string) => `stats:trending:${period}`,
    popular: (category: string) => `stats:popular:${category}`,
  },
}

export const withCache = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number = cacheDurations.standard
): T => {
  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args)
    return cache.remember(key, () => fn(...args), { ttl })
  }) as T
}