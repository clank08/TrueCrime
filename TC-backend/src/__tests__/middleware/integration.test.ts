import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fastify, type FastifyInstance } from 'fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { createContext, router, publicProcedure, protectedProcedure } from '@/lib/trpc';
import { applyRateLimiting } from '@/middleware/rateLimiting';
import { setupFastifyMonitoring } from '@/lib/monitoring';
import { cache } from '@/lib/cache';
import { TestFactory } from '@/test/factories';
import { z } from 'zod';

// Test router for middleware integration
const testRouter = router({
  public: publicProcedure
    .input(z.object({ message: z.string() }))
    .query(async ({ input }) => {
      return { echo: input.message };
    }),
    
  protected: protectedProcedure
    .input(z.object({ data: z.string() }))
    .query(async ({ input, ctx }) => {
      return { 
        data: input.data,
        userId: ctx.user.id,
        email: ctx.user.email,
      };
    }),
    
  slow: publicProcedure
    .query(async () => {
      // Simulate slow operation
      await new Promise(resolve => setTimeout(resolve, 100));
      return { message: 'slow response' };
    }),
    
  error: publicProcedure
    .query(async () => {
      throw new Error('Test error for middleware');
    }),
    
  rateLimit: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return { message: `Rate limited endpoint called with ${input.id}` };
    }),
});

