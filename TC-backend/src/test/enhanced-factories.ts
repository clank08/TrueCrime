import { vi } from 'vitest';
import { TestFactory, faker } from './factories';
import type { User, UserPreferences } from '@prisma/client';

/**
 * Enhanced factory methods for complex testing scenarios
 */
export class EnhancedTestFactory extends TestFactory {
  /**
   * Create a comprehensive test dataset with realistic relationships
   */
  static createTestDataset(options: {
    userCount?: number;
    contentCount?: number;
    includeInactiveUsers?: boolean;
    includeUnverifiedUsers?: boolean;
    includeExpiredSessions?: boolean;
  } = {}) {
    const {
      userCount = 10,
      contentCount = 50,
      includeInactiveUsers = true,
      includeUnverifiedUsers = true,
      includeExpiredSessions = true,
    } = options;

    // Create users with different states
    const activeUsers = Array.from({ length: Math.floor(userCount * 0.7) }, () =>
      this.createUser({
        isActive: true,
        emailVerified: true,
        lastActivityAt: faker.date.recent({ days: 7 }),
      })
    );

    const inactiveUsers = includeInactiveUsers
      ? Array.from({ length: Math.floor(userCount * 0.2) }, () =>
          this.createUser({
            isActive: false,
            lastActivityAt: faker.date.past({ years: 1 }),
          })
        )
      : [];

    const unverifiedUsers = includeUnverifiedUsers
      ? Array.from({ length: Math.floor(userCount * 0.1) }, () =>
          this.createUser({
            emailVerified: false,
            emailVerifiedAt: null,
          })
        )
      : [];

    const allUsers = [...activeUsers, ...inactiveUsers, ...unverifiedUsers];

    // Create user preferences for all users
    const preferences = allUsers.map(user =>
      this.createUserPreferences({ userId: user.id })
    );

    // Create sessions with various states
    const activeSessions = allUsers
      .filter(user => user.isActive)
      .flatMap(user =>
        Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () =>
          this.createUserSession({
            userId: user.id,
            isActive: true,
            lastActivityAt: faker.date.recent({ days: 1 }),
            expiresAt: faker.date.future(),
          })
        )
      );

    const expiredSessions = includeExpiredSessions
      ? allUsers.slice(0, 5).map(user =>
          this.createUserSession({
            userId: user.id,
            isActive: false,
            expiresAt: faker.date.past(),
          })
        )
      : [];

    // Create content with various types and states
    const content = Array.from({ length: contentCount }, (_, index) => ({
      id: faker.string.uuid(),
      title: `Test Content ${index + 1}`,
      description: `Description for test content ${index + 1}`,
      type: faker.helpers.arrayElement(['movie', 'series', 'documentary', 'podcast']),
      year: faker.number.int({ min: 1990, max: 2024 }),
      rating: faker.number.int({ min: 1, max: 5 }),
      genres: faker.helpers.arrayElement([
        ['True Crime'],
        ['True Crime', 'Documentary'],
        ['True Crime', 'Mystery'],
        ['Crime', 'Drama'],
      ]),
      platforms: faker.helpers.arrayElement([
        ['Netflix'],
        ['Amazon Prime', 'Hulu'],
        ['Netflix', 'HBO Max'],
        ['Discovery+', 'Investigation Discovery'],
      ]),
      metadata: {
        episodes: faker.number.int({ min: 1, max: 20 }),
        seasons: faker.number.int({ min: 1, max: 5 }),
        runtime: faker.number.int({ min: 30, max: 120 }),
      },
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    }));

