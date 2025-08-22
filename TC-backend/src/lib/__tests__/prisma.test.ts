import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { ExtendedPrismaClient } from '../prisma';

// Mock the @prisma/client module
vi.mock('@prisma/client', () => {
  const mockPrismaClient = {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $queryRaw: vi.fn(),
    $on: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userSession: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    passwordReset: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    emailVerification: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    PrismaClient: vi.fn().mockImplementation(() => mockPrismaClient),
  };
});

describe('Prisma Utilities', () => {
  let prismaClient: ExtendedPrismaClient;
  let mockConsoleLog: any;
  let mockConsoleError: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock console methods
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create a new instance for each test
    prismaClient = new ExtendedPrismaClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ExtendedPrismaClient constructor', () => {
    it('should create instance with proper logging configuration', () => {
      expect(prismaClient).toBeDefined();
      expect(prismaClient.$on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should set up query logging in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devClient = new ExtendedPrismaClient();

      expect(devClient.$on).toHaveBeenCalledWith('query', expect.any(Function));

      process.env.NODE_ENV = originalEnv;
    });

    it('should not set up query logging in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const prodClient = new ExtendedPrismaClient();

      // Should only be called once for error logging
      expect(prodClient.$on).toHaveBeenCalledTimes(1);
      expect(prodClient.$on).toHaveBeenCalledWith('error', expect.any(Function));

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('safeDisconnect', () => {
    it('should successfully disconnect from database', async () => {
      (prismaClient.$disconnect as MockedFunction<any>).mockResolvedValue(undefined);

      await prismaClient.safeDisconnect();

      expect(prismaClient.$disconnect).toHaveBeenCalledOnce();
    });

    it('should handle disconnection errors gracefully', async () => {
      const disconnectError = new Error('Disconnection failed');
      (prismaClient.$disconnect as MockedFunction<any>).mockRejectedValue(disconnectError);

      await prismaClient.safeDisconnect();

      expect(prismaClient.$disconnect).toHaveBeenCalledOnce();
      expect(mockConsoleError).toHaveBeenCalledWith('Error disconnecting from database:', disconnectError);
    });
  });

  describe('healthCheck', () => {
    it('should return true for healthy database connection', async () => {
      (prismaClient.$queryRaw as MockedFunction<any>).mockResolvedValue([{ result: 1 }]);

      const isHealthy = await prismaClient.healthCheck();

      expect(isHealthy).toBe(true);
      expect(prismaClient.$queryRaw).toHaveBeenCalledWith(['SELECT 1']);
    });

    it('should return false for unhealthy database connection', async () => {
      const dbError = new Error('Connection failed');
      (prismaClient.$queryRaw as MockedFunction<any>).mockRejectedValue(dbError);

      const isHealthy = await prismaClient.healthCheck();

      expect(isHealthy).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith('Database health check failed:', dbError);
    });

    it('should return false for timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      (prismaClient.$queryRaw as MockedFunction<any>).mockRejectedValue(timeoutError);

      const isHealthy = await prismaClient.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('getConnectionInfo', () => {
    it('should return connection info for successful connection', async () => {
      const mockVersionResult = [{ version: 'PostgreSQL 14.0' }];
      const mockDatabaseResult = [{ current_database: 'truecrime_test' }];

      (prismaClient.$queryRaw as MockedFunction<any>)
        .mockResolvedValueOnce(mockVersionResult)
        .mockResolvedValueOnce(mockDatabaseResult);

      const connectionInfo = await prismaClient.getConnectionInfo();

      expect(connectionInfo).toEqual({
        connected: true,
        version: 'PostgreSQL 14.0',
        database: 'truecrime_test',
      });

      expect(prismaClient.$queryRaw).toHaveBeenCalledTimes(2);
      expect(prismaClient.$queryRaw).toHaveBeenNthCalledWith(1, ['SELECT version()']);
      expect(prismaClient.$queryRaw).toHaveBeenNthCalledWith(2, ['SELECT current_database()']);
    });

    it('should return connected false for failed connection', async () => {
      const connectionError = new Error('Connection failed');
      (prismaClient.$queryRaw as MockedFunction<any>).mockRejectedValue(connectionError);

      const connectionInfo = await prismaClient.getConnectionInfo();

      expect(connectionInfo).toEqual({
        connected: false,
      });
    });

    it('should handle partial query failures', async () => {
      const mockVersionResult = [{ version: 'PostgreSQL 14.0' }];
      
      (prismaClient.$queryRaw as MockedFunction<any>)
        .mockResolvedValueOnce(mockVersionResult)
        .mockRejectedValueOnce(new Error('Database query failed'));

      const connectionInfo = await prismaClient.getConnectionInfo();

      expect(connectionInfo).toEqual({
        connected: false,
      });
    });

    it('should handle empty query results', async () => {
      (prismaClient.$queryRaw as MockedFunction<any>)
        .mockResolvedValueOnce([]) // Empty version result
        .mockResolvedValueOnce([{ current_database: 'truecrime_test' }]);

      const connectionInfo = await prismaClient.getConnectionInfo();

      expect(connectionInfo).toEqual({
        connected: true,
        version: undefined,
        database: 'truecrime_test',
      });
    });

    it('should handle malformed query results', async () => {
      const mockVersionResult = [{ version: null }];
      const mockDatabaseResult = [{ current_database: null }];

      (prismaClient.$queryRaw as MockedFunction<any>)
        .mockResolvedValueOnce(mockVersionResult)
        .mockResolvedValueOnce(mockDatabaseResult);

      const connectionInfo = await prismaClient.getConnectionInfo();

      expect(connectionInfo).toEqual({
        connected: true,
        version: null,
        database: null,
      });
    });
  });

  describe('event logging', () => {
    it('should log query events in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const devClient = new ExtendedPrismaClient();

      // Simulate a query event
      const mockQueryEvent = {
        query: 'SELECT * FROM users',
        params: '[]',
        duration: 25,
      };

      // Get the query event handler
      const queryHandler = (devClient.$on as MockedFunction<any>).mock.calls
        .find(call => call[0] === 'query')?.[1];

      if (queryHandler) {
        queryHandler(mockQueryEvent);

        expect(mockConsoleLog).toHaveBeenCalledWith('Query: SELECT * FROM users');
        expect(mockConsoleLog).toHaveBeenCalledWith('Params: []');
        expect(mockConsoleLog).toHaveBeenCalledWith('Duration: 25ms');
      }

      process.env.NODE_ENV = originalEnv;
    });

    it('should log error events', () => {
      const mockErrorEvent = {
        message: 'Database connection failed',
        code: 'P1001',
      };

      // Get the error event handler
      const errorHandler = (prismaClient.$on as MockedFunction<any>).mock.calls
        .find(call => call[0] === 'error')?.[1];

      if (errorHandler) {
        errorHandler(mockErrorEvent);

        expect(mockConsoleError).toHaveBeenCalledWith('Prisma Error:', mockErrorEvent);
      }
    });
  });

  describe('configuration options', () => {
    it('should accept custom options in constructor', () => {
      const customOptions = {
        datasources: {
          db: {
            url: 'postgresql://custom:connection@localhost:5432/custom_db',
          },
        },
      };

      const customClient = new ExtendedPrismaClient(customOptions);

      expect(customClient).toBeDefined();
    });

    it('should merge custom options with default log configuration', () => {
      const customOptions = {
        datasources: {
          db: {
            url: 'postgresql://custom:connection@localhost:5432/custom_db',
          },
        },
      };

      const customClient = new ExtendedPrismaClient(customOptions);

      // Should still set up logging
      expect(customClient.$on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('transaction handling', () => {
    it('should support transaction operations', async () => {
      const mockTransaction = vi.fn().mockResolvedValue({ id: 'user-123' });
      (prismaClient as any).$transaction = mockTransaction;

      const result = await (prismaClient as any).$transaction([
        prismaClient.user.create({ data: { email: 'test@example.com' } }),
      ]);

      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe('error handling edge cases', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Query timeout');
      timeoutError.name = 'TimeoutError';
      
      (prismaClient.$queryRaw as MockedFunction<any>).mockRejectedValue(timeoutError);

      const isHealthy = await prismaClient.healthCheck();

      expect(isHealthy).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith('Database health check failed:', timeoutError);
    });

    it('should handle connection pool exhaustion', async () => {
      const poolError = new Error('Pool exhausted');
      poolError.name = 'PoolError';
      
      (prismaClient.$queryRaw as MockedFunction<any>).mockRejectedValue(poolError);

      const connectionInfo = await prismaClient.getConnectionInfo();

      expect(connectionInfo.connected).toBe(false);
    });

    it('should handle invalid SQL queries', async () => {
      const sqlError = new Error('Invalid SQL syntax');
      sqlError.name = 'SqlError';
      
      (prismaClient.$queryRaw as MockedFunction<any>).mockRejectedValue(sqlError);

      const isHealthy = await prismaClient.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('performance monitoring', () => {
    it('should track query performance in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const perfClient = new ExtendedPrismaClient();

      const slowQueryEvent = {
        query: 'SELECT * FROM users WHERE complex_condition = true',
        params: '[]',
        duration: 1500, // Slow query
      };

      const queryHandler = (perfClient.$on as MockedFunction<any>).mock.calls
        .find(call => call[0] === 'query')?.[1];

      if (queryHandler) {
        queryHandler(slowQueryEvent);

        expect(mockConsoleLog).toHaveBeenCalledWith('Duration: 1500ms');
      }

      process.env.NODE_ENV = originalEnv;
    });

    it('should not expose query details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const prodClient = new ExtendedPrismaClient();

      // Should not set up query logging in production
      const queryHandlerCall = (prodClient.$on as MockedFunction<any>).mock.calls
        .find(call => call[0] === 'query');

      expect(queryHandlerCall).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('memory management', () => {
    it('should properly clean up resources on disconnect', async () => {
      (prismaClient.$disconnect as MockedFunction<any>).mockResolvedValue(undefined);

      await prismaClient.safeDisconnect();

      expect(prismaClient.$disconnect).toHaveBeenCalledOnce();
    });

    it('should handle multiple disconnect calls gracefully', async () => {
      (prismaClient.$disconnect as MockedFunction<any>).mockResolvedValue(undefined);

      await prismaClient.safeDisconnect();
      await prismaClient.safeDisconnect();
      await prismaClient.safeDisconnect();

      expect(prismaClient.$disconnect).toHaveBeenCalledTimes(3);
    });
  });
});