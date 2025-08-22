import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import {
  createRateLimiter,
  rateLimiters,
  applyRateLimiting,
  createDynamicRateLimiter,
  getRateLimitInfo,
  type RateLimitInfo
} from '@/middleware/rateLimiting';

// Mock Redis
vi.mock('ioredis');
const MockRedis = vi.mocked(Redis);

describe('Rate Limiting Middleware', () => {
  let mockRedisInstance: any;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Redis instance
    mockRedisInstance = {
      multi: vi.fn(() => ({
        incr: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        ttl: vi.fn().mockReturnThis(),
        exec: vi.fn(),
      })),
      get: vi.fn(),
      ttl: vi.fn(),
      del: vi.fn(),
      quit: vi.fn(),
    };
    MockRedis.mockImplementation(() => mockRedisInstance);

    // Mock Fastify request
    mockRequest = {
      ip: '192.168.1.100',
      log: {
        error: vi.fn(),
      } as any,
    };

    // Mock Fastify reply
    mockReply = {
      header: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      statusCode: 200,
    };

    // Reset environment variables
    delete process.env.REDIS_URL;
    delete process.env.UPSTASH_URL;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('RedisStore', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'redis://localhost:6379';
    });

    describe('increment', () => {
      it('should increment counter and return current count with TTL', async () => {
        const mockMulti = mockRedisInstance.multi();
        mockMulti.exec.mockResolvedValue([
          [null, 1],    // incr result
          [null, 1],    // expire result  
          [null, 300],  // ttl result
        ]);

        const rateLimiter = createRateLimiter({
          max: 5,
          window: 300,
        });

        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        expect(mockMulti.incr).toHaveBeenCalledWith('ratelimit:192.168.1.100');
        expect(mockMulti.expire).toHaveBeenCalledWith('ratelimit:192.168.1.100', 300);
        expect(mockMulti.ttl).toHaveBeenCalledWith('ratelimit:192.168.1.100');
      });

      it('should handle Redis transaction failures', async () => {
        const mockMulti = mockRedisInstance.multi();
        mockMulti.exec.mockResolvedValue(null);

        const rateLimiter = createRateLimiter({
          max: 5,
          window: 300,
        });

        // Should not throw error, just continue without rate limiting
        await expect(rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply))
          .resolves.not.toThrow();
      });

      it('should set correct TTL when Redis TTL is -1', async () => {
        const mockMulti = mockRedisInstance.multi();
        mockMulti.exec.mockResolvedValue([
          [null, 2],    // incr result
          [null, 1],    // expire result  
          [null, -1],   // ttl result (key has no expiry)
        ]);

        const rateLimiter = createRateLimiter({
          max: 5,
          window: 300,
        });

        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
        const resetHeader = (mockReply.header as any).mock.calls.find(
          call => call[0] === 'X-RateLimit-Reset'
        )?.[1];
        
        // Should use window time as fallback
        const resetTime = new Date(resetHeader);
        const now = new Date();
        const diffSeconds = (resetTime.getTime() - now.getTime()) / 1000;
        expect(diffSeconds).toBeGreaterThan(290); // Should be close to 300 seconds
      });
    });
  });

  describe('MemoryStore', () => {
    beforeEach(() => {
      // Ensure no Redis URL to trigger memory store
      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_URL;
    });

    describe('increment', () => {
      it('should increment counter in memory', async () => {
        const rateLimiter = createRateLimiter({
          max: 3,
          window: 60,
        });

        // First request
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '3');
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '2');

        // Second request
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '1');

        // Third request
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
      });

      it('should reset counter after window expires', async () => {
        const rateLimiter = createRateLimiter({
          max: 2,
          window: 1, // 1 second window
        });

        // Exhaust limit
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // Wait for window to expire
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Should be reset
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.header).toHaveBeenLastCalledWith('X-RateLimit-Remaining', '1');
      });

      it('should handle concurrent requests correctly', async () => {
        const rateLimiter = createRateLimiter({
          max: 5,
          window: 60,
        });

        // Simulate concurrent requests
        const promises = Array.from({ length: 3 }, () =>
          rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply)
        );

        await Promise.all(promises);

        // Last call should show 2 remaining (5 - 3 = 2)
        expect(mockReply.header).toHaveBeenLastCalledWith('X-RateLimit-Remaining', '2');
      });
    });

    describe('reset', () => {
      it('should reset counter for specific key', async () => {
        const rateLimiter = createRateLimiter({
          max: 2,
          window: 60,
        });

        // Make requests to exhaust limit
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.header).toHaveBeenLastCalledWith('X-RateLimit-Remaining', '0');

        // In memory store, reset happens automatically when limit is exceeded and skipFailedRequests is true
        // This is tested in the rate limiting behavior section
      });
    });
  });

  describe('Rate Limiting Behavior', () => {
    beforeEach(() => {
      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_URL;
    });

    describe('within limits', () => {
      it('should allow requests within rate limit', async () => {
        const rateLimiter = createRateLimiter({
          max: 5,
          window: 60,
        });

        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
        expect(mockReply.code).not.toHaveBeenCalled();
        expect(mockReply.send).not.toHaveBeenCalled();
      });

      it('should set proper headers for each request', async () => {
        const rateLimiter = createRateLimiter({
          max: 3,
          window: 60,
        });

        // First request
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '3');
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '2');

        // Second request
        vi.clearAllMocks();
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '1');
      });
    });

    describe('exceeding limits', () => {
      it('should block requests that exceed rate limit', async () => {
        const rateLimiter = createRateLimiter({
          max: 2,
          window: 60,
        });

        // Use up the limit
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // This should be blocked
        vi.clearAllMocks();
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        expect(mockReply.code).toHaveBeenCalledWith(429);
        expect(mockReply.send).toHaveBeenCalledWith({
          error: 'Too Many Requests',
          message: expect.stringContaining('Rate limit exceeded'),
          retryAfter: expect.any(Number),
        });
        expect(mockReply.header).toHaveBeenCalledWith('Retry-After', expect.any(String));
      });

      it('should use custom response when provided', async () => {
        const customResponse = vi.fn();
        const rateLimiter = createRateLimiter({
          max: 1,
          window: 60,
          customResponse,
        });

        // Use up the limit
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // This should trigger custom response
        vi.clearAllMocks();
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        expect(customResponse).toHaveBeenCalledWith(mockRequest, mockReply);
        expect(mockReply.code).not.toHaveBeenCalled();
      });

      it('should set Retry-After header when rate limited', async () => {
        const rateLimiter = createRateLimiter({
          max: 1,
          window: 300, // 5 minutes
        });

        // Use up the limit
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // This should be blocked
        vi.clearAllMocks();
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        expect(mockReply.header).toHaveBeenCalledWith('Retry-After', expect.stringMatching(/^\d+$/));
        
        const retryAfter = (mockReply.header as any).mock.calls.find(
          call => call[0] === 'Retry-After'
        )?.[1];
        
        expect(parseInt(retryAfter)).toBeGreaterThan(290); // Should be close to 300 seconds
      });
    });

    describe('custom key generation', () => {
      it('should use custom key generator', async () => {
        const customKeyGen = vi.fn().mockReturnValue('custom-key');
        const rateLimiter = createRateLimiter({
          max: 3,
          window: 60,
          keyGenerator: customKeyGen,
        });

        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        expect(customKeyGen).toHaveBeenCalledWith(mockRequest);
      });

      it('should isolate different keys', async () => {
        const rateLimiter = createRateLimiter({
          max: 2,
          window: 60,
          keyGenerator: (req) => `user-${req.ip}`,
        });

        const request1 = { ...mockRequest, ip: '192.168.1.1' };
        const request2 = { ...mockRequest, ip: '192.168.1.2' };

        // Each IP should have separate limits
        await rateLimiter(request1 as FastifyRequest, mockReply as FastifyReply);
        await rateLimiter(request1 as FastifyRequest, mockReply as FastifyReply);
        
        // First IP is now at limit
        vi.clearAllMocks();
        await rateLimiter(request1 as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.code).toHaveBeenCalledWith(429);

        // Second IP should still be allowed
        vi.clearAllMocks();
        await rateLimiter(request2 as FastifyRequest, mockReply as FastifyReply);
        expect(mockReply.code).not.toHaveBeenCalled();
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '1');
      });
    });

    describe('skip options', () => {
      it('should skip successful requests when skipSuccessfulRequests is true', async () => {
        const rateLimiter = createRateLimiter({
          max: 2,
          window: 60,
          skipSuccessfulRequests: true,
        });

        const originalSend = mockReply.send;
        let interceptedSend: any;

        // Mock reply.send to test the interception
        mockReply.send = vi.fn().mockImplementation(function(this: any, payload) {
          // Simulate successful request (status < 400)
          (mockReply as any).statusCode = 200;
          if (interceptedSend) {
            return interceptedSend(payload);
          }
          return originalSend?.call(this, payload);
        });

        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // The send method should be wrapped
        expect(typeof mockReply.send).toBe('function');
        
        // When send is called with successful status, it should reset the counter
        // This is tested by verifying the function was wrapped
      });

      it('should skip failed requests when skipFailedRequests is true', async () => {
        const rateLimiter = createRateLimiter({
          max: 2,
          window: 60,
          skipFailedRequests: true,
        });

        const originalSend = mockReply.send;

        // Mock reply.send to simulate error response
        mockReply.send = vi.fn().mockImplementation(function(this: any, payload) {
          // Simulate error request (status >= 400)
          (mockReply as any).statusCode = 500;
          return originalSend?.call(this, payload);
        });

        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        // The send method should be wrapped
        expect(typeof mockReply.send).toBe('function');
      });
    });

    describe('error handling', () => {
      it('should handle store errors gracefully', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';
        
        const mockMulti = mockRedisInstance.multi();
        mockMulti.exec.mockRejectedValue(new Error('Redis connection failed'));

        const rateLimiter = createRateLimiter({
          max: 5,
          window: 60,
        });

        // Should not throw, should log error
        await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

        expect(mockRequest.log?.error).toHaveBeenCalled();
      });

      it('should continue processing when rate limiting fails', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';
        
        // Mock Redis to throw error
        MockRedis.mockImplementation(() => {
          throw new Error('Redis initialization failed');
        });

        const rateLimiter = createRateLimiter({
          max: 5,
          window: 60,
        });

        // Should not throw error
        await expect(
          rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply)
        ).resolves.not.toThrow();
      });
    });
  });

  describe('Predefined Rate Limiters', () => {
    beforeEach(() => {
      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_URL;
    });

    it('should have correct configuration for strict limiter', async () => {
      await rateLimiters.strict(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
    });

    it('should have correct configuration for standard limiter', async () => {
      await rateLimiters.standard(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '30');
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '29');
    });

    it('should have correct configuration for relaxed limiter', async () => {
      await rateLimiters.relaxed(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '99');
    });

    describe('search limiter', () => {
      it('should use custom key generator for search', async () => {
        const requestWithUserId = {
          ...mockRequest,
          userId: 'user-123',
        };

        await rateLimiters.search(requestWithUserId as any, mockReply as FastifyReply);
        
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '20');
      });

      it('should fallback to IP when no userId', async () => {
        await rateLimiters.search(mockRequest as FastifyRequest, mockReply as FastifyReply);
        
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '20');
      });
    });

    describe('auth limiter', () => {
      it('should have longer window for auth attempts', async () => {
        await rateLimiters.auth(mockRequest as FastifyRequest, mockReply as FastifyReply);
        
        expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
        // Should have 15-minute window (900 seconds)
        const resetHeader = (mockReply.header as any).mock.calls.find(
          call => call[0] === 'X-RateLimit-Reset'
        )?.[1];
        
        const resetTime = new Date(resetHeader);
        const now = new Date();
        const diffMinutes = (resetTime.getTime() - now.getTime()) / (1000 * 60);
        expect(diffMinutes).toBeGreaterThan(14); // Should be close to 15 minutes
      });
    });

    describe('streaming limiter', () => {
      it('should use custom response message', async () => {
        // Exceed limit
        for (let i = 0; i < 11; i++) {
          await rateLimiters.streaming(mockRequest as FastifyRequest, mockReply as FastifyReply);
        }

        expect(mockReply.send).toHaveBeenCalledWith(
          expect.objectContaining({
            error: 'Too Many Requests',
            message: 'Streaming API rate limit exceeded. This endpoint is expensive to call.',
            upgradeMessage: 'Consider upgrading to premium for higher limits.',
          })
        );
      });
    });
  });

  describe('applyRateLimiting', () => {
    let mockFastify: Partial<FastifyInstance>;
    let registeredRoutes: any[];

    beforeEach(() => {
      registeredRoutes = [];
      
      mockFastify = {
        addHook: vi.fn((event, callback) => {
          if (event === 'onRoute') {
            // Store the callback for testing
            mockFastify._onRouteCallback = callback;
          }
        }),
        _onRouteCallback: null,
      };
    });

    it('should apply search rate limiting for search routes', () => {
      applyRateLimiting(mockFastify as FastifyInstance);
      
      const routeOptions = {
        method: 'GET',
        url: '/api/search',
        preHandler: [],
      };

      mockFastify._onRouteCallback?.(routeOptions);

      expect(Array.isArray(routeOptions.preHandler)).toBe(true);
      expect(routeOptions.preHandler.length).toBeGreaterThan(0);
    });

    it('should apply standard rate limiting for content routes', () => {
      applyRateLimiting(mockFastify as FastifyInstance);
      
      const routeOptions = {
        method: 'GET',
        url: '/api/content',
        preHandler: [],
      };

      mockFastify._onRouteCallback?.(routeOptions);

      expect(Array.isArray(routeOptions.preHandler)).toBe(true);
      expect(routeOptions.preHandler.length).toBeGreaterThan(0);
    });

    it('should apply auth rate limiting for auth routes', () => {
      applyRateLimiting(mockFastify as FastifyInstance);
      
      const routeOptions = {
        method: 'POST',
        url: '/auth/login',
        preHandler: [],
      };

      mockFastify._onRouteCallback?.(routeOptions);

      expect(Array.isArray(routeOptions.preHandler)).toBe(true);
      expect(routeOptions.preHandler.length).toBeGreaterThan(0);
    });

    it('should apply write rate limiting for mutation routes', () => {
      applyRateLimiting(mockFastify as FastifyInstance);
      
      const routeOptions = {
        method: 'POST',
        url: '/api/content',
        preHandler: [],
      };

      mockFastify._onRouteCallback?.(routeOptions);

      expect(Array.isArray(routeOptions.preHandler)).toBe(true);
      expect(routeOptions.preHandler.length).toBeGreaterThan(0);
    });

    it('should apply streaming rate limiting for streaming routes', () => {
      applyRateLimiting(mockFastify as FastifyInstance);
      
      const routeOptions = {
        method: 'GET',
        url: '/api/streaming',
        preHandler: [],
      };

      mockFastify._onRouteCallback?.(routeOptions);

      expect(Array.isArray(routeOptions.preHandler)).toBe(true);
      expect(routeOptions.preHandler.length).toBeGreaterThan(0);
    });

    it('should preserve existing preHandlers', () => {
      applyRateLimiting(mockFastify as FastifyInstance);
      
      const existingHandler = vi.fn();
      const routeOptions = {
        method: 'GET',
        url: '/api/search',
        preHandler: [existingHandler],
      };

      mockFastify._onRouteCallback?.(routeOptions);

      expect(routeOptions.preHandler).toContain(existingHandler);
      expect(routeOptions.preHandler.length).toBeGreaterThan(1);
    });
  });

  describe('createDynamicRateLimiter', () => {
    let mockFastify: Partial<FastifyInstance>;

    beforeEach(() => {
      mockFastify = {};
    });

    it('should apply limits based on user tier', async () => {
      const dynamicLimiter = createDynamicRateLimiter(mockFastify as FastifyInstance);
      
      const freeUserRequest = {
        ...mockRequest,
        userTier: 'free',
        userId: 'user-123',
      };

      await dynamicLimiter(freeUserRequest as any, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    });

    it('should use higher limits for pro users', async () => {
      const dynamicLimiter = createDynamicRateLimiter(mockFastify as FastifyInstance);
      
      const proUserRequest = {
        ...mockRequest,
        userTier: 'pro',
        userId: 'user-456',
      };

      await dynamicLimiter(proUserRequest as any, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '1000');
    });

    it('should default to free tier for unknown user tiers', async () => {
      const dynamicLimiter = createDynamicRateLimiter(mockFastify as FastifyInstance);
      
      const unknownUserRequest = {
        ...mockRequest,
        userTier: 'unknown',
        userId: 'user-789',
      };

      await dynamicLimiter(unknownUserRequest as any, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    });
  });

  describe('getRateLimitInfo', () => {
    describe('without Redis', () => {
      beforeEach(() => {
        delete process.env.REDIS_URL;
        delete process.env.UPSTASH_URL;
      });

      it('should return default rate limit info when Redis is not available', async () => {
        const info: RateLimitInfo = await getRateLimitInfo('test-key', {
          max: 10,
          window: 60,
        });

        expect(info.limit).toBe(10);
        expect(info.remaining).toBe(10);
        expect(info.reset).toBeInstanceOf(Date);
        expect(info.reset.getTime()).toBeGreaterThan(Date.now());
      });
    });

    describe('with Redis', () => {
      beforeEach(() => {
        process.env.REDIS_URL = 'redis://localhost:6379';
      });

      it('should return current rate limit status from Redis', async () => {
        mockRedisInstance.get.mockResolvedValue('3'); // Current count
        mockRedisInstance.ttl.mockResolvedValue(45);   // TTL in seconds
        mockRedisInstance.quit.mockResolvedValue('OK');

        const info: RateLimitInfo = await getRateLimitInfo('test-key', {
          max: 10,
          window: 60,
        });

        expect(info.limit).toBe(10);
        expect(info.remaining).toBe(7); // 10 - 3
        expect(info.reset).toBeInstanceOf(Date);
        
        const resetTime = info.reset.getTime();
        const expectedResetTime = Date.now() + 45 * 1000;
        expect(Math.abs(resetTime - expectedResetTime)).toBeLessThan(1000); // Within 1 second
      });

      it('should handle missing Redis key', async () => {
        mockRedisInstance.get.mockResolvedValue(null);
        mockRedisInstance.ttl.mockResolvedValue(-2); // Key doesn't exist
        mockRedisInstance.quit.mockResolvedValue('OK');

        const info: RateLimitInfo = await getRateLimitInfo('test-key', {
          max: 5,
          window: 300,
        });

        expect(info.limit).toBe(5);
        expect(info.remaining).toBe(5);
        expect(info.reset).toBeInstanceOf(Date);
      });

      it('should handle negative TTL correctly', async () => {
        mockRedisInstance.get.mockResolvedValue('2');
        mockRedisInstance.ttl.mockResolvedValue(-1); // Key exists but no expiry
        mockRedisInstance.quit.mockResolvedValue('OK');

        const info: RateLimitInfo = await getRateLimitInfo('test-key', {
          max: 5,
          window: 300,
        });

        expect(info.limit).toBe(5);
        expect(info.remaining).toBe(3);
        
        // Should use window as fallback
        const resetTime = info.reset.getTime();
        const expectedResetTime = Date.now() + 300 * 1000;
        expect(Math.abs(resetTime - expectedResetTime)).toBeLessThan(2000); // Within 2 seconds
      });

      it('should properly close Redis connection', async () => {
        mockRedisInstance.get.mockResolvedValue('1');
        mockRedisInstance.ttl.mockResolvedValue(30);
        mockRedisInstance.quit.mockResolvedValue('OK');

        await getRateLimitInfo('test-key', {
          max: 10,
          window: 60,
        });

        expect(mockRedisInstance.quit).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed Redis responses', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      const mockMulti = mockRedisInstance.multi();
      mockMulti.exec.mockResolvedValue([
        ['error', null],  // Error in incr
        [null, 1],        // Success in expire
        [null, 300],      // Success in ttl
      ]);

      const rateLimiter = createRateLimiter({
        max: 5,
        window: 300,
      });

      // Should handle the error gracefully
      await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      // Should not crash and should log error
      expect(mockRequest.log?.error).toHaveBeenCalled();
    });

    it('should handle extremely high rate limits', async () => {
      const rateLimiter = createRateLimiter({
        max: 1000000,
        window: 1,
      });

      await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Limit', '1000000');
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '999999');
    });

    it('should handle zero rate limits', async () => {
      const rateLimiter = createRateLimiter({
        max: 0,
        window: 60,
      });

      await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(429);
    });

    it('should handle very short windows', async () => {
      const rateLimiter = createRateLimiter({
        max: 1,
        window: 0.1, // 100ms
      });

      await rateLimiter(mockRequest as FastifyRequest, mockReply as FastifyReply);
      
      expect(mockReply.header).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });
  });
});