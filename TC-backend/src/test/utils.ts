import { vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import type { User, UserPreferences } from '@prisma/client';
import { TestFactory } from './factories';

/**
 * Test utilities for common testing operations
 */

export class TestUtils {
  /**
   * Create a mock tRPC context for authenticated user
   */
  static createAuthenticatedContext(user?: User & { preferences: UserPreferences | null }) {
    const testUser = user || TestFactory.createUserWithPreferences();
    
    return {
      user: testUser,
      sessionToken: `session_${Math.random().toString(36).substring(7)}`,
      setCookie: vi.fn(),
    };
  }

  /**
   * Create a mock tRPC context for unauthenticated user
   */
  static createUnauthenticatedContext() {
    return {
      setCookie: vi.fn(),
    };
  }

  /**
   * Wait for async operations to complete
   */
  static async waitFor(condition: () => boolean | Promise<boolean>, timeout: number = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Create a mock function that returns different values on subsequent calls
   */
  static createMockSequence<T>(values: T[]) {
    let index = 0;
    return vi.fn(() => {
      const value = values[index];
      index = (index + 1) % values.length;
      return value;
    });
  }

  /**
   * Create a mock function that throws an error after N successful calls
   */
  static createFailAfterNCallsMock<T>(successValue: T, errorToThrow: Error, callsBeforeFailure: number) {
    let callCount = 0;
    return vi.fn(() => {
      callCount++;
      if (callCount > callsBeforeFailure) {
        throw errorToThrow;
      }
      return successValue;
    });
  }

  /**
   * Mock console methods to capture logs during tests
   */
  static mockConsole() {
    const originalConsole = { ...console };
    const mocks = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    };

    return {
      mocks,
      restore: () => {
        Object.assign(console, originalConsole);
        Object.values(mocks).forEach(mock => mock.mockRestore());
      },
    };
  }

  /**
   * Simulate network delays for testing async operations
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a mock function that randomly fails
   */
  static createFlakyMock<T>(successValue: T, errorToThrow: Error, failureRate: number = 0.3) {
    return vi.fn(() => {
      if (Math.random() < failureRate) {
        throw errorToThrow;
      }
      return successValue;
    });
  }

  /**
   * Assert that a function throws a TRPCError with specific properties
   */
  static async expectTRPCError(
    asyncFn: () => Promise<any>,
    expectedCode: string,
    expectedMessage?: string
  ): Promise<void> {
    try {
      await asyncFn();
      throw new Error('Expected function to throw TRPCError');
    } catch (error) {
      if (!(error instanceof TRPCError)) {
        throw new Error(`Expected TRPCError, got ${error?.constructor?.name}`);
      }
      
      if (error.code !== expectedCode) {
        throw new Error(`Expected error code ${expectedCode}, got ${error.code}`);
      }
      
      if (expectedMessage && !error.message.includes(expectedMessage)) {
        throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
      }
    }
  }

  /**
   * Create a test database transaction that automatically rolls back
   */
  static createTestTransaction() {
    // This would integrate with your actual database for integration tests
    // For unit tests, we just return a mock
    return {
      commit: vi.fn(),
      rollback: vi.fn(),
      execute: vi.fn(),
    };
  }

  /**
   * Generate test JWT tokens
   */
  static generateTestTokens(userId: string = 'test-user-123') {
    return {
      accessToken: `test_access_${userId}_${Date.now()}`,
      refreshToken: `test_refresh_${userId}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
  }

  /**
   * Create a mock email service for testing
   */
  static createMockEmailService() {
    return {
      sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
      sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
      sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
      getEmailsSent: vi.fn().mockReturnValue([]),
    };
  }

  /**
   * Mock environment variables
   */
  static mockEnvironment(envVars: Record<string, string>) {
    const originalEnv = { ...process.env };
    Object.assign(process.env, envVars);
    
    return {
      restore: () => {
        process.env = originalEnv;
      },
    };
  }

  /**
   * Validate password strength (for testing validation functions)
   */
  static isStrongPassword(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers
    );
  }

  /**
   * Validate email format (for testing validation functions)
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create a mock Prisma client for testing
   */
  static createMockPrismaClient() {
    return {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      userSession: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      passwordReset: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      emailVerification: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      userPreferences: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      $queryRaw: vi.fn(),
      $transaction: vi.fn(),
    };
  }

  /**
   * Create mock Supabase client for testing
   */
  static createMockSupabaseClient() {
    return {
      auth: {
        admin: {
          createUser: vi.fn(),
          updateUserById: vi.fn(),
          deleteUser: vi.fn(),
          listUsers: vi.fn(),
        },
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        setSession: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        verifyOtp: vi.fn(),
        signInWithOAuth: vi.fn(),
        exchangeCodeForSession: vi.fn(),
        getUser: vi.fn(),
      },
    };
  }

  /**
   * Assert that arrays are equal (order doesn't matter)
   */
  static expectArraysToBeEqual<T>(actual: T[], expected: T[]): void {
    expect(actual.length).toBe(expected.length);
    expected.forEach(item => {
      expect(actual).toContain(item);
    });
  }

  /**
   * Assert that an object contains specific properties
   */
  static expectObjectToContain(actual: any, expected: Partial<any>): void {
    Object.keys(expected).forEach(key => {
      expect(actual).toHaveProperty(key, expected[key]);
    });
  }

  /**
   * Create a performance timer for testing
   */
  static createPerformanceTimer() {
    const startTime = Date.now();
    
    return {
      elapsed: () => Date.now() - startTime,
      expectFasterThan: (maxMs: number) => {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(maxMs);
      },
      expectSlowerThan: (minMs: number) => {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeGreaterThan(minMs);
      },
    };
  }

  /**
   * Generate test data for stress testing
   */
  static generateStressTestData(count: number) {
    return Array.from({ length: count }, (_, index) => ({
      id: `stress-test-${index}`,
      email: `stresstest${index}@example.com`,
      data: `stress-test-data-${index}`,
    }));
  }

  /**
   * Mock rate limiting for testing
   */
  static createMockRateLimiter(limit: number, windowMs: number) {
    const requests = new Map<string, number[]>();
    
    return {
      checkLimit: (identifier: string): boolean => {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!requests.has(identifier)) {
          requests.set(identifier, []);
        }
        
        const userRequests = requests.get(identifier)!;
        const recentRequests = userRequests.filter(time => time > windowStart);
        
        if (recentRequests.length >= limit) {
          return false;
        }
        
        recentRequests.push(now);
        requests.set(identifier, recentRequests);
        return true;
      },
      reset: () => {
        requests.clear();
      },
    };
  }

  /**
   * Test helper for checking security headers
   */
  static expectSecurityHeaders(headers: Record<string, string>) {
    expect(headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(headers).toHaveProperty('x-frame-options', 'DENY');
    expect(headers).toHaveProperty('x-xss-protection', '1; mode=block');
  }

  /**
   * Clean up test data
   */
  static async cleanupTestData(testDataIds: string[]) {
    // In a real implementation, this would clean up test data from the database
    // For unit tests, we just clear mocks
    vi.clearAllMocks();
  }

  /**
   * Assert that a date is approximately equal to another date (within tolerance)
   */
  static expectDateToBeCloseTo(actual: Date, expected: Date, toleranceMs: number = 1000) {
    const diff = Math.abs(actual.getTime() - expected.getTime());
    expect(diff).toBeLessThan(toleranceMs);
  }

  /**
   * Create a test scenario for concurrent operations
   */
  static async runConcurrentOperations<T>(
    operations: Array<() => Promise<T>>,
    maxConcurrency: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Create a comprehensive test server setup
   */
  static async createTestServer(options: {
    withAuth?: boolean;
    withCache?: boolean;
    withRateLimit?: boolean;
    withMonitoring?: boolean;
    mockServices?: boolean;
  } = {}) {
    const { createServer } = await import('@/server');
    const server = await createServer();
    
    if (options.mockServices) {
      // Mock external services
      vi.doMock('@/lib/supabase', () => ({
        supabase: this.createMockSupabaseClient(),
      }));
    }

    await server.listen({ port: 0 });
    const address = server.server.address();
    const port = typeof address === 'string' ? address : address?.port;
    const baseUrl = `http://localhost:${port}`;

    return {
      server,
      baseUrl,
      port,
      close: async () => {
        await server.close();
      },
    };
  }

  /**
   * Create mock cache implementation for testing
   */
  static createMockCache() {
    const storage = new Map<string, { value: any; expires?: number; tags?: string[] }>();
    
    return {
      get: vi.fn(async (key: string) => {
        const item = storage.get(key);
        if (!item) return null;
        if (item.expires && Date.now() > item.expires) {
          storage.delete(key);
          return null;
        }
        return item.value;
      }),
      
      set: vi.fn(async (key: string, value: any, ttl?: number, tags?: string[]) => {
        const expires = ttl ? Date.now() + ttl * 1000 : undefined;
        storage.set(key, { value, expires, tags });
      }),
      
      del: vi.fn(async (key: string) => {
        return storage.delete(key);
      }),
      
      mget: vi.fn(async (keys: string[]) => {
        return keys.map(key => {
          const item = storage.get(key);
          if (!item || (item.expires && Date.now() > item.expires)) {
            return null;
          }
          return item.value;
        });
      }),
      
      flush: vi.fn(async () => {
        storage.clear();
      }),
      
      invalidatePattern: vi.fn(async (patterns: string[]) => {
        const keysToDelete: string[] = [];
        for (const [key] of storage) {
          if (patterns.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(key);
          })) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => storage.delete(key));
      }),
      
      invalidateTag: vi.fn(async (tags: string[]) => {
        const keysToDelete: string[] = [];
        for (const [key, item] of storage) {
          if (item.tags && item.tags.some(tag => tags.includes(tag))) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => storage.delete(key));
      }),
      
      // Test helper methods
      _getStorage: () => storage,
      _clear: () => storage.clear(),
      _size: () => storage.size,
    };
  }

  /**
   * Create mock monitoring service for testing
   */
  static createMockMonitoring() {
    const metrics: any[] = [];
    const errors: any[] = [];
    
    return {
      trackAPIPerformance: vi.fn(async (data: any) => {
        metrics.push({ type: 'api_performance', ...data, timestamp: Date.now() });
      }),
      
      captureException: vi.fn(async (error: Error, context?: any) => {
        errors.push({ error, context, timestamp: Date.now() });
      }),
      
      setUser: vi.fn(),
      setTag: vi.fn(),
      setContext: vi.fn(),
      
      startTransaction: vi.fn(() => ({
        setName: vi.fn(),
        setData: vi.fn(),
        finish: vi.fn(),
      })),
      
      cleanup: vi.fn(() => {
        metrics.length = 0;
        errors.length = 0;
      }),
      
      // Test helper methods
      _getMetrics: () => metrics,
      _getErrors: () => errors,
      _clear: () => {
        metrics.length = 0;
        errors.length = 0;
      },
    };
  }

  /**
   * Create mock search service for testing
   */
  static createMockSearchService() {
    const documents = new Map<string, any>();
    
    return {
      search: vi.fn(async (query: string, options?: any) => {
        const results = Array.from(documents.values())
          .filter(doc => JSON.stringify(doc).toLowerCase().includes(query.toLowerCase()))
          .slice(0, options?.limit || 20);
          
        return {
          hits: results.map((hit, index) => ({ ...hit, _rankingScore: 1 - (index * 0.1) })),
          estimatedTotalHits: results.length,
          query,
          processingTimeMs: 1,
        };
      }),
      
      addDocuments: vi.fn(async (docs: any[]) => {
        docs.forEach(doc => documents.set(doc.id, doc));
      }),
      
      updateDocuments: vi.fn(async (docs: any[]) => {
        docs.forEach(doc => documents.set(doc.id, doc));
      }),
      
      deleteDocuments: vi.fn(async (ids: string[]) => {
        ids.forEach(id => documents.delete(id));
      }),
      
      clearAllDocuments: vi.fn(async () => {
        documents.clear();
      }),
      
      // Test helper methods
      _getDocuments: () => Array.from(documents.values()),
      _getDocument: (id: string) => documents.get(id),
      _clear: () => documents.clear(),
    };
  }

  /**
   * Create comprehensive test context with all services mocked
   */
  static createTestContext(options: {
    user?: any;
    cache?: any;
    monitoring?: any;
    search?: any;
    database?: any;
  } = {}) {
    const mockTimer = {
      start: vi.fn(),
      end: vi.fn(),
    };

    return {
      user: options.user || null,
      sessionToken: options.user ? `test-session-${Date.now()}` : undefined,
      cache: options.cache || this.createMockCache(),
      monitoring: options.monitoring || this.createMockMonitoring(),
      search: options.search || this.createMockSearchService(),
      database: options.database || this.createMockPrismaClient(),
      timer: mockTimer,
      setCookie: vi.fn(),
    };
  }

  /**
   * Performance testing utilities
   */
  static createPerformanceBenchmark() {
    const measurements: Array<{ name: string; duration: number; timestamp: number }> = [];
    
    return {
      measure: async <T>(name: string, operation: () => Promise<T>): Promise<T> => {
        const start = Date.now();
        try {
          const result = await operation();
          const duration = Date.now() - start;
          measurements.push({ name, duration, timestamp: Date.now() });
          return result;
        } catch (error) {
          const duration = Date.now() - start;
          measurements.push({ name: `${name} (error)`, duration, timestamp: Date.now() });
          throw error;
        }
      },
      
      getMeasurements: () => measurements,
      
      getStats: () => {
        const durations = measurements.map(m => m.duration);
        return {
          count: measurements.length,
          total: durations.reduce((sum, d) => sum + d, 0),
          average: durations.reduce((sum, d) => sum + d, 0) / durations.length || 0,
          min: Math.min(...durations),
          max: Math.max(...durations),
          p95: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)] || 0,
          p99: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.99)] || 0,
        };
      },
      
      expectPerformance: (name: string, maxMs: number) => {
        const measurement = measurements.find(m => m.name === name);
        expect(measurement).toBeDefined();
        expect(measurement!.duration).toBeLessThan(maxMs);
      },
      
      clear: () => {
        measurements.length = 0;
      },
    };
  }

  /**
   * Memory usage tracking for performance tests
   */
  static createMemoryTracker() {
    const snapshots: Array<{ name: string; memory: NodeJS.MemoryUsage; timestamp: number }> = [];
    
    return {
      snapshot: (name: string) => {
        snapshots.push({
          name,
          memory: process.memoryUsage(),
          timestamp: Date.now(),
        });
      },
      
      getSnapshots: () => snapshots,
      
      getMemoryGrowth: (fromSnapshot: string, toSnapshot: string) => {
        const from = snapshots.find(s => s.name === fromSnapshot);
        const to = snapshots.find(s => s.name === toSnapshot);
        
        if (!from || !to) {
          throw new Error('Snapshot not found');
        }
        
        return {
          rss: to.memory.rss - from.memory.rss,
          heapUsed: to.memory.heapUsed - from.memory.heapUsed,
          heapTotal: to.memory.heapTotal - from.memory.heapTotal,
          external: to.memory.external - from.memory.external,
          arrayBuffers: to.memory.arrayBuffers - from.memory.arrayBuffers,
        };
      },
      
      expectMemoryGrowth: (fromSnapshot: string, toSnapshot: string, maxGrowthMB: number) => {
        const growth = this.getMemoryGrowth(fromSnapshot, toSnapshot);
        const growthMB = growth.heapUsed / 1024 / 1024;
        expect(growthMB).toBeLessThan(maxGrowthMB);
      },
      
      clear: () => {
        snapshots.length = 0;
      },
    };
  }

  /**
   * Load testing utilities
   */
  static createLoadTester() {
    return {
      async runLoadTest<T>(
        operation: () => Promise<T>,
        options: {
          concurrent: number;
          duration: number; // in milliseconds
          rampUp?: number; // in milliseconds
        }
      ) {
        const results: Array<{ success: boolean; duration: number; error?: any; timestamp: number }> = [];
        const startTime = Date.now();
        let activeOperations = 0;
        let completedOperations = 0;

        const runOperation = async () => {
          const operationStart = Date.now();
          activeOperations++;
          
          try {
            await operation();
            const duration = Date.now() - operationStart;
            results.push({ success: true, duration, timestamp: Date.now() });
          } catch (error) {
            const duration = Date.now() - operationStart;
            results.push({ success: false, duration, error, timestamp: Date.now() });
          } finally {
            activeOperations--;
            completedOperations++;
          }
        };

        // Ramp up phase
        if (options.rampUp) {
          const rampUpInterval = options.rampUp / options.concurrent;
          for (let i = 0; i < options.concurrent; i++) {
            setTimeout(() => {
              const intervalId = setInterval(() => {
                if (Date.now() - startTime < options.duration) {
                  runOperation();
                } else {
                  clearInterval(intervalId);
                }
              }, 100);
            }, i * rampUpInterval);
          }
        } else {
          // Immediate full load
          const intervalIds: NodeJS.Timeout[] = [];
          for (let i = 0; i < options.concurrent; i++) {
            const intervalId = setInterval(() => {
              if (Date.now() - startTime < options.duration) {
                runOperation();
              } else {
                clearInterval(intervalId);
              }
            }, 100);
            intervalIds.push(intervalId);
          }
        }

        // Wait for test duration plus some buffer for operations to complete
        await new Promise(resolve => setTimeout(resolve, options.duration + 5000));

        // Wait for all active operations to complete
        while (activeOperations > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const durations = results.map(r => r.duration);

        return {
          totalRequests: results.length,
          successful: successful.length,
          failed: failed.length,
          successRate: successful.length / results.length,
          averageResponseTime: durations.reduce((sum, d) => sum + d, 0) / durations.length,
          minResponseTime: Math.min(...durations),
          maxResponseTime: Math.max(...durations),
          p95ResponseTime: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)],
          p99ResponseTime: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.99)],
          requestsPerSecond: results.length / (options.duration / 1000),
          errors: failed.map(r => r.error),
        };
      },
    };
  }

  /**
   * Database test utilities
   */
  static createDatabaseTestUtils() {
    return {
      async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
        // In a real implementation, this would use actual database transactions
        // For testing, we'll just run the operation
        return await operation();
      },

      async seedTestData(data: any) {
        // Mock seeding test data
        return data;
      },

      async cleanupTestData(filter: any = {}) {
        // Mock cleanup
        return true;
      },

      createTestUser: () => TestFactory.createUser(),
      createTestUsers: (count: number) => TestFactory.createUsers(count),
    };
  }

  /**
   * HTTP client for testing API endpoints
   */
  static createTestClient(baseUrl: string) {
    return {
      async get(path: string, options: { headers?: Record<string, string> } = {}) {
        const url = `${baseUrl}${path}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: options.headers,
        });
        
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: await response.text(),
          json: async () => JSON.parse(await response.text()),
        };
      },

      async post(path: string, data: any, options: { headers?: Record<string, string> } = {}) {
        const url = `${baseUrl}${path}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: JSON.stringify(data),
        });
        
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: await response.text(),
          json: async () => JSON.parse(await response.text()),
        };
      },
    };
  }

  /**
   * Security testing utilities
   */
  static createSecurityTestUtils() {
    return {
      generateMaliciousPayloads: () => [
        // SQL Injection attempts
        "'; DROP TABLE users; --",
        '1; DELETE FROM users; --',
        "admin'; --",
        '1 OR 1=1',
        
        // XSS attempts
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload=alert(1)>',
        
        // Path traversal
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        
        // Command injection
        '; cat /etc/passwd',
        '| whoami',
        '& dir',
        
        // NoSQL injection
        '{"$gt": ""}',
        '{"$ne": null}',
      ],

      expectSanitizedOutput: (input: string, output: string) => {
        // Check that dangerous patterns are not present in output
        const dangerousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+=/i,
          /DROP\s+TABLE/i,
          /DELETE\s+FROM/i,
          /\.\.+[/\\]/i,
        ];

        dangerousPatterns.forEach(pattern => {
          expect(output).not.toMatch(pattern);
        });
      },

      testPasswordStrength: (password: string) => {
        const checks = {
          minLength: password.length >= 8,
          hasUppercase: /[A-Z]/.test(password),
          hasLowercase: /[a-z]/.test(password),
          hasNumber: /\d/.test(password),
          hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
          notCommon: ![
            'password', '123456', '12345678', 'qwerty', 
            'abc123', 'password123', 'admin', 'letmein'
          ].includes(password.toLowerCase()),
        };

        return {
          ...checks,
          score: Object.values(checks).filter(Boolean).length,
          isStrong: Object.values(checks).every(Boolean),
        };
      },
    };
  }
}

// Export common test assertions
export const testAssertions = {
  /**
   * Assert that an async function throws a specific error
   */
  async rejects(asyncFn: () => Promise<any>, expectedError: string | RegExp): Promise<void> {
    try {
      await asyncFn();
      throw new Error('Expected function to throw an error');
    } catch (error: any) {
      if (typeof expectedError === 'string') {
        expect(error.message).toContain(expectedError);
      } else {
        expect(error.message).toMatch(expectedError);
      }
    }
  },

  /**
   * Assert that an async function resolves without throwing
   */
  async resolves(asyncFn: () => Promise<any>): Promise<void> {
    try {
      await asyncFn();
    } catch (error) {
      throw new Error(`Expected function to resolve, but it threw: ${error}`);
    }
  },
};

// Common test data
export const TEST_DATA = {
  VALID_USER: {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  },
  INVALID_USER: {
    email: 'invalid-email',
    password: 'weak',
  },
  ADMIN_USER: {
    email: 'admin@truecrime.com',
    password: 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'User',
  },
} as const;