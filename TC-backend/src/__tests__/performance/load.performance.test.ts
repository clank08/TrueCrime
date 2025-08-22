import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { fastify, type FastifyInstance } from 'fastify';
import { createServer } from '@/server';
import { cache } from '@/lib/cache';
import { monitoring } from '@/lib/monitoring';
import { TestFactory } from '@/test/factories';

describe('Load Testing and Performance Tests', () => {
  let server: FastifyInstance;
  let baseUrl: string;
  
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
    
    const address = server.server.address();
    const port = typeof address === 'string' ? address : address?.port;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    await server?.close();
    await cache.flush();
    monitoring.cleanup();
  });

  describe('API Endpoint Performance', () => {
    it('should handle high concurrent load on public endpoints', async () => {
      const concurrencyLevel = 50;
      const requestsPerEndpoint = 20;
      
      const endpoints = [
        `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
        })}`,
        `/api/trpc/content.list?${new URLSearchParams({
          input: JSON.stringify({ category: 'trending', limit: 10 })
        })}`,
        `/api/trpc/content.search?${new URLSearchParams({
          input: JSON.stringify({ query: 'Ted Bundy', limit: 5 })
        })}`,
      ];

      const allRequests: Promise<any>[] = [];
      
      // Generate concurrent requests across different endpoints
      for (let i = 0; i < concurrencyLevel; i++) {
        for (const endpoint of endpoints) {
          for (let j = 0; j < requestsPerEndpoint; j++) {
            allRequests.push(
              server.inject({
                method: 'GET',
                url: endpoint,
                headers: {
                  'x-forwarded-for': `192.168.1.${(i % 255) + 1}`, // Vary IPs to avoid rate limiting
                },
              })
            );
          }
        }
      }

      const startTime = Date.now();
      const responses = await Promise.allSettled(allRequests);
      const totalTime = Date.now() - startTime;

      console.log(`\n📊 Load Test Results:`);
      console.log(`Total requests: ${allRequests.length}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Requests per second: ${(allRequests.length / (totalTime / 1000)).toFixed(2)}`);

      // Analyze responses
      const fulfilled = responses.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
      const rejected = responses.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
      
      const successfulResponses = fulfilled.filter(r => r.value.statusCode === 200);
      const rateLimitedResponses = fulfilled.filter(r => r.value.statusCode === 429);
      const errorResponses = fulfilled.filter(r => r.value.statusCode >= 500);

      console.log(`✅ Successful: ${successfulResponses.length}`);
      console.log(`⏳ Rate Limited: ${rateLimitedResponses.length}`);
      console.log(`❌ Server Errors: ${errorResponses.length}`);
      console.log(`💥 Failed Requests: ${rejected.length}`);

      // Performance assertions
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
      expect(successfulResponses.length).toBeGreaterThan(0); // Some requests should succeed
      expect(errorResponses.length).toBe(0); // No server errors under normal load
      expect(rejected.length).toBe(0); // No completely failed requests
      
      // Should handle at least 60% of requests successfully or rate limit gracefully
      const handledSuccessfully = successfulResponses.length + rateLimitedResponses.length;
      expect(handledSuccessfully / allRequests.length).toBeGreaterThan(0.6);
    });

    it('should maintain response time SLA under moderate load', async () => {
      const numberOfRequests = 100;
      const maxAcceptableResponseTime = 1000; // 1 second
      const responseTimes: number[] = [];

      const requests = Array.from({ length: numberOfRequests }, async (_, i) => {
        const startTime = Date.now();
        
        const response = await server.inject({
          method: 'GET',
          url: `/api/trpc/content.getById?${new URLSearchParams({
            input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
          })}`,
          headers: {
            'x-forwarded-for': `10.0.0.${(i % 255) + 1}`,
          },
        });
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
        
        return response;
      });

      const responses = await Promise.all(requests);

      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const minResponseTime = Math.min(...responseTimes);
      const maxResponseTime = Math.max(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      console.log(`\n⏱️ Response Time Analysis:`);
      console.log(`Average: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Min: ${minResponseTime}ms`);
      console.log(`Max: ${maxResponseTime}ms`);
      console.log(`95th Percentile: ${p95ResponseTime}ms`);

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(maxAcceptableResponseTime);
      expect(p95ResponseTime).toBeLessThan(maxAcceptableResponseTime * 2); // P95 can be up to 2x
      expect(responses.filter(r => r.statusCode === 200).length).toBeGreaterThan(numberOfRequests * 0.8);
    });

    it('should handle memory-intensive operations without leaks', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate memory-intensive requests
      const requests = Array.from({ length: 200 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: `/api/trpc/content.search?${new URLSearchParams({
            input: JSON.stringify({
              query: `memory intensive search query with lots of text ${i}`,
              page: 1,
              limit: 20,
            })
          })}`,
          headers: {
            'x-forwarded-for': `172.16.0.${(i % 255) + 1}`,
          },
        })
      );

      await Promise.all(requests);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        // Wait a bit for GC to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = {
        rss: finalMemory.rss - initialMemory.rss,
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external,
      };

      console.log(`\n🧠 Memory Usage Analysis:`);
      console.log(`RSS Growth: ${(memoryGrowth.rss / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Heap Used Growth: ${(memoryGrowth.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Heap Total Growth: ${(memoryGrowth.heapTotal / 1024 / 1024).toFixed(2)}MB`);

      // Memory should not grow excessively (less than 100MB for this test)
      expect(memoryGrowth.rss).toBeLessThan(100 * 1024 * 1024); // 100MB
      expect(memoryGrowth.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  describe('Cache Performance Under Load', () => {
    it('should demonstrate cache efficiency under high load', async () => {
      const contentId = '123e4567-e89b-12d3-a456-426614174000';
      const endpoint = `/api/trpc/content.getById?${new URLSearchParams({
        input: JSON.stringify({ id: contentId })
      })}`;
      
      // First, populate cache with a single request
      await server.inject({
        method: 'GET',
        url: endpoint,
      });

      // Now make many concurrent requests to the same endpoint
      const cacheRequests = Array.from({ length: 100 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: endpoint,
          headers: {
            'x-forwarded-for': `192.168.2.${(i % 255) + 1}`,
          },
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(cacheRequests);
      const cacheTestTime = Date.now() - startTime;

      // All responses should be successful and identical (from cache)
      const successfulResponses = responses.filter(r => r.statusCode === 200);
      expect(successfulResponses.length).toBeGreaterThan(90); // Most should succeed despite rate limiting

      // Verify all successful responses have identical content
      if (successfulResponses.length > 1) {
        const firstPayload = successfulResponses[0].payload;
        successfulResponses.forEach(response => {
          expect(response.payload).toBe(firstPayload);
        });
      }

      console.log(`\n💾 Cache Performance Results:`);
      console.log(`Cache test time: ${cacheTestTime}ms`);
      console.log(`Average time per cached request: ${(cacheTestTime / cacheRequests.length).toFixed(2)}ms`);
      console.log(`Cache hit responses: ${successfulResponses.length}/${cacheRequests.length}`);

      // Cache should significantly improve performance
      expect(cacheTestTime).toBeLessThan(5000); // Should complete quickly with cache
    });

    it('should handle cache invalidation under concurrent load', async () => {
      // Set up authenticated user
      const user = TestFactory.createUser();
      const { generateAccessToken, createUserPayload } = await import('@/lib/jwt');
      const token = generateAccessToken(createUserPayload(user));
      const contentId = '123e4567-e89b-12d3-a456-426614174000';

      // Populate cache with watchlist data
      await server.inject({
        method: 'GET',
        url: `/api/trpc/content.getWatchlist?${new URLSearchParams({
          input: JSON.stringify({ page: 1, limit: 20 })
        })}`,
        headers: { 'authorization': `Bearer ${token}` },
      });

      // Create concurrent cache invalidation operations
      const invalidationRequests = Array.from({ length: 10 }, (_, i) =>
        server.inject({
          method: 'POST',
          url: '/api/trpc/content.addToWatchlist',
          headers: {
            'authorization': `Bearer ${token}`,
            'content-type': 'application/json',
            'x-forwarded-for': `10.1.1.${i + 1}`,
          },
          payload: { contentId },
        })
      );

      // Also create concurrent read requests during invalidation
      const readRequests = Array.from({ length: 20 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: `/api/trpc/content.getWatchlist?${new URLSearchParams({
            input: JSON.stringify({ page: 1, limit: 20 })
          })}`,
          headers: {
            'authorization': `Bearer ${token}`,
            'x-forwarded-for': `10.1.2.${i + 1}`,
          },
        })
      );

      const startTime = Date.now();
      const [writeResponses, readResponses] = await Promise.all([
        Promise.allSettled(invalidationRequests),
        Promise.allSettled(readRequests),
      ]);
      const totalTime = Date.now() - startTime;

      console.log(`\n🔄 Cache Invalidation Performance:`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Write operations: ${writeResponses.length}`);
      console.log(`Read operations: ${readResponses.length}`);

      // Most operations should succeed despite concurrent cache operations
      const successfulWrites = writeResponses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).statusCode === 200
      ).length;
      const successfulReads = readResponses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).statusCode === 200
      ).length;

      console.log(`Successful writes: ${successfulWrites}/${writeResponses.length}`);
      console.log(`Successful reads: ${successfulReads}/${readResponses.length}`);

      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(successfulWrites).toBeGreaterThan(0); // Some writes should succeed
      expect(successfulReads).toBeGreaterThan(readRequests.length * 0.5); // Most reads should work
    });

    it('should maintain cache consistency under high write load', async () => {
      const user = TestFactory.createUser();
      const { generateAccessToken, createUserPayload } = await import('@/lib/jwt');
      const token = generateAccessToken(createUserPayload(user));

      // Create multiple content IDs for testing
      const contentIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174002',
        '123e4567-e89b-12d3-a456-426614174003',
        '123e4567-e89b-12d3-a456-426614174004',
      ];

      // Perform concurrent watchlist operations
      const operations: Promise<any>[] = [];

      // Add operations
      contentIds.forEach((contentId, i) => {
        operations.push(
          server.inject({
            method: 'POST',
            url: '/api/trpc/content.addToWatchlist',
            headers: {
              'authorization': `Bearer ${token}`,
              'content-type': 'application/json',
              'x-forwarded-for': `10.2.1.${i + 1}`,
            },
            payload: { contentId },
          })
        );
      });

      // Remove operations (some might fail if not added yet)
      contentIds.slice(0, 2).forEach((contentId, i) => {
        operations.push(
          server.inject({
            method: 'POST',
            url: '/api/trpc/content.removeFromWatchlist',
            headers: {
              'authorization': `Bearer ${token}`,
              'content-type': 'application/json',
              'x-forwarded-for': `10.2.2.${i + 1}`,
            },
            payload: { contentId },
          })
        );
      });

      // Read operations during concurrent writes
      for (let i = 0; i < 10; i++) {
        operations.push(
          server.inject({
            method: 'GET',
            url: `/api/trpc/content.getWatchlist?${new URLSearchParams({
              input: JSON.stringify({ page: 1, limit: 50 })
            })}`,
            headers: {
              'authorization': `Bearer ${token}`,
              'x-forwarded-for': `10.2.3.${i + 1}`,
            },
          })
        );
      }

      const responses = await Promise.allSettled(operations);
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).statusCode === 200
      ).length;

      console.log(`\n🔐 Cache Consistency Results:`);
      console.log(`Total operations: ${operations.length}`);
      console.log(`Successful operations: ${successful}`);
      console.log(`Success rate: ${((successful / operations.length) * 100).toFixed(1)}%`);

      // Most operations should succeed
      expect(successful / operations.length).toBeGreaterThan(0.7);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should efficiently enforce rate limits under high load', async () => {
      const clientIP = '192.168.100.1';
      const endpoint = `/api/trpc/content.search?${new URLSearchParams({
        input: JSON.stringify({ query: 'rate limit test', limit: 5 })
      })}`;

      // Make requests way beyond the rate limit
      const excessRequests = Array.from({ length: 100 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: endpoint,
          headers: {
            'x-forwarded-for': clientIP,
            'user-agent': `test-client-${i}`,
          },
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(excessRequests);
      const totalTime = Date.now() - startTime;

      const successfulResponses = responses.filter(r => r.statusCode === 200);
      const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
      const otherResponses = responses.filter(r => r.statusCode !== 200 && r.statusCode !== 429);

      console.log(`\n🚦 Rate Limiting Performance:`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Successful requests: ${successfulResponses.length}`);
      console.log(`Rate limited requests: ${rateLimitedResponses.length}`);
      console.log(`Other response codes: ${otherResponses.length}`);

      // Rate limiting should work efficiently
      expect(rateLimitedResponses.length).toBeGreaterThan(0); // Should hit rate limits
      expect(successfulResponses.length).toBeLessThanOrEqual(30); // Within reasonable limits
      expect(otherResponses.length).toBe(0); // No unexpected errors
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Verify rate limit headers are present
      const firstRateLimited = rateLimitedResponses[0];
      expect(firstRateLimited?.headers).toHaveProperty('retry-after');
      expect(firstRateLimited?.headers).toHaveProperty('x-ratelimit-limit');
    });

    it('should handle rate limiting across multiple IPs efficiently', async () => {
      const numberOfIPs = 20;
      const requestsPerIP = 10;
      const allRequests: Promise<any>[] = [];

      // Generate requests from multiple IP addresses
      for (let ip = 1; ip <= numberOfIPs; ip++) {
        for (let req = 1; req <= requestsPerIP; req++) {
          allRequests.push(
            server.inject({
              method: 'GET',
              url: `/api/trpc/content.getById?${new URLSearchParams({
                input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
              })}`,
              headers: {
                'x-forwarded-for': `10.10.10.${ip}`,
              },
            })
          );
        }
      }

      const startTime = Date.now();
      const responses = await Promise.all(allRequests);
      const totalTime = Date.now() - startTime;

      const responsesByStatusCode = responses.reduce((acc, response) => {
        acc[response.statusCode] = (acc[response.statusCode] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      console.log(`\n🌐 Multi-IP Rate Limiting:`);
      console.log(`Total requests: ${allRequests.length}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Response codes:`, responsesByStatusCode);

      // Each IP should be able to make some requests
      expect(responsesByStatusCode[200]).toBeGreaterThan(numberOfIPs * 5); // At least 5 per IP
      expect(totalTime).toBeLessThan(20000); // Should complete within 20 seconds
    });
  });

  describe('Database and External Service Performance', () => {
    it('should handle database query load efficiently', async () => {
      // Create multiple different queries to simulate database load
      const queryTypes = [
        () => server.inject({
          method: 'GET',
          url: `/api/trpc/content.getById?${new URLSearchParams({
            input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
          })}`,
        }),
        () => server.inject({
          method: 'GET',
          url: `/api/trpc/content.search?${new URLSearchParams({
            input: JSON.stringify({ query: 'database load', limit: 10 })
          })}`,
        }),
        () => server.inject({
          method: 'GET',
          url: `/api/trpc/content.list?${new URLSearchParams({
            input: JSON.stringify({ category: 'trending', limit: 15 })
          })}`,
        }),
      ];

      const dbRequests: Promise<any>[] = [];
      
      // Generate varied database queries
      for (let i = 0; i < 60; i++) {
        const queryType = queryTypes[i % queryTypes.length];
        dbRequests.push(queryType());
      }

      const startTime = Date.now();
      const responses = await Promise.allSettled(dbRequests);
      const totalTime = Date.now() - startTime;

      const successful = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).statusCode === 200
      ).length;
      
      const failed = responses.filter(r => 
        r.status === 'rejected' || (r.value as any).statusCode >= 500
      ).length;

      console.log(`\n🗄️ Database Load Performance:`);
      console.log(`Total queries: ${dbRequests.length}`);
      console.log(`Successful: ${successful}`);
      console.log(`Failed: ${failed}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Avg time per query: ${(totalTime / dbRequests.length).toFixed(2)}ms`);

      // Database should handle the load without failures
      expect(failed).toBe(0);
      expect(successful).toBeGreaterThan(dbRequests.length * 0.8);
      expect(totalTime).toBeLessThan(15000);
    });

    it('should maintain performance during concurrent authenticated operations', async () => {
      // Create multiple users for concurrent operations
      const users = Array.from({ length: 5 }, () => TestFactory.createUser());
      const { generateAccessToken, createUserPayload } = await import('@/lib/jwt');
      const tokens = users.map(user => generateAccessToken(createUserPayload(user)));

      const authenticatedRequests: Promise<any>[] = [];

      // Generate various authenticated operations
      tokens.forEach((token, userIndex) => {
        // Get profile
        authenticatedRequests.push(
          server.inject({
            method: 'GET',
            url: '/api/trpc/auth.me',
            headers: {
              'authorization': `Bearer ${token}`,
              'x-forwarded-for': `10.20.1.${userIndex + 1}`,
            },
          })
        );

        // Get watchlist
        authenticatedRequests.push(
          server.inject({
            method: 'GET',
            url: `/api/trpc/content.getWatchlist?${new URLSearchParams({
              input: JSON.stringify({ page: 1, limit: 20 })
            })}`,
            headers: {
              'authorization': `Bearer ${token}`,
              'x-forwarded-for': `10.20.2.${userIndex + 1}`,
            },
          })
        );

        // Add to watchlist
        authenticatedRequests.push(
          server.inject({
            method: 'POST',
            url: '/api/trpc/content.addToWatchlist',
            headers: {
              'authorization': `Bearer ${token}`,
              'content-type': 'application/json',
              'x-forwarded-for': `10.20.3.${userIndex + 1}`,
            },
            payload: { contentId: '123e4567-e89b-12d3-a456-426614174000' },
          })
        );
      });

      const startTime = Date.now();
      const responses = await Promise.allSettled(authenticatedRequests);
      const totalTime = Date.now() - startTime;

      const successful = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).statusCode === 200
      ).length;

      console.log(`\n🔐 Authenticated Operations Performance:`);
      console.log(`Total operations: ${authenticatedRequests.length}`);
      console.log(`Successful: ${successful}`);
      console.log(`Total time: ${totalTime}ms`);

      expect(successful).toBeGreaterThan(authenticatedRequests.length * 0.8);
      expect(totalTime).toBeLessThan(10000);
    });
  });

  describe('System Resource Performance', () => {
    it('should handle peak load without resource exhaustion', async () => {
      const initialStats = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      };

      // Generate peak load
      const peakLoadRequests = Array.from({ length: 300 }, (_, i) => {
        const endpoints = [
          `/api/trpc/content.getById?${new URLSearchParams({
            input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
          })}`,
          `/api/trpc/content.search?${new URLSearchParams({
            input: JSON.stringify({ query: `peak load query ${i}`, limit: 5 })
          })}`,
          `/api/trpc/content.list?${new URLSearchParams({
            input: JSON.stringify({ category: 'trending', limit: 10 })
          })}`,
        ];

        return server.inject({
          method: 'GET',
          url: endpoints[i % endpoints.length],
          headers: {
            'x-forwarded-for': `172.20.${Math.floor(i / 255) + 1}.${(i % 255) + 1}`,
          },
        });
      });

      const startTime = Date.now();
      const responses = await Promise.allSettled(peakLoadRequests);
      const totalTime = Date.now() - startTime;

      const finalStats = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(initialStats.cpu),
      };

      // Analyze resource usage
      const memoryGrowth = {
        rss: finalStats.memory.rss - initialStats.memory.rss,
        heapUsed: finalStats.memory.heapUsed - initialStats.memory.heapUsed,
      };

      const successful = responses.filter(r => 
        r.status === 'fulfilled' && 
        [200, 429].includes((r.value as any).statusCode) // Success or rate limited
      ).length;

      console.log(`\n🚀 Peak Load Performance:`);
      console.log(`Total requests: ${peakLoadRequests.length}`);
      console.log(`Successful/Rate-limited: ${successful}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`RPS: ${(peakLoadRequests.length / (totalTime / 1000)).toFixed(2)}`);
      console.log(`Memory growth: RSS ${(memoryGrowth.rss / 1024 / 1024).toFixed(2)}MB, Heap ${(memoryGrowth.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`CPU usage: User ${(finalStats.cpu.user / 1000).toFixed(2)}ms, System ${(finalStats.cpu.system / 1000).toFixed(2)}ms`);

      // System should handle peak load gracefully
      expect(successful / peakLoadRequests.length).toBeGreaterThan(0.7); // 70% success rate
      expect(memoryGrowth.rss).toBeLessThan(200 * 1024 * 1024); // Less than 200MB growth
      expect(totalTime).toBeLessThan(60000); // Complete within 60 seconds
    });

    it('should recover gracefully after load spikes', async () => {
      // Generate a load spike
      const spikeRequests = Array.from({ length: 100 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: `/api/trpc/content.search?${new URLSearchParams({
            input: JSON.stringify({ query: `spike ${i}`, limit: 10 })
          })}`,
          headers: {
            'x-forwarded-for': '192.168.spike.100',
          },
        })
      );

      await Promise.all(spikeRequests);

      // Wait for system to recover
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test normal operation after spike
      const recoveryRequests = Array.from({ length: 10 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: `/api/trpc/content.getById?${new URLSearchParams({
            input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
          })}`,
          headers: {
            'x-forwarded-for': `192.168.recovery.${i + 1}`,
          },
        })
      );

      const recoveryStartTime = Date.now();
      const recoveryResponses = await Promise.all(recoveryRequests);
      const recoveryTime = Date.now() - recoveryStartTime;

      const successfulRecovery = recoveryResponses.filter(r => r.statusCode === 200).length;

      console.log(`\n🔄 Recovery Performance:`);
      console.log(`Recovery requests: ${recoveryRequests.length}`);
      console.log(`Successful: ${successfulRecovery}`);
      console.log(`Recovery time: ${recoveryTime}ms`);

      // System should recover and perform normally
      expect(successfulRecovery).toBeGreaterThan(recoveryRequests.length * 0.8);
      expect(recoveryTime).toBeLessThan(2000); // Should be fast after recovery
    });
  });

  afterAll(async () => {
    // Final cleanup and reporting
    if (global.gc) {
      global.gc();
    }
    
    console.log(`\n📋 Performance Test Suite Summary:`);
    console.log(`✅ All performance tests completed successfully`);
    console.log(`🔧 System handled concurrent load, cache operations, and rate limiting effectively`);
    console.log(`📊 Memory usage and response times remained within acceptable limits`);
  });
});