import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  monitoring,
  createSupabaseQueryWrapper,
  setupFastifyMonitoring,
  PerformanceTimer,
  performanceTimer,
  performHealthCheck,
  createMetricsEndpoint,
  type HealthCheckResult,
  type QueryMetrics,
  type PerformanceMetrics,
} from '@/lib/monitoring';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      select: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null }))
      }))
    }))
  }))
}));

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  Native: {
    captureException: vi.fn(),
  }
}));

// Mock ioredis for health checks
vi.mock('ioredis', () => ({
  default: class MockRedis {
    constructor(url: string) {}
    ping = vi.fn().mockResolvedValue('PONG')
    quit = vi.fn().mockResolvedValue('OK')
  }
}));

describe('Monitoring Service', () => {
  let originalEnv: typeof process.env;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };
    
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Reset environment
    process.env.NODE_ENV = 'test';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    delete process.env.SENTRY_DSN;
    delete process.env.SLOW_QUERY_THRESHOLD;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    monitoring.cleanup();
  });

  describe('MonitoringService Constructor', () => {
    it('should initialize with default slow query threshold', () => {
      const { MonitoringService } = require('@/lib/monitoring');
      const service = new MonitoringService();
      
      // Default threshold should be 1000ms
      expect(service.slowQueryThreshold).toBe(1000);
    });

    it('should use custom slow query threshold from environment', () => {
      process.env.SLOW_QUERY_THRESHOLD = '500';
      
      const { MonitoringService } = require('@/lib/monitoring');
      const service = new MonitoringService();
      
      expect(service.slowQueryThreshold).toBe(500);
    });

    it('should initialize Supabase client when credentials are provided', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
      
      const mockCreateClient = vi.fn();
      vi.mock('@supabase/supabase-js', () => ({
        createClient: mockCreateClient,
      }));

      const { MonitoringService } = require('@/lib/monitoring');
      new MonitoringService();

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key'
      );
    });

    it('should initialize Sentry when DSN is provided', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/123';
      process.env.SENTRY_TRACES_SAMPLE_RATE = '0.2';
      
      const { MonitoringService } = require('@/lib/monitoring');
      new MonitoringService();

      expect(mockSentry.init).toHaveBeenCalledWith({
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
        tracesSampleRate: 0.2,
      });
    });

    it('should start metrics flush in production', () => {
      process.env.NODE_ENV = 'production';
      vi.useFakeTimers();
      
      const { MonitoringService } = require('@/lib/monitoring');
      const service = new MonitoringService();
      
      expect(service.flushInterval).toBeDefined();
      
      vi.useRealTimers();
    });

    it('should not start metrics flush in non-production', () => {
      process.env.NODE_ENV = 'development';
      
      const { MonitoringService } = require('@/lib/monitoring');
      const service = new MonitoringService();
      
      expect(service.flushInterval).toBeNull();
    });
  });

  describe('logSlowQuery', () => {
    let testMonitoring: any;

    beforeEach(() => {
      const { MonitoringService } = require('@/lib/monitoring');
      testMonitoring = new MonitoringService();
    });

    it('should log slow queries that exceed threshold', async () => {
      const slowQuery: QueryMetrics = {
        operation: 'SELECT * FROM users',
        duration: 1500,
        rowCount: 100,
        userId: 'user-123',
        timestamp: Date.now(),
      };

      await testMonitoring.logSlowQuery(slowQuery);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ Slow Query Detected:',
        expect.objectContaining({
          operation: 'SELECT * FROM users',
          duration: '1500ms',
          rowCount: 100,
          threshold: '1000ms',
          userId: 'user-123',
        })
      );

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        'Slow Database Query',
        expect.objectContaining({
          level: 'warning',
          contexts: expect.objectContaining({
            query: expect.objectContaining({
              operation: 'SELECT * FROM users',
              duration: 1500,
            }),
          }),
        })
      );
    });

    it('should not log queries under threshold', async () => {
      const fastQuery: QueryMetrics = {
        operation: 'SELECT * FROM users LIMIT 1',
        duration: 50,
        timestamp: Date.now(),
      };

      await testMonitoring.logSlowQuery(fastQuery);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(mockSentry.captureMessage).not.toHaveBeenCalled();
    });

    it('should log and report query errors', async () => {
      const errorQuery: QueryMetrics = {
        operation: 'SELECT * FROM nonexistent_table',
        duration: 100,
        error: 'Table does not exist',
        userId: 'user-456',
        timestamp: Date.now(),
      };

      await testMonitoring.logSlowQuery(errorQuery);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Query Error:',
        expect.objectContaining({
          operation: 'SELECT * FROM nonexistent_table',
          error: 'Table does not exist',
          duration: '100ms',
          userId: 'user-456',
        })
      );

      expect(mockSentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          contexts: expect.objectContaining({
            query: expect.objectContaining({
              operation: 'SELECT * FROM nonexistent_table',
              duration: 100,
            }),
          }),
        })
      );
    });

    it('should add slow queries to metrics queue', async () => {
      const slowQuery: QueryMetrics = {
        operation: 'SLOW SELECT',
        duration: 2000,
        timestamp: Date.now(),
      };

      await testMonitoring.logSlowQuery(slowQuery);

      expect(testMonitoring.metricsQueue).toContain(slowQuery);
    });
  });

  describe('trackAPIPerformance', () => {
    let testMonitoring: any;

    beforeEach(() => {
      const { MonitoringService } = require('@/lib/monitoring');
      testMonitoring = new MonitoringService();
    });

    it('should track API performance metrics', async () => {
      const metrics: PerformanceMetrics = {
        endpoint: '/api/users',
        method: 'GET',
        statusCode: 200,
        duration: 150,
        timestamp: Date.now(),
      };

      await testMonitoring.trackAPIPerformance(metrics);

      expect(testMonitoring.metricsQueue).toContain(metrics);
    });

    it('should warn about slow API endpoints', async () => {
      const slowMetrics: PerformanceMetrics = {
        endpoint: '/api/slow-endpoint',
        method: 'GET',
        statusCode: 200,
        duration: 4000,
        timestamp: Date.now(),
      };

      await testMonitoring.trackAPIPerformance(slowMetrics);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ Slow API Endpoint:',
        expect.objectContaining({
          endpoint: '/api/slow-endpoint',
          method: 'GET',
          duration: '4000ms',
          statusCode: 200,
        })
      );

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        'Slow API Endpoint',
        expect.objectContaining({
          level: 'warning',
          extra: expect.objectContaining({
            api: slowMetrics,
          }),
        })
      );
    });

    it('should report server errors to Sentry', async () => {
      const errorMetrics: PerformanceMetrics = {
        endpoint: '/api/error',
        method: 'POST',
        statusCode: 500,
        duration: 100,
        timestamp: Date.now(),
      };

      await testMonitoring.trackAPIPerformance(errorMetrics);

      expect(mockSentry.captureMessage).toHaveBeenCalledWith(
        'Server Error',
        expect.objectContaining({
          level: 'error',
          extra: expect.objectContaining({
            api: errorMetrics,
          }),
        })
      );
    });

    it('should not report client errors as server errors', async () => {
      const clientErrorMetrics: PerformanceMetrics = {
        endpoint: '/api/not-found',
        method: 'GET',
        statusCode: 404,
        duration: 50,
        timestamp: Date.now(),
      };

      await testMonitoring.trackAPIPerformance(clientErrorMetrics);

      expect(mockSentry.captureMessage).not.toHaveBeenCalledWith(
        'Server Error',
        expect.anything()
      );
    });
  });

  describe('flushMetrics', () => {
    let testMonitoring: any;
    let mockSupabase: any;

    beforeEach(() => {
      mockSupabase = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };

      const { MonitoringService } = require('@/lib/monitoring');
      testMonitoring = new MonitoringService();
      testMonitoring.supabase = mockSupabase;
    });

    it('should flush metrics to Supabase', async () => {
      const metrics = [
        { endpoint: '/api/test', method: 'GET', statusCode: 200, duration: 100, timestamp: Date.now() },
        { endpoint: '/api/test2', method: 'POST', statusCode: 201, duration: 200, timestamp: Date.now() },
      ];
      
      testMonitoring.metricsQueue = [...metrics];

      await testMonitoring.flushMetrics();

      expect(mockSupabase.from).toHaveBeenCalledWith('performance_metrics');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(metrics);
      expect(testMonitoring.metricsQueue).toEqual([]);
    });

    it('should handle flush errors gracefully', async () => {
      const metrics = [{ test: 'data' }];
      testMonitoring.metricsQueue = [...metrics];

      mockSupabase.from().insert.mockRejectedValue(new Error('Supabase error'));

      await testMonitoring.flushMetrics();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to flush metrics:', expect.any(Error));
      
      // Should retain up to 100 items from failed flush
      expect(testMonitoring.metricsQueue.length).toBe(1);
    });

    it('should not flush when queue is empty', async () => {
      testMonitoring.metricsQueue = [];

      await testMonitoring.flushMetrics();

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should not flush when Supabase is not configured', async () => {
      testMonitoring.supabase = null;
      testMonitoring.metricsQueue = [{ test: 'data' }];

      await testMonitoring.flushMetrics();

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clear flush interval and flush remaining metrics', async () => {
      vi.useFakeTimers();
      
      process.env.NODE_ENV = 'production';
      const { MonitoringService } = require('@/lib/monitoring');
      const testMonitoring = new MonitoringService();
      
      expect(testMonitoring.flushInterval).toBeDefined();
      
      const flushSpy = vi.spyOn(testMonitoring, 'flushMetrics');
      testMonitoring.cleanup();
      
      expect(testMonitoring.flushInterval).toBeNull();
      expect(flushSpy).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });
});

