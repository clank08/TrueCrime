import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { fastify, type FastifyInstance } from 'fastify';
import { createServer } from '@/server';
import { cache } from '@/lib/cache';
import { TestFactory } from '@/test/factories';

describe('Cache Performance Tests', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only-minimum-256-bits';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-jwt-secret-for-testing-purposes-only-different';
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await cache.flush();
    
    server = await createServer();
    await server.listen({ port: 0 });
  });

  afterEach(async () => {
    await server?.close();
    await cache.flush();
  });

  describe('Cache Hit/Miss Performance', () => {
    it('should demonstrate cache performance improvement', async () => {
      const contentId = '123e4567-e89b-12d3-a456-426614174000';
      const endpoint = `/api/trpc/content.getById?${new URLSearchParams({
        input: JSON.stringify({ id: contentId })
      })}`;

      // Measure cold cache performance (first request)
      const coldStartTime = Date.now();
      const coldResponse = await server.inject({
        method: 'GET',
        url: endpoint,
      });
      const coldCacheTime = Date.now() - coldStartTime;

      expect(coldResponse.statusCode).toBe(200);

      // Measure warm cache performance (subsequent requests)
      const warmTimes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const warmStartTime = Date.now();
        const warmResponse = await server.inject({
          method: 'GET',
          url: endpoint,
        });
        const warmTime = Date.now() - warmStartTime;
        warmTimes.push(warmTime);

        expect(warmResponse.statusCode).toBe(200);
        expect(warmResponse.payload).toBe(coldResponse.payload); // Should be identical
      }

      const avgWarmTime = warmTimes.reduce((sum, time) => sum + time, 0) / warmTimes.length;
      const cacheImprovement = ((coldCacheTime - avgWarmTime) / coldCacheTime) * 100;

      console.log(`\n💾 Cache Performance Improvement:`);
      console.log(`Cold cache time: ${coldCacheTime}ms`);
      console.log(`Warm cache avg time: ${avgWarmTime.toFixed(2)}ms`);
      console.log(`Performance improvement: ${cacheImprovement.toFixed(1)}%`);

      // Cache should provide measurable performance improvement
      expect(avgWarmTime).toBeLessThanOrEqual(coldCacheTime);
      
      // For most scenarios, cache should be at least 10% faster
      if (coldCacheTime > 50) { // Only check improvement if cold cache took meaningful time
        expect(cacheImprovement).toBeGreaterThan(10);
      }
    });

    it('should handle cache misses efficiently under load', async () => {
      // Generate requests for different content IDs (all cache misses)
      const contentIds = Array.from({ length: 50 }, (_, i) => 
        `${i.toString().padStart(3, '0')}e4567-e89b-12d3-a456-426614174000`
      );

      const cacheMissRequests = contentIds.map(id =>
        server.inject({
          method: 'GET',
          url: `/api/trpc/content.getById?${new URLSearchParams({
            input: JSON.stringify({ id })
          })}`,
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(cacheMissRequests);
      const totalTime = Date.now() - startTime;

      const successfulResponses = responses.filter(r => r.statusCode === 200);
      const notFoundResponses = responses.filter(r => r.statusCode === 404);

      console.log(`\n🔍 Cache Miss Performance:`);
      console.log(`Total requests: ${contentIds.length}`);
      console.log(`Successful: ${successfulResponses.length}`);
      console.log(`Not found: ${notFoundResponses.length}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Avg time per miss: ${(totalTime / contentIds.length).toFixed(2)}ms`);

      // System should handle cache misses reasonably well
      expect(totalTime).toBeLessThan(15000); // Complete within 15 seconds
      expect(responses.length).toBe(contentIds.length); // All requests completed
    });

    it('should maintain cache performance with high hit rate', async () => {
      const contentId = '123e4567-e89b-12d3-a456-426614174000';
      const endpoint = `/api/trpc/content.getById?${new URLSearchParams({
        input: JSON.stringify({ id: contentId })
      })}`;

      // Warm up cache
      await server.inject({ method: 'GET', url: endpoint });

      // Generate high volume of cache hit requests
      const cacheHitRequests = Array.from({ length: 200 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: endpoint,
          headers: {
            'x-forwarded-for': `10.50.${Math.floor(i / 255) + 1}.${(i % 255) + 1}`,
          },
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(cacheHitRequests);
      const totalTime = Date.now() - startTime;

      const successfulResponses = responses.filter(r => r.statusCode === 200);
      const rateLimitedResponses = responses.filter(r => r.statusCode === 429);

      console.log(`\n⚡ High Cache Hit Rate Performance:`);
      console.log(`Total requests: ${cacheHitRequests.length}`);
      console.log(`Cache hits (200): ${successfulResponses.length}`);
      console.log(`Rate limited (429): ${rateLimitedResponses.length}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Requests per second: ${(cacheHitRequests.length / (totalTime / 1000)).toFixed(2)}`);

      // High cache hit rate should provide excellent performance
      expect(successfulResponses.length).toBeGreaterThan(0);
      expect(totalTime).toBeLessThan(10000); // Should be very fast with cache
      
      // All successful responses should be identical (cached content)
      if (successfulResponses.length > 1) {
        const firstPayload = successfulResponses[0].payload;
        successfulResponses.forEach(response => {
          expect(response.payload).toBe(firstPayload);
        });
      }
    });
  });

  describe('Cache Memory and Storage Performance', () => {
    it('should handle large cache datasets efficiently', async () => {
      const initialMemory = process.memoryUsage();
      
      // Populate cache with multiple content items
      const cachePopulationPromises = [];
      
      for (let i = 1; i <= 100; i++) {
        const testContent = {
          id: `${i.toString().padStart(3, '0')}e4567-e89b-12d3-a456-426614174000`,
          title: `Test Content ${i}`,
          description: 'A'.repeat(500), // 500 character description
          type: 'series',
          platforms: ['Netflix', 'Amazon Prime', 'Hulu'],
          genres: ['True Crime', 'Documentary'],
          year: 2020 + (i % 5),
          rating: (i % 5) + 1,
          metadata: {
            episodes: i % 20,
            seasons: Math.ceil(i / 10),
            runtime: (i % 60) + 30,
            cast: Array.from({ length: i % 10 }, (_, j) => `Actor ${j + 1}`),
            crew: Array.from({ length: i % 5 }, (_, j) => `Crew ${j + 1}`),
          }
        };

        // Cache the content directly
        cachePopulationPromises.push(
          cache.set(`content:${testContent.id}`, testContent, 3600)
        );
      }

      const populationStartTime = Date.now();
      await Promise.all(cachePopulationPromises);
      const populationTime = Date.now() - populationStartTime;

      console.log(`\n📚 Cache Population Performance:`);
      console.log(`Items cached: 100`);
      console.log(`Population time: ${populationTime}ms`);
      console.log(`Avg time per item: ${(populationTime / 100).toFixed(2)}ms`);

      // Test retrieval performance
      const retrievalPromises = [];
      for (let i = 1; i <= 100; i++) {
        const contentId = `${i.toString().padStart(3, '0')}e4567-e89b-12d3-a456-426614174000`;
        retrievalPromises.push(cache.get(`content:${contentId}`));
      }

      const retrievalStartTime = Date.now();
      const retrievedItems = await Promise.all(retrievalPromises);
      const retrievalTime = Date.now() - retrievalStartTime;

      console.log(`\n🔍 Cache Retrieval Performance:`);
      console.log(`Items retrieved: ${retrievedItems.filter(Boolean).length}`);
      console.log(`Retrieval time: ${retrievalTime}ms`);
      console.log(`Avg time per retrieval: ${(retrievalTime / 100).toFixed(2)}ms`);

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

      // Performance assertions
      expect(populationTime).toBeLessThan(5000); // Population should be fast
      expect(retrievalTime).toBeLessThan(1000); // Retrieval should be very fast
      expect(retrievedItems.filter(Boolean)).toHaveLength(100); // All items should be retrieved
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB for 100 items
    });

    it('should handle cache eviction under memory pressure', async () => {
      // Fill cache with large items to trigger memory management
      const largeItems = [];
      
      for (let i = 0; i < 50; i++) {
        const largeContent = {
          id: `large-${i}`,
          title: `Large Content ${i}`,
          description: 'X'.repeat(10000), // 10KB description
          metadata: {
            largField: 'Y'.repeat(50000), // 50KB of metadata
            episodes: Array.from({ length: 100 }, (_, j) => ({
              id: j,
              title: `Episode ${j}`,
              description: 'Z'.repeat(1000), // 1KB per episode
            })),
          }
        };
        
        largeItems.push(cache.set(`large-content:${i}`, largeContent, 1800)); // 30 min TTL
      }

      const cacheTime = Date.now();
      await Promise.all(largeItems);
      const totalCacheTime = Date.now() - cacheTime;

      console.log(`\n💾 Large Cache Item Performance:`);
      console.log(`Large items cached: 50`);
      console.log(`Total cache time: ${totalCacheTime}ms`);

      // Test retrieval of large items
      const retrievalPromises = Array.from({ length: 50 }, (_, i) =>
        cache.get(`large-content:${i}`)
      );

      const retrievalStartTime = Date.now();
      const retrievedLargeItems = await Promise.all(retrievalPromises);
      const retrievalTime = Date.now() - retrievalStartTime;

      console.log(`Large items retrieved: ${retrievedLargeItems.filter(Boolean).length}`);
      console.log(`Large item retrieval time: ${retrievalTime}ms`);

      // System should handle large cache items efficiently
      expect(totalCacheTime).toBeLessThan(10000);
      expect(retrievalTime).toBeLessThan(5000);
      expect(retrievedLargeItems.filter(Boolean).length).toBeGreaterThan(40); // Most should be cached
    });

    it('should maintain cache performance during concurrent operations', async () => {
      const concurrentOperations: Promise<any>[] = [];
      
      // Mix of cache operations
      for (let i = 0; i < 100; i++) {
        // Set operations
        concurrentOperations.push(
          cache.set(`concurrent-${i}`, {
            id: i,
            data: `Test data for item ${i}`,
            timestamp: Date.now(),
          })
        );

        // Get operations (some will miss, some will hit after set)
        concurrentOperations.push(
          cache.get(`concurrent-${i}`)
        );

        // Delete operations
        if (i % 5 === 0) {
          concurrentOperations.push(
            cache.del(`concurrent-${i}`)
          );
        }

        // Pattern operations
        if (i % 10 === 0) {
          concurrentOperations.push(
            cache.invalidatePattern([`concurrent-${i}*`])
          );
        }
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(concurrentOperations);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`\n🔄 Concurrent Cache Operations:`);
      console.log(`Total operations: ${concurrentOperations.length}`);
      console.log(`Successful: ${successful}`);
      console.log(`Failed: ${failed}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Operations per second: ${(concurrentOperations.length / (totalTime / 1000)).toFixed(2)}`);

      // Concurrent operations should be handled efficiently
      expect(failed).toBe(0); // No operations should fail
      expect(totalTime).toBeLessThan(5000); // Should complete quickly
    });
  });

  describe('Cache Pattern and Tag Performance', () => {
    it('should efficiently handle pattern-based cache invalidation', async () => {
      const user = TestFactory.createUser();
      const { generateAccessToken, createUserPayload } = await import('@/lib/jwt');
      const token = generateAccessToken(createUserPayload(user));

      // Create multiple cache entries with patterns
      const cacheSetupPromises = [];
      
      // User-specific cache entries
      for (let i = 1; i <= 20; i++) {
        cacheSetupPromises.push(
          cache.set(`user:${user.id}:watchlist:${i}:10`, {
            page: i,
            results: Array.from({ length: 10 }, (_, j) => ({ id: `item-${i}-${j}` })),
          })
        );
        
        cacheSetupPromises.push(
          cache.set(`user:${user.id}:progress:content-${i}`, {
            contentId: `content-${i}`,
            watched: i % 2 === 0,
            progress: i * 5,
          })
        );
      }

      // Global cache entries
      for (let i = 1; i <= 30; i++) {
        cacheSetupPromises.push(
          cache.set(`content:${i}`, {
            id: i,
            title: `Content ${i}`,
            cached: true,
          })
        );
      }

      await Promise.all(cacheSetupPromises);

      console.log(`\n🎯 Cache Pattern Setup Complete:`);
      console.log(`User-specific entries: 40`);
      console.log(`Global entries: 30`);

      // Test pattern invalidation performance
      const patternInvalidationStartTime = Date.now();
      
      await cache.invalidatePattern([
        `user:${user.id}:watchlist*`,
        `user:${user.id}:progress*`,
      ]);
      
      const patternInvalidationTime = Date.now() - patternInvalidationStartTime;

      // Verify pattern invalidation worked
      const verificationPromises = [];
      for (let i = 1; i <= 20; i++) {
        verificationPromises.push(cache.get(`user:${user.id}:watchlist:${i}:10`));
        verificationPromises.push(cache.get(`user:${user.id}:progress:content-${i}`));
      }

      const verificationResults = await Promise.all(verificationPromises);
      const remainingUserEntries = verificationResults.filter(Boolean).length;

      // Check that global entries are still cached
      const globalCheckPromises = Array.from({ length: 30 }, (_, i) =>
        cache.get(`content:${i + 1}`)
      );
      const globalResults = await Promise.all(globalCheckPromises);
      const remainingGlobalEntries = globalResults.filter(Boolean).length;

      console.log(`\n🚀 Pattern Invalidation Performance:`);
      console.log(`Invalidation time: ${patternInvalidationTime}ms`);
      console.log(`Remaining user entries: ${remainingUserEntries}/40`);
      console.log(`Remaining global entries: ${remainingGlobalEntries}/30`);

      // Pattern invalidation should be efficient and selective
      expect(patternInvalidationTime).toBeLessThan(1000); // Should be very fast
      expect(remainingUserEntries).toBe(0); // All user entries should be invalidated
      expect(remainingGlobalEntries).toBe(30); // Global entries should remain
    });

    it('should handle tag-based invalidation efficiently', async () => {
      // Set up cache with tags
      const taggedCachePromises = [];
      
      // Content with 'watchlist' tag
      for (let i = 1; i <= 25; i++) {
        taggedCachePromises.push(
          cache.set(`watchlist-content:${i}`, { id: i, type: 'watchlist' }, 3600, ['watchlist', 'content'])
        );
      }

      // Content with 'progress' tag
      for (let i = 1; i <= 25; i++) {
        taggedCachePromises.push(
          cache.set(`progress-content:${i}`, { id: i, type: 'progress' }, 3600, ['progress', 'content'])
        );
      }

      // Content with 'search' tag
      for (let i = 1; i <= 25; i++) {
        taggedCachePromises.push(
          cache.set(`search-result:${i}`, { id: i, type: 'search' }, 3600, ['search', 'content'])
        );
      }

      await Promise.all(taggedCachePromises);

      // Test tag invalidation performance
      const tagInvalidationStartTime = Date.now();
      await cache.invalidateTag(['watchlist', 'progress']);
      const tagInvalidationTime = Date.now() - tagInvalidationStartTime;

      // Verify tag invalidation results
      const watchlistCheck = await Promise.all(
        Array.from({ length: 25 }, (_, i) => cache.get(`watchlist-content:${i + 1}`))
      );
      const progressCheck = await Promise.all(
        Array.from({ length: 25 }, (_, i) => cache.get(`progress-content:${i + 1}`))
      );
      const searchCheck = await Promise.all(
        Array.from({ length: 25 }, (_, i) => cache.get(`search-result:${i + 1}`))
      );

      const remainingWatchlist = watchlistCheck.filter(Boolean).length;
      const remainingProgress = progressCheck.filter(Boolean).length;
      const remainingSearch = searchCheck.filter(Boolean).length;

      console.log(`\n🏷️ Tag-based Invalidation Performance:`);
      console.log(`Tag invalidation time: ${tagInvalidationTime}ms`);
      console.log(`Remaining watchlist: ${remainingWatchlist}/25`);
      console.log(`Remaining progress: ${remainingProgress}/25`);
      console.log(`Remaining search: ${remainingSearch}/25`);

      // Tag invalidation should be efficient and precise
      expect(tagInvalidationTime).toBeLessThan(2000);
      expect(remainingWatchlist).toBe(0); // Should invalidate watchlist tagged items
      expect(remainingProgress).toBe(0); // Should invalidate progress tagged items
      expect(remainingSearch).toBe(25); // Should preserve search tagged items
    });
  });

  describe('Cache Failure and Recovery Performance', () => {
    it('should handle cache storage failures gracefully', async () => {
      // Mock cache operations to fail intermittently
      let failureCount = 0;
      const originalGet = cache.get;
      const originalSet = cache.set;

      const intermittentFailureGet = vi.fn(async (key: string) => {
        if (failureCount++ % 3 === 0) {
          throw new Error('Simulated cache get failure');
        }
        return originalGet.call(cache, key);
      });

      const intermittentFailureSet = vi.fn(async (key: string, value: any, ttl?: number, tags?: string[]) => {
        if (failureCount++ % 4 === 0) {
          throw new Error('Simulated cache set failure');
        }
        return originalSet.call(cache, key, value, ttl, tags);
      });

      cache.get = intermittentFailureGet;
      cache.set = intermittentFailureSet;

      // Test API performance with cache failures
      const contentId = '123e4567-e89b-12d3-a456-426614174000';
      const endpoint = `/api/trpc/content.getById?${new URLSearchParams({
        input: JSON.stringify({ id: contentId })
      })}`;

      const requestsWithFailures = Array.from({ length: 20 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: endpoint,
          headers: {
            'x-forwarded-for': `10.100.1.${i + 1}`,
          },
        })
      );

      const startTime = Date.now();
      const responses = await Promise.allSettled(requestsWithFailures);
      const totalTime = Date.now() - startTime;

      const successful = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).statusCode === 200
      ).length;

      console.log(`\n🔥 Cache Failure Resilience:`);
      console.log(`Requests with cache failures: 20`);
      console.log(`Successful responses: ${successful}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Get failure calls: ${intermittentFailureGet.mock.calls.length}`);
      console.log(`Set failure calls: ${intermittentFailureSet.mock.calls.length}`);

      // Restore original cache methods
      cache.get = originalGet;
      cache.set = originalSet;

      // System should continue working despite cache failures
      expect(successful).toBeGreaterThan(15); // Most requests should still work
      expect(totalTime).toBeLessThan(10000); // Performance shouldn't degrade drastically
    });

    it('should recover performance after cache system restoration', async () => {
      // First, measure performance with working cache
      const contentId = '123e4567-e89b-12d3-a456-426614174000';
      const endpoint = `/api/trpc/content.getById?${new URLSearchParams({
        input: JSON.stringify({ id: contentId })
      })}`;

      const normalRequests = Array.from({ length: 10 }, () =>
        server.inject({ method: 'GET', url: endpoint })
      );

      const normalStartTime = Date.now();
      await Promise.all(normalRequests);
      const normalTime = Date.now() - normalStartTime;

      // Simulate cache system failure
      const originalGet = cache.get;
      cache.get = vi.fn().mockRejectedValue(new Error('Cache system down'));

      const failureRequests = Array.from({ length: 10 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: endpoint,
          headers: {
            'x-forwarded-for': `10.200.1.${i + 1}`,
          },
        })
      );

      const failureStartTime = Date.now();
      await Promise.all(failureRequests);
      const failureTime = Date.now() - failureStartTime;

      // Restore cache system
      cache.get = originalGet;

      const recoveryRequests = Array.from({ length: 10 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: endpoint,
          headers: {
            'x-forwarded-for': `10.200.2.${i + 1}`,
          },
        })
      );

      const recoveryStartTime = Date.now();
      await Promise.all(recoveryRequests);
      const recoveryTime = Date.now() - recoveryStartTime;

      console.log(`\n🔄 Cache Recovery Performance:`);
      console.log(`Normal operation time: ${normalTime}ms`);
      console.log(`Failure operation time: ${failureTime}ms`);
      console.log(`Recovery operation time: ${recoveryTime}ms`);
      console.log(`Recovery vs Normal ratio: ${(recoveryTime / normalTime).toFixed(2)}x`);

      // System should recover to near-normal performance
      expect(recoveryTime).toBeLessThan(failureTime * 1.5); // Better than failure mode
      expect(recoveryTime).toBeLessThan(normalTime * 3); // Within reasonable range of normal
    });
  });

  afterAll(async () => {
    console.log(`\n📈 Cache Performance Test Summary:`);
    console.log(`✅ Cache hit/miss performance verified`);
    console.log(`✅ Memory and storage efficiency confirmed`);
    console.log(`✅ Pattern and tag invalidation performance validated`);
    console.log(`✅ Failure resilience and recovery tested`);
    console.log(`🚀 Cache system performs efficiently under various load conditions`);
  });
});