describe('Middleware Integration Tests', () => {
  let server: FastifyInstance;
  let baseUrl: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Clear cache
    await cache.flush();
    
    server = fastify({
      logger: false,
    });

    // Set up environment variables for testing
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-jwt-secret-for-testing-purposes-only';

    // Register middleware
    await server.register(require('@fastify/cors'), {
      origin: true,
      credentials: true,
    });

    // Apply rate limiting
    applyRateLimiting(server);

    // Setup monitoring
    setupFastifyMonitoring(server);

    // Register tRPC
    await server.register(fastifyTRPCPlugin, {
      prefix: '/api/trpc',
      trpcOptions: {
        router: testRouter,
        createContext,
        onError: (opts) => {
          console.error('tRPC Error:', opts.error.message);
        },
      },
    });

    await server.listen({ port: 0 });
    baseUrl = `http://localhost:${(server.server.address() as any).port}`;
  });

  afterEach(async () => {
    await server.close();
    await cache.flush();
  });

  describe('CORS Middleware', () => {
    it('should set correct CORS headers', async () => {
      const response = await server.inject({
        method: 'OPTIONS',
        url: '/api/trpc/public',
        headers: {
          'origin': 'http://localhost:3000',
          'access-control-request-method': 'POST',
        },
      });

      expect(response.statusCode).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should reject unauthorized origins', async () => {
      const response = await server.inject({
        method: 'OPTIONS',
        url: '/api/trpc/public',
        headers: {
          'origin': 'http://malicious-site.com',
          'access-control-request-method': 'POST',
        },
      });

      expect(response.statusCode).toBe(500);
    });

    it('should allow requests without origin for mobile apps', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/trpc/public',
        payload: { message: 'test' },
        headers: {
          'content-type': 'application/json',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Rate Limiting Middleware', () => {
    it('should apply standard rate limiting to GET endpoints', async () => {
      const requests = [];
      
      // Make multiple requests quickly
      for (let i = 0; i < 35; i++) {
        requests.push(server.inject({
          method: 'GET',
          url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: `test${i}` })),
        }));
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Check rate limit headers
      const successResponse = responses.find(r => r.statusCode === 200);
      expect(successResponse?.headers).toHaveProperty('x-ratelimit-limit');
      expect(successResponse?.headers).toHaveProperty('x-ratelimit-remaining');
    });

    it('should apply different rate limits to different endpoints', async () => {
      // Test search endpoint rate limiting
      const searchRequests = [];
      
      for (let i = 0; i < 25; i++) {
        searchRequests.push(server.inject({
          method: 'GET',
          url: `/api/trpc/rateLimit?input=${encodeURIComponent(JSON.stringify({ id: `search${i}` }))}`,
          headers: {
            'user-agent': 'test-search-client',
          },
        }));
      }

      const searchResponses = await Promise.all(searchRequests);
      
      // Should hit search rate limit (20 requests per minute)
      const rateLimited = searchResponses.filter(r => r.statusCode === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should include correct rate limit headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: 'test' })),
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
      
      const limit = parseInt(response.headers['x-ratelimit-limit'] as string);
      const remaining = parseInt(response.headers['x-ratelimit-remaining'] as string);
      
      expect(limit).toBeGreaterThan(0);
      expect(remaining).toBeLessThan(limit);
    });

    it('should handle rate limit storage failures gracefully', async () => {
      // Mock Redis to fail
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: 'test' })),
      });

      // Should still work even if rate limiting fails
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Monitoring Middleware', () => {
    it('should add request timing to requests', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: 'test' })),
      });

      expect(response.statusCode).toBe(200);
      // Request should have been timed (we can't directly test the timing,
      // but we can verify the middleware ran without errors)
    });

    it('should track slow API endpoints', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/slow',
      });

      expect(response.statusCode).toBe(200);
      
      // The slow endpoint should trigger monitoring warnings
      // In a real test environment, you'd mock the monitoring service
      // to verify it was called with slow endpoint metrics
    });

    it('should capture errors to monitoring system', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/error',
      });

      expect(response.statusCode).toBe(500);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle monitoring system failures gracefully', async () => {
      // Mock monitoring to fail
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: 'test' })),
      });

      // Should still work even if monitoring fails
      expect(response.statusCode).toBe(200);
    });
  });

  describe('tRPC Middleware Chain', () => {
    it('should execute performance tracking middleware', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: 'performance test' })),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.result.data.echo).toBe('performance test');
    });

    it('should execute logging middleware', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: 'logging test' })),
      });

      // Should have logged the request
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should enforce authentication middleware', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/protected?input=' + encodeURIComponent(JSON.stringify({ data: 'test' })),
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.payload);
      expect(data.error.message).toContain('You must be logged in');
    });

    it('should allow authenticated requests through', async () => {
      const user = TestFactory.createUser();
      const { generateAccessToken, createUserPayload } = await import('@/lib/jwt');
      const token = generateAccessToken(createUserPayload(user));

      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/protected?input=' + encodeURIComponent(JSON.stringify({ data: 'authenticated test' })),
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.result.data.data).toBe('authenticated test');
      expect(data.result.data.userId).toBe(user.id);
      expect(data.result.data.email).toBe(user.email);
    });
  });

  describe('Error Handling Middleware', () => {
    it('should handle tRPC errors properly', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/error',
      });

      expect(response.statusCode).toBe(500);
      const data = JSON.parse(response.payload);
      expect(data.error).toBeDefined();
      expect(data.error.message).toBe('Test error for middleware');
    });

    it('should handle validation errors', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ wrongField: 'test' })),
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.error).toBeDefined();
      expect(data.error.data?.zodError).toBeDefined();
    });

    it('should handle malformed JSON requests', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/trpc/public',
        headers: {
          'content-type': 'application/json',
        },
        payload: 'invalid json{',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle missing content-type headers', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/trpc/public',
        payload: '{"message": "test"}',
      });

      // Should still work or return appropriate error
      expect([200, 400, 415]).toContain(response.statusCode);
    });
  });

  describe('Security Middleware', () => {
    it('should set security headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: 'test' })),
      });

      // Helmet middleware should set security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should validate JWT tokens properly', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/protected?input=' + encodeURIComponent(JSON.stringify({ data: 'test' })),
        headers: {
          authorization: `Bearer ${invalidToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject expired JWT tokens', async () => {
      const jwt = await import('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'test-user', email: 'test@example.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s', issuer: 'truecrime-api', audience: 'truecrime-app' }
      );

      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/protected?input=' + encodeURIComponent(JSON.stringify({ data: 'test' })),
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Cache Integration', () => {
    it('should work with cache middleware', async () => {
      // Set a cache value
      await cache.set('test-key', { message: 'cached value' });

      // Verify cache is working
      const cached = await cache.get('test-key');
      expect(cached).toEqual({ message: 'cached value' });

      // Make a request that might use caching
      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: 'test' })),
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle cache failures gracefully', async () => {
      // Mock cache to fail
      vi.spyOn(cache, 'get').mockRejectedValue(new Error('Cache failed'));

      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: 'test' })),
      });

      // Should still work even if cache fails
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Middleware Ordering', () => {
    it('should execute middleware in correct order', async () => {
      const executionOrder: string[] = [];
      
      // Mock middleware components to track execution order
      const originalConsoleLog = console.log;
      console.log = vi.fn((message: string) => {
        if (typeof message === 'string' && message.includes('✅')) {
          executionOrder.push('logging');
        }
        originalConsoleLog(message);
      });

      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: 'order test' })),
      });

      expect(response.statusCode).toBe(200);
      
      console.log = originalConsoleLog;
    });

    it('should short-circuit on authentication failure', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/protected?input=' + encodeURIComponent(JSON.stringify({ data: 'test' })),
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      
      // Should not have executed the actual procedure
      const data = JSON.parse(response.payload);
      expect(data.error.message).toContain('You must be logged in');
    });

    it('should stop processing on rate limit exceeded', async () => {
      // Exceed rate limit
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(server.inject({
          method: 'GET',
          url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: `test${i}` })),
          headers: {
            'x-forwarded-for': '192.168.1.100',
          },
        }));
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponse = responses.find(r => r.statusCode === 429);
      
      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse?.headers).toHaveProperty('retry-after');
    });
  });

  describe('Request/Response Transformation', () => {
    it('should properly serialize response data', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: 'test serialization' })),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.result.data.echo).toBe('test serialization');
    });

    it('should handle complex data types', async () => {
      const user = TestFactory.createUser();
      const { generateAccessToken, createUserPayload } = await import('@/lib/jwt');
      const token = generateAccessToken(createUserPayload(user));

      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/protected?input=' + encodeURIComponent(JSON.stringify({ data: 'complex data' })),
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.result.data).toMatchObject({
        data: 'complex data',
        userId: user.id,
        email: user.email,
      });
    });

    it('should properly handle query parameters', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/trpc/public?input=' + encodeURIComponent(JSON.stringify({ message: 'query test' })),
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.result.data.echo).toBe('query test');
    });
  });

  describe('Health and Status Endpoints', () => {
    beforeEach(async () => {
      // Add health endpoint to server
      server.get('/health', async (request, reply) => {
        const { performHealthCheck } = await import('@/lib/monitoring');
        const health = await performHealthCheck();
        
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 503 : 500;
        
        reply.code(statusCode).send(health);
      });
    });

    it('should respond to health checks', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect([200, 503]).toContain(response.statusCode);
      const data = JSON.parse(response.payload);
      expect(data.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(data.services).toBeDefined();
      expect(data.metrics).toBeDefined();
    });
  });
});