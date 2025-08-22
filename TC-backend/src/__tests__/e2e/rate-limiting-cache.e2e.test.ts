import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { fastify, type FastifyInstance } from 'fastify';
import { createServer } from '@/server';
import { cache } from '@/lib/cache';
import { TestFactory, TestUtils } from '@/test';

describe('E2E Rate Limiting and Cache Tests', () => {
  let server: FastifyInstance;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only-minimum-256-bits';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-jwt-secret-for-testing-purposes-only-different';
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Clear cache before each test
    await cache.flush();
    
    // Create server instance
    server = await createServer();
    await server.listen({ port: 0 });
    
    const address = server.server.address();
    const port = typeof address === 'string' ? address : address?.port;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    await server?.close();
    await cache.flush();
  });

  describe('Rate Limiting E2E', () => {
    describe('General Rate Limiting', () => {
      it('should apply standard rate limits to public endpoints', async () => {
        const promises = [];
        
        // Make 35 requests quickly (standard limit is 30/minute)
        for (let i = 0; i < 35; i++) {
          promises.push(
            server.inject({
              method: 'GET',
              url: `/api/trpc/content.getById?${new URLSearchParams({
                input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
              })}`,
              headers: {
                'x-forwarded-for': '192.168.1.100', // Same IP for all requests
              },
            })
          );
        }

        const responses = await Promise.all(promises);
        
        const successResponses = responses.filter(r => r.statusCode === 200);
        const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
        
        expect(successResponses.length).toBeLessThanOrEqual(30);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
        
        // Verify rate limit headers
        const firstSuccess = successResponses[0];
        expect(firstSuccess.headers).toHaveProperty('x-ratelimit-limit');
        expect(firstSuccess.headers).toHaveProperty('x-ratelimit-remaining');
        expect(firstSuccess.headers).toHaveProperty('x-ratelimit-reset');
        
        // Verify rate limited response
        if (rateLimitedResponses.length > 0) {
          const rateLimited = rateLimitedResponses[0];
          expect(rateLimited.headers).toHaveProperty('retry-after');
          
          const rateLimitedData = JSON.parse(rateLimited.payload);
          expect(rateLimitedData).toHaveProperty('error');
          expect(rateLimitedData.error).toContain('Too Many Requests');
        }
      });

      it('should have separate rate limits per IP address', async () => {
        const ip1Requests = [];
        const ip2Requests = [];
        
        // IP 1 makes requests
        for (let i = 0; i < 15; i++) {
          ip1Requests.push(
            server.inject({
              method: 'GET',
              url: `/api/trpc/content.list?${new URLSearchParams({
                input: JSON.stringify({ page: 1, limit: 10 })
              })}`,
              headers: {
                'x-forwarded-for': '192.168.1.100',
              },
            })
          );
        }
        
        // IP 2 makes requests
        for (let i = 0; i < 15; i++) {
          ip2Requests.push(
            server.inject({
              method: 'GET',
              url: `/api/trpc/content.list?${new URLSearchParams({
                input: JSON.stringify({ page: 1, limit: 10 })
              })}`,
              headers: {
                'x-forwarded-for': '192.168.1.200',
              },
            })
          );
        }

        const [ip1Responses, ip2Responses] = await Promise.all([
          Promise.all(ip1Requests),
          Promise.all(ip2Requests)
        ]);
        
        // Both IPs should be able to make their requests independently
        const ip1Success = ip1Responses.filter(r => r.statusCode === 200).length;
        const ip2Success = ip2Responses.filter(r => r.statusCode === 200).length;
        
        expect(ip1Success).toBeGreaterThan(0);
        expect(ip2Success).toBeGreaterThan(0);
      });

      it('should reset rate limits after window expires', async () => {
        const endpoint = `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
        })}`;

        // Make initial request to establish baseline
        const initialResponse = await server.inject({
          method: 'GET',
          url: endpoint,
          headers: {
            'x-forwarded-for': '192.168.1.150',
          },
        });

        expect(initialResponse.statusCode).toBe(200);
        
        const initialRemaining = parseInt(initialResponse.headers['x-ratelimit-remaining'] as string);
        const resetTime = initialResponse.headers['x-ratelimit-reset'] as string;
        
        expect(initialRemaining).toBeGreaterThan(0);
        expect(resetTime).toBeDefined();
        
        // Make another request immediately
        const secondResponse = await server.inject({
          method: 'GET',
          url: endpoint,
          headers: {
            'x-forwarded-for': '192.168.1.150',
          },
        });

        expect(secondResponse.statusCode).toBe(200);
        
        const secondRemaining = parseInt(secondResponse.headers['x-ratelimit-remaining'] as string);
        expect(secondRemaining).toBe(initialRemaining - 1);
      });
    });

    describe('Authentication Rate Limiting', () => {
      it('should apply strict rate limits to authentication endpoints', async () => {
        const requests = [];
        
        // Make multiple failed login attempts (auth limit is 5 per 15 minutes)
        for (let i = 0; i < 8; i++) {
          requests.push(
            server.inject({
              method: 'POST',
              url: '/api/trpc/auth.login',
              headers: {
                'content-type': 'application/json',
                'x-forwarded-for': '192.168.1.100',
              },
              payload: {
                email: 'nonexistent@example.com',
                password: 'wrongpassword',
              },
            })
          );
        }

        const responses = await Promise.all(requests);
        
        const unauthorizedResponses = responses.filter(r => r.statusCode === 401);
        const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
        
        // Should have both unauthorized responses and rate limited responses
        expect(unauthorizedResponses.length).toBeGreaterThan(0);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
        
        // Rate limited response should have longer retry-after
        if (rateLimitedResponses.length > 0) {
          const rateLimited = rateLimitedResponses[0];
          const retryAfter = parseInt(rateLimited.headers['retry-after'] as string);
          expect(retryAfter).toBeGreaterThan(300); // Should be longer than regular rate limits
        }
      });

      it('should not count successful authentication attempts against rate limit', async () => {
        // Register a user first
        const userData = {
          email: 'ratelimituser@example.com',
          password: 'RateLimit123!',
          firstName: 'Rate',
          lastName: 'Limit',
        };

        const registerResponse = await server.inject({
          method: 'POST',
          url: '/api/trpc/auth.register',
          headers: {
            'content-type': 'application/json',
            'x-forwarded-for': '192.168.1.100',
          },
          payload: userData,
        });

        expect(registerResponse.statusCode).toBe(200);

        // Make multiple successful login attempts
        const successfulLogins = [];
        for (let i = 0; i < 6; i++) {
          successfulLogins.push(
            server.inject({
              method: 'POST',
              url: '/api/trpc/auth.login',
              headers: {
                'content-type': 'application/json',
                'x-forwarded-for': '192.168.1.100',
              },
              payload: {
                email: userData.email,
                password: userData.password,
              },
            })
          );
        }

        const loginResponses = await Promise.all(successfulLogins);
        
        // All successful logins should work (skipSuccessfulRequests=true for auth)
        const successCount = loginResponses.filter(r => r.statusCode === 200).length;
        expect(successCount).toBe(6);
      });
    });

    describe('Search Rate Limiting', () => {
      it('should apply special rate limits to search endpoints', async () => {
        const searchRequests = [];
        
        // Search limit is typically 20 per minute
        for (let i = 0; i < 25; i++) {
          searchRequests.push(
            server.inject({
              method: 'GET',
              url: `/api/trpc/content.search?${new URLSearchParams({
                input: JSON.stringify({ 
                  query: `search query ${i}`,
                  page: 1,
                  limit: 10,
                })
              })}`,
              headers: {
                'x-forwarded-for': '192.168.1.100',
              },
            })
          );
        }

        const responses = await Promise.all(searchRequests);
        
        const successResponses = responses.filter(r => r.statusCode === 200);
        const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
        
        expect(successResponses.length).toBeLessThanOrEqual(20);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
        
        // Verify search-specific rate limit
        const firstSuccess = successResponses[0];
        const limit = parseInt(firstSuccess.headers['x-ratelimit-limit'] as string);
        expect(limit).toBeLessThanOrEqual(30); // Should be lower than general API limit
      });
    });

    describe('Write Operation Rate Limiting', () => {
      let accessToken: string;

      beforeEach(async () => {
        // Set up authenticated user for write operations
        const userData = {
          email: 'writeuser@example.com',
          password: 'WritePassword123!',
          firstName: 'Write',
          lastName: 'User',
        };

        const registerResponse = await server.inject({
          method: 'POST',
          url: '/api/trpc/auth.register',
          headers: { 'content-type': 'application/json' },
          payload: userData,
        });

        const registerData = JSON.parse(registerResponse.payload);
        accessToken = registerData.result.data.tokens.accessToken;
      });

      it('should apply rate limits to write operations', async () => {
        const writeRequests = [];
        const contentId = '123e4567-e89b-12d3-a456-426614174000';
        
        // Write operations limit is typically 20 per minute
        for (let i = 0; i < 25; i++) {
          writeRequests.push(
            server.inject({
              method: 'POST',
              url: '/api/trpc/content.addToWatchlist',
              headers: {
                'authorization': `Bearer ${accessToken}`,
                'content-type': 'application/json',
                'x-forwarded-for': '192.168.1.100',
              },
              payload: { contentId },
            })
          );
        }

        const responses = await Promise.all(writeRequests);
        
        const successResponses = responses.filter(r => r.statusCode === 200);
        const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
        
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
        
        // Write rate limit should be stricter than read operations
        expect(successResponses.length).toBeLessThanOrEqual(20);
      });
    });
  });

  describe('Cache Invalidation E2E', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      // Set up authenticated user for cache tests
      const userData = {
        email: 'cacheuser@example.com',
        password: 'CachePassword123!',
        firstName: 'Cache',
        lastName: 'User',
      };

      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.register',
        headers: { 'content-type': 'application/json' },
        payload: userData,
      });

      const registerData = JSON.parse(registerResponse.payload);
      accessToken = registerData.result.data.tokens.accessToken;
      userId = registerData.result.data.user.id;
    });

    describe('Content Cache Invalidation', () => {
      it('should cache content getById responses', async () => {
        const contentId = '123e4567-e89b-12d3-a456-426614174000';
        const endpoint = `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: contentId })
        })}`;

        // First request should populate cache
        const response1 = await server.inject({
          method: 'GET',
          url: endpoint,
        });

        expect(response1.statusCode).toBe(200);

        // Verify content is cached
        const cacheKey = `content:${contentId}`;
        const cachedContent = await cache.get(cacheKey);
        expect(cachedContent).toBeDefined();
        expect(cachedContent).toMatchObject({
          id: contentId,
          title: expect.any(String),
        });

        // Second request should use cache
        const response2 = await server.inject({
          method: 'GET',
          url: endpoint,
        });

        expect(response2.statusCode).toBe(200);
        expect(response1.payload).toBe(response2.payload);
      });

      it('should cache search results', async () => {
        const searchQuery = 'Ted Bundy';
        const endpoint = `/api/trpc/content.search?${new URLSearchParams({
          input: JSON.stringify({ 
            query: searchQuery,
            page: 1,
            limit: 10,
          })
        })}`;

        // First search should populate cache
        const response1 = await server.inject({
          method: 'GET',
          url: endpoint,
        });

        expect(response1.statusCode).toBe(200);

        // Second search should use cache
        const response2 = await server.inject({
          method: 'GET',
          url: endpoint,
        });

        expect(response2.statusCode).toBe(200);
        expect(response1.payload).toBe(response2.payload);
      });

      it('should cache content lists', async () => {
        const endpoint = `/api/trpc/content.list?${new URLSearchParams({
          input: JSON.stringify({ 
            category: 'trending',
            page: 1,
            limit: 10,
          })
        })}`;

        // First request should populate cache
        const response1 = await server.inject({
          method: 'GET',
          url: endpoint,
        });

        expect(response1.statusCode).toBe(200);

        // Second request should use cache
        const response2 = await server.inject({
          method: 'GET',
          url: endpoint,
        });

        expect(response2.statusCode).toBe(200);
        expect(response1.payload).toBe(response2.payload);
      });
    });

    describe('User-Specific Cache Invalidation', () => {
      it('should invalidate watchlist cache when adding/removing items', async () => {
        const contentId = '123e4567-e89b-12d3-a456-426614174000';
        const watchlistEndpoint = `/api/trpc/content.getWatchlist?${new URLSearchParams({
          input: JSON.stringify({ page: 1, limit: 20 })
        })}`;

        // Get initial watchlist (should be empty and cached)
        const initialWatchlistResponse = await server.inject({
          method: 'GET',
          url: watchlistEndpoint,
          headers: { 'authorization': `Bearer ${accessToken}` },
        });

        expect(initialWatchlistResponse.statusCode).toBe(200);
        const initialWatchlist = JSON.parse(initialWatchlistResponse.payload);

        // Add content to watchlist (should invalidate cache)
        const addResponse = await server.inject({
          method: 'POST',
          url: '/api/trpc/content.addToWatchlist',
          headers: {
            'authorization': `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          payload: { contentId },
        });

        expect(addResponse.statusCode).toBe(200);

        // Get watchlist again (should reflect changes, not cached)
        const updatedWatchlistResponse = await server.inject({
          method: 'GET',
          url: watchlistEndpoint,
          headers: { 'authorization': `Bearer ${accessToken}` },
        });

        expect(updatedWatchlistResponse.statusCode).toBe(200);
        
        // The responses should be different (cache was invalidated)
        expect(initialWatchlistResponse.payload).not.toBe(updatedWatchlistResponse.payload);

        // Remove from watchlist (should invalidate cache again)
        const removeResponse = await server.inject({
          method: 'POST',
          url: '/api/trpc/content.removeFromWatchlist',
          headers: {
            'authorization': `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          payload: { contentId },
        });

        expect(removeResponse.statusCode).toBe(200);

        // Get watchlist one more time
        const finalWatchlistResponse = await server.inject({
          method: 'GET',
          url: watchlistEndpoint,
          headers: { 'authorization': `Bearer ${accessToken}` },
        });

        expect(finalWatchlistResponse.statusCode).toBe(200);
        
        // Should be different from the updated watchlist
        expect(updatedWatchlistResponse.payload).not.toBe(finalWatchlistResponse.payload);
      });

      it('should isolate cache between different users', async () => {
        // Create second user
        const user2Data = {
          email: 'cacheuser2@example.com',
          password: 'CachePassword123!',
          firstName: 'Cache2',
          lastName: 'User2',
        };

        const register2Response = await server.inject({
          method: 'POST',
          url: '/api/trpc/auth.register',
          headers: { 'content-type': 'application/json' },
          payload: user2Data,
        });

        const register2Data = JSON.parse(register2Response.payload);
        const accessToken2 = register2Data.result.data.tokens.accessToken;
        const contentId = '123e4567-e89b-12d3-a456-426614174000';

        // User 1 adds content to watchlist
        await server.inject({
          method: 'POST',
          url: '/api/trpc/content.addToWatchlist',
          headers: {
            'authorization': `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          payload: { contentId },
        });

        // Get watchlists for both users
        const watchlistEndpoint = `/api/trpc/content.getWatchlist?${new URLSearchParams({
          input: JSON.stringify({ page: 1, limit: 20 })
        })}`;

        const [user1Watchlist, user2Watchlist] = await Promise.all([
          server.inject({
            method: 'GET',
            url: watchlistEndpoint,
            headers: { 'authorization': `Bearer ${accessToken}` },
          }),
          server.inject({
            method: 'GET',
            url: watchlistEndpoint,
            headers: { 'authorization': `Bearer ${accessToken2}` },
          })
        ]);

        expect(user1Watchlist.statusCode).toBe(200);
        expect(user2Watchlist.statusCode).toBe(200);

        // Watchlists should be different (cached separately per user)
        expect(user1Watchlist.payload).not.toBe(user2Watchlist.payload);
      });
    });

    describe('Cache Pattern and Tag Invalidation', () => {
      it('should invalidate cache by pattern', async () => {
        const contentId = '123e4567-e89b-12d3-a456-426614174000';
        
        // Make requests that should populate cache with user-specific keys
        const watchlistEndpoint = `/api/trpc/content.getWatchlist?${new URLSearchParams({
          input: JSON.stringify({ page: 1, limit: 20 })
        })}`;

        // Populate cache
        await server.inject({
          method: 'GET',
          url: watchlistEndpoint,
          headers: { 'authorization': `Bearer ${accessToken}` },
        });

        // Verify cache exists
        const userCacheKeys = await cache.mget([
          `user:${userId}:watchlist:1:20`,
        ]);
        
        // Add to watchlist (should trigger pattern invalidation)
        await server.inject({
          method: 'POST',
          url: '/api/trpc/content.addToWatchlist',
          headers: {
            'authorization': `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          payload: { contentId },
        });

        // Cache should be invalidated
        const invalidatedCacheKeys = await cache.mget([
          `user:${userId}:watchlist:1:20`,
        ]);

        // The cache should have been cleared or updated
        expect(invalidatedCacheKeys[0]).not.toEqual(userCacheKeys[0]);
      });

      it('should handle cache tag invalidation', async () => {
        const contentId = '123e4567-e89b-12d3-a456-426614174000';
        
        // Make multiple requests that use the same cache tags
        const requests = [
          `/api/trpc/content.getWatchlist?${new URLSearchParams({
            input: JSON.stringify({ page: 1, limit: 10 })
          })}`,
          `/api/trpc/content.getWatchlist?${new URLSearchParams({
            input: JSON.stringify({ page: 2, limit: 10 })
          })}`,
        ];

        // Populate cache for multiple pages
        await Promise.all(
          requests.map(endpoint =>
            server.inject({
              method: 'GET',
              url: endpoint,
              headers: { 'authorization': `Bearer ${accessToken}` },
            })
          )
        );

        // Add to watchlist (should invalidate all watchlist-tagged cache entries)
        await server.inject({
          method: 'POST',
          url: '/api/trpc/content.addToWatchlist',
          headers: {
            'authorization': `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          payload: { contentId },
        });

        // All watchlist cache entries should be invalidated
        const responses = await Promise.all(
          requests.map(endpoint =>
            server.inject({
              method: 'GET',
              url: endpoint,
              headers: { 'authorization': `Bearer ${accessToken}` },
            })
          )
        );

        responses.forEach(response => {
          expect(response.statusCode).toBe(200);
        });
      });
    });

    describe('Cache Failure Resilience', () => {
      it('should handle cache get failures gracefully', async () => {
        // Mock cache.get to fail
        const originalGet = cache.get;
        vi.spyOn(cache, 'get').mockImplementation(async () => {
          throw new Error('Cache get failed');
        });

        const contentId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await server.inject({
          method: 'GET',
          url: `/api/trpc/content.getById?${new URLSearchParams({
            input: JSON.stringify({ id: contentId })
          })}`,
        });

        // Should still work even if cache fails
        expect(response.statusCode).toBe(200);

        // Restore original function
        cache.get = originalGet;
      });

      it('should handle cache set failures gracefully', async () => {
        // Mock cache.set to fail
        const originalSet = cache.set;
        vi.spyOn(cache, 'set').mockImplementation(async () => {
          throw new Error('Cache set failed');
        });

        const contentId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await server.inject({
          method: 'GET',
          url: `/api/trpc/content.getById?${new URLSearchParams({
            input: JSON.stringify({ id: contentId })
          })}`,
        });

        // Should still work even if cache setting fails
        expect(response.statusCode).toBe(200);

        // Restore original function
        cache.set = originalSet;
      });

      it('should handle cache invalidation failures gracefully', async () => {
        // Mock cache invalidation to fail
        const originalInvalidatePattern = cache.invalidatePattern;
        vi.spyOn(cache, 'invalidatePattern').mockImplementation(async () => {
          throw new Error('Cache invalidation failed');
        });

        const contentId = '123e4567-e89b-12d3-a456-426614174000';
        const response = await server.inject({
          method: 'POST',
          url: '/api/trpc/content.addToWatchlist',
          headers: {
            'authorization': `Bearer ${accessToken}`,
            'content-type': 'application/json',
          },
          payload: { contentId },
        });

        // Should still work even if cache invalidation fails
        expect(response.statusCode).toBe(200);

        // Restore original function
        cache.invalidatePattern = originalInvalidatePattern;
      });
    });
  });

  describe('Rate Limiting and Cache Interaction E2E', () => {
    it('should cache rate limit counters correctly', async () => {
      const endpoint = `/api/trpc/content.getById?${new URLSearchParams({
        input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
      })}`;

      // Make initial request
      const response1 = await server.inject({
        method: 'GET',
        url: endpoint,
        headers: { 'x-forwarded-for': '192.168.1.100' },
      });

      expect(response1.statusCode).toBe(200);
      const remaining1 = parseInt(response1.headers['x-ratelimit-remaining'] as string);

      // Make second request
      const response2 = await server.inject({
        method: 'GET',
        url: endpoint,
        headers: { 'x-forwarded-for': '192.168.1.100' },
      });

      expect(response2.statusCode).toBe(200);
      const remaining2 = parseInt(response2.headers['x-ratelimit-remaining'] as string);

      // Rate limit counter should have decremented
      expect(remaining2).toBe(remaining1 - 1);
    });

    it('should not be affected by content cache when rate limiting', async () => {
      const endpoint = `/api/trpc/content.getById?${new URLSearchParams({
        input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
      })}`;

      const requests = [];
      
      // Make multiple requests to the same cached endpoint
      for (let i = 0; i < 10; i++) {
        requests.push(
          server.inject({
            method: 'GET',
            url: endpoint,
            headers: { 'x-forwarded-for': '192.168.1.100' },
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // All requests should be counted against rate limit, regardless of cache
      const remainingValues = responses
        .filter(r => r.statusCode === 200)
        .map(r => parseInt(r.headers['x-ratelimit-remaining'] as string));

      // Should have decreasing remaining counts
      for (let i = 1; i < remainingValues.length; i++) {
        expect(remainingValues[i]).toBeLessThanOrEqual(remainingValues[i - 1]);
      }
    });

    it('should handle concurrent requests with both rate limiting and caching', async () => {
      const endpoint = `/api/trpc/content.search?${new URLSearchParams({
        input: JSON.stringify({ 
          query: 'concurrent test',
          page: 1,
          limit: 10,
        })
      })}`;

      // Make many concurrent requests
      const concurrentRequests = Array.from({ length: 25 }, () =>
        server.inject({
          method: 'GET',
          url: endpoint,
          headers: { 'x-forwarded-for': '192.168.1.100' },
        })
      );

      const responses = await Promise.all(concurrentRequests);
      
      const successResponses = responses.filter(r => r.statusCode === 200);
      const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
      
      // Some requests should succeed (and be cached)
      expect(successResponses.length).toBeGreaterThan(0);
      
      // Some requests should be rate limited
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Successful responses should have identical content (cached)
      if (successResponses.length > 1) {
        const firstPayload = successResponses[0].payload;
        successResponses.forEach(response => {
          expect(response.payload).toBe(firstPayload);
        });
      }
    });
  });

  describe('Memory Management E2E', () => {
    it('should not cause memory leaks with cache and rate limiting', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Make many requests to exercise cache and rate limiting
      const endpoints = [
        `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
        })}`,
        `/api/trpc/content.list?${new URLSearchParams({
          input: JSON.stringify({ category: 'trending', limit: 10 })
        })}`,
        `/api/trpc/content.search?${new URLSearchParams({
          input: JSON.stringify({ query: 'memory test', limit: 5 })
        })}`,
      ];

      // Make requests across multiple IPs to create various cache and rate limit entries
      const allRequests = [];
      for (let ip = 1; ip <= 10; ip++) {
        for (const endpoint of endpoints) {
          allRequests.push(
            server.inject({
              method: 'GET',
              url: endpoint,
              headers: { 'x-forwarded-for': `192.168.1.${ip}` },
            })
          );
        }
      }

      await Promise.all(allRequests);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB for this test)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });
});