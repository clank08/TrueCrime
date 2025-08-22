import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCallerFactory } from '@trpc/server';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { contentRouter } from '@/routers/content.router';
import { createContext } from '@/lib/trpc';
import { TestFactory } from '@/test';
import { cache } from '@/lib/cache';

/**
 * Performance tests for Content Discovery search functionality
 * Tests response times, throughput, memory usage, and scalability
 * Target: Search responses < 100ms for optimal user experience
 */

const createCaller = createCallerFactory(contentRouter);

describe('Content Search Performance Tests', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockContext: any;
  let performanceMetrics: {
    searchTimes: number[];
    memoryUsage: NodeJS.MemoryUsage[];
    cacheHitRates: number[];
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockRequest = {
      ip: '192.168.1.100',
      headers: {
        'user-agent': 'performance-test-client',
      },
    };
    
    mockReply = {
      setCookie: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    
    mockContext = await createContext({
      req: mockRequest as FastifyRequest,
      res: mockReply as FastifyReply,
    });
    
    // Initialize performance tracking
    performanceMetrics = {
      searchTimes: [],
      memoryUsage: [],
      cacheHitRates: []
    };
    
    // Clear cache for consistent testing
    await cache.flush();
  });

  afterEach(async () => {
    await cache.flush();
    vi.restoreAllMocks();
  });

  describe('Search Response Time Performance', () => {
    it('should complete basic search within 100ms target', async () => {
      const caller = createCaller(mockContext);
      
      const startTime = performance.now();
      const result = await caller.search({
        query: 'Ted Bundy',
        page: 1,
        limit: 20,
      });
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      performanceMetrics.searchTimes.push(responseTime);
      
      expect(responseTime).toBeLessThan(100); // 100ms target
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });

    it('should complete filtered search within 150ms target', async () => {
      const caller = createCaller(mockContext);
      
      const startTime = performance.now();
      const result = await caller.search({
        query: 'serial killer',
        page: 1,
        limit: 20,
        filters: {
          contentType: 'DOCUMENTARY',
          caseType: 'SERIAL_KILLER',
          yearFrom: 2015,
          ratingFrom: 4.0
        }
      });
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      performanceMetrics.searchTimes.push(responseTime);
      
      expect(responseTime).toBeLessThan(150); // Slightly higher for complex filters
      expect(result).toBeDefined();
    });

    it('should complete sorted search within 120ms target', async () => {
      const caller = createCaller(mockContext);
      
      const startTime = performance.now();
      const result = await caller.search({
        query: 'true crime',
        page: 1,
        limit: 20,
        sort: 'rating_desc'
      });
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      performanceMetrics.searchTimes.push(responseTime);
      
      expect(responseTime).toBeLessThan(120);
      expect(result).toBeDefined();
    });

    it('should maintain performance with pagination', async () => {
      const caller = createCaller(mockContext);
      
      // Test multiple pages
      const pages = [1, 2, 3, 5, 10];
      const pageTimes: number[] = [];
      
      for (const page of pages) {
        const startTime = performance.now();
        await caller.search({
          query: 'documentary',
          page,
          limit: 20,
        });
        const endTime = performance.now();
        
        const responseTime = endTime - startTime;
        pageTimes.push(responseTime);
        performanceMetrics.searchTimes.push(responseTime);
      }
      
      // Performance should remain consistent across pages
      const avgTime = pageTimes.reduce((sum, time) => sum + time, 0) / pageTimes.length;
      const maxTime = Math.max(...pageTimes);
      
      expect(avgTime).toBeLessThan(100);
      expect(maxTime).toBeLessThan(150);
      
      // Variance should be low (consistent performance)
      const variance = pageTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / pageTimes.length;
      expect(variance).toBeLessThan(1000); // Low variance in response times
    });
  });

  describe('Content Retrieval Performance', () => {
    it('should retrieve content by ID within 50ms target', async () => {
      const caller = createCaller(mockContext);
      const contentId = '123e4567-e89b-12d3-a456-426614174000';
      
      const startTime = performance.now();
      const result = await caller.getById({ id: contentId });
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      performanceMetrics.searchTimes.push(responseTime);
      
      expect(responseTime).toBeLessThan(50); // ID lookup should be very fast
      expect(result).toBeDefined();
      expect(result.id).toBe(contentId);
    });

    it('should retrieve content list within 80ms target', async () => {
      const caller = createCaller(mockContext);
      
      const startTime = performance.now();
      const result = await caller.list({
        page: 1,
        limit: 20,
        category: 'trending'
      });
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      performanceMetrics.searchTimes.push(responseTime);
      
      expect(responseTime).toBeLessThan(80);
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });
  });

  describe('Caching Performance Impact', () => {
    it('should show significant performance improvement with caching', async () => {
      const caller = createCaller(mockContext);
      const searchParams = {
        query: 'Ted Bundy',
        page: 1,
        limit: 20,
      };
      
      // First call (no cache)
      const startTime1 = performance.now();
      await caller.search(searchParams);
      const endTime1 = performance.now();
      const firstCallTime = endTime1 - startTime1;
      
      // Second call (with cache)
      const startTime2 = performance.now();
      await caller.search(searchParams);
      const endTime2 = performance.now();
      const secondCallTime = endTime2 - startTime2;
      
      // Cached call should be significantly faster
      expect(secondCallTime).toBeLessThan(firstCallTime * 0.5); // At least 50% faster
      expect(secondCallTime).toBeLessThan(20); // Very fast cache retrieval
      
      performanceMetrics.searchTimes.push(firstCallTime, secondCallTime);
    });

    it('should maintain cache performance under load', async () => {
      const caller = createCaller(mockContext);
      
      // Warm up cache
      await caller.search({ query: 'cache test', page: 1, limit: 20 });
      
      // Test multiple concurrent cache hits
      const cacheTests = Array.from({ length: 10 }, () => 
        caller.search({ query: 'cache test', page: 1, limit: 20 })
      );
      
      const startTime = performance.now();
      const results = await Promise.all(cacheTests);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / cacheTests.length;
      
      expect(avgTimePerRequest).toBeLessThan(25); // Fast concurrent cache access
      expect(results).toHaveLength(10);
      
      // All results should be identical (from cache)
      results.forEach(result => {
        expect(result).toEqual(results[0]);
      });
    });
  });

  describe('Load Testing and Scalability', () => {
    it('should handle concurrent search requests efficiently', async () => {
      const caller = createCaller(mockContext);
      
      // Simulate 20 concurrent users searching
      const concurrentSearches = Array.from({ length: 20 }, (_, i) => 
        caller.search({
          query: `search ${i}`,
          page: 1,
          limit: 20,
        })
      );
      
      const startTime = performance.now();
      const results = await Promise.all(concurrentSearches);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / concurrentSearches.length;
      
      expect(avgTimePerRequest).toBeLessThan(200); // Reasonable under load
      expect(results).toHaveLength(20);
      
      // All requests should complete successfully
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.results).toBeDefined();
      });
      
      performanceMetrics.searchTimes.push(avgTimePerRequest);
    });

    it('should maintain performance with varying query complexity', async () => {
      const caller = createCaller(mockContext);
      
      const complexQueries = [
        // Simple query
        { query: 'crime', complexity: 'simple' },
        
        // Medium complexity
        {
          query: 'serial killer documentary',
          filters: { contentType: 'DOCUMENTARY' },
          complexity: 'medium'
        },
        
        // High complexity
        {
          query: 'true crime investigation',
          filters: {
            contentType: 'DOCUSERIES',
            caseType: 'SERIAL_KILLER',
            yearFrom: 2015,
            yearTo: 2023,
            ratingFrom: 4.0,
            platforms: ['Netflix', 'Amazon Prime']
          },
          sort: 'rating_desc',
          complexity: 'high'
        }
      ];
      
      const queryTimes: Record<string, number> = {};
      
      for (const { complexity, ...searchParams } of complexQueries) {
        const startTime = performance.now();
        await caller.search(searchParams);
        const endTime = performance.now();
        
        const responseTime = endTime - startTime;
        queryTimes[complexity] = responseTime;
        performanceMetrics.searchTimes.push(responseTime);
      }
      
      // All queries should complete within reasonable time
      expect(queryTimes.simple).toBeLessThan(80);
      expect(queryTimes.medium).toBeLessThan(120);
      expect(queryTimes.high).toBeLessThan(200);
      
      // Complex queries can take longer but should be predictable
      expect(queryTimes.high).toBeGreaterThan(queryTimes.simple);
    });

    it('should handle large result sets efficiently', async () => {
      const caller = createCaller(mockContext);
      
      // Test with different page sizes
      const pageSizes = [5, 10, 20, 50];
      const pageSizeTimes: Record<number, number> = {};
      
      for (const limit of pageSizes) {
        const startTime = performance.now();
        const result = await caller.search({
          query: 'documentary',
          page: 1,
          limit,
        });
        const endTime = performance.now();
        
        const responseTime = endTime - startTime;
        pageSizeTimes[limit] = responseTime;
        performanceMetrics.searchTimes.push(responseTime);
        
        expect(result.results).toBeDefined();
      }
      
      // Performance should scale reasonably with page size
      expect(pageSizeTimes[5]).toBeLessThan(80);
      expect(pageSizeTimes[50]).toBeLessThan(150);
      
      // Larger pages should not be disproportionately slower
      const scalingRatio = pageSizeTimes[50] / pageSizeTimes[5];
      expect(scalingRatio).toBeLessThan(3); // Should not be more than 3x slower
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('should maintain stable memory usage during repeated searches', async () => {
      const caller = createCaller(mockContext);
      
      // Record initial memory
      const initialMemory = process.memoryUsage();
      performanceMetrics.memoryUsage.push(initialMemory);
      
      // Perform multiple searches
      for (let i = 0; i < 50; i++) {
        await caller.search({
          query: `memory test ${i}`,
          page: 1,
          limit: 20,
        });
        
        if (i % 10 === 0) {
          performanceMetrics.memoryUsage.push(process.memoryUsage());
        }
      }
      
      // Record final memory
      const finalMemory = process.memoryUsage();
      performanceMetrics.memoryUsage.push(finalMemory);
      
      // Memory growth should be reasonable
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      
      expect(memoryGrowthMB).toBeLessThan(50); // Less than 50MB growth
      
      // RSS should not grow excessively
      const rssGrowth = finalMemory.rss - initialMemory.rss;
      const rssGrowthMB = rssGrowth / (1024 * 1024);
      expect(rssGrowthMB).toBeLessThan(100); // Less than 100MB RSS growth
    });

    it('should efficiently garbage collect after searches', async () => {
      const caller = createCaller(mockContext);
      
      // Perform searches that should create temporary objects
      for (let i = 0; i < 20; i++) {
        await caller.search({
          query: `gc test ${Math.random()}`,
          page: 1,
          limit: 20,
          filters: {
            contentType: 'DOCUMENTARY',
            yearFrom: 2000 + i,
          }
        });
      }
      
      // Force garbage collection
      global.gc && global.gc();
      
      const memoryAfterGC = process.memoryUsage();
      performanceMetrics.memoryUsage.push(memoryAfterGC);
      
      // Memory should be reasonable after GC
      const heapUsedMB = memoryAfterGC.heapUsed / (1024 * 1024);
      expect(heapUsedMB).toBeLessThan(100); // Reasonable heap usage
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent search performance over time', async () => {
      const caller = createCaller(mockContext);
      
      // Baseline performance test
      const baselineTests = Array.from({ length: 10 }, () => 
        caller.search({ query: 'baseline test', page: 1, limit: 20 })
      );
      
      const baselineTimes: number[] = [];
      for (const test of baselineTests) {
        const startTime = performance.now();
        await test;
        const endTime = performance.now();
        baselineTimes.push(endTime - startTime);
      }
      
      const baselineAvg = baselineTimes.reduce((sum, time) => sum + time, 0) / baselineTimes.length;
      
      // Simulate some operations that might affect performance
      await cache.flush();
      
      // Performance test after operations
      const regressionTests = Array.from({ length: 10 }, () => 
        caller.search({ query: 'regression test', page: 1, limit: 20 })
      );
      
      const regressionTimes: number[] = [];
      for (const test of regressionTests) {
        const startTime = performance.now();
        await test;
        const endTime = performance.now();
        regressionTimes.push(endTime - startTime);
      }
      
      const regressionAvg = regressionTimes.reduce((sum, time) => sum + time, 0) / regressionTimes.length;
      
      // Performance should not have regressed significantly
      const performanceRatio = regressionAvg / baselineAvg;
      expect(performanceRatio).toBeLessThan(2.0); // No more than 2x slower
      
      performanceMetrics.searchTimes.push(...baselineTimes, ...regressionTimes);
    });

    it('should provide performance metrics summary', () => {
      if (performanceMetrics.searchTimes.length === 0) {
        // If no tests have run, skip metrics
        return;
      }
      
      const times = performanceMetrics.searchTimes;
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
      
      // Log performance summary
      console.log('\n=== Content Search Performance Summary ===');
      console.log(`Total tests: ${times.length}`);
      console.log(`Average response time: ${avgTime.toFixed(2)}ms`);
      console.log(`Minimum response time: ${minTime.toFixed(2)}ms`);
      console.log(`Maximum response time: ${maxTime.toFixed(2)}ms`);
      console.log(`95th percentile: ${p95Time.toFixed(2)}ms`);
      
      // Performance assertions
      expect(avgTime).toBeLessThan(150); // Average should be good
      expect(p95Time).toBeLessThan(250); // 95% of requests should be fast
      expect(maxTime).toBeLessThan(500); // Even worst case should be reasonable
      
      // Memory usage summary
      if (performanceMetrics.memoryUsage.length > 0) {
        const memoryUsages = performanceMetrics.memoryUsage.map(m => m.heapUsed / (1024 * 1024));
        const avgMemory = memoryUsages.reduce((sum, mem) => sum + mem, 0) / memoryUsages.length;
        const maxMemory = Math.max(...memoryUsages);
        
        console.log(`Average heap usage: ${avgMemory.toFixed(2)}MB`);
        console.log(`Maximum heap usage: ${maxMemory.toFixed(2)}MB`);
        console.log('==========================================\n');
      }
    });
  });
});
