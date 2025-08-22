/**
 * Test utilities and factories for the True Crime Backend
 * 
 * This module provides comprehensive testing infrastructure including:
 * - Mock data factories for various entities
 * - Test utilities for common testing patterns
 * - Contract testing utilities for API validation
 * - Performance and load testing utilities
 * - Security testing helpers
 */

// Core factories and utilities
export { TestFactory, faker, TEST_CONSTANTS } from './factories';
export { TestUtils, testAssertions, TEST_DATA } from './utils';

// Enhanced factories for complex testing scenarios
export { EnhancedTestFactory, TestSetup } from './enhanced-factories';

// Contract testing utilities
export { ContractTestUtils, ContractSchemas } from './contract-utils';

// Type definitions for testing
export interface TestContext {
  user?: any;
  sessionToken?: string;
  cache?: any;
  monitoring?: any;
  search?: any;
  database?: any;
  timer?: any;
  setCookie?: any;
}

export interface TestServerOptions {
  withAuth?: boolean;
  withCache?: boolean;
  withRateLimit?: boolean;
  withMonitoring?: boolean;
  mockServices?: boolean;
}

export interface PerformanceTestOptions {
  concurrent?: number;
  duration?: number;
  rampUp?: number;
  maxResponseTime?: number;
  minSuccessRate?: number;
}

export interface LoadTestResult {
  totalRequests: number;
  successful: number;
  failed: number;
  successRate: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errors: any[];
}

export interface SecurityTestPayload {
  type: 'sql_injection' | 'xss' | 'path_traversal' | 'command_injection' | 'nosql_injection';
  payload: string;
  expectedBehavior: 'sanitized' | 'rejected' | 'escaped';
}

export interface ContractTestCase {
  name: string;
  input: any;
  expectedOutput?: any;
  expectError?: boolean;
  errorCode?: string;
}

export interface TestDataset {
  users: any[];
  content: any[];
  sessions: any[];
  preferences: any[];
  activeUsers: any[];
  inactiveUsers: any[];
  unverifiedUsers: any[];
}

// Common test patterns and helpers
export const TestPatterns = {
  /**
   * Common test setup for authenticated routes
   */
  authenticatedRouteTest: (routeName: string, testFn: (context: TestContext) => Promise<void>) => {
    return async () => {
      const user = TestFactory.createUser({ emailVerified: true });
      const context = TestUtils.createTestContext({ user });
      await testFn(context);
    };
  },

  /**
   * Common test setup for unauthenticated routes
   */
  publicRouteTest: (routeName: string, testFn: (context: TestContext) => Promise<void>) => {
    return async () => {
      const context = TestUtils.createTestContext();
      await testFn(context);
    };
  },

  /**
   * Common performance test setup
   */
  performanceTest: (
    testName: string,
    operation: () => Promise<any>,
    options: PerformanceTestOptions = {}
  ) => {
    return async () => {
      const benchmark = TestUtils.createPerformanceBenchmark();
      const memoryTracker = TestUtils.createMemoryTracker();
      
      memoryTracker.snapshot('before');
      
      const result = await benchmark.measure(testName, operation);
      
      memoryTracker.snapshot('after');
      
      const stats = benchmark.getStats();
      
      // Assert performance requirements
      if (options.maxResponseTime) {
        benchmark.expectPerformance(testName, options.maxResponseTime);
      }
      
      return {
        result,
        stats,
        memoryGrowth: memoryTracker.getMemoryGrowth('before', 'after'),
      };
    };
  },

  /**
   * Common rate limiting test setup
   */
  rateLimitTest: (
    endpoint: string,
    limit: number,
    windowMs: number
  ) => {
    return async () => {
      const rateLimiter = TestUtils.createMockRateLimiter(limit, windowMs);
      const requests = Array.from({ length: limit + 10 }, () => 
        rateLimiter.checkLimit('test-ip')
      );
      
      const successful = requests.filter(Boolean);
      const rateLimited = requests.filter(r => !r);
      
      expect(successful).toHaveLength(limit);
      expect(rateLimited).toHaveLength(10);
    };
  },

  /**
   * Common security test setup
   */
  securityTest: (
    endpoint: string,
    payloads: SecurityTestPayload[]
  ) => {
    return async () => {
      const securityUtils = TestUtils.createSecurityTestUtils();
      
      for (const { type, payload, expectedBehavior } of payloads) {
        // This would be implemented based on your specific security requirements
        const result = await TestUtils.expectSanitizedOutput(payload, payload);
        
        switch (expectedBehavior) {
          case 'sanitized':
            securityUtils.expectSanitizedOutput(payload, result);
            break;
          case 'rejected':
            expect(result).toBeNull();
            break;
          case 'escaped':
            expect(result).not.toBe(payload);
            break;
        }
      }
    };
  },
};