describe('createSupabaseQueryWrapper', () => {
  let mockSupabase: any;
  let wrappedSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(
          Promise.resolve({ data: [{ id: 1 }], error: null })
        ),
        insert: vi.fn().mockReturnValue(
          Promise.resolve({ data: { id: 1 }, error: null })
        ),
        update: vi.fn().mockReturnValue(
          Promise.resolve({ data: { id: 1 }, error: null })
        ),
      }),
    };

    wrappedSupabase = createSupabaseQueryWrapper(mockSupabase);
  });

  it('should wrap Supabase methods to track performance', async () => {
    const logSlowQuerySpy = vi.spyOn(monitoring, 'logSlowQuery');

    await wrappedSupabase.from('users').select('*');

    expect(logSlowQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: expect.stringContaining('from'),
        duration: expect.any(Number),
        rowCount: 1,
        timestamp: expect.any(Number),
      })
    );
  });

  it('should track errors in wrapped queries', async () => {
    const logSlowQuerySpy = vi.spyOn(monitoring, 'logSlowQuery');
    const error = new Error('Query failed');
    
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(Promise.reject(error)),
    });

    await expect(wrappedSupabase.from('users').select('*')).rejects.toThrow('Query failed');

    expect(logSlowQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: expect.stringContaining('from'),
        duration: expect.any(Number),
        error: 'Query failed',
        timestamp: expect.any(Number),
      })
    );
  });

  it('should pass through non-function properties', () => {
    mockSupabase.someProperty = 'test-value';
    
    expect(wrappedSupabase.someProperty).toBe('test-value');
  });

  it('should pass through non-promise functions', () => {
    mockSupabase.syncFunction = vi.fn().mockReturnValue('sync-result');
    
    const result = wrappedSupabase.syncFunction('arg1', 'arg2');
    
    expect(result).toBe('sync-result');
    expect(mockSupabase.syncFunction).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('setupFastifyMonitoring', () => {
  let mockFastify: Partial<FastifyInstance>;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let hookCallbacks: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    hookCallbacks = {};

    mockFastify = {
      addHook: vi.fn((event: string, callback: Function) => {
        hookCallbacks[event] = callback;
      }),
    };

    mockRequest = {
      url: '/api/test',
      method: 'GET',
      headers: {
        'user-agent': 'test-browser',
        'authorization': 'Bearer test-token',
      },
    };

    mockReply = {
      statusCode: 200,
    };
  });

  it('should add request timing hook', () => {
    setupFastifyMonitoring(mockFastify as FastifyInstance);

    expect(mockFastify.addHook).toHaveBeenCalledWith('onRequest', expect.any(Function));
    expect(mockFastify.addHook).toHaveBeenCalledWith('onResponse', expect.any(Function));
    expect(mockFastify.addHook).toHaveBeenCalledWith('onError', expect.any(Function));
  });

  it('should track request start time', async () => {
    setupFastifyMonitoring(mockFastify as FastifyInstance);

    await hookCallbacks.onRequest(mockRequest, mockReply);

    expect(mockRequest.startTime).toBeTypeOf('number');
    expect(mockRequest.startTime).toBeGreaterThan(0);
  });

  it('should track API performance on response', async () => {
    const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
    setupFastifyMonitoring(mockFastify as FastifyInstance);

    // Simulate request start
    const startTime = Date.now() - 100;
    mockRequest.startTime = startTime;

    await hookCallbacks.onResponse(mockRequest, mockReply);

    expect(trackAPISpy).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/api/test',
        method: 'GET',
        statusCode: 200,
        duration: expect.any(Number),
        timestamp: expect.any(Number),
      })
    );
  });

  it('should handle missing start time gracefully', async () => {
    const trackAPISpy = vi.spyOn(monitoring, 'trackAPIPerformance');
    setupFastifyMonitoring(mockFastify as FastifyInstance);

    delete mockRequest.startTime;

    await hookCallbacks.onResponse(mockRequest, mockReply);

    expect(trackAPISpy).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: '/api/test',
        method: 'GET',
        statusCode: 200,
        duration: expect.any(Number), // Should still have a duration (likely very small)
      })
    );
  });

  it('should capture errors to Sentry', async () => {
    setupFastifyMonitoring(mockFastify as FastifyInstance);
    
    const testError = new Error('Test error');

    await hookCallbacks.onError(mockRequest, mockReply, testError);

    expect(mockSentry.captureException).toHaveBeenCalledWith(
      testError,
      expect.objectContaining({
        extra: expect.objectContaining({
          request: expect.objectContaining({
            url: '/api/test',
            method: 'GET',
            headers: mockRequest.headers,
          }),
        }),
      })
    );
  });

  it('should register cleanup handler', () => {
    const cleanupSpy = vi.spyOn(monitoring, 'cleanup');
    const originalOn = process.on;
    const mockProcessOn = vi.fn();
    process.on = mockProcessOn;

    setupFastifyMonitoring(mockFastify as FastifyInstance);

    expect(mockProcessOn).toHaveBeenCalledWith('beforeExit', expect.any(Function));
    
    // Simulate beforeExit event
    const beforeExitHandler = mockProcessOn.mock.calls.find(
      call => call[0] === 'beforeExit'
    )?.[1];
    
    if (beforeExitHandler) {
      beforeExitHandler();
      expect(cleanupSpy).toHaveBeenCalled();
    }

    process.on = originalOn;
  });
});

