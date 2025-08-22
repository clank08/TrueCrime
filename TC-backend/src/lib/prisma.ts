import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

// Extend PrismaClient with custom methods
class ExtendedPrismaClient extends PrismaClient<
  Prisma.PrismaClientOptions,
  'query' | 'info' | 'warn' | 'error'
> {
  constructor(options?: Prisma.PrismaClientOptions) {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
      ...options,
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query', (e) => {
        console.log('Query: ' + e.query);
        console.log('Params: ' + e.params);
        console.log('Duration: ' + e.duration + 'ms');
      });
    }

    // Log errors
    this.$on('error', (e) => {
      console.error('Prisma Error:', e);
    });
  }

  /**
   * Safely disconnect from the database
   */
  async safeDisconnect(): Promise<void> {
    try {
      await this.$disconnect();
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
  }

  /**
   * Check if the database connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get database connection info
   */
  async getConnectionInfo(): Promise<{
    connected: boolean;
    version?: string;
    database?: string;
  }> {
    try {
      const result = await this.$queryRaw<[{ version: string }]>`SELECT version()`;
      const dbResult = await this.$queryRaw<[{ current_database: string }]>`SELECT current_database()`;
      
      return {
        connected: true,
        version: result[0]?.version,
        database: dbResult[0]?.current_database,
      };
    } catch (error) {
      return { connected: false };
    }
  }
}

// Global Prisma instance with connection management
declare global {
  var __prisma: ExtendedPrismaClient | undefined;
}

// Singleton pattern for Prisma client
const prisma = globalThis.__prisma ?? new ExtendedPrismaClient();

// In development, store the client in global to prevent hot reload issues
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down Prisma client...');
  await prisma.safeDisconnect();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export { prisma, ExtendedPrismaClient };

// Export commonly used types
export type {
  User,
  UserPreferences,
  UserSession,
  AuthProvider,
  PasswordReset,
  EmailVerification,
  ContentTracking,
  UserInterest,
  UserFollow,
  PrivacyLevel,
  Theme,
  ContentType,
  WatchStatus,
} from '@prisma/client';

// Export Prisma types for advanced usage
export type { Prisma } from '@prisma/client';