    return {
      users: allUsers,
      preferences,
      sessions: [...activeSessions, ...expiredSessions],
      content,
      activeUsers,
      inactiveUsers,
      unverifiedUsers,
      activeSessions,
      expiredSessions,
    };
  }

  /**
   * Create realistic content data for different true crime categories
   */
  static createTrueCrimeContent() {
    const serialKillers = [
      'Ted Bundy', 'Jeffrey Dahmer', 'John Wayne Gacy', 'Ed Gein', 'Charles Manson',
      'Richard Ramirez', 'Dennis Rader', 'Gary Ridgway', 'Edmund Kemper', 'Aileen Wuornos'
    ];

    const cases = [
      'The Golden State Killer', 'Zodiac Killer', 'Jack the Ripper', 'Black Dahlia',
      'JonBenét Ramsey', 'OJ Simpson', 'Casey Anthony', 'Scott Peterson', 'Steven Avery'
    ];

    return Array.from({ length: 100 }, (_, index) => {
      const isSerialKiller = index < 30;
      const subject = isSerialKiller 
        ? faker.helpers.arrayElement(serialKillers)
        : faker.helpers.arrayElement(cases);

      return {
        id: faker.string.uuid(),
        title: `${subject}: ${faker.helpers.arrayElement([
          'The Complete Story',
          'Conversations with a Killer',
          'Mind of a Serial Killer',
          'The Investigation',
          'Unsolved Mystery',
          'Case Files',
          'Documentary Series'
        ])}`,
        description: `An in-depth look at ${subject} and the investigation that ${
          faker.helpers.arrayElement(['brought justice', 'shocked the nation', 'remains unsolved'])
        }.`,
        type: faker.helpers.arrayElement(['series', 'movie', 'documentary']),
        year: faker.number.int({ min: 2010, max: 2024 }),
        rating: faker.number.int({ min: 3, max: 5 }),
        genres: ['True Crime', ...faker.helpers.arrayElement([
          ['Documentary'],
          ['Mystery', 'Thriller'],
          ['Crime', 'Drama'],
          ['Investigation']
        ])],
        platforms: faker.helpers.arrayElement([
          ['Netflix'],
          ['Amazon Prime Video'],
          ['Hulu'],
          ['HBO Max'],
          ['Discovery+'],
          ['Investigation Discovery'],
          ['Netflix', 'Amazon Prime Video'],
          ['Hulu', 'Investigation Discovery']
        ]),
        metadata: {
          subject,
          category: isSerialKiller ? 'serial-killer' : 'true-crime-case',
          episodes: faker.number.int({ min: 1, max: 10 }),
          seasons: faker.number.int({ min: 1, max: 3 }),
          runtime: faker.number.int({ min: 45, max: 90 }),
          keywords: [
            subject.toLowerCase(),
            'true crime',
            faker.helpers.arrayElement(['investigation', 'murder', 'mystery', 'killer', 'case'])
          ],
          verified: faker.datatype.boolean(),
          popularity: faker.number.int({ min: 1, max: 100 }),
        },
        createdAt: faker.date.past({ years: 2 }),
        updatedAt: faker.date.recent({ days: 30 }),
      };
    });
  }

  /**
   * Create test users with different subscription levels and engagement patterns
   */
  static createDiverseUserBase(count: number = 50) {
    const userTypes = [
      {
        type: 'casual',
        weight: 0.4,
        traits: {
          lastActivityAt: faker.date.recent({ days: 14 }),
          emailNotifications: false,
          weeklyDigest: true,
          avgSessionDuration: { min: 15, max: 45 }, // minutes
        }
      },
      {
        type: 'engaged',
        weight: 0.35,
        traits: {
          lastActivityAt: faker.date.recent({ days: 3 }),
          emailNotifications: true,
          weeklyDigest: true,
          avgSessionDuration: { min: 45, max: 120 },
        }
      },
      {
        type: 'power',
        weight: 0.2,
        traits: {
          lastActivityAt: faker.date.recent({ days: 1 }),
          emailNotifications: true,
          weeklyDigest: true,
          avgSessionDuration: { min: 120, max: 240 },
        }
      },
      {
        type: 'dormant',
        weight: 0.05,
        traits: {
          lastActivityAt: faker.date.past({ years: 1 }),
          emailNotifications: false,
          weeklyDigest: false,
          avgSessionDuration: { min: 5, max: 15 },
        }
      }
    ];

    const users = [];
    let userIndex = 0;

    for (const userType of userTypes) {
      const userCount = Math.floor(count * userType.weight);
      
      for (let i = 0; i < userCount; i++) {
        const user = this.createUser({
          email: `${userType.type}user${userIndex++}@example.com`,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          lastActivityAt: userType.traits.lastActivityAt,
          isActive: userType.type !== 'dormant',
          emailVerified: userType.type !== 'dormant',
        });

        const preferences = this.createUserPreferences({
          userId: user.id,
          emailNotifications: userType.traits.emailNotifications,
          weeklyDigest: userType.traits.weeklyDigest,
        });

        users.push({
          ...user,
          preferences,
          userType: userType.type,
          avgSessionDuration: faker.number.int(userType.traits.avgSessionDuration),
        });
      }
    }

    return users;
  }

  /**
   * Create test data for performance testing scenarios
   */
  static createPerformanceTestData(options: {
    userCount?: number;
    contentCount?: number;
    searchQueries?: number;
    sessionCount?: number;
  } = {}) {
    const {
      userCount = 1000,
      contentCount = 5000,
      searchQueries = 100,
      sessionCount = 2000,
    } = options;

    // Create users efficiently
    const users = Array.from({ length: userCount }, (_, index) => ({
      id: `perf-user-${index}`,
      email: `perfuser${index}@example.com`,
      firstName: `User${index}`,
      lastName: 'Test',
      hashedPassword: 'hashed-password',
      isActive: true,
      emailVerified: index % 10 !== 0, // 10% unverified
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Create content efficiently
    const content = Array.from({ length: contentCount }, (_, index) => ({
      id: `perf-content-${index}`,
      title: `Performance Test Content ${index}`,
      description: `Test content for performance testing ${index}`,
      type: ['movie', 'series', 'documentary'][index % 3],
      rating: (index % 5) + 1,
      genres: ['True Crime'],
      platforms: ['Netflix', 'Amazon Prime'][index % 2],
      year: 2020 + (index % 5),
    }));

    // Create diverse search queries
    const searchTerms = [
      'Ted Bundy', 'serial killer', 'true crime', 'documentary', 'investigation',
      'murder mystery', 'cold case', 'forensic', 'detective', 'criminal minds',
      'Netflix true crime', 'unsolved', 'killer', 'crime scene', 'FBI'
    ];

    const queries = Array.from({ length: searchQueries }, (_, index) => ({
      query: faker.helpers.arrayElement(searchTerms),
      filters: index % 3 === 0 ? {
        type: faker.helpers.arrayElement(['movie', 'series', 'documentary']),
        year: 2020 + (index % 5),
      } : undefined,
      page: Math.floor(index / 20) + 1,
      limit: [10, 20, 50][index % 3],
    }));

    // Create sessions for performance testing
    const sessions = Array.from({ length: sessionCount }, (_, index) => ({
      id: `perf-session-${index}`,
      userId: `perf-user-${index % userCount}`,
      sessionToken: `session-token-${index}`,
      refreshToken: `refresh-token-${index}`,
      isActive: index % 20 !== 0, // 5% inactive
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date(),
    }));

    return {
      users,
      content,
      searchQueries,
      sessions,
    };
  }

  /**
   * Create test data for edge case testing
   */
  static createEdgeCaseData() {
    return {
      // Users with edge case properties
      users: [
        // User with minimal valid data
        this.createUser({
          firstName: 'A',
          lastName: 'B',
          displayName: null,
          avatar: null,
        }),
        
        // User with maximum length data
        this.createUser({
          firstName: 'A'.repeat(50),
          lastName: 'B'.repeat(50),
          displayName: 'Very Long Display Name That Tests Maximum Length Limits',
        }),
        
        // User with special characters
        this.createUser({
          firstName: 'José',
          lastName: 'O\'Connor-Smith',
          displayName: 'José O\'Connor-Smith Jr. III',
          email: 'test+special.chars_123@example.co.uk',
        }),
        
        // Recently created user
        this.createUser({
          createdAt: new Date(Date.now() - 1000), // 1 second ago
          updatedAt: new Date(),
          lastActivityAt: new Date(),
        }),
        
        // User from far in the past
        this.createUser({
          createdAt: new Date('2020-01-01'),
          updatedAt: new Date('2020-01-01'),
          lastActivityAt: new Date('2020-01-01'),
        }),
      ],

      // Content with edge cases
      content: [
        // Content with minimal data
        {
          id: faker.string.uuid(),
          title: 'A',
          type: 'movie',
          genres: ['Crime'],
          platforms: ['Test'],
          year: 1900,
          rating: 0,
        },
        
        // Content with maximum data
        {
          id: faker.string.uuid(),
          title: 'Very Long Content Title That Tests Maximum Length Constraints And Boundary Conditions',
          description: 'A'.repeat(2000),
          type: 'series',
          genres: ['True Crime', 'Documentary', 'Mystery', 'Thriller', 'Drama'],
          platforms: Array.from({ length: 10 }, (_, i) => `Platform${i + 1}`),
          year: 2024,
          rating: 10,
          metadata: {
            episodes: 1000,
            seasons: 100,
            runtime: 600,
            cast: Array.from({ length: 50 }, (_, i) => `Actor ${i + 1}`),
            largeData: 'X'.repeat(10000),
          },
        },
        
        // Content with special characters and unicode
        {
          id: faker.string.uuid(),
          title: 'Café Müller: Die Geheimnisse des 🔍 Détective',
          description: 'Content with émojis 🎭 and spéciàl chàràctérs',
          type: 'documentary',
          genres: ['Crímenes Reales'],
          platforms: ['Plataforma Ñ'],
        },
        
        // Content with empty arrays
        {
          id: faker.string.uuid(),
          title: 'Empty Arrays Test',
          type: 'podcast',
          genres: [],
          platforms: [],
        },
      ],

      // Edge case inputs for testing validation
      validationEdgeCases: {
        emails: [
          'a@b.co',                           // Minimal valid email
          'very.long.email.address.that.tests.maximum.length.limits@example.com',
          'test+tag@example.com',             // Email with plus
          'test.email+tag+sorting@example.com',
          'test_email-with-dashes@example.co.uk',
        ],
        
        passwords: [
          'A1b2C3d!',                         // Minimal valid password
          'A'.repeat(72) + '1!',              // Very long password
          'Pássw0rd!',                        // Password with unicode
          'Test!@#$%^&*()_+-=[]{}|;:,.<>?',  // Password with many special chars
        ],
        
        searchQueries: [
          'a',                                // Single character
          'search query with many words that tests the maximum length limit',
          '123456789',                        // Numeric query
          'émojis 🔍 and unicode ñ',         // Unicode search
          'UPPERCASE SEARCH',                 // All caps
          'mixed CaSe SeArCh',               // Mixed case
        ],
        
        ids: [
          '00000000-0000-0000-0000-000000000000', // All zeros UUID
          'ffffffff-ffff-ffff-ffff-ffffffffffff', // All Fs UUID
          '123e4567-e89b-12d3-a456-426614174000', // Standard test UUID
        ],
      },
    };
  }

  /**
   * Create mock external service responses
   */
  static createMockServiceResponses() {
    return {
      supabase: {
        auth: {
          signInWithPassword: vi.fn().mockImplementation(({ email, password }) => {
            if (email === 'valid@example.com' && password === 'ValidPassword123!') {
              return {
                data: {
                  user: {
                    id: faker.string.uuid(),
                    email,
                    email_confirmed_at: new Date().toISOString(),
                  },
                  session: {
                    access_token: 'mock-access-token',
                    refresh_token: 'mock-refresh-token',
                    expires_at: Math.floor(Date.now() / 1000) + 3600,
                  },
                },
                error: null,
              };
            }
            return {
              data: { user: null, session: null },
              error: { message: 'Invalid credentials' },
            };
          }),

          signUp: vi.fn().mockImplementation(({ email, password }) => {
            return {
              data: {
                user: {
                  id: faker.string.uuid(),
                  email,
                  email_confirmed_at: null,
                },
                session: null,
              },
              error: null,
            };
          }),

          signOut: vi.fn().mockResolvedValue({ error: null }),
        },

        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: this.createUser(),
            error: null,
          }),
        }),
      },

      meilisearch: {
        search: vi.fn().mockImplementation((query) => {
          const mockResults = this.createTrueCrimeContent()
            .filter(content => 
              content.title.toLowerCase().includes(query.toLowerCase()) ||
              content.description.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 20);

          return {
            hits: mockResults.map((hit, index) => ({
              ...hit,
              _rankingScore: 1 - (index * 0.1),
            })),
            estimatedTotalHits: mockResults.length,
            query,
            processingTimeMs: faker.number.int({ min: 1, max: 50 }),
          };
        }),

        addDocuments: vi.fn().mockResolvedValue({
          taskUid: faker.number.int({ min: 1, max: 1000 }),
        }),

        updateDocuments: vi.fn().mockResolvedValue({
          taskUid: faker.number.int({ min: 1, max: 1000 }),
        }),

        deleteDocuments: vi.fn().mockResolvedValue({
          taskUid: faker.number.int({ min: 1, max: 1000 }),
        }),
      },

      redis: {
        get: vi.fn().mockImplementation((key) => {
          // Simulate cache hits/misses
          return Math.random() > 0.3 ? JSON.stringify({ cached: true, key }) : null;
        }),

        set: vi.fn().mockResolvedValue('OK'),
        del: vi.fn().mockResolvedValue(1),
        exists: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(1),
        keys: vi.fn().mockResolvedValue([]),
        flushall: vi.fn().mockResolvedValue('OK'),
      },

      monitoring: {
        captureException: vi.fn(),
        captureMessage: vi.fn(),
        setUser: vi.fn(),
        setTag: vi.fn(),
        setContext: vi.fn(),
        addBreadcrumb: vi.fn(),
        
        startTransaction: vi.fn().mockReturnValue({
          setName: vi.fn(),
          setData: vi.fn(),
          setTag: vi.fn(),
          finish: vi.fn(),
        }),
      },

      email: {
        send: vi.fn().mockResolvedValue({
          id: faker.string.uuid(),
          status: 'sent',
        }),

        sendPasswordReset: vi.fn().mockResolvedValue({
          id: faker.string.uuid(),
          status: 'sent',
          recipient: faker.internet.email(),
        }),

        sendVerification: vi.fn().mockResolvedValue({
          id: faker.string.uuid(),
          status: 'sent',
          recipient: faker.internet.email(),
        }),
      },
    };
  }

  /**
   * Create comprehensive test scenarios for different workflows
   */
  static createTestScenarios() {
    return {
      userRegistration: [
        {
          name: 'successful registration',
          input: this.createRegistrationInput(),
          expectedOutcome: 'success',
          shouldCreateUser: true,
          shouldSendVerification: true,
        },
        {
          name: 'duplicate email registration',
          input: this.createRegistrationInput({ email: 'existing@example.com' }),
          expectedOutcome: 'error',
          expectedError: 'User already exists',
        },
        {
          name: 'invalid email registration',
          input: this.createRegistrationInput({ email: 'invalid-email' }),
          expectedOutcome: 'validation_error',
          expectedError: 'Invalid email',
        },
        {
          name: 'weak password registration',
          input: this.createRegistrationInput({ password: 'weak' }),
          expectedOutcome: 'validation_error',
          expectedError: 'Password too weak',
        },
      ],

      userLogin: [
        {
          name: 'successful login',
          input: this.createLoginInput({ email: 'valid@example.com' }),
          expectedOutcome: 'success',
          shouldCreateSession: true,
          shouldUpdateLastLogin: true,
        },
        {
          name: 'invalid credentials',
          input: this.createLoginInput({ email: 'invalid@example.com', password: 'wrong' }),
          expectedOutcome: 'error',
          expectedError: 'Invalid credentials',
        },
        {
          name: 'unverified user login',
          input: this.createLoginInput({ email: 'unverified@example.com' }),
          expectedOutcome: 'error',
          expectedError: 'Email not verified',
        },
        {
          name: 'suspended user login',
          input: this.createLoginInput({ email: 'suspended@example.com' }),
          expectedOutcome: 'error',
          expectedError: 'Account suspended',
        },
      ],

      contentSearch: [
        {
          name: 'basic search',
          input: { query: 'Ted Bundy', page: 1, limit: 20 },
          expectedOutcome: 'success',
          expectedResultCount: { min: 1, max: 20 },
        },
        {
          name: 'search with filters',
          input: { 
            query: 'serial killer', 
            filters: { type: 'series', year: 2023 },
            page: 1, 
            limit: 10 
          },
          expectedOutcome: 'success',
        },
        {
          name: 'empty search query',
          input: { query: '', page: 1, limit: 20 },
          expectedOutcome: 'validation_error',
        },
        {
          name: 'pagination beyond results',
          input: { query: 'nonexistent', page: 100, limit: 20 },
          expectedOutcome: 'success',
          expectedResultCount: { min: 0, max: 0 },
        },
      ],

      rateLimit: [
        {
          name: 'within rate limit',
          requestCount: 10,
          timeWindow: 60000, // 1 minute
          expectedOutcome: 'success',
          expectedSuccessRate: 1.0,
        },
        {
          name: 'exceeding rate limit',
          requestCount: 100,
          timeWindow: 60000,
          expectedOutcome: 'partial_success',
          expectedSuccessRate: 0.3, // 30 requests allowed
        },
        {
          name: 'burst requests',
          requestCount: 50,
          timeWindow: 1000, // 1 second
          expectedOutcome: 'rate_limited',
          expectedSuccessRate: 0.1,
        },
      ],
    };
  }
}