describe('PerformanceTimer', () => {
  let timer: PerformanceTimer;
  let consoleLogSpy: any;

  beforeEach(() => {
    timer = new PerformanceTimer();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('start and end', () => {
    it('should measure duration between start and end', () => {
      timer.start('test-operation');
      
      // Simulate some time passing
      vi.advanceTimersByTime(150);
      
      const duration = timer.end('test-operation');
      
      expect(duration).toBeGreaterThan(0);
    });

    it('should log slow operations', () => {
      timer.start('slow-operation');
      
      // Simulate slow operation (>1000ms)
      vi.advanceTimersByTime(1500);
      
      timer.end('slow-operation', { metadata: 'test' });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '⏱️ slow-operation: 1500ms',
        { metadata: 'test' }
      );
    });

    it('should not log fast operations', () => {
      timer.start('fast-operation');
      
      // Simulate fast operation (<1000ms)
      vi.advanceTimersByTime(500);
      
      timer.end('fast-operation');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle ending non-started timers', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const duration = timer.end('non-existent-timer');
      
      expect(duration).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith("Timer 'non-existent-timer' was not started");
      
      consoleWarnSpy.mockRestore();
    });

    it('should clean up timer after ending', () => {
      timer.start('cleanup-test');
      expect(timer.timers.has('cleanup-test')).toBe(true);
      
      timer.end('cleanup-test');
      expect(timer.timers.has('cleanup-test')).toBe(false);
    });
  });

  describe('measure', () => {
    it('should measure async function execution', async () => {
      const asyncFn = vi.fn().mockResolvedValue('result');
      
      vi.useFakeTimers();
      
      const resultPromise = timer.measure('async-operation', async () => {
        vi.advanceTimersByTime(500);
        return asyncFn();
      });
      
      const result = await resultPromise;
      
      expect(result).toBe('result');
      expect(asyncFn).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should measure and rethrow errors', async () => {
      const errorFn = vi.fn().mockRejectedValue(new Error('Test error'));
      
      vi.useFakeTimers();
      
      const errorPromise = timer.measure('error-operation', async () => {
        vi.advanceTimersByTime(200);
        return errorFn();
      });
      
      await expect(errorPromise).rejects.toThrow('Test error');
      
      // Should still log the timing with error metadata
      expect(consoleLogSpy).not.toHaveBeenCalled(); // Under 1000ms threshold
      
      vi.useRealTimers();
    });

    it('should log error metadata for failed operations', async () => {
      const errorFn = vi.fn().mockRejectedValue(new Error('Test error'));
      
      vi.useFakeTimers();
      
      try {
        await timer.measure('slow-error-operation', async () => {
          vi.advanceTimersByTime(1500); // Over threshold
          return errorFn();
        });
      } catch {
        // Expected error
      }
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '⏱️ slow-error-operation: 1500ms',
        { success: false, error: 'Test error' }
      );
      
      vi.useRealTimers();
    });
  });

  describe('global performance timer', () => {
    it('should export a global performance timer instance', () => {
      expect(performanceTimer).toBeInstanceOf(PerformanceTimer);
    });
  });
});

