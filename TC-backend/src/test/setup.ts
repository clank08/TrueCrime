import { vi } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only-minimum-256-bits';
process.env.JWT_REFRESH_SECRET = 'test-refresh-jwt-secret-for-testing-purposes-only-different';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock external dependencies
vi.mock('@/lib/prisma', () => {
  const createMockPrismaInstance = () => {
    const instance = {
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      $queryRaw: vi.fn(),
      $on: vi.fn(),
      healthCheck: vi.fn().mockResolvedValue(true),
      getConnectionInfo: vi.fn().mockResolvedValue({
        connected: true,
        version: 'PostgreSQL 14.0',
        database: 'test_db',
      }),
      safeDisconnect: vi.fn().mockImplementation(function() {
        return this.$disconnect();
      }),
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
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
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      emailVerification: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      userPreferences: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    return instance;
  };

  const MockExtendedPrismaClient = vi.fn().mockImplementation(() => {
    const instance = createMockPrismaInstance();
    
    // Simulate the constructor behavior
    // Always set up error logging
    instance.$on('error', vi.fn());
    
    // Set up query logging only in development
    if (process.env.NODE_ENV === 'development') {
      instance.$on('query', vi.fn());
    }
    
    return instance;
  });

  return {
    prisma: createMockPrismaInstance(),
    ExtendedPrismaClient: MockExtendedPrismaClient,
  };
});

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: vi.fn(),
        updateUserById: vi.fn(),
        deleteUser: vi.fn(),
        listUsers: vi.fn(),
        getUserById: vi.fn(),
      },
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      setSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      verifyOtp: vi.fn(),
      signInWithOAuth: vi.fn(),
      exchangeCodeForSession: vi.fn(),
    },
  })),
}));

// Mock the supabase utility module
vi.mock('@/lib/supabase', async () => {
  const actual = await vi.importActual('@/lib/supabase');
  return {
    ...actual,
    supabaseAdmin: {
      auth: {
        admin: {
          createUser: vi.fn(),
          updateUserById: vi.fn(),
          deleteUser: vi.fn(),
          listUsers: vi.fn(),
          getUserById: vi.fn(),
        },
      },
    },
    supabaseClient: {
      auth: {
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        getUser: vi.fn(),
        setSession: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        verifyOtp: vi.fn(),
        signInWithOAuth: vi.fn(),
        exchangeCodeForSession: vi.fn(),
      },
    },
    createUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUserFromToken: vi.fn(),
    updateUserPassword: vi.fn(),
    updateUserMetadata: vi.fn(),
    deleteUser: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    verifyEmailToken: vi.fn(),
    emailExists: vi.fn(),
    generateVerificationToken: vi.fn(),
    isValidJWTFormat: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithApple: vi.fn(),
    handleOAuthCallback: vi.fn(),
    mapSupabaseError: vi.fn(),
  };
});

// Global test utilities
global.console = {
  ...console,
  // Suppress console.error in tests unless explicitly testing error logging
  error: vi.fn(),
  warn: vi.fn(),
};

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});