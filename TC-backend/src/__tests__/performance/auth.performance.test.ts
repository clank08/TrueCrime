import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authRouter } from '@/routers/auth.router';
import { authService } from '@/services/auth.service';
import { TestFactory } from '@/test/factories';
import { TestUtils } from '@/test/utils';

/**
 * Performance Tests for Authentication Endpoints
 * 
 * These tests measure response times, throughput, and resource usage
 * for authentication operations to ensure they meet performance requirements.
 */

describe('Authentication Performance Tests', () => {
  let testContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    testContext = TestUtils.createUnauthenticatedContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Response Time Performance', () => {
    it('should complete user registration within acceptable time limits', async () => {
      const timer = TestUtils.createPerformanceTimer();
      
      const mockResult = TestFactory.createAuthResult();
      (authService.registerUser as any).mockResolvedValue(mockResult);

      const caller = authRouter.createCaller(testContext);
      
      const result = await caller.register({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.user).toBeDefined();
      
      // Registration should complete within 2 seconds
      timer.expectFasterThan(2000);
    });

    it('should complete user login within acceptable time limits', async () => {
      const timer = TestUtils.createPerformanceTimer();
      
      const mockResult = TestFactory.createAuthResult();
      (authService.loginUser as any).mockResolvedValue(mockResult);

      const caller = authRouter.createCaller(testContext);
      
      const result = await caller.login({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      expect(result.user).toBeDefined();
      
      // Login should complete within 1 second
      timer.expectFasterThan(1000);
    });

    it('should complete token refresh within acceptable time limits', async () => {
      const timer = TestUtils.createPerformanceTimer();
      
      const mockTokens = TestUtils.generateTestTokens();
      (authService.refreshTokens as any).mockResolvedValue(mockTokens);

      const caller = authRouter.createCaller(testContext);
      
      const result = await caller.refresh({
        refreshToken: 'valid-refresh-token',
      });

      expect(result.accessToken).toBeDefined();
      
      // Token refresh should complete within 500ms
      timer.expectFasterThan(500);
    });

    it('should complete password reset request within acceptable time limits', async () => {
      const timer = TestUtils.createPerformanceTimer();
      
      (authService.requestPasswordReset as any).mockResolvedValue(undefined);

      const caller = authRouter.createCaller(testContext);
      
      const result = await caller.requestPasswordReset({
        email: 'test@example.com',
      });

      expect(result.message).toBeDefined();
      
      // Password reset should complete within 1.5 seconds
      timer.expectFasterThan(1500);
    });

    it('should complete email verification within acceptable time limits', async () => {
      const timer = TestUtils.createPerformanceTimer();
      
      (authService.verifyEmail as any).mockResolvedValue(undefined);

      const caller = authRouter.createCaller(testContext);
      
      const result = await caller.verifyEmail({
        token: 'verification-token',
      });

      expect(result.message).toBeDefined();
      
      // Email verification should complete within 1 second
      timer.expectFasterThan(1000);
    });
  });

  describe('Throughput Performance', () => {
    it('should handle multiple concurrent registrations efficiently', async () => {
      const concurrentUsers = 10;
      const timer = TestUtils.createPerformanceTimer();
      
      const mockResults = Array.from({ length: concurrentUsers }, () => 
        TestFactory.createAuthResult()
      );

      (authService.registerUser as any).mockImplementation((input: any) => {
        // Simulate database/network delay
        return new Promise(resolve => 
          setTimeout(() => resolve(mockResults.pop()), 50)
        );
      });

      const caller = authRouter.createCaller(testContext);
      
      const registrationPromises = Array.from({ length: concurrentUsers }, (_, index) =>
        caller.register({
          email: `user${index}@example.com`,
          password: 'TestPassword123!',
        })
      );

      const results = await Promise.all(registrationPromises);
      
      expect(results).toHaveLength(concurrentUsers);
      results.forEach(result => {
        expect(result.user).toBeDefined();
        expect(result.tokens).toBeDefined();
      });

      // Should handle 10 concurrent registrations within 3 seconds
      timer.expectFasterThan(3000);
    });

    it('should handle multiple concurrent logins efficiently', async () => {
      const concurrentLogins = 20;
      const timer = TestUtils.createPerformanceTimer();
      
      const mockResult = TestFactory.createAuthResult();
      (authService.loginUser as any).mockImplementation(() => {
        // Simulate authentication processing time
        return new Promise(resolve => 
          setTimeout(() => resolve(mockResult), 25)
        );
      });

      const caller = authRouter.createCaller(testContext);
      
      const loginPromises = Array.from({ length: concurrentLogins }, () =>
        caller.login({
          email: 'test@example.com',
          password: 'TestPassword123!',
        })
      );

      const results = await Promise.all(loginPromises);
      
      expect(results).toHaveLength(concurrentLogins);
      
      // Should handle 20 concurrent logins within 2 seconds
      timer.expectFasterThan(2000);
    });

    it('should handle burst of token refreshes efficiently', async () => {
      const burstSize = 50;
      const timer = TestUtils.createPerformanceTimer();
      
      const mockTokens = TestUtils.generateTestTokens();
      (authService.refreshTokens as any).mockImplementation(() => {
        // Simulate minimal processing time for token refresh
        return new Promise(resolve => 
          setTimeout(() => resolve(mockTokens), 10)
        );
      });

      const caller = authRouter.createCaller(testContext);
      
      const refreshPromises = Array.from({ length: burstSize }, () =>
        caller.refresh({
          refreshToken: 'valid-refresh-token',
        })
      );

      const results = await Promise.all(refreshPromises);
      
      expect(results).toHaveLength(burstSize);
      
      // Should handle 50 token refreshes within 2 seconds
      timer.expectFasterThan(2000);
    });
  });

  describe('Resource Usage Performance', () => {
    it('should maintain performance under memory pressure', async () => {
      const largeDatasetSize = 100;
      const timer = TestUtils.createPerformanceTimer();
      
      // Create large dataset to simulate memory pressure
      const largeUsers = Array.from({ length: largeDatasetSize }, (_, index) => 
        TestFactory.createUser({ email: `user${index}@example.com` })
      );

      const mockResult = TestFactory.createAuthResult();
      (authService.registerUser as any).mockResolvedValue(mockResult);

      const caller = authRouter.createCaller(testContext);
      
      // Process users in batches to simulate real-world scenario
      const batchSize = 10;
      const results = [];
      
      for (let i = 0; i < largeDatasetSize; i += batchSize) {
        const batch = largeUsers.slice(i, i + batchSize);
        const batchPromises = batch.map(user =>
          caller.register({
            email: user.email,
            password: 'TestPassword123!',
          })
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      expect(results).toHaveLength(largeDatasetSize);
      
      // Should process 100 users within 10 seconds
      timer.expectFasterThan(10000);
    });

    it('should handle operations with large payloads efficiently', async () => {
      const timer = TestUtils.createPerformanceTimer();
      
      // Create registration with maximum allowed field lengths
      const largePayload = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'A'.repeat(50), // Maximum length
        lastName: 'B'.repeat(50), // Maximum length
        displayName: 'C'.repeat(100), // Maximum length
      };

      const mockResult = TestFactory.createAuthResult();
      (authService.registerUser as any).mockResolvedValue(mockResult);

      const caller = authRouter.createCaller(testContext);
      
      const result = await caller.register(largePayload);
      
      expect(result.user).toBeDefined();
      
      // Large payload should still process quickly
      timer.expectFasterThan(1000);
    });
  });

  describe('Scalability Performance', () => {
    it('should maintain consistent performance as load increases', async () => {
      const loadLevels = [1, 5, 10, 25, 50];
      const performanceResults: Array<{ load: number; time: number }> = [];

      const mockResult = TestFactory.createAuthResult();
      (authService.loginUser as any).mockImplementation(() => {
        // Simulate processing time
        return new Promise(resolve => 
          setTimeout(() => resolve(mockResult), 20)
        );
      });

      const caller = authRouter.createCaller(testContext);

      for (const load of loadLevels) {
        const timer = TestUtils.createPerformanceTimer();
        
        const loginPromises = Array.from({ length: load }, () =>
          caller.login({
            email: 'test@example.com',
            password: 'TestPassword123!',
          })
        );

        await Promise.all(loginPromises);
        
        const elapsed = timer.elapsed();
        performanceResults.push({ load, time: elapsed });
      }

      // Performance should not degrade dramatically with increased load
      // Allow for some linear increase but not exponential
      const maxExpectedTime = Math.max(...performanceResults.map(r => r.time));
      const minExpectedTime = Math.min(...performanceResults.map(r => r.time));
      
      // Performance degradation should be reasonable (not more than 10x)
      expect(maxExpectedTime / minExpectedTime).toBeLessThan(10);
    });

    it('should handle rapid successive operations efficiently', async () => {
      const operationCount = 30;
      const timer = TestUtils.createPerformanceTimer();

      const mockTokens = TestUtils.generateTestTokens();
      (authService.refreshTokens as any).mockResolvedValue(mockTokens);

      const caller = authRouter.createCaller(testContext);

      // Execute operations in rapid succession (not parallel)
      for (let i = 0; i < operationCount; i++) {
        await caller.refresh({
          refreshToken: 'valid-refresh-token',
        });
      }

      // 30 successive operations should complete within 5 seconds
      timer.expectFasterThan(5000);
    });
  });

  describe('Database Query Performance', () => {
    it('should efficiently handle user lookup operations', async () => {
      const timer = TestUtils.createPerformanceTimer();

      // Mock multiple database calls that would typically happen during login
      const mockResult = TestFactory.createAuthResult();
      (authService.loginUser as any).mockImplementation(async () => {
        // Simulate database queries with realistic delays
        await TestUtils.delay(10); // User lookup
        await TestUtils.delay(5);  // Password verification
        await TestUtils.delay(8);  // Session creation
        await TestUtils.delay(3);  // Preferences fetch
        return mockResult;
      });

      const caller = authRouter.createCaller(testContext);
      
      const result = await caller.login({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      expect(result.user).toBeDefined();
      
      // All database operations should complete efficiently
      timer.expectFasterThan(200);
    });

    it('should optimize batch operations for multiple users', async () => {
      const userCount = 15;
      const timer = TestUtils.createPerformanceTimer();

      // Simulate batch processing optimization
      const mockResults = Array.from({ length: userCount }, () => 
        TestFactory.createAuthResult()
      );

      (authService.registerUser as any).mockImplementation(() => {
        // Simulate optimized batch processing
        return new Promise(resolve => 
          setTimeout(() => resolve(mockResults.pop()), 30)
        );
      });

      const caller = authRouter.createCaller(testContext);

      // Process in optimal batch size
      const batchSize = 5;
      const results = await TestUtils.runConcurrentOperations(
        Array.from({ length: userCount }, (_, index) => () =>
          caller.register({
            email: `batch${index}@example.com`,
            password: 'TestPassword123!',
          })
        ),
        batchSize
      );

      expect(results).toHaveLength(userCount);
      
      // Batch processing should be efficient
      timer.expectFasterThan(3000);
    });
  });

  describe('Network Performance', () => {
    it('should handle simulated network latency gracefully', async () => {
      const timer = TestUtils.createPerformanceTimer();

      const mockResult = TestFactory.createAuthResult();
      (authService.loginUser as any).mockImplementation(async () => {
        // Simulate network latency
        await TestUtils.delay(100);
        return mockResult;
      });

      const caller = authRouter.createCaller(testContext);
      
      const result = await caller.login({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      expect(result.user).toBeDefined();
      
      // Should handle network latency within reasonable bounds
      timer.expectFasterThan(500);
    });

    it('should optimize payload sizes for performance', async () => {
      const timer = TestUtils.createPerformanceTimer();

      // Test with minimal payload for optimal network performance
      const minimalPayload = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const mockResult = TestFactory.createAuthResult();
      (authService.registerUser as any).mockResolvedValue(mockResult);

      const caller = authRouter.createCaller(testContext);
      
      const result = await caller.register(minimalPayload);
      
      expect(result.user).toBeDefined();
      
      // Minimal payload should process very quickly
      timer.expectFasterThan(300);
    });
  });

  describe('Error Handling Performance', () => {
    it('should fail fast for validation errors', async () => {
      const timer = TestUtils.createPerformanceTimer();

      const caller = authRouter.createCaller(testContext);

      try {
        await caller.register({
          email: 'invalid-email',
          password: 'weak',
        });
      } catch (error) {
        // Validation errors should fail immediately
        timer.expectFasterThan(100);
        expect(error).toBeDefined();
      }
    });

    it('should handle service errors efficiently', async () => {
      const timer = TestUtils.createPerformanceTimer();

      (authService.loginUser as any).mockRejectedValue(
        new Error('Invalid credentials')
      );

      const caller = authRouter.createCaller(testContext);

      try {
        await caller.login({
          email: 'test@example.com',
          password: 'wrong-password',
        });
      } catch (error) {
        // Service errors should be handled quickly
        timer.expectFasterThan(200);
        expect(error).toBeDefined();
      }
    });
  });

  describe('Memory Performance', () => {
    it('should not accumulate memory during repeated operations', async () => {
      const operationCount = 100;
      
      const mockResult = TestFactory.createAuthResult();
      (authService.refreshTokens as any).mockResolvedValue(
        TestUtils.generateTestTokens()
      );

      const caller = authRouter.createCaller(testContext);

      // Track initial memory usage
      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      for (let i = 0; i < operationCount; i++) {
        await caller.refresh({
          refreshToken: 'valid-refresh-token',
        });
        
        // Force garbage collection if available (Node.js --expose-gc)
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      
      // Memory usage should not increase dramatically
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const maxAllowedIncrease = 50 * 1024 * 1024; // 50MB
      
      expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain baseline performance characteristics', async () => {
      const baselineMaxTime = 1000; // 1 second baseline
      const timer = TestUtils.createPerformanceTimer();

      const mockResult = TestFactory.createAuthResult();
      (authService.loginUser as any).mockResolvedValue(mockResult);

      const caller = authRouter.createCaller(testContext);
      
      await caller.login({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      // Should not exceed baseline performance
      timer.expectFasterThan(baselineMaxTime);
    });

    it('should detect performance anomalies', async () => {
      const sampleSize = 10;
      const times: number[] = [];

      const mockResult = TestFactory.createAuthResult();
      (authService.registerUser as any).mockImplementation(() => {
        // Simulate varying response times
        const delay = Math.random() * 100 + 50; // 50-150ms
        return new Promise(resolve => 
          setTimeout(() => resolve(mockResult), delay)
        );
      });

      const caller = authRouter.createCaller(testContext);

      // Collect performance samples
      for (let i = 0; i < sampleSize; i++) {
        const timer = TestUtils.createPerformanceTimer();
        
        await caller.register({
          email: `perf${i}@example.com`,
          password: 'TestPassword123!',
        });
        
        times.push(timer.elapsed());
      }

      // Calculate statistics
      const average = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = times.reduce((a, b) => a + Math.pow(b - average, 2), 0) / times.length;
      const standardDeviation = Math.sqrt(variance);

      // Performance should be consistent (low variance)
      expect(standardDeviation).toBeLessThan(average * 0.5); // SD should be less than 50% of average
    });
  });
});