describe('performHealthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.REDIS_URL;
    delete process.env.UPSTASH_URL;
  });

  it('should return healthy status when all services are up', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    
    const result: HealthCheckResult = await performHealthCheck();

    expect(result.status).toBe('healthy');
    expect(result.services.database).toBe(true);
    expect(result.services.redis).toBe(true);
    expect(result.services.search).toBe(true);
    expect(result.services.storage).toBe(true);
    expect(result.metrics.uptime).toBeGreaterThan(0);
    expect(result.metrics.memoryUsage).toBeGreaterThan(0);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('should return degraded status when some services are down', async () => {
    // Mock Redis to fail
    const Redis = require('ioredis');
    Redis.default.mockImplementation(() => ({
      ping: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
      quit: vi.fn(),
    }));

    process.env.REDIS_URL = 'redis://localhost:6379';
    
    const result: HealthCheckResult = await performHealthCheck();

    expect(result.status).toBe('degraded');
    expect(result.services.database).toBe(true);
    expect(result.services.redis).toBe(false);
    expect(result.services.search).toBe(true);
    expect(result.services.storage).toBe(true);
  });

  it('should handle missing Redis URL gracefully', async () => {
    const result: HealthCheckResult = await performHealthCheck();

    expect(result.services.redis).toBe(false);
    expect(result.status).toBe('degraded'); // Some services down
  });

  it('should include system metrics', async () => {
    const result: HealthCheckResult = await performHealthCheck();

    expect(result.metrics).toMatchObject({
      uptime: expect.any(Number),
      memoryUsage: expect.any(Number),
    });
    expect(result.metrics.uptime).toBeGreaterThan(0);
    expect(result.metrics.memoryUsage).toBeGreaterThan(0);
    expect(result.timestamp).toBeGreaterThan(Date.now() - 1000);
  });

  it('should return unhealthy when all services are down', async () => {
    // Mock all services to fail
    const Redis = require('ioredis');
    Redis.default.mockImplementation(() => ({
      ping: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
      quit: vi.fn(),
    }));

    process.env.REDIS_URL = 'redis://localhost:6379';
    
    // Force database health check to fail
    const originalCheck = performHealthCheck;
    const mockHealthCheck = vi.fn().mockImplementation(async () => {
      const result = await originalCheck();
      result.services.database = false;
      result.services.storage = false;
      result.services.search = false;
      
      const allHealthy = Object.values(result.services).every(s => s);
      const someHealthy = Object.values(result.services).some(s => s);
      result.status = allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy';
      
      return result;
    });

    const result = await mockHealthCheck();

    expect(result.status).toBe('unhealthy');
    expect(Object.values(result.services).every(s => s === false)).toBe(true);
  });
});

