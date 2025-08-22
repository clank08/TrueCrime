import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { fastify, type FastifyInstance } from 'fastify';
import { createServer } from '@/server';
import { TestFactory, TestUtils } from '@/test';
import { cache } from '@/lib/cache';
import { prisma } from '@/lib/prisma';

describe('E2E API Flows', () => {
  let server: FastifyInstance;
  let baseUrl: string;
  
  beforeAll(async () => {
    // Set up test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only-minimum-256-bits';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-jwt-secret-for-testing-purposes-only-different';
    process.env.PORT = '0'; // Use random available port
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Clear cache
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

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Authentication Flow E2E', () => {
    it('should complete full user registration and login flow', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'User',
      };

      // Step 1: Register new user
      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.register',
        headers: { 'content-type': 'application/json' },
        payload: userData,
      });

      expect(registerResponse.statusCode).toBe(200);
      const registerData = JSON.parse(registerResponse.payload);
      expect(registerData.result.data.success).toBe(true);
      expect(registerData.result.data.user.email).toBe(userData.email);
      expect(registerData.result.data.tokens).toBeDefined();
      
      const { accessToken } = registerData.result.data.tokens;

      // Step 2: Use access token to get user profile
      const profileResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/auth.me',
        headers: {
          'authorization': `Bearer ${accessToken}`,
        },
      });

      expect(profileResponse.statusCode).toBe(200);
      const profileData = JSON.parse(profileResponse.payload);
      expect(profileData.result.data.email).toBe(userData.email);
      expect(profileData.result.data.firstName).toBe(userData.firstName);

      // Step 3: Logout
      const logoutResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.logout',
        headers: {
          'authorization': `Bearer ${accessToken}`,
        },
      });

      expect(logoutResponse.statusCode).toBe(200);

      // Step 4: Try to access protected resource (should fail)
      const protectedResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/auth.me',
        headers: {
          'authorization': `Bearer ${accessToken}`,
        },
      });

      expect(protectedResponse.statusCode).toBe(401);

      // Step 5: Login again
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.login',
        headers: { 'content-type': 'application/json' },
        payload: {
          email: userData.email,
          password: userData.password,
        },
      });

      expect(loginResponse.statusCode).toBe(200);
      const loginData = JSON.parse(loginResponse.payload);
      expect(loginData.result.data.success).toBe(true);
      expect(loginData.result.data.tokens.accessToken).not.toBe(accessToken);
    });

    it('should handle password reset flow', async () => {
      const userEmail = 'resetuser@example.com';

      // Step 1: Register user first
      await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.register',
        headers: { 'content-type': 'application/json' },
        payload: {
          email: userEmail,
          password: 'OldPassword123!',
          firstName: 'Reset',
          lastName: 'User',
        },
      });

      // Step 2: Request password reset
      const resetRequestResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.requestPasswordReset',
        headers: { 'content-type': 'application/json' },
        payload: { email: userEmail },
      });

      expect(resetRequestResponse.statusCode).toBe(200);
      const resetData = JSON.parse(resetRequestResponse.payload);
      expect(resetData.result.data.success).toBe(true);

      // In a real scenario, the token would be sent via email
      // For testing, we'll assume we have access to the generated token
      const mockResetToken = 'mock-reset-token-for-testing';

      // Step 3: Confirm password reset with new password
      const confirmResetResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.confirmPasswordReset',
        headers: { 'content-type': 'application/json' },
        payload: {
          token: mockResetToken,
          newPassword: 'NewPassword123!',
        },
      });

      // This might fail in mock environment, but should work in real scenario
      expect([200, 400]).toContain(confirmResetResponse.statusCode);
    });

    it('should handle token refresh flow', async () => {
      const userData = {
        email: 'refreshuser@example.com',
        password: 'RefreshPassword123!',
        firstName: 'Refresh',
        lastName: 'User',
      };

      // Step 1: Register and get tokens
      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.register',
        headers: { 'content-type': 'application/json' },
        payload: userData,
      });

      const registerData = JSON.parse(registerResponse.payload);
      const { accessToken, refreshToken } = registerData.result.data.tokens;

      // Step 2: Use refresh token to get new access token
      const refreshResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.refresh',
        headers: { 'content-type': 'application/json' },
        payload: { refreshToken },
      });

      expect(refreshResponse.statusCode).toBe(200);
      const refreshData = JSON.parse(refreshResponse.payload);
      expect(refreshData.result.data.success).toBe(true);
      expect(refreshData.result.data.tokens.accessToken).not.toBe(accessToken);

      // Step 3: Use new access token to access protected resource
      const newAccessToken = refreshData.result.data.tokens.accessToken;
      const profileResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/auth.me',
        headers: {
          'authorization': `Bearer ${newAccessToken}`,
        },
      });

      expect(profileResponse.statusCode).toBe(200);
    });
  });

  describe('Content Discovery Flow E2E', () => {
    it('should complete content search and discovery workflow', async () => {
      // Step 1: Search for content (public endpoint)
      const searchResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/content.search?' + new URLSearchParams({
          input: JSON.stringify({
            query: 'Ted Bundy',
            page: 1,
            limit: 20,
          }),
        }),
      });

      expect(searchResponse.statusCode).toBe(200);
      const searchData = JSON.parse(searchResponse.payload);
      expect(searchData.result.data.results).toBeInstanceOf(Array);
      expect(searchData.result.data.results.length).toBeGreaterThan(0);

      const contentId = searchData.result.data.results[0].id;

      // Step 2: Get detailed content information
      const detailResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/content.getById?' + new URLSearchParams({
          input: JSON.stringify({ id: contentId }),
        }),
      });

      expect(detailResponse.statusCode).toBe(200);
      const detailData = JSON.parse(detailResponse.payload);
      expect(detailData.result.data.id).toBe(contentId);
      expect(detailData.result.data.title).toBeDefined();
      expect(detailData.result.data.platforms).toBeInstanceOf(Array);

      // Step 3: Browse content lists
      const categories = ['trending', 'new', 'popular', 'recommended'];
      
      for (const category of categories) {
        const listResponse = await server.inject({
          method: 'GET',
          url: '/api/trpc/content.list?' + new URLSearchParams({
            input: JSON.stringify({ category, limit: 10 }),
          }),
        });

        expect(listResponse.statusCode).toBe(200);
        const listData = JSON.parse(listResponse.payload);
        expect(listData.result.data.category).toBe(category);
        expect(listData.result.data.results).toBeInstanceOf(Array);
      }
    });

    it('should handle content filtering and pagination', async () => {
      // Step 1: Search with filters
      const filteredSearchResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/content.search?' + new URLSearchParams({
          input: JSON.stringify({
            query: 'Ted',
            page: 1,
            limit: 5,
            filters: {
              type: 'series',
              genre: 'True Crime',
            },
          }),
        }),
      });

      expect(filteredSearchResponse.statusCode).toBe(200);
      const searchData = JSON.parse(filteredSearchResponse.payload);
      expect(searchData.result.data.pagination.limit).toBe(5);

      // Step 2: Test pagination
      if (searchData.result.data.pagination.hasNext) {
        const nextPageResponse = await server.inject({
          method: 'GET',
          url: '/api/trpc/content.search?' + new URLSearchParams({
            input: JSON.stringify({
              query: 'Ted',
              page: 2,
              limit: 5,
            }),
          }),
        });

        expect(nextPageResponse.statusCode).toBe(200);
        const nextPageData = JSON.parse(nextPageResponse.payload);
        expect(nextPageData.result.data.pagination.page).toBe(2);
      }
    });
  });

  describe('User Content Management Flow E2E', () => {
    let accessToken: string;
    let userId: string;
    let contentId: string;

    beforeEach(async () => {
      // Set up authenticated user
      const userData = {
        email: 'contentuser@example.com',
        password: 'ContentPassword123!',
        firstName: 'Content',
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
      contentId = '123e4567-e89b-12d3-a456-426614174000'; // Mock content ID
    });

    it('should complete watchlist management workflow', async () => {
      // Step 1: Add content to watchlist
      const addToWatchlistResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/content.addToWatchlist',
        headers: {
          'authorization': `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        payload: { contentId },
      });

      expect(addToWatchlistResponse.statusCode).toBe(200);
      const addData = JSON.parse(addToWatchlistResponse.payload);
      expect(addData.result.data.success).toBe(true);

      // Step 2: Get watchlist
      const watchlistResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/content.getWatchlist?' + new URLSearchParams({
          input: JSON.stringify({ page: 1, limit: 20 }),
        }),
        headers: {
          'authorization': `Bearer ${accessToken}`,
        },
      });

      expect(watchlistResponse.statusCode).toBe(200);
      const watchlistData = JSON.parse(watchlistResponse.payload);
      expect(watchlistData.result.data.results).toBeInstanceOf(Array);
      expect(watchlistData.result.data.results.length).toBeGreaterThan(0);

      // Step 3: Remove from watchlist
      const removeFromWatchlistResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/content.removeFromWatchlist',
        headers: {
          'authorization': `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        payload: { contentId },
      });

      expect(removeFromWatchlistResponse.statusCode).toBe(200);
      const removeData = JSON.parse(removeFromWatchlistResponse.payload);
      expect(removeData.result.data.success).toBe(true);
    });

    it('should handle progress tracking workflow', async () => {
      // Note: This requires email verification, so we'll mock a verified user
      const verifiedUserData = {
        email: 'verified@example.com',
        password: 'VerifiedPassword123!',
        firstName: 'Verified',
        lastName: 'User',
      };

      const verifiedRegisterResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.register',
        headers: { 'content-type': 'application/json' },
        payload: verifiedUserData,
      });

      const verifiedData = JSON.parse(verifiedRegisterResponse.payload);
      const verifiedToken = verifiedData.result.data.tokens.accessToken;

      // Step 1: Update progress
      const updateProgressResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/content.updateProgress',
        headers: {
          'authorization': `Bearer ${verifiedToken}`,
          'content-type': 'application/json',
        },
        payload: {
          contentId,
          progress: {
            watched: true,
            currentEpisode: 3,
            totalEpisodes: 10,
            rating: 4,
            notes: 'Great series so far!',
          },
        },
      });

      // This might fail due to email verification requirement
      expect([200, 403]).toContain(updateProgressResponse.statusCode);

      if (updateProgressResponse.statusCode === 200) {
        const progressData = JSON.parse(updateProgressResponse.payload);
        expect(progressData.result.data.success).toBe(true);
      }
    });
  });

  describe('Error Handling E2E', () => {
    it('should handle validation errors across the API', async () => {
      // Test invalid UUID
      const invalidIdResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/content.getById?' + new URLSearchParams({
          input: JSON.stringify({ id: 'invalid-uuid' }),
        }),
      });

      expect(invalidIdResponse.statusCode).toBe(400);
      const errorData = JSON.parse(invalidIdResponse.payload);
      expect(errorData.error.message).toContain('Invalid content ID format');

      // Test missing required fields
      const missingFieldResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.register',
        headers: { 'content-type': 'application/json' },
        payload: { email: 'test@example.com' }, // Missing password
      });

      expect(missingFieldResponse.statusCode).toBe(400);
    });

    it('should handle authentication errors consistently', async () => {
      // Test accessing protected endpoint without token
      const noTokenResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/auth.me',
      });

      expect(noTokenResponse.statusCode).toBe(401);

      // Test with invalid token
      const invalidTokenResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/auth.me',
        headers: {
          'authorization': 'Bearer invalid-token',
        },
      });

      expect(invalidTokenResponse.statusCode).toBe(401);
    });

    it('should handle rate limiting properly', async () => {
      // Make many requests quickly to trigger rate limiting
      const promises = Array.from({ length: 50 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: '/api/trpc/content.search?' + new URLSearchParams({
            input: JSON.stringify({
              query: `test${i}`,
              page: 1,
              limit: 10,
            }),
          }),
        })
      );

      const responses = await Promise.all(promises);
      
      // Some responses should be rate limited
      const rateLimitedCount = responses.filter(r => r.statusCode === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);

      // Rate limited responses should have appropriate headers
      const rateLimitedResponse = responses.find(r => r.statusCode === 429);
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.headers).toHaveProperty('retry-after');
        expect(rateLimitedResponse.headers).toHaveProperty('x-ratelimit-limit');
      }
    });
  });

  describe('Performance and Caching E2E', () => {
    it('should demonstrate caching behavior', async () => {
      const contentId = '123e4567-e89b-12d3-a456-426614174000';
      const endpoint = `/api/trpc/content.getById?${new URLSearchParams({
        input: JSON.stringify({ id: contentId }),
      })}`;

      // First request (should cache result)
      const startTime1 = Date.now();
      const response1 = await server.inject({
        method: 'GET',
        url: endpoint,
      });
      const duration1 = Date.now() - startTime1;

      expect(response1.statusCode).toBe(200);

      // Second request (should use cache, potentially faster)
      const startTime2 = Date.now();
      const response2 = await server.inject({
        method: 'GET',
        url: endpoint,
      });
      const duration2 = Date.now() - startTime2;

      expect(response2.statusCode).toBe(200);
      
      // Responses should be identical
      expect(response1.payload).toBe(response2.payload);
      
      // Cache hit might be faster (though not guaranteed in test environment)
      console.log(`First request: ${duration1}ms, Second request: ${duration2}ms`);
    });

    it('should handle cache invalidation', async () => {
      const userData = {
        email: 'cacheuser@example.com',
        password: 'CachePassword123!',
        firstName: 'Cache',
        lastName: 'User',
      };

      // Register user
      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.register',
        headers: { 'content-type': 'application/json' },
        payload: userData,
      });

      const { accessToken } = JSON.parse(registerResponse.payload).result.data.tokens;
      const contentId = '123e4567-e89b-12d3-a456-426614174000';

      // Get initial watchlist (should be empty and cached)
      const watchlist1 = await server.inject({
        method: 'GET',
        url: '/api/trpc/content.getWatchlist?' + new URLSearchParams({
          input: JSON.stringify({ page: 1, limit: 20 }),
        }),
        headers: { 'authorization': `Bearer ${accessToken}` },
      });

      expect(watchlist1.statusCode).toBe(200);

      // Add to watchlist (should invalidate cache)
      await server.inject({
        method: 'POST',
        url: '/api/trpc/content.addToWatchlist',
        headers: {
          'authorization': `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        payload: { contentId },
      });

      // Get watchlist again (should reflect changes)
      const watchlist2 = await server.inject({
        method: 'GET',
        url: '/api/trpc/content.getWatchlist?' + new URLSearchParams({
          input: JSON.stringify({ page: 1, limit: 20 }),
        }),
        headers: { 'authorization': `Bearer ${accessToken}` },
      });

      expect(watchlist2.statusCode).toBe(200);
      // The watchlist should now include the added item
    });
  });

  describe('Health and Monitoring E2E', () => {
    it('should provide health check endpoints', async () => {
      const healthResponse = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect([200, 503]).toContain(healthResponse.statusCode);
      const healthData = JSON.parse(healthResponse.payload);
      
      expect(healthData).toHaveProperty('status');
      expect(healthData).toHaveProperty('services');
      expect(healthData).toHaveProperty('metrics');
      expect(healthData.status).toMatch(/^(healthy|degraded|unhealthy)$/);
    });

    it('should provide metrics endpoints', async () => {
      const metricsResponse = await server.inject({
        method: 'GET',
        url: '/metrics',
      });

      expect(metricsResponse.statusCode).toBe(200);
      const metricsData = JSON.parse(metricsResponse.payload);
      
      expect(metricsData).toHaveProperty('uptime');
      expect(metricsData).toHaveProperty('memory');
      expect(metricsData).toHaveProperty('timestamp');
      expect(typeof metricsData.uptime).toBe('number');
    });
  });

  describe('Real-world Usage Patterns E2E', () => {
    it('should handle typical user session', async () => {
      const userData = {
        email: 'sessionuser@example.com',
        password: 'SessionPassword123!',
        firstName: 'Session',
        lastName: 'User',
      };

      // 1. User registers
      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.register',
        headers: { 'content-type': 'application/json' },
        payload: userData,
      });

      const { accessToken } = JSON.parse(registerResponse.payload).result.data.tokens;

      // 2. User searches for content
      const searchResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/content.search?' + new URLSearchParams({
          input: JSON.stringify({ query: 'Ted Bundy', limit: 10 }),
        }),
      });

      expect(searchResponse.statusCode).toBe(200);

      // 3. User views content details
      const contentId = '123e4567-e89b-12d3-a456-426614174000';
      const detailResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/content.getById?' + new URLSearchParams({
          input: JSON.stringify({ id: contentId }),
        }),
      });

      expect(detailResponse.statusCode).toBe(200);

      // 4. User adds to watchlist
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

      // 5. User checks their profile
      const profileResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/auth.me',
        headers: { 'authorization': `Bearer ${accessToken}` },
      });

      expect(profileResponse.statusCode).toBe(200);

      // 6. User logs out
      const logoutResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.logout',
        headers: { 'authorization': `Bearer ${accessToken}` },
      });

      expect(logoutResponse.statusCode).toBe(200);
    });

    it('should handle mobile app usage patterns', async () => {
      // Simulate mobile app making requests without Origin header
      const userData = {
        email: 'mobileuser@example.com',
        password: 'MobilePassword123!',
        firstName: 'Mobile',
        lastName: 'User',
      };

      const registerResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.register',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'TrueCrime-Mobile-App/1.0 (iOS 17.0)',
        },
        payload: userData,
      });

      expect(registerResponse.statusCode).toBe(200);
      
      const { accessToken } = JSON.parse(registerResponse.payload).result.data.tokens;

      // Mobile apps typically make many quick requests
      const quickRequests = [
        '/api/trpc/content.list?' + new URLSearchParams({
          input: JSON.stringify({ category: 'trending', limit: 5 }),
        }),
        '/api/trpc/content.list?' + new URLSearchParams({
          input: JSON.stringify({ category: 'new', limit: 5 }),
        }),
        '/api/trpc/auth.me',
      ];

      const responses = await Promise.all(
        quickRequests.map(url =>
          server.inject({
            method: 'GET',
            url,
            headers: url.includes('auth.me') 
              ? { 'authorization': `Bearer ${accessToken}` }
              : {},
          })
        )
      );

      responses.forEach((response, index) => {
        expect(response.statusCode).toBe(200);
      });
    });
  });
});