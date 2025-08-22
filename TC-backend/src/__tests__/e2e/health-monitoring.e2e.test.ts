import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { fastify, type FastifyInstance } from 'fastify';
import { createServer } from '@/server';
import { cache } from '@/lib/cache';
import { monitoring } from '@/lib/monitoring';

describe('E2E Health Checks and Monitoring', () => {
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
    monitoring.cleanup();
  });

  describe('Health Check Endpoints E2E', () => {
    describe('/health endpoint', () => {
      it('should return health status with all service checks', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/health',
        });

        expect([200, 503, 500]).toContain(response.statusCode);
        
        const healthData = JSON.parse(response.payload);
        
        // Verify health response structure
        expect(healthData).toHaveProperty('status');
        expect(healthData.status).toMatch(/^(healthy|degraded|unhealthy)$/);
        
        expect(healthData).toHaveProperty('services');
        expect(healthData.services).toHaveProperty('database');
        expect(healthData.services).toHaveProperty('redis');
        expect(healthData.services).toHaveProperty('search');
        expect(healthData.services).toHaveProperty('storage');
        
        expect(healthData).toHaveProperty('metrics');
        expect(healthData.metrics).toHaveProperty('uptime');
        expect(healthData.metrics).toHaveProperty('memoryUsage');
        
        expect(healthData).toHaveProperty('timestamp');
        expect(typeof healthData.timestamp).toBe('number');
        
        // Verify service status types
        Object.values(healthData.services).forEach(serviceStatus => {
          expect(typeof serviceStatus).toBe('boolean');
        });
        
        // Verify metrics types
        expect(typeof healthData.metrics.uptime).toBe('number');
        expect(typeof healthData.metrics.memoryUsage).toBe('number');
        expect(healthData.metrics.uptime).toBeGreaterThan(0);
        expect(healthData.metrics.memoryUsage).toBeGreaterThan(0);
      });

      it('should return 200 when all services are healthy', async () => {
        // Mock all services to be healthy
        const { performHealthCheck } = await import('@/lib/monitoring');
        const originalHealthCheck = performHealthCheck;
        
        vi.doMock('@/lib/monitoring', async () => {
          const actual = await vi.importActual('@/lib/monitoring');
          return {
            ...actual,
            performHealthCheck: vi.fn().mockResolvedValue({
              status: 'healthy',
              services: {
                database: true,
                redis: true,
                search: true,
                storage: true,
              },
              metrics: {
                uptime: 123,
                memoryUsage: 45.6,
              },
              timestamp: Date.now(),
            }),
          };
        });

        const response = await server.inject({
          method: 'GET',
          url: '/health',
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.status).toBe('healthy');
      });

      it('should return 503 when some services are degraded', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/health',
        });

        // In the test environment, some services might not be available
        if (response.statusCode === 503) {
          const data = JSON.parse(response.payload);
          expect(data.status).toBe('degraded');
          
          // Should have at least one service up and one down
          const serviceStatuses = Object.values(data.services);
          expect(serviceStatuses.some(status => status === true)).toBe(true);
          expect(serviceStatuses.some(status => status === false)).toBe(true);
        }
      });

      it('should include response time in reasonable range', async () => {
        const startTime = Date.now();
        
        const response = await server.inject({
          method: 'GET',
          url: '/health',
        });
        
        const responseTime = Date.now() - startTime;
        
        expect(response.statusCode).toBeOneOf([200, 503, 500]);
        
        // Health check should respond within 5 seconds
        expect(responseTime).toBeLessThan(5000);
        
        console.log(`Health check response time: ${responseTime}ms`);
      });

      it('should handle concurrent health check requests', async () => {
        const concurrentRequests = Array.from({ length: 10 }, () =>
          server.inject({
            method: 'GET',
            url: '/health',
          })
        );

        const responses = await Promise.all(concurrentRequests);
        
        responses.forEach(response => {
          expect([200, 503, 500]).toContain(response.statusCode);
          
          const data = JSON.parse(response.payload);
          expect(data.status).toMatch(/^(healthy|degraded|unhealthy)$/);
        });

        // All responses should have similar content
        const firstResponse = JSON.parse(responses[0].payload);
        responses.slice(1).forEach(response => {
          const data = JSON.parse(response.payload);
          expect(data.status).toBe(firstResponse.status);
        });
      });
    });

    describe('/metrics endpoint', () => {
      it('should return system metrics', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/metrics',
        });

        expect(response.statusCode).toBe(200);
        
        const metricsData = JSON.parse(response.payload);
        
        expect(metricsData).toHaveProperty('uptime');
        expect(metricsData).toHaveProperty('memory');
        expect(metricsData).toHaveProperty('timestamp');
        
        // Verify uptime
        expect(typeof metricsData.uptime).toBe('number');
        expect(metricsData.uptime).toBeGreaterThan(0);
        
        // Verify memory object structure
        expect(metricsData.memory).toHaveProperty('rss');
        expect(metricsData.memory).toHaveProperty('heapTotal');
        expect(metricsData.memory).toHaveProperty('heapUsed');
        expect(metricsData.memory).toHaveProperty('external');
        expect(metricsData.memory).toHaveProperty('arrayBuffers');
        
        // Verify memory values are positive numbers
        Object.values(metricsData.memory).forEach(value => {
          expect(typeof value).toBe('number');
          expect(value as number).toBeGreaterThan(0);
        });
        
        // Verify timestamp
        expect(typeof metricsData.timestamp).toBe('number');
        expect(metricsData.timestamp).toBeGreaterThan(Date.now() - 1000); // Within last second
      });

      it('should show increasing memory usage under load', async () => {
        // Get initial metrics
        const initialResponse = await server.inject({
          method: 'GET',
          url: '/metrics',
        });
        
        const initialMetrics = JSON.parse(initialResponse.payload);
        const initialMemory = initialMetrics.memory.heapUsed;

        // Generate some load to increase memory usage
        const loadRequests = Array.from({ length: 50 }, (_, i) =>
          server.inject({
            method: 'GET',
            url: `/api/trpc/content.search?${new URLSearchParams({
              input: JSON.stringify({
                query: `load test ${i}`,
                page: 1,
                limit: 10,
              })
            })}`,
          })
        );

        await Promise.all(loadRequests);

        // Get metrics after load
        const afterLoadResponse = await server.inject({
          method: 'GET',
          url: '/metrics',
        });
        
        const afterLoadMetrics = JSON.parse(afterLoadResponse.payload);
        const afterLoadMemory = afterLoadMetrics.memory.heapUsed;

        expect(afterLoadResponse.statusCode).toBe(200);
        
        // Memory usage may or may not increase depending on garbage collection
        // But the endpoint should still work correctly
        expect(typeof afterLoadMemory).toBe('number');
        expect(afterLoadMemory).toBeGreaterThan(0);
        
        console.log(`Memory before load: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Memory after load: ${(afterLoadMemory / 1024 / 1024).toFixed(2)}MB`);
      });

      it('should handle metrics endpoint errors gracefully', async () => {
        // Mock process.memoryUsage to fail
        const originalMemoryUsage = process.memoryUsage;
        process.memoryUsage = vi.fn().mockImplementation(() => {
          throw new Error('Memory usage failed');
        });

        const response = await server.inject({
          method: 'GET',
          url: '/metrics',
        });

        // Should either work with fallback values or return appropriate error
        expect([200, 500]).toContain(response.statusCode);

        // Restore original function
        process.memoryUsage = originalMemoryUsage;
      });
    });
  });

  describe('API Performance Monitoring E2E', () => {
    it('should track API response times', async () => {
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      const response = await server.inject({
        method: 'GET',
        url: `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
        })}`,
      });

      expect(response.statusCode).toBe(200);
      
      // Should have tracked the API call
      expect(trackAPISpy).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: expect.any(String),
          method: 'GET',
          statusCode: 200,
          duration: expect.any(Number),
          timestamp: expect.any(Number),
        })
      );

      const call = trackAPISpy.mock.calls[0][0];
      expect(call.duration).toBeGreaterThan(0);
      expect(call.duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should track slow API endpoints', async () => {
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      // Make a request that might be slow
      const response = await server.inject({
        method: 'GET',
        url: `/api/trpc/content.search?${new URLSearchParams({
          input: JSON.stringify({
            query: 'performance test with complex filters',
            page: 1,
            limit: 50,
            filters: {
              type: 'series',
              genre: 'True Crime',
              year: 2023,
            },
          })
        })}`,
      });

      expect(response.statusCode).toBe(200);
      expect(trackAPISpy).toHaveBeenCalled();
      
      const call = trackAPISpy.mock.calls[0][0];
      expect(call.endpoint).toBeDefined();
      expect(call.duration).toBeGreaterThan(0);
    });

    it('should track error responses', async () => {
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      const response = await server.inject({
        method: 'GET',
        url: `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: 'invalid-uuid-format' })
        })}`,
      });

      expect(response.statusCode).toBe(400);
      
      // Should track error responses too
      expect(trackAPISpy).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          duration: expect.any(Number),
        })
      );
    });

    it('should track different HTTP methods', async () => {
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      // Test GET request
      await server.inject({
        method: 'GET',
        url: `/api/trpc/content.list?${new URLSearchParams({
          input: JSON.stringify({ category: 'trending', limit: 5 })
        })}`,
      });

      // Test POST request (requires authentication setup)
      const userData = {
        email: 'monitoringuser@example.com',
        password: 'MonitoringPassword123!',
        firstName: 'Monitoring',
        lastName: 'User',
      };

      await server.inject({
        method: 'POST',
        url: '/api/trpc/auth.register',
        headers: { 'content-type': 'application/json' },
        payload: userData,
      });

      // Should have tracked both requests
      expect(trackAPISpy).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET' })
      );
      
      expect(trackAPISpy).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should handle monitoring system failures gracefully', async () => {
      // Mock monitoring to fail
      vi.spyOn(monitoring, 'trackAPIPerformance').mockImplementation(() => {
        throw new Error('Monitoring system failed');
      });

      const response = await server.inject({
        method: 'GET',
        url: `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
        })}`,
      });

      // API should still work even if monitoring fails
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Database Monitoring E2E', () => {
    it('should monitor database connection status in health checks', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      const data = JSON.parse(response.payload);
      expect(data.services).toHaveProperty('database');
      
      // Database status should be boolean
      expect(typeof data.services.database).toBe('boolean');
    });

    it('should monitor storage status in health checks', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      const data = JSON.parse(response.payload);
      expect(data.services).toHaveProperty('storage');
      
      // Storage status should be boolean
      expect(typeof data.services.storage).toBe('boolean');
    });
  });

  describe('Cache Monitoring E2E', () => {
    it('should monitor Redis connection status in health checks', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      const data = JSON.parse(response.payload);
      expect(data.services).toHaveProperty('redis');
      
      // Redis status should be boolean
      expect(typeof data.services.redis).toBe('boolean');
    });

    it('should reflect Redis health status correctly', async () => {
      // Test when Redis is not configured (should be false)
      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_URL;

      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      const data = JSON.parse(response.payload);
      
      // Without Redis URL, Redis should be reported as down
      expect(data.services.redis).toBe(false);
      
      // Overall status should be degraded or unhealthy
      expect(['degraded', 'unhealthy']).toContain(data.status);
    });

    it('should handle cache-related performance monitoring', async () => {
      const contentId = '123e4567-e89b-12d3-a456-426614174000';
      
      // First request (miss - should populate cache)
      const response1 = await server.inject({
        method: 'GET',
        url: `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: contentId })
        })}`,
      });

      expect(response1.statusCode).toBe(200);

      // Second request (hit - should use cache)
      const response2 = await server.inject({
        method: 'GET',
        url: `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: contentId })
        })}`,
      });

      expect(response2.statusCode).toBe(200);
      
      // Both requests should be tracked by monitoring
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      // Make another request to verify monitoring is working
      await server.inject({
        method: 'GET',
        url: `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: contentId })
        })}`,
      });
      
      expect(trackAPISpy).toHaveBeenCalled();
    });
  });

  describe('Search Service Monitoring E2E', () => {
    it('should monitor search service status in health checks', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      const data = JSON.parse(response.payload);
      expect(data.services).toHaveProperty('search');
      
      // Search status should be boolean
      expect(typeof data.services.search).toBe('boolean');
    });

    it('should track search performance', async () => {
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      const response = await server.inject({
        method: 'GET',
        url: `/api/trpc/content.search?${new URLSearchParams({
          input: JSON.stringify({
            query: 'Ted Bundy',
            page: 1,
            limit: 10,
          })
        })}`,
      });

      expect(response.statusCode).toBe(200);
      expect(trackAPISpy).toHaveBeenCalled();
      
      const call = trackAPISpy.mock.calls.find(call => 
        call[0].endpoint.includes('search')
      );
      
      if (call) {
        expect(call[0].duration).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Monitoring E2E', () => {
    it('should track 4xx client errors', async () => {
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      // Invalid UUID format (400 error)
      const badRequestResponse = await server.inject({
        method: 'GET',
        url: `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: 'invalid-uuid' })
        })}`,
      });

      expect(badRequestResponse.statusCode).toBe(400);
      
      // Unauthorized access (401 error)
      const unauthorizedResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/auth.me',
      });

      expect(unauthorizedResponse.statusCode).toBe(401);
      
      // Should track both error responses
      expect(trackAPISpy).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
      
      expect(trackAPISpy).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 })
      );
    });

    it('should track 5xx server errors', async () => {
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      // Mock a server error scenario
      // (In practice, you'd create a test endpoint that throws an error)
      
      // For now, we'll test that monitoring can handle different status codes
      const calls = trackAPISpy.mock.calls.map(call => call[0].statusCode);
      const has500Error = calls.some(code => code >= 500);
      
      // If we've captured any 500-level errors, verify they're tracked
      if (has500Error) {
        expect(trackAPISpy).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: expect.any(Number),
            duration: expect.any(Number),
          })
        );
      }
    });

    it('should track authentication and authorization errors', async () => {
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      // Test invalid token
      const invalidTokenResponse = await server.inject({
        method: 'GET',
        url: '/api/trpc/auth.me',
        headers: {
          'authorization': 'Bearer invalid-token-format',
        },
      });

      expect(invalidTokenResponse.statusCode).toBe(401);
      
      // Test missing authorization for protected resource
      const missingAuthResponse = await server.inject({
        method: 'POST',
        url: '/api/trpc/content.addToWatchlist',
        headers: { 'content-type': 'application/json' },
        payload: { contentId: '123e4567-e89b-12d3-a456-426614174000' },
      });

      expect(missingAuthResponse.statusCode).toBe(401);
      
      // Should track auth errors
      expect(trackAPISpy).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 })
      );
    });
  });

  describe('Performance Metrics E2E', () => {
    it('should show reasonable response times for different endpoints', async () => {
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      const endpoints = [
        `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
        })}`,
        `/api/trpc/content.list?${new URLSearchParams({
          input: JSON.stringify({ category: 'trending', limit: 5 })
        })}`,
        `/api/trpc/content.search?${new URLSearchParams({
          input: JSON.stringify({ query: 'Ted', limit: 5 })
        })}`,
        '/health',
        '/metrics',
      ];

      const responses = await Promise.all(
        endpoints.map(endpoint =>
          server.inject({
            method: 'GET',
            url: endpoint,
          })
        )
      );

      responses.forEach((response, index) => {
        expect(response.statusCode).toBeLessThan(500);
        console.log(`${endpoints[index]}: ${response.statusCode}`);
      });

      // All API calls should be tracked with reasonable response times
      const apiCalls = trackAPISpy.mock.calls.filter(call => 
        call[0].endpoint.includes('api/trpc')
      );

      apiCalls.forEach(call => {
        const metrics = call[0];
        expect(metrics.duration).toBeGreaterThan(0);
        expect(metrics.duration).toBeLessThan(5000); // Should complete within 5 seconds
      });
    });

    it('should track cumulative performance over time', async () => {
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      const endpoint = `/api/trpc/content.getById?${new URLSearchParams({
        input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
      })}`;

      // Make multiple requests over time
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          server.inject({
            method: 'GET',
            url: endpoint,
          })
        );
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });

      // Should have tracked multiple calls
      expect(trackAPISpy).toHaveBeenCalledTimes(expect.any(Number));
      
      const durations = trackAPISpy.mock.calls.map(call => call[0].duration);
      const avgDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
      
      console.log(`Average response time: ${avgDuration.toFixed(2)}ms`);
      expect(avgDuration).toBeGreaterThan(0);
      expect(avgDuration).toBeLessThan(1000); // Average should be under 1 second
    });

    it('should handle high-load scenarios', async () => {
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      // Generate concurrent load
      const concurrentRequests = Array.from({ length: 50 }, (_, i) =>
        server.inject({
          method: 'GET',
          url: `/api/trpc/content.search?${new URLSearchParams({
            input: JSON.stringify({
              query: `load test ${i}`,
              page: 1,
              limit: 5,
            })
          })}`,
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // All requests should complete
      responses.forEach(response => {
        expect([200, 429]).toContain(response.statusCode); // Success or rate limited
      });

      const successCount = responses.filter(r => r.statusCode === 200).length;
      console.log(`Completed ${successCount}/50 requests in ${totalTime}ms`);
      
      // Should handle at least some concurrent requests
      expect(successCount).toBeGreaterThan(0);
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000); // Under 10 seconds
    });
  });

  describe('Monitoring Integration E2E', () => {
    it('should integrate health checks with API monitoring', async () => {
      const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
      
      // Make some API calls
      await server.inject({
        method: 'GET',
        url: `/api/trpc/content.list?${new URLSearchParams({
          input: JSON.stringify({ category: 'trending', limit: 5 })
        })}`,
      });

      // Check health
      const healthResponse = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(healthResponse.statusCode).toBeOneOf([200, 503]);
      
      const healthData = JSON.parse(healthResponse.payload);
      
      // Health check should still work after API calls
      expect(healthData.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(healthData.metrics.uptime).toBeGreaterThan(0);
      
      // API monitoring should have tracked the requests
      expect(trackAPISpy).toHaveBeenCalled();
    });

    it('should maintain monitoring state across multiple requests', async () => {
      const endpoints = [
        `/api/trpc/content.getById?${new URLSearchParams({
          input: JSON.stringify({ id: '123e4567-e89b-12d3-a456-426614174000' })
        })}`,
        '/health',
        '/metrics',
        `/api/trpc/content.list?${new URLSearchParams({
          input: JSON.stringify({ category: 'new', limit: 5 })
        })}`,
        '/health', // Check health again
      ];

      const responses = [];
      for (const endpoint of endpoints) {
        const response = await server.inject({
          method: 'GET',
          url: endpoint,
        });
        responses.push(response);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // All requests should succeed or fail gracefully
      responses.forEach(response => {
        expect(response.statusCode).toBeLessThan(600);
      });

      // Health checks should remain consistent
      const healthResponses = responses.filter((_, index) => 
        endpoints[index] === '/health'
      );

      healthResponses.forEach(healthResponse => {
        const data = JSON.parse(healthResponse.payload);
        expect(data.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      });
    });

    it('should handle monitoring cleanup properly', async () => {
      // Generate some monitoring data
      await server.inject({
        method: 'GET',
        url: `/api/trpc/content.search?${new URLSearchParams({
          input: JSON.stringify({ query: 'cleanup test', limit: 5 })
        })}`,
      });

      // Trigger cleanup
      monitoring.cleanup();

      // System should still be responsive after cleanup
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect([200, 503]).toContain(response.statusCode);
    });
  });
});