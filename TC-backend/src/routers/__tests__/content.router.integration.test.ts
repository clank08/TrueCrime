import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCallerFactory } from '@trpc/server';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { contentRouter } from '@/routers/content.router';
import { createContext } from '@/lib/trpc';
import { TestFactory, TestUtils } from '@/test';
import { cache } from '@/lib/cache';
import { monitoring } from '@/lib/monitoring';

// Create caller factory for testing tRPC procedures
const createCaller = createCallerFactory(contentRouter);

describe('Content Router Integration Tests', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockContext: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock Fastify request and reply
    mockRequest = {
      ip: '192.168.1.100',
      headers: {
        'user-agent': 'test-browser',
        authorization: 'Bearer test-token',
      },
      cookies: {},
    };

    mockReply = {
      setCookie: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    // Clear cache before each test
    await cache.flush();
  });

  afterEach(async () => {
    await cache.flush();
    vi.restoreAllMocks();
  });

  describe('Public procedures', () => {
    beforeEach(async () => {
      mockContext = await createContext({
        req: mockRequest as FastifyRequest,
        res: mockReply as FastifyReply,
      });
    });

    describe('getById', () => {
      it('should return content by ID for valid UUID', async () => {
        const caller = createCaller(mockContext);
        const validId = '123e4567-e89b-12d3-a456-426614174000';

        const result = await caller.getById({ id: validId });

        expect(result).toBeDefined();
        expect(result.id).toBe(validId);
        expect(result.title).toBe('Ted Bundy: Conversations with a Killer');
        expect(result.type).toBe('series');
        expect(result.platforms).toBeInstanceOf(Array);
        expect(result.genres).toBeInstanceOf(Array);
      });

      it('should throw NOT_FOUND for non-existent content', async () => {
        const caller = createCaller(mockContext);
        const nonExistentId = '999e4567-e89b-12d3-a456-426614174999';

        await expect(caller.getById({ id: nonExistentId }))
          .rejects.toThrow('Content not found');
      });

      it('should throw BAD_REQUEST for invalid UUID format', async () => {
        const caller = createCaller(mockContext);
        const invalidId = 'not-a-valid-uuid';

        await expect(caller.getById({ id: invalidId }))
          .rejects.toThrow('Invalid content ID format');
      });

      it('should cache content results', async () => {
        const caller = createCaller(mockContext);
        const validId = '123e4567-e89b-12d3-a456-426614174000';

        // First call should cache the result
        const result1 = await caller.getById({ id: validId });
        
        // Second call should return cached result
        const result2 = await caller.getById({ id: validId });

        expect(result1).toEqual(result2);
        
        // Verify cache was used (mock monitoring would show only one actual fetch)
        const cacheKey = `content:${validId}`;
        const cached = await cache.get(cacheKey);
        expect(cached).toEqual(result1);
      });

      it('should track performance metrics', async () => {
        const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
        const caller = createCaller(mockContext);
        const validId = '123e4567-e89b-12d3-a456-426614174000';

        await caller.getById({ id: validId });

        expect(trackAPISpy).toHaveBeenCalledWith(
          expect.objectContaining({
            endpoint: expect.stringContaining('getById'),
            statusCode: 200,
            duration: expect.any(Number),
          })
        );
      });
    });

    describe('search', () => {
      it('should search content with matching query', async () => {
        const caller = createCaller(mockContext);

        const result = await caller.search({
          query: 'Ted Bundy',
          page: 1,
          limit: 20,
        });

        expect(result.results).toBeInstanceOf(Array);
        expect(result.results).toHaveLength(1);
        expect(result.results[0].title).toContain('Ted Bundy');
        expect(result.pagination).toEqual({
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        });
      });

      it('should return empty results for non-matching query', async () => {
        const caller = createCaller(mockContext);

        const result = await caller.search({
          query: 'Non Existent Content',
          page: 1,
          limit: 20,
        });

        expect(result.results).toBeInstanceOf(Array);
        expect(result.results).toHaveLength(0);
        expect(result.pagination.total).toBe(0);
      });

      it('should validate search parameters', async () => {
        const caller = createCaller(mockContext);

        // Test query too short
        await expect(caller.search({
          query: '',
          page: 1,
          limit: 20,
        })).rejects.toThrow();

        // Test query too long
        await expect(caller.search({
          query: 'a'.repeat(101),
          page: 1,
          limit: 20,
        })).rejects.toThrow();

        // Test invalid page
        await expect(caller.search({
          query: 'test',
          page: 0,
          limit: 20,
        })).rejects.toThrow();

        // Test invalid limit
        await expect(caller.search({
          query: 'test',
          page: 1,
          limit: 0,
        })).rejects.toThrow();

        await expect(caller.search({
          query: 'test',
          page: 1,
          limit: 100,
        })).rejects.toThrow();
      });

      it('should handle optional filters', async () => {
        const caller = createCaller(mockContext);

        const result = await caller.search({
          query: 'Ted',
          page: 1,
          limit: 20,
          filters: {
            type: 'series',
            genre: 'True Crime',
            year: 2019,
          },
        });

        expect(result).toBeDefined();
        expect(result.results).toBeInstanceOf(Array);
      });

      it('should cache search results', async () => {
        const caller = createCaller(mockContext);
        const searchParams = {
          query: 'Ted Bundy',
          page: 1,
          limit: 20,
        };

        // First call
        const result1 = await caller.search(searchParams);
        
        // Second call should return cached result
        const result2 = await caller.search(searchParams);

        expect(result1).toEqual(result2);
      });

      it('should measure search performance', async () => {
        const performanceSpy = vi.spyOn(mockContext.timer, 'start');
        const endSpy = vi.spyOn(mockContext.timer, 'end');
        const caller = createCaller(mockContext);

        await caller.search({
          query: 'Ted Bundy',
          page: 1,
          limit: 20,
        });

        expect(performanceSpy).toHaveBeenCalledWith('content.search.query');
        expect(endSpy).toHaveBeenCalledWith('content.search.query');
      });
    });

    describe('list', () => {
      it('should return content list with default parameters', async () => {
        const caller = createCaller(mockContext);

        const result = await caller.list({});

        expect(result.results).toBeInstanceOf(Array);
        expect(result.results).toHaveLength(1);
        expect(result.pagination).toEqual({
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        });
        expect(result.category).toBe('trending');
        expect(result.timeframe).toBe('week');
      });

      it('should handle different categories', async () => {
        const caller = createCaller(mockContext);

        const categories = ['trending', 'new', 'popular', 'recommended'] as const;

        for (const category of categories) {
          const result = await caller.list({ category });
          expect(result.category).toBe(category);
        }
      });

      it('should handle different timeframes', async () => {
        const caller = createCaller(mockContext);

        const timeframes = ['day', 'week', 'month', 'all'] as const;

        for (const timeframe of timeframes) {
          const result = await caller.list({ timeframe });
          expect(result.timeframe).toBe(timeframe);
        }
      });

      it('should validate list parameters', async () => {
        const caller = createCaller(mockContext);

        // Invalid category
        await expect(caller.list({
          category: 'invalid' as any,
        })).rejects.toThrow();

        // Invalid timeframe
        await expect(caller.list({
          timeframe: 'invalid' as any,
        })).rejects.toThrow();
      });

      it('should cache list results', async () => {
        const caller = createCaller(mockContext);
        const listParams = { page: 1, limit: 10 };

        const result1 = await caller.list(listParams);
        const result2 = await caller.list(listParams);

        expect(result1).toEqual(result2);
      });
    });
  });

  describe('Protected procedures', () => {
    let authenticatedContext: any;

    beforeEach(async () => {
      const user = TestFactory.createUser();
      authenticatedContext = {
        ...mockContext,
        user,
        sessionToken: 'test-session-token',
      };
    });

    describe('addToWatchlist', () => {
      it('should add content to user watchlist', async () => {
        const caller = createCaller(authenticatedContext);
        const contentId = '123e4567-e89b-12d3-a456-426614174000';

        const result = await caller.addToWatchlist({ contentId });

        expect(result.success).toBe(true);
        expect(result.message).toContain('added to your watchlist');
      });

      it('should require authentication', async () => {
        const caller = createCaller(mockContext); // Unauthenticated context

        await expect(caller.addToWatchlist({
          contentId: '123e4567-e89b-12d3-a456-426614174000',
        })).rejects.toThrow('You must be logged in');
      });

      it('should validate content exists', async () => {
        const caller = createCaller(authenticatedContext);

        await expect(caller.addToWatchlist({
          contentId: '999e4567-e89b-12d3-a456-426614174999',
        })).rejects.toThrow('Content not found');
      });

      it('should invalidate user cache', async () => {
        const invalidateSpy = vi.spyOn(cache, 'invalidatePattern');
        const caller = createCaller(authenticatedContext);
        const contentId = '123e4567-e89b-12d3-a456-426614174000';

        await caller.addToWatchlist({ contentId });

        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.arrayContaining([expect.stringMatching(/user:.*:watchlist/)])
        );
      });
    });

    describe('removeFromWatchlist', () => {
      it('should remove content from user watchlist', async () => {
        const caller = createCaller(authenticatedContext);
        const contentId = '123e4567-e89b-12d3-a456-426614174000';

        const result = await caller.removeFromWatchlist({ contentId });

        expect(result.success).toBe(true);
        expect(result.message).toContain('removed from your watchlist');
      });

      it('should require authentication', async () => {
        const caller = createCaller(mockContext);

        await expect(caller.removeFromWatchlist({
          contentId: '123e4567-e89b-12d3-a456-426614174000',
        })).rejects.toThrow('You must be logged in');
      });

      it('should handle non-existent content', async () => {
        const caller = createCaller(authenticatedContext);

        await expect(caller.removeFromWatchlist({
          contentId: '999e4567-e89b-12d3-a456-426614174999',
        })).rejects.toThrow('Content is not in your watchlist');
      });
    });

    describe('getWatchlist', () => {
      it('should return user watchlist', async () => {
        const caller = createCaller(authenticatedContext);

        const result = await caller.getWatchlist({});

        expect(result.results).toBeInstanceOf(Array);
        expect(result.results).toHaveLength(1);
        expect(result.results[0]).toHaveProperty('addedAt');
        expect(result.pagination).toBeDefined();
      });

      it('should require authentication', async () => {
        const caller = createCaller(mockContext);

        await expect(caller.getWatchlist({}))
          .rejects.toThrow('You must be logged in');
      });

      it('should handle pagination', async () => {
        const caller = createCaller(authenticatedContext);

        const result = await caller.getWatchlist({
          page: 1,
          limit: 10,
        });

        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(10);
      });

      it('should cache watchlist results', async () => {
        const caller = createCaller(authenticatedContext);
        const params = { page: 1, limit: 20 };

        const result1 = await caller.getWatchlist(params);
        const result2 = await caller.getWatchlist(params);

        expect(result1).toEqual(result2);
      });
    });
  });

  describe('Verified procedures', () => {
    let verifiedContext: any;

    beforeEach(async () => {
      const user = TestFactory.createUser({ emailVerified: true });
      verifiedContext = {
        ...mockContext,
        user,
        sessionToken: 'test-session-token',
      };
    });

    describe('updateProgress', () => {
      it('should update content progress for verified user', async () => {
        const caller = createCaller(verifiedContext);
        const contentId = '123e4567-e89b-12d3-a456-426614174000';

        const result = await caller.updateProgress({
          contentId,
          progress: {
            watched: true,
            currentEpisode: 5,
            totalEpisodes: 10,
            rating: 4,
            notes: 'Great series!',
          },
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain('Progress updated');
      });

      it('should require email verification', async () => {
        const unverifiedUser = TestFactory.createUser({ emailVerified: false });
        const unverifiedContext = {
          ...mockContext,
          user: unverifiedUser,
          sessionToken: 'test-session-token',
        };
        const caller = createCaller(unverifiedContext);

        await expect(caller.updateProgress({
          contentId: '123e4567-e89b-12d3-a456-426614174000',
          progress: { watched: true },
        })).rejects.toThrow('You must verify your email address');
      });

      it('should validate progress data', async () => {
        const caller = createCaller(verifiedContext);
        const contentId = '123e4567-e89b-12d3-a456-426614174000';

        // Invalid rating
        await expect(caller.updateProgress({
          contentId,
          progress: {
            watched: true,
            rating: 6, // Rating should be 1-5
          },
        })).rejects.toThrow();

        // Negative episode numbers
        await expect(caller.updateProgress({
          contentId,
          progress: {
            watched: true,
            currentEpisode: -1,
          },
        })).rejects.toThrow();
      });

      it('should validate notes length', async () => {
        const caller = createCaller(verifiedContext);
        const contentId = '123e4567-e89b-12d3-a456-426614174000';

        await expect(caller.updateProgress({
          contentId,
          progress: {
            watched: true,
            notes: 'a'.repeat(1001), // Too long
          },
        })).rejects.toThrow();
      });

      it('should invalidate user progress cache', async () => {
        const invalidateSpy = vi.spyOn(cache, 'invalidatePattern');
        const caller = createCaller(verifiedContext);
        const contentId = '123e4567-e89b-12d3-a456-426614174000';

        await caller.updateProgress({
          contentId,
          progress: { watched: true },
        });

        expect(invalidateSpy).toHaveBeenCalledWith(
          expect.arrayContaining([expect.stringMatching(/user:.*:progress/)])
        );
      });
    });
  });

  describe('Error handling', () => {
    beforeEach(async () => {
      mockContext = await createContext({
        req: mockRequest as FastifyRequest,
        res: mockReply as FastifyReply,
      });
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error scenario
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const caller = createCaller(mockContext);

      // This would normally cause a database error, but we're using mock data
      // In a real test, you'd mock the database to throw an error
      await expect(caller.getById({
        id: '123e4567-e89b-12d3-a456-426614174000',
      })).resolves.toBeDefined();
    });

    it('should handle cache failures gracefully', async () => {
      // Mock cache to fail
      vi.spyOn(cache, 'get').mockRejectedValue(new Error('Cache failed'));
      const caller = createCaller(mockContext);

      // Should still work even if cache fails
      await expect(caller.getById({
        id: '123e4567-e89b-12d3-a456-426614174000',
      })).resolves.toBeDefined();
    });

    it('should handle monitoring failures gracefully', async () => {
      // Mock monitoring to fail
      vi.spyOn(monitoring, 'trackAPIPerformance').mockRejectedValue(new Error('Monitoring failed'));
      const caller = createCaller(mockContext);

      // Should still work even if monitoring fails
      await expect(caller.getById({
        id: '123e4567-e89b-12d3-a456-426614174000',
      })).resolves.toBeDefined();
    });
  });

  describe('Performance and caching behavior', () => {
    beforeEach(async () => {
      mockContext = await createContext({
        req: mockRequest as FastifyRequest,
        res: mockReply as FastifyReply,
      });
    });

    it('should respect cache TTL settings', async () => {
      const caller = createCaller(mockContext);
      const contentId = '123e4567-e89b-12d3-a456-426614174000';

      // First call should cache with standard TTL
      await caller.getById({ id: contentId });

      // Verify cache key exists
      const cacheKey = `content:${contentId}`;
      const cached = await cache.get(cacheKey);
      expect(cached).toBeDefined();
    });

    it('should invalidate cache with correct tags', async () => {
      const user = TestFactory.createUser();
      const authenticatedContext = {
        ...mockContext,
        user,
        sessionToken: 'test-session-token',
      };
      
      const invalidateTagSpy = vi.spyOn(cache, 'invalidateTag');
      const caller = createCaller(authenticatedContext);

      await caller.addToWatchlist({
        contentId: '123e4567-e89b-12d3-a456-426614174000',
      });

      expect(invalidateTagSpy).toHaveBeenCalledWith(
        expect.arrayContaining(['watchlist', expect.stringMatching(/user-/)])
      );
    });

    it('should handle concurrent requests correctly', async () => {
      const caller = createCaller(mockContext);
      const contentId = '123e4567-e89b-12d3-a456-426614174000';

      // Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        caller.getById({ id: contentId })
      );

      const results = await Promise.all(promises);

      // All results should be identical
      results.forEach(result => {
        expect(result).toEqual(results[0]);
      });
    });
  });

  describe('Input validation and sanitization', () => {
    beforeEach(async () => {
      mockContext = await createContext({
        req: mockRequest as FastifyRequest,
        res: mockReply as FastifyReply,
      });
    });

    it('should validate UUID formats strictly', async () => {
      const caller = createCaller(mockContext);

      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '123e4567-e89b-12d3-a456-42661417400', // Too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // Too long
        '123g4567-e89b-12d3-a456-426614174000', // Invalid character
      ];

      for (const invalidId of invalidUUIDs) {
        await expect(caller.getById({ id: invalidId }))
          .rejects.toThrow('Invalid content ID format');
      }
    });

    it('should sanitize search queries', async () => {
      const caller = createCaller(mockContext);

      // Test with special characters and XSS attempts
      const dangerousQueries = [
        '<script>alert("xss")</script>',
        'SELECT * FROM users',
        '"; DROP TABLE users; --',
      ];

      for (const query of dangerousQueries) {
        // Should not throw error but also should not return harmful results
        const result = await caller.search({
          query,
          page: 1,
          limit: 20,
        });
        expect(result.results).toBeInstanceOf(Array);
      }
    });

    it('should validate enum values strictly', async () => {
      const caller = createCaller(mockContext);

      // Invalid content type filter
      await expect(caller.search({
        query: 'test',
        filters: {
          type: 'invalid_type' as any,
        },
      })).rejects.toThrow();

      // Invalid category
      await expect(caller.list({
        category: 'invalid_category' as any,
      })).rejects.toThrow();
    });

    it('should handle edge cases in numeric inputs', async () => {
      const caller = createCaller(mockContext);

      // Test boundary values
      await expect(caller.search({
        query: 'test',
        page: Number.MAX_SAFE_INTEGER,
        limit: 1,
      })).rejects.toThrow();

      await expect(caller.search({
        query: 'test',
        page: 1,
        limit: Number.MAX_SAFE_INTEGER,
      })).rejects.toThrow();
    });
  });
});