// Test data generators
export const TestDataGenerators = {
  /**
   * Generate test data for user registration scenarios
   */
  userRegistrationScenarios: () => [
    {
      name: 'valid registration',
      input: TestFactory.createRegistrationInput(),
      shouldSucceed: true,
    },
    {
      name: 'duplicate email',
      input: TestFactory.createRegistrationInput({ email: 'existing@example.com' }),
      shouldSucceed: false,
      expectedError: 'User already exists',
    },
    {
      name: 'invalid email',
      input: TestFactory.createRegistrationInput({ email: TestFactory.generateInvalidEmail() }),
      shouldSucceed: false,
      expectedError: 'Invalid email',
    },
    {
      name: 'weak password',
      input: TestFactory.createRegistrationInput({ password: TestFactory.generateWeakPassword() }),
      shouldSucceed: false,
      expectedError: 'Password too weak',
    },
  ],

  /**
   * Generate test data for search scenarios
   */
  searchScenarios: () => [
    {
      name: 'basic search',
      input: { query: 'Ted Bundy', page: 1, limit: 20 },
      shouldSucceed: true,
    },
    {
      name: 'search with filters',
      input: { 
        query: 'serial killer',
        filters: { type: 'series', year: 2023 },
        page: 1,
        limit: 10,
      },
      shouldSucceed: true,
    },
    {
      name: 'empty query',
      input: { query: '', page: 1, limit: 20 },
      shouldSucceed: false,
      expectedError: 'Query is required',
    },
    {
      name: 'invalid pagination',
      input: { query: 'test', page: 0, limit: 20 },
      shouldSucceed: false,
      expectedError: 'Invalid page number',
    },
  ],

  /**
   * Generate malicious payloads for security testing
   */
  securityPayloads: (): SecurityTestPayload[] => [
    {
      type: 'sql_injection',
      payload: "'; DROP TABLE users; --",
      expectedBehavior: 'sanitized',
    },
    {
      type: 'xss',
      payload: '<script>alert("XSS")</script>',
      expectedBehavior: 'sanitized',
    },
    {
      type: 'path_traversal',
      payload: '../../../etc/passwd',
      expectedBehavior: 'rejected',
    },
    {
      type: 'command_injection',
      payload: '; cat /etc/passwd',
      expectedBehavior: 'sanitized',
    },
    {
      type: 'nosql_injection',
      payload: '{"$gt": ""}',
      expectedBehavior: 'escaped',
    },
  ],
};

// Export commonly used test configurations
export const TestConfigs = {
  DEFAULT_TIMEOUT: 10000,
  PERFORMANCE_TIMEOUT: 60000,
  SLOW_TEST_TIMEOUT: 120000,
  
  RATE_LIMITS: {
    STANDARD: { requests: 30, windowMs: 60000 },
    SEARCH: { requests: 20, windowMs: 60000 },
    AUTH: { requests: 5, windowMs: 900000 }, // 15 minutes
    WRITE: { requests: 20, windowMs: 60000 },
  },
  
  PERFORMANCE_THRESHOLDS: {
    API_RESPONSE: 1000, // 1 second
    DATABASE_QUERY: 500, // 500ms
    CACHE_OPERATION: 50, // 50ms
    SEARCH_QUERY: 2000, // 2 seconds
  },
  
  LOAD_TEST_DEFAULTS: {
    CONCURRENT_USERS: 50,
    TEST_DURATION: 30000, // 30 seconds
    RAMP_UP_TIME: 10000, // 10 seconds
    SUCCESS_RATE_THRESHOLD: 0.95, // 95%
  },
};

// Utility functions for common test operations
export const TestHelpers = {
  /**
   * Wait for a condition to be met
   */
  waitForCondition: TestUtils.waitFor,

  /**
   * Create mock timers for time-based testing
   */
  createMockTimers: () => {
    const originalSetTimeout = setTimeout;
    const originalSetInterval = setInterval;
    const originalDate = Date;
    
    return {
      useFakeTimers: () => {
        vi.useFakeTimers();
      },
      useRealTimers: () => {
        vi.useRealTimers();
      },
      advanceTime: (ms: number) => {
        vi.advanceTimersByTime(ms);
      },
      runAllTimers: () => {
        vi.runAllTimers();
      },
    };
  },

  /**
   * Create snapshot testing utilities
   */
  createSnapshotUtils: () => ({
    expectToMatchSnapshot: (data: any, snapshotName?: string) => {
      expect(data).toMatchSnapshot(snapshotName);
    },
    expectToMatchInlineSnapshot: (data: any) => {
      expect(data).toMatchInlineSnapshot();
    },
  }),

  /**
   * Database test helpers
   */
  createDatabaseHelpers: () => TestUtils.createDatabaseTestUtils(),

  /**
   * Cache test helpers
   */
  createCacheHelpers: () => TestUtils.createMockCache(),

  /**
   * Security test helpers
   */
  createSecurityHelpers: () => TestUtils.createSecurityTestUtils(),
};