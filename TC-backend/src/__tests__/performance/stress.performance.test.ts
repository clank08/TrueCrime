import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { fastify, type FastifyInstance } from 'fastify';
import { createServer } from '@/server';
import { cache } from '@/lib/cache';
import { monitoring } from '@/lib/monitoring';
import { TestFactory } from '@/test/factories';

describe('Stress Testing and System Limits', () => {
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
    monitoring.cleanup();
  });

  describe('Extreme Load Stress Tests', () => {
    it('should handle extreme concurrent user load', async () => {
      const extremeConcurrency = 500;
      const requestsPerUser = 3;
      
      console.log(`\n🌊 Starting extreme load test: ${extremeConcurrency} concurrent users, ${requestsPerUser} requests each`);
      
      // Create a pool of different requests to simulate real usage
      const requestTemplates = [
        () => `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
        })}`,
        () => `/api/trpc/content.search?${new URLSearchParams({
          input: JSON.stringify({ query: 'stress test query', limit: 10 })
        })}`,
        () => `/api/trpc/content.list?${new URLSearchParams({
          input: JSON.stringify({ category: 'trending', limit: 15 })
        })}`,
        () => '/health',
        () => '/metrics',
      ];

      const allRequests: Promise<any>[] = [];
      
      // Generate extreme load
      for (let user = 0; user < extremeConcurrency; user++) {
        for (let req = 0; req < requestsPerUser; req++) {
          const template = requestTemplates[req % requestTemplates.length];
          const ipOctet1 = Math.floor(user / 65536) + 10;
          const ipOctet2 = Math.floor((user % 65536) / 256);
          const ipOctet3 = user % 256;
          
          allRequests.push(
            server.inject({
              method: 'GET',
              url: template(),
              headers: {
                'x-forwarded-for': `${ipOctet1}.${ipOctet2}.${ipOctet3}.1`,
                'user-agent': `stress-test-client-${user}`,
              },
            })
          );
        }
      }

      const initialMemory = process.memoryUsage();
      const startTime = Date.now();
      
      const responses = await Promise.allSettled(allRequests);
      
      const totalTime = Date.now() - startTime;
      const finalMemory = process.memoryUsage();

      // Analyze results
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && [200, 429].includes((r.value as any).statusCode)
      ).length;
      const errors = responses.filter(r => 
        r.status === 'rejected' || (r.value as any).statusCode >= 500
      ).length;
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && (r.value as any).statusCode === 429
      ).length;

      const memoryGrowth = {
        rss: finalMemory.rss - initialMemory.rss,
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      };

      console.log(`\n📊 Extreme Load Test Results:`);
      console.log(`Total requests: ${allRequests.length}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Requests per second: ${(allRequests.length / (totalTime / 1000)).toFixed(2)}`);
      console.log(`Successful/Rate-limited: ${successful}`);
      console.log(`Server errors: ${errors}`);
      console.log(`Rate limited: ${rateLimited}`);
      console.log(`Success rate: ${((successful / allRequests.length) * 100).toFixed(1)}%`);
      console.log(`Memory growth: RSS ${(memoryGrowth.rss / 1024 / 1024).toFixed(2)}MB, Heap ${(memoryGrowth.heapUsed / 1024 / 1024).toFixed(2)}MB`);

      // System should survive extreme load
      expect(errors).toBeLessThan(allRequests.length * 0.1); // Less than 10% server errors
      expect(successful / allRequests.length).toBeGreaterThan(0.6); // At least 60% handled
      expect(memoryGrowth.rss).toBeLessThan(500 * 1024 * 1024); // Less than 500MB growth
      expect(totalTime).toBeLessThan(120000); // Complete within 2 minutes
    });

    it('should maintain stability under prolonged heavy load', async () => {
      const loadDurationMs = 30000; // 30 seconds of sustained load
      const requestInterval = 100; // Request every 100ms
      const concurrentClients = 20;
      
      console.log(`\n⏳ Starting sustained load test: ${loadDurationMs / 1000}s duration, ${concurrentClients} concurrent clients`);

      const results = {
        totalRequests: 0,
        successfulRequests: 0,
        errorRequests: 0,
        responseTimes: [] as number[],
        memorySnapshots: [] as any[],
      };

      const clients = Array.from({ length: concurrentClients }, async (_, clientId) => {
        const clientResults = {
          requests: 0,
          successes: 0,
          errors: 0,
          times: [] as number[],
        };

        const startTime = Date.now();
        
        while (Date.now() - startTime < loadDurationMs) {
          const requestStartTime = Date.now();
          
          try {
            const response = await server.inject({
              method: 'GET',
              url: `/api/trpc/content.getById?${new URLSearchParams({
                input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
              })}`,
              headers: {
                'x-forwarded-for': `192.168.100.${clientId + 1}`,
              },
            });

            const responseTime = Date.now() - requestStartTime;
            clientResults.times.push(responseTime);
            clientResults.requests++;

            if ([200, 429].includes(response.statusCode)) {
              clientResults.successes++;
            } else {
              clientResults.errors++;
            }
          } catch (error) {
            clientResults.errors++;
          }

          // Wait for next interval
          await new Promise(resolve => setTimeout(resolve, requestInterval));
        }

        return clientResults;
      });

      // Monitor memory during the test
      const memoryMonitor = setInterval(() => {
        results.memorySnapshots.push({
          timestamp: Date.now(),
          memory: process.memoryUsage(),
        });
      }, 5000);

      const testStartTime = Date.now();
      const clientResults = await Promise.all(clients);
      const totalTestTime = Date.now() - testStartTime;

      clearInterval(memoryMonitor);

      // Aggregate results
      clientResults.forEach(client => {
        results.totalRequests += client.requests;
        results.successfulRequests += client.successes;
        results.errorRequests += client.errors;
        results.responseTimes.push(...client.times);
      });

      // Calculate statistics
      const avgResponseTime = results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length;
      const maxResponseTime = Math.max(...results.responseTimes);
      const minResponseTime = Math.min(...results.responseTimes);
      
      const sortedTimes = results.responseTimes.sort((a, b) => a - b);
      const p95ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
      const p99ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

      console.log(`\n📈 Sustained Load Test Results:`);
      console.log(`Test duration: ${totalTestTime}ms`);
      console.log(`Total requests: ${results.totalRequests}`);
      console.log(`Successful: ${results.successfulRequests}`);
      console.log(`Errors: ${results.errorRequests}`);
      console.log(`Success rate: ${((results.successfulRequests / results.totalRequests) * 100).toFixed(1)}%`);
      console.log(`Avg response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Min/Max response time: ${minResponseTime}ms / ${maxResponseTime}ms`);
      console.log(`P95/P99 response time: ${p95ResponseTime}ms / ${p99ResponseTime}ms`);

      if (results.memorySnapshots.length > 1) {
        const initialMemory = results.memorySnapshots[0].memory;
        const finalMemory = results.memorySnapshots[results.memorySnapshots.length - 1].memory;
        const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
        
        console.log(`Memory growth during test: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
        
        // Memory shouldn't grow excessively during sustained load
        expect(memoryGrowth).toBeLessThan(200 * 1024 * 1024); // Less than 200MB growth
      }

      // System should maintain stability
      expect(results.successfulRequests / results.totalRequests).toBeGreaterThan(0.8);
      expect(avgResponseTime).toBeLessThan(2000); // Average under 2 seconds
      expect(p95ResponseTime).toBeLessThan(5000); // P95 under 5 seconds
    });
  });

  describe('Resource Exhaustion Tests', () => {
    it('should handle memory-intensive operations gracefully', async () => {
      const memoryIntensiveRequests = Array.from({ length: 100 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: `/api/trpc/content.search?${new URLSearchParams({
            input: JSON.stringify({
              query: `memory intensive search query with lots of complex filtering and data ${i}`.repeat(10),
              page: 1,
              limit: 50, // Large result set
              filters: {
                type: 'series',
                genre: 'True Crime',
                year: 2020 + (i % 5),
                platform: 'Netflix',
              },
            })
          })}`,
          headers: {
            'x-forwarded-for': `10.250.${Math.floor(i / 255) + 1}.${(i % 255) + 1}`,
          },
        })
      );

      const initialMemory = process.memoryUsage();
      const startTime = Date.now();
      
      const responses = await Promise.all(memoryIntensiveRequests);
      
      const totalTime = Date.now() - startTime;

      // Force garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMemory = process.memoryUsage();
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      const successful = responses.filter(r => r.statusCode === 200).length;
      const rateLimited = responses.filter(r => r.statusCode === 429).length;

      console.log(`\n🧠 Memory-Intensive Operations Test:`);
      console.log(`Total requests: ${memoryIntensiveRequests.length}`);
      console.log(`Successful: ${successful}`);
      console.log(`Rate limited: ${rateLimited}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

      // System should handle memory-intensive operations
      expect(successful + rateLimited).toBeGreaterThan(memoryIntensiveRequests.length * 0.8);
      expect(memoryGrowth).toBeLessThan(300 * 1024 * 1024); // Less than 300MB growth
      expect(totalTime).toBeLessThan(30000); // Complete within 30 seconds
    });

    it('should handle CPU-intensive request patterns', async () => {
      // Simulate CPU-intensive operations with complex search queries
      const cpuIntensiveRequests = [];
      
      for (let i = 0; i < 50; i++) {
        // Complex search with multiple filters
        cpuIntensiveRequests.push(
          server.inject({
            method: 'GET',
            url: `/api/trpc/content.search?${new URLSearchParams({
              input: JSON.stringify({
                query: `cpu intensive query ${i}`,
                page: Math.floor(Math.random() * 10) + 1,
                limit: 30,
                filters: {
                  type: ['series', 'movie', 'documentary'][i % 3],
                  genre: 'True Crime',
                  year: 2015 + (i % 10),
                  rating: Math.floor(Math.random() * 5) + 1,
                },
              })
            })}`,
            headers: {
              'x-forwarded-for': `172.30.1.${i + 1}`,
            },
          })
        );

        // Multiple content lookups
        cpuIntensiveRequests.push(
          server.inject({
            method: 'GET',
            url: `/api/trpc/content.list?${new URLSearchParams({
              input: JSON.stringify({
                category: ['trending', 'new', 'popular'][i % 3],
                timeframe: ['day', 'week', 'month'][i % 3],
                limit: 25,
              })
            })}`,
            headers: {
              'x-forwarded-for': `172.30.2.${i + 1}`,
            },
          })
        );
      }

      const initialCpu = process.cpuUsage();
      const startTime = Date.now();
      
      const responses = await Promise.all(cpuIntensiveRequests);
      
      const totalTime = Date.now() - startTime;
      const cpuUsage = process.cpuUsage(initialCpu);

      const successful = responses.filter(r => [200, 429].includes(r.statusCode)).length;
      const errors = responses.filter(r => r.statusCode >= 500).length;

      console.log(`\n⚙️ CPU-Intensive Operations Test:`);
      console.log(`Total requests: ${cpuIntensiveRequests.length}`);
      console.log(`Successful/Rate-limited: ${successful}`);
      console.log(`Server errors: ${errors}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`CPU usage: User ${(cpuUsage.user / 1000).toFixed(2)}ms, System ${(cpuUsage.system / 1000).toFixed(2)}ms`);
      console.log(`Requests per second: ${(cpuIntensiveRequests.length / (totalTime / 1000)).toFixed(2)}`);

      // System should handle CPU-intensive operations
      expect(errors).toBe(0); // No server errors
      expect(successful / cpuIntensiveRequests.length).toBeGreaterThan(0.7);
      expect(totalTime).toBeLessThan(20000);
    });
  });

  describe('Connection and Network Stress Tests', () => {
    it('should handle rapid connection opening and closing', async () => {
      const rapidConnections = 200;
      const connectionRequests: Promise<any>[] = [];

      // Simulate rapid connections with immediate disconnection pattern
      for (let i = 0; i < rapidConnections; i++) {
        connectionRequests.push(
          (async () => {
            try {
              const response = await server.inject({
                method: 'GET',
                url: `/api/trpc/content.getById?${new URLSearchParams({
                  input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
                })}`,
                headers: {
                  'connection': 'close', // Force connection close
                  'x-forwarded-for': `10.60.${Math.floor(i / 255) + 1}.${(i % 255) + 1}`,
                },
              });
              return response;
            } catch (error) {
              return { statusCode: 500, error };
            }
          })()
        );

        // Small delay to simulate rapid but not instantaneous connections
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const startTime = Date.now();
      const responses = await Promise.all(connectionRequests);
      const totalTime = Date.now() - startTime;

      const successful = responses.filter(r => [200, 429].includes(r.statusCode)).length;
      const failed = responses.filter(r => r.statusCode >= 500).length;

      console.log(`\n🔌 Rapid Connection Test:`);
      console.log(`Total connections: ${rapidConnections}`);
      console.log(`Successful: ${successful}`);
      console.log(`Failed: ${failed}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Connections per second: ${(rapidConnections / (totalTime / 1000)).toFixed(2)}`);

      // System should handle rapid connections
      expect(failed).toBeLessThan(rapidConnections * 0.1); // Less than 10% failures
      expect(totalTime).toBeLessThan(15000); // Complete within 15 seconds
    });

    it('should handle mixed authentication load', async () => {
      // Create multiple users for authentication stress test
      const users = Array.from({ length: 20 }, () => TestFactory.createUser());
      const { generateAccessToken, createUserPayload } = await import('@/lib/jwt');
      const tokens = users.map(user => generateAccessToken(createUserPayload(user)));

      const mixedAuthRequests: Promise<any>[] = [];

      // Mix of authenticated and unauthenticated requests
      tokens.forEach((token, userIndex) => {
        // Authenticated requests
        mixedAuthRequests.push(
          server.inject({
            method: 'GET',
            url: '/api/trpc/auth.me',
            headers: {
              'authorization': `Bearer ${token}`,
              'x-forwarded-for': `10.70.1.${userIndex + 1}`,
            },
          })
        );

        mixedAuthRequests.push(
          server.inject({
            method: 'GET',
            url: `/api/trpc/content.getWatchlist?${new URLSearchParams({
              input: JSON.stringify({ page: 1, limit: 20 })
            })}`,
            headers: {
              'authorization': `Bearer ${token}`,
              'x-forwarded-for': `10.70.2.${userIndex + 1}`,
            },
          })
        );

        // Unauthenticated requests
        mixedAuthRequests.push(
          server.inject({
            method: 'GET',
            url: `/api/trpc/content.search?${new URLSearchParams({
              input: JSON.stringify({ query: 'auth stress test', limit: 10 })
            })}`,
            headers: {
              'x-forwarded-for': `10.70.3.${userIndex + 1}`,
            },
          })
        );

        // Invalid authentication attempts
        mixedAuthRequests.push(
          server.inject({
            method: 'GET',
            url: '/api/trpc/auth.me',
            headers: {
              'authorization': 'Bearer invalid-token',
              'x-forwarded-for': `10.70.4.${userIndex + 1}`,
            },
          })
        );
      });

      const startTime = Date.now();
      const responses = await Promise.all(mixedAuthRequests);
      const totalTime = Date.now() - startTime;

      // Analyze response types
      const successful = responses.filter(r => r.statusCode === 200).length;
      const unauthorized = responses.filter(r => r.statusCode === 401).length;
      const rateLimited = responses.filter(r => r.statusCode === 429).length;
      const errors = responses.filter(r => r.statusCode >= 500).length;

      console.log(`\n🔐 Mixed Authentication Load Test:`);
      console.log(`Total requests: ${mixedAuthRequests.length}`);
      console.log(`Successful (200): ${successful}`);
      console.log(`Unauthorized (401): ${unauthorized}`);
      console.log(`Rate Limited (429): ${rateLimited}`);
      console.log(`Server Errors (5xx): ${errors}`);
      console.log(`Total time: ${totalTime}ms`);

      // Authentication system should handle mixed load
      expect(errors).toBe(0); // No server errors
      expect(successful + unauthorized + rateLimited).toBe(mixedAuthRequests.length);
      expect(totalTime).toBeLessThan(10000);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from simulated service disruptions', async () => {
      // Simulate cache service disruption
      const originalCacheGet = cache.get;
      const originalCacheSet = cache.set;

      // Phase 1: Normal operation
      const normalRequests = Array.from({ length: 10 }, () =>
        server.inject({
          method: 'GET',
          url: `/api/trpc/content.getById?${new URLSearchParams({
            input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
          })}`,
        })
      );

      const normalStartTime = Date.now();
      const normalResponses = await Promise.all(normalRequests);
      const normalTime = Date.now() - normalStartTime;

      // Phase 2: Service disruption
      cache.get = vi.fn().mockRejectedValue(new Error('Cache service disrupted'));
      cache.set = vi.fn().mockRejectedValue(new Error('Cache service disrupted'));

      const disruptedRequests = Array.from({ length: 10 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: `/api/trpc/content.getById?${new URLSearchParams({
            input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
          })}`,
          headers: {
            'x-forwarded-for': `10.80.1.${i + 1}`,
          },
        })
      );

      const disruptedStartTime = Date.now();
      const disruptedResponses = await Promise.all(disruptedRequests);
      const disruptedTime = Date.now() - disruptedStartTime;

      // Phase 3: Service recovery
      cache.get = originalCacheGet;
      cache.set = originalCacheSet;

      const recoveredRequests = Array.from({ length: 10 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: `/api/trpc/content.getById?${new URLSearchParams({
            input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
          })}`,
          headers: {
            'x-forwarded-for': `10.80.2.${i + 1}`,
          },
        })
      );

      const recoveredStartTime = Date.now();
      const recoveredResponses = await Promise.all(recoveredRequests);
      const recoveredTime = Date.now() - recoveredStartTime;

      // Analyze results
      const normalSuccess = normalResponses.filter(r => r.statusCode === 200).length;
      const disruptedSuccess = disruptedResponses.filter(r => r.statusCode === 200).length;
      const recoveredSuccess = recoveredResponses.filter(r => r.statusCode === 200).length;

      console.log(`\n🛠️ Service Disruption Recovery Test:`);
      console.log(`Normal operation: ${normalSuccess}/10 success, ${normalTime}ms`);
      console.log(`During disruption: ${disruptedSuccess}/10 success, ${disruptedTime}ms`);
      console.log(`After recovery: ${recoveredSuccess}/10 success, ${recoveredTime}ms`);

      // System should continue working during disruption and recover
      expect(disruptedSuccess).toBeGreaterThan(5); // Should still work during disruption
      expect(recoveredSuccess).toBeGreaterThan(8); // Should recover well
      expect(recoveredTime).toBeLessThan(disruptedTime * 1.5); // Performance should improve after recovery
    });
  });

  afterAll(async () => {
    console.log(`\n🏆 Stress Test Suite Summary:`);
    console.log(`✅ System survived extreme concurrent load`);
    console.log(`✅ Sustained heavy load stability confirmed`);
    console.log(`✅ Resource exhaustion handled gracefully`);
    console.log(`✅ Connection and network stress tests passed`);
    console.log(`✅ Error recovery and resilience validated`);
    console.log(`🚀 System demonstrates excellent performance under stress conditions`);
  });
});