// Export utility functions for test setup and teardown
export const TestSetup = {
  /**
   * Set up test environment with mocks
   */
  async setupTestEnvironment(options: {
    mockDatabase?: boolean;
    mockCache?: boolean;
    mockSearch?: boolean;
    mockEmail?: boolean;
    mockMonitoring?: boolean;
  } = {}) {
    const mocks = EnhancedTestFactory.createMockServiceResponses();

    if (options.mockDatabase !== false) {
      // Mock Prisma client
      vi.doMock('@/lib/prisma', () => ({
        prisma: {
          user: {
            create: mocks.supabase.from().insert,
            findUnique: mocks.supabase.from().single,
            findMany: vi.fn().mockResolvedValue([]),
            update: mocks.supabase.from().update,
            delete: mocks.supabase.from().delete,
          },
          $connect: vi.fn(),
          $disconnect: vi.fn(),
        },
      }));
    }

    if (options.mockCache !== false) {
      vi.doMock('@/lib/cache', () => ({
        cache: {
          get: mocks.redis.get,
          set: mocks.redis.set,
          del: mocks.redis.del,
          flush: mocks.redis.flushall,
        },
      }));
    }

    if (options.mockSearch !== false) {
      vi.doMock('@/lib/search', () => ({
        searchClient: mocks.meilisearch,
      }));
    }

    return mocks;
  },

  /**
   * Clean up test environment
   */
  async teardownTestEnvironment() {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.restoreAllMocks();
  },

  /**
   * Create isolated test context
   */
  createIsolatedContext() {
    return {
      beforeEach: async () => {
        vi.clearAllMocks();
      },
      afterEach: async () => {
        // Cleanup any test-specific data
      },
    };
  },
};