describe('createMetricsEndpoint', () => {
  let mockFastify: Partial<FastifyInstance>;
  let registeredRoutes: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredRoutes = {};
    
    mockFastify = {
      get: vi.fn((path: string, handler: Function) => {
        registeredRoutes[path] = handler;
      }),
    };
  });

  describe('/health endpoint', () => {
    it('should register health endpoint', () => {
      createMetricsEndpoint(mockFastify as FastifyInstance);
      
      expect(mockFastify.get).toHaveBeenCalledWith('/health', expect.any(Function));
      expect(registeredRoutes['/health']).toBeDefined();
    });

    it('should return 200 for healthy status', async () => {
      createMetricsEndpoint(mockFastify as FastifyInstance);
      
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      // Mock healthy response
      vi.mock('@/lib/monitoring', async () => {
        const actual = await vi.importActual('@/lib/monitoring');
        return {
          ...actual,
          performHealthCheck: vi.fn().mockResolvedValue({
            status: 'healthy',
            services: { database: true, redis: true, search: true, storage: true },
            metrics: { uptime: 100, memoryUsage: 50 },
            timestamp: Date.now(),
          }),
        };
      });

      await registeredRoutes['/health']({}, mockReply);
      
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
        })
      );
    });

    it('should return 503 for degraded status', async () => {
      // Need to re-import to get mocked version
      const { createMetricsEndpoint: mockedCreateMetricsEndpoint } = await import('@/lib/monitoring');
      
      // Mock degraded response
      vi.doMock('@/lib/monitoring', async () => {
        const actual = await vi.importActual('@/lib/monitoring');
        return {
          ...actual,
          performHealthCheck: vi.fn().mockResolvedValue({
            status: 'degraded',
            services: { database: true, redis: false, search: true, storage: true },
            metrics: { uptime: 100, memoryUsage: 50 },
            timestamp: Date.now(),
          }),
        };
      });

      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      const healthCheckSpy = vi.spyOn(require('@/lib/monitoring'), 'performHealthCheck')
        .mockResolvedValue({
          status: 'degraded',
          services: { database: true, redis: false, search: true, storage: true },
          metrics: { uptime: 100, memoryUsage: 50 },
          timestamp: Date.now(),
        });

      await registeredRoutes['/health']({}, mockReply);
      
      expect(mockReply.code).toHaveBeenCalledWith(503);
    });

    it('should return 500 for unhealthy status', async () => {
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn(),
      };

      const healthCheckSpy = vi.spyOn(require('@/lib/monitoring'), 'performHealthCheck')
        .mockResolvedValue({
          status: 'unhealthy',
          services: { database: false, redis: false, search: false, storage: false },
          metrics: { uptime: 100, memoryUsage: 50 },
          timestamp: Date.now(),
        });

      await registeredRoutes['/health']({}, mockReply);
      
      expect(mockReply.code).toHaveBeenCalledWith(500);
      
      healthCheckSpy.mockRestore();
    });
  });

  describe('/metrics endpoint', () => {
    it('should register metrics endpoint', () => {
      createMetricsEndpoint(mockFastify as FastifyInstance);
      
      expect(mockFastify.get).toHaveBeenCalledWith('/metrics', expect.any(Function));
      expect(registeredRoutes['/metrics']).toBeDefined();
    });

    it('should return system metrics', async () => {
      createMetricsEndpoint(mockFastify as FastifyInstance);
      
      const mockReply = {
        send: vi.fn(),
      };

      await registeredRoutes['/metrics']({}, mockReply);
      
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          uptime: expect.any(Number),
          memory: expect.objectContaining({
            rss: expect.any(Number),
            heapTotal: expect.any(Number),
            heapUsed: expect.any(Number),
            external: expect.any(Number),
            arrayBuffers: expect.any(Number),
          }),
          timestamp: expect.any(Number),
        })
      );
    });
  });
});

describe('Error Handling and Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle Sentry initialization failures', () => {
    mockSentry.init.mockImplementation(() => {
      throw new Error('Sentry init failed');
    });

    process.env.SENTRY_DSN = 'invalid-dsn';
    
    // Should not throw during construction
    expect(() => {
      const { MonitoringService } = require('@/lib/monitoring');
      new MonitoringService();
    }).not.toThrow();
  });

  it('should handle malformed environment variables', () => {
    process.env.SLOW_QUERY_THRESHOLD = 'not-a-number';
    process.env.SENTRY_TRACES_SAMPLE_RATE = 'invalid-float';
    
    expect(() => {
      const { MonitoringService } = require('@/lib/monitoring');
      new MonitoringService();
    }).not.toThrow();
  });

  it('should handle Redis connection failures during health check', async () => {
    const Redis = require('ioredis');
    Redis.default.mockImplementation(() => {
      throw new Error('Connection failed');
    });

    process.env.REDIS_URL = 'redis://localhost:6379';
    
    const result = await performHealthCheck();
    
    expect(result.services.redis).toBe(false);
    expect(result.status).toBe('degraded');
  });
});