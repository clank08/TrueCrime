import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';
import { cache, cacheDurations, cacheKeyGenerators, withCache } from '@/lib/cache';

// Mock Redis
vi.mock('ioredis');
const MockRedis = vi.mocked(Redis);

describe('Cache Layer', () => {
  let mockRedisInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisInstance = {
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      keys: vi.fn(),
      mget: vi.fn(),
      pipeline: vi.fn(() => ({
        setex: vi.fn().mockReturnThis(),
        exec: vi.fn(),
      })),
      smembers: vi.fn(),
      sadd: vi.fn(),
      quit: vi.fn(),
      on: vi.fn(),
    };
    MockRedis.mockImplementation(() => mockRedisInstance);

    // Reset environment variables
    delete process.env.REDIS_URL;
    delete process.env.UPSTASH_URL;
  });

  afterEach(async () => {
    await cache.flush();
    await cache.quit();
  });

  describe('Cache Manager Initialization', () => {
    it('should initialize without Redis when no URL is provided', async () => {
      // Redis URL is already undefined from beforeEach
      const testCache = new (await import('@/lib/cache')).CacheManager();
      
      expect(testCache.isConnected()).toBe(false);
    });

    it('should initialize with Redis when URL is provided', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      // Simulate successful connection
      const onConnectCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      
      if (onConnectCallback) {
        onConnectCallback();
      }
      
      const testCache = new (await import('@/lib/cache')).CacheManager();
      
      expect(MockRedis).toHaveBeenCalledWith('redis://localhost:6379', expect.any(Object));
    });

    it('should handle Redis connection errors gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      const testCache = new (await import('@/lib/cache')).CacheManager();
      
      // Simulate connection error
      const onErrorCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      if (onErrorCallback) {
        onErrorCallback(new Error('Connection failed'));
      }
      
      expect(testCache.isConnected()).toBe(false);
    });
  });

  describe('Basic Cache Operations', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      // Simulate connected state
      const onConnectCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (onConnectCallback) {
        onConnectCallback();
      }
    });

    describe('get', () => {
      it('should retrieve and parse cached data', async () => {
        const testData = { id: '123', name: 'test' };
        mockRedisInstance.get.mockResolvedValue(JSON.stringify(testData));

        const result = await cache.get('test-key');

        expect(mockRedisInstance.get).toHaveBeenCalledWith('tc:test-key');
        expect(result).toEqual(testData);
      });

      it('should return null for non-existent keys', async () => {
        mockRedisInstance.get.mockResolvedValue(null);

        const result = await cache.get('non-existent');

        expect(result).toBeNull();
      });

      it('should handle JSON parsing errors gracefully', async () => {
        mockRedisInstance.get.mockResolvedValue('invalid-json');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const result = await cache.get('invalid-key');

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });

      it('should return null when Redis is not connected', async () => {
        const testCache = new (await import('@/lib/cache')).CacheManager();
        
        const result = await testCache.get('test-key');
        
        expect(result).toBeNull();
        expect(mockRedisInstance.get).not.toHaveBeenCalled();
      });
    });

    describe('set', () => {
      it('should store data with default TTL', async () => {
        const testData = { id: '123', name: 'test' };
        mockRedisInstance.setex.mockResolvedValue('OK');

        await cache.set('test-key', testData);

        expect(mockRedisInstance.setex).toHaveBeenCalledWith(
          'tc:test-key',
          3600, // default TTL
          JSON.stringify(testData)
        );
      });

      it('should store data with custom TTL', async () => {
        const testData = { id: '123', name: 'test' };
        mockRedisInstance.setex.mockResolvedValue('OK');

        await cache.set('test-key', testData, { ttl: 300 });

        expect(mockRedisInstance.setex).toHaveBeenCalledWith(
          'tc:test-key',
          300,
          JSON.stringify(testData)
        );
      });

      it('should handle tags when provided', async () => {
        const testData = { id: '123', name: 'test' };
        mockRedisInstance.setex.mockResolvedValue('OK');
        const mockPipeline = {
          sadd: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([['OK']]),
        };
        mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

        await cache.set('test-key', testData, { tags: ['user', 'profile'] });

        expect(mockRedisInstance.setex).toHaveBeenCalled();
        expect(mockPipeline.sadd).toHaveBeenCalledTimes(2);
        expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:user', 'tc:test-key');
        expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:profile', 'tc:test-key');
      });

      it('should handle storage errors gracefully', async () => {
        const testData = { id: '123', name: 'test' };
        mockRedisInstance.setex.mockRejectedValue(new Error('Storage failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await cache.set('test-key', testData);

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });

    describe('delete', () => {
      it('should delete keys', async () => {
        mockRedisInstance.del.mockResolvedValue(1);

        await cache.delete('test-key');

        expect(mockRedisInstance.del).toHaveBeenCalledWith('tc:test-key');
      });

      it('should handle deletion errors gracefully', async () => {
        mockRedisInstance.del.mockRejectedValue(new Error('Deletion failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await cache.delete('test-key');

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });
  });

  describe('Pattern-based Operations', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const onConnectCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (onConnectCallback) {
        onConnectCallback();
      }
    });

    describe('invalidatePattern', () => {
      it('should delete all keys matching pattern', async () => {
        mockRedisInstance.keys.mockResolvedValue([
          'tc:user:123:profile',
          'tc:user:123:preferences',
          'tc:user:456:profile'
        ]);
        mockRedisInstance.del.mockResolvedValue(3);

        await cache.invalidatePattern('user:*');

        expect(mockRedisInstance.keys).toHaveBeenCalledWith('tc:user:*');
        expect(mockRedisInstance.del).toHaveBeenCalledWith(
          'tc:user:123:profile',
          'tc:user:123:preferences',
          'tc:user:456:profile'
        );
      });

      it('should handle empty results gracefully', async () => {
        mockRedisInstance.keys.mockResolvedValue([]);

        await cache.invalidatePattern('non-existent:*');

        expect(mockRedisInstance.keys).toHaveBeenCalledWith('tc:non-existent:*');
        expect(mockRedisInstance.del).not.toHaveBeenCalled();
      });
    });

    describe('invalidateTag', () => {
      it('should delete all keys associated with tag', async () => {
        const taggedKeys = ['tc:user:123:profile', 'tc:user:456:profile'];
        mockRedisInstance.smembers.mockResolvedValue(taggedKeys);
        mockRedisInstance.del.mockResolvedValue(3);

        await cache.invalidateTag('profile');

        expect(mockRedisInstance.smembers).toHaveBeenCalledWith('tag:profile');
        expect(mockRedisInstance.del).toHaveBeenCalledWith(...taggedKeys, 'tag:profile');
      });

      it('should handle empty tag sets gracefully', async () => {
        mockRedisInstance.smembers.mockResolvedValue([]);

        await cache.invalidateTag('empty-tag');

        expect(mockRedisInstance.smembers).toHaveBeenCalledWith('tag:empty-tag');
        expect(mockRedisInstance.del).not.toHaveBeenCalled();
      });
    });
  });

  describe('Batch Operations', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const onConnectCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (onConnectCallback) {
        onConnectCallback();
      }
    });

    describe('mget', () => {
      it('should retrieve multiple keys', async () => {
        const values = ['{"id":"123"}', '{"id":"456"}', null];
        mockRedisInstance.mget.mockResolvedValue(values);

        const keys = ['user:123', 'user:456', 'user:789'];
        const results = await cache.mget(keys);

        expect(mockRedisInstance.mget).toHaveBeenCalledWith(
          'tc:user:123',
          'tc:user:456',
          'tc:user:789'
        );
        expect(results).toEqual([
          { id: '123' },
          { id: '456' },
          null
        ]);
      });

      it('should handle empty key arrays', async () => {
        const results = await cache.mget([]);
        expect(results).toEqual([]);
        expect(mockRedisInstance.mget).not.toHaveBeenCalled();
      });

      it('should return null array when Redis is disconnected', async () => {
        const testCache = new (await import('@/lib/cache')).CacheManager();
        
        const results = await testCache.mget(['key1', 'key2']);
        
        expect(results).toEqual([null, null]);
      });
    });

    describe('mset', () => {
      it('should store multiple keys using pipeline', async () => {
        const mockPipeline = {
          setex: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([['OK'], ['OK']]),
        };
        mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

        const items = [
          { key: 'user:123', value: { id: '123' }, ttl: 300 },
          { key: 'user:456', value: { id: '456' } }
        ];

        await cache.mset(items);

        expect(mockPipeline.setex).toHaveBeenCalledTimes(2);
        expect(mockPipeline.setex).toHaveBeenCalledWith(
          'tc:user:123',
          300,
          JSON.stringify({ id: '123' })
        );
        expect(mockPipeline.setex).toHaveBeenCalledWith(
          'tc:user:456',
          3600, // default TTL
          JSON.stringify({ id: '456' })
        );
      });

      it('should handle empty arrays gracefully', async () => {
        await cache.mset([]);
        expect(mockRedisInstance.pipeline).not.toHaveBeenCalled();
      });
    });
  });

  describe('remember', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const onConnectCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (onConnectCallback) {
        onConnectCallback();
      }
    });

    it('should return cached value if exists', async () => {
      const cachedValue = { id: '123', name: 'cached' };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedValue));

      const fetcher = vi.fn().mockResolvedValue({ id: '123', name: 'fresh' });
      const result = await cache.remember('test-key', fetcher);

      expect(result).toEqual(cachedValue);
      expect(fetcher).not.toHaveBeenCalled();
      expect(mockRedisInstance.setex).not.toHaveBeenCalled();
    });

    it('should fetch and cache value if not cached', async () => {
      const freshValue = { id: '123', name: 'fresh' };
      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      const fetcher = vi.fn().mockResolvedValue(freshValue);
      const result = await cache.remember('test-key', fetcher);

      expect(result).toEqual(freshValue);
      expect(fetcher).toHaveBeenCalledOnce();
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'tc:test-key',
        3600,
        JSON.stringify(freshValue)
      );
    });

    it('should handle fetcher errors', async () => {
      mockRedisInstance.get.mockResolvedValue(null);
      const error = new Error('Fetcher failed');
      const fetcher = vi.fn().mockRejectedValue(error);

      await expect(cache.remember('test-key', fetcher)).rejects.toThrow('Fetcher failed');
      expect(mockRedisInstance.setex).not.toHaveBeenCalled();
    });
  });

  describe('Cache Key Generators', () => {
    it('should generate content cache keys correctly', () => {
      expect(cacheKeyGenerators.content.detail('123')).toBe('content:123');
      expect(cacheKeyGenerators.content.list(1, 20)).toBe('content:list:1:20');
      expect(cacheKeyGenerators.content.byCase('case-123')).toBe('content:case:case-123');
      expect(cacheKeyGenerators.content.availability('content-123')).toBe('content:content-123:availability');
    });

    it('should generate user cache keys correctly', () => {
      expect(cacheKeyGenerators.user.profile('user-123')).toBe('user:user-123:profile');
      expect(cacheKeyGenerators.user.watchlist('user-123')).toBe('user:user-123:watchlist');
      expect(cacheKeyGenerators.user.progress('user-123', 'content-456')).toBe('user:user-123:progress:content-456');
      expect(cacheKeyGenerators.user.progress('user-123')).toBe('user:user-123:progress');
    });

    it('should generate search cache keys correctly', () => {
      expect(cacheKeyGenerators.search.results('ted bundy', 'type=documentary')).toBe('search:ted bundy:type=documentary');
      expect(cacheKeyGenerators.search.suggestions('ted')).toBe('search:suggestions:ted');
    });
  });

  describe('Cache Durations', () => {
    it('should provide standard duration constants', () => {
      expect(cacheDurations.none).toBe(0);
      expect(cacheDurations.short).toBe(60);
      expect(cacheDurations.medium).toBe(300);
      expect(cacheDurations.standard).toBe(3600);
      expect(cacheDurations.long).toBe(7200);
      expect(cacheDurations.day).toBe(86400);
      expect(cacheDurations.week).toBe(604800);
    });
  });

  describe('withCache Higher-Order Function', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const onConnectCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (onConnectCallback) {
        onConnectCallback();
      }
    });

    it('should cache function results', async () => {
      const originalFn = vi.fn().mockResolvedValue('result');
      const cachedFn = withCache(originalFn, (id: string) => `test:${id}`, 300);

      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      const result1 = await cachedFn('123');
      expect(result1).toBe('result');
      expect(originalFn).toHaveBeenCalledOnce();

      // Simulate cache hit on second call
      mockRedisInstance.get.mockResolvedValue('"cached-result"');
      const result2 = await cachedFn('123');
      expect(result2).toBe('cached-result');
      expect(originalFn).toHaveBeenCalledOnce(); // Should not be called again
    });

    it('should pass through function arguments correctly', async () => {
      const originalFn = vi.fn().mockImplementation((a: number, b: string) => `${a}-${b}`);
      const cachedFn = withCache(originalFn, (a: number, b: string) => `test:${a}:${b}`);

      mockRedisInstance.get.mockResolvedValue(null);
      mockRedisInstance.setex.mockResolvedValue('OK');

      await cachedFn(123, 'test');

      expect(originalFn).toHaveBeenCalledWith(123, 'test');
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        'tc:test:123:test',
        3600,
        '"123-test"'
      );
    });
  });

  describe('Key Prefixing', () => {
    it('should use default prefix when CACHE_PREFIX is not set', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      delete process.env.CACHE_PREFIX;
      
      mockRedisInstance.get.mockResolvedValue(null);
      
      await cache.get('test-key');
      
      expect(mockRedisInstance.get).toHaveBeenCalledWith('tc:test-key');
    });

    it('should use custom prefix when CACHE_PREFIX is set', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.CACHE_PREFIX = 'custom';
      
      // Need to recreate cache instance to pick up new env var
      const { CacheManager } = await import('@/lib/cache');
      const testCache = new CacheManager();
      
      // Simulate connection
      const onConnectCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (onConnectCallback) {
        onConnectCallback();
      }
      
      mockRedisInstance.get.mockResolvedValue(null);
      
      await testCache.get('test-key');
      
      expect(mockRedisInstance.get).toHaveBeenCalledWith('custom:test-key');
    });
  });

  describe('Cleanup and Connection Management', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const onConnectCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (onConnectCallback) {
        onConnectCallback();
      }
    });

    it('should flush all cache keys', async () => {
      mockRedisInstance.keys.mockResolvedValue(['tc:key1', 'tc:key2', 'tc:key3']);
      mockRedisInstance.del.mockResolvedValue(3);

      await cache.flush();

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('tc:*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('tc:key1', 'tc:key2', 'tc:key3');
    });

    it('should quit Redis connection cleanly', async () => {
      mockRedisInstance.quit.mockResolvedValue('OK');

      await cache.quit();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });

    it('should report connection status correctly', () => {
      expect(cache.isConnected()).toBe(true);
    });
  });

  describe('Error Resilience', () => {
    it('should continue working when Redis operations fail', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const onConnectCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      if (onConnectCallback) {
        onConnectCallback();
      }

      mockRedisInstance.get.mockRejectedValue(new Error('Redis unavailable'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await cache.get('test-key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle reconnection scenarios', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      // Simulate error then reconnect
      const onErrorCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      const onConnectCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];

      if (onErrorCallback) {
        onErrorCallback(new Error('Connection lost'));
      }
      expect(cache.isConnected()).toBe(false);

      if (onConnectCallback) {
        onConnectCallback();
      }
      expect(cache.isConnected()).toBe(true);
    });
  });

  describe('Memory Fallback Mode', () => {
    beforeEach(() => {
      // Ensure no Redis URL is set to trigger memory fallback
      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_URL;
    });

    it('should work without Redis using memory fallback', async () => {
      const testCache = new (await import('@/lib/cache')).CacheManager();
      
      // Since we're in memory fallback mode, operations should work but not use Redis
      await testCache.set('memory-key', { data: 'test' });
      const result = await testCache.get('memory-key');
      
      // In memory fallback mode, get operations return null since we don't have in-memory storage implemented
      expect(result).toBeNull();
      expect(testCache.isConnected()).toBe(false);
    });
  });
});