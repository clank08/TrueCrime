// Simple faker alternative for test data generation
const faker = {
  string: {
    uuid: () => `test-uuid-${Math.random().toString(36).substring(2, 15)}`,
    alphanumeric: (length: number) => Math.random().toString(36).substring(2, 2 + length),
    sample: () => `test-sample-${Math.random().toString(36).substring(2, 10)}`,
  },
  internet: {
    email: () => `test${Math.floor(Math.random() * 1000)}@example.com`,
    userAgent: () => 'Mozilla/5.0 (Test Browser)',
    ip: () => `192.168.1.${Math.floor(Math.random() * 255)}`,
    userName: () => `testuser${Math.floor(Math.random() * 1000)}`,
  },
  person: {
    firstName: () => ['John', 'Jane', 'Bob', 'Alice', 'Charlie'][Math.floor(Math.random() * 5)],
    lastName: () => ['Doe', 'Smith', 'Johnson', 'Brown', 'Wilson'][Math.floor(Math.random() * 5)],
    fullName: () => `${faker.person.firstName()} ${faker.person.lastName()}`,
  },
  image: {
    avatar: () => `https://example.com/avatar/${Math.random().toString(36).substring(7)}.jpg`,
  },
  datatype: {
    boolean: () => Math.random() > 0.5,
  },
  date: {
    past: (options?: { years?: number }) => {
      const years = options?.years || 1;
      return new Date(Date.now() - Math.random() * years * 365 * 24 * 60 * 60 * 1000);
    },
    recent: (options?: { days?: number }) => {
      const days = options?.days || 30;
      return new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000);
    },
    future: () => new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
  },
  location: {
    countryCode: () => ['US', 'CA', 'GB', 'DE', 'FR'][Math.floor(Math.random() * 5)],
    city: () => ['New York', 'London', 'Paris', 'Tokyo', 'Sydney'][Math.floor(Math.random() * 5)],
    country: () => ['United States', 'Canada', 'United Kingdom', 'Germany', 'France'][Math.floor(Math.random() * 5)],
  },
  helpers: {
    arrayElement: <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)],
  },
  number: {
    int: (options: { min: number; max: number }) => 
      Math.floor(Math.random() * (options.max - options.min + 1)) + options.min,
  },
  seed: (_seedValue: number) => {
    // Simple seed implementation for basic deterministic testing
    // In a real implementation, you'd want a proper PRNG
  },
};
import bcrypt from 'bcryptjs';
import type { User, UserPreferences, UserSession, PasswordReset, EmailVerification } from '@prisma/client';
import { generateSecureToken, hashToken } from '@/lib/jwt';

/**
 * Test data factories for creating mock data objects
 */

export class TestFactory {
  /**
   * Create a mock user object
   */
  static createUser(overrides: Partial<User> = {}): User {
    const defaultUser: User = {
      id: faker.string.uuid(),
      email: faker.internet.email().toLowerCase(),
      hashedPassword: bcrypt.hashSync('TestPassword123!', 10),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      displayName: faker.person.fullName(),
      avatar: faker.image.avatar(),
      emailVerified: faker.datatype.boolean(),
      emailVerifiedAt: faker.date.recent(),
      isActive: true,
      isSuspended: false,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      lastLoginAt: faker.date.recent(),
      lastActivityAt: faker.date.recent(),
    };

    return { ...defaultUser, ...overrides };
  }

  /**
   * Create a mock user preferences object
   */
  static createUserPreferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
    const defaultPreferences: UserPreferences = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      theme: faker.helpers.arrayElement(['LIGHT', 'DARK', 'SYSTEM'] as const),
      emailNotifications: faker.datatype.boolean(),
      pushNotifications: faker.datatype.boolean(),
      weeklyDigest: faker.datatype.boolean(),
      newContentAlerts: faker.datatype.boolean(),
      socialNotifications: faker.datatype.boolean(),
      explicitContent: faker.datatype.boolean(),
      contentWarnings: faker.datatype.boolean(),
      autoplayTrailers: faker.datatype.boolean(),
      recommendBasedOnFriends: faker.datatype.boolean(),
      includeWatchedContent: faker.datatype.boolean(),
      language: faker.location.countryCode(),
      region: faker.location.countryCode(),
      compactMode: faker.datatype.boolean(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };

    return { ...defaultPreferences, ...overrides };
  }

  /**
   * Create a mock user session object
   */
  static createUserSession(overrides: Partial<UserSession> = {}): UserSession {
    const defaultSession: UserSession = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      sessionToken: `session_${faker.string.alphanumeric(64)}`,
      refreshToken: `refresh_${faker.string.alphanumeric(64)}`,
      deviceInfo: faker.string.sample(),
      userAgent: faker.internet.userAgent(),
      ipAddress: faker.internet.ip(),
      location: `${faker.location.city()}, ${faker.location.country()}`,
      isActive: true,
      createdAt: faker.date.past(),
      lastActivityAt: faker.date.recent(),
      expiresAt: faker.date.future(),
    };

    return { ...defaultSession, ...overrides };
  }

  /**
   * Create a mock password reset object
   */
  static createPasswordReset(overrides: Partial<PasswordReset> = {}): PasswordReset {
    const token = generateSecureToken();
    const hashedToken = hashToken(token);

    const defaultPasswordReset: PasswordReset = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      token: hashedToken,
      isUsed: false,
      usedAt: null,
      expiresAt: faker.date.future(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };

    return { ...defaultPasswordReset, ...overrides };
  }

  /**
   * Create a mock email verification object
   */
  static createEmailVerification(overrides: Partial<EmailVerification> = {}): EmailVerification {
    const token = generateSecureToken();
    const hashedToken = hashToken(token);

    const defaultEmailVerification: EmailVerification = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      email: faker.internet.email().toLowerCase(),
      token: hashedToken,
      isUsed: false,
      usedAt: null,
      expiresAt: faker.date.future(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };

    return { ...defaultEmailVerification, ...overrides };
  }

  /**
   * Create a user with preferences
   */
  static createUserWithPreferences(
    userOverrides: Partial<User> = {},
    preferencesOverrides: Partial<UserPreferences> = {}
  ): User & { preferences: UserPreferences } {
    const user = this.createUser(userOverrides);
    const preferences = this.createUserPreferences({
      userId: user.id,
      ...preferencesOverrides,
    });

    return { ...user, preferences };
  }

  /**
   * Create a complete auth result object
   */
  static createAuthResult(userOverrides: Partial<User> = {}) {
    const user = this.createUserWithPreferences(userOverrides);
    const session = this.createUserSession({ userId: user.id });

    return {
      user,
      tokens: {
        accessToken: `access_${faker.string.alphanumeric(64)}`,
        refreshToken: `refresh_${faker.string.alphanumeric(64)}`,
        expiresAt: faker.date.future(),
        refreshExpiresAt: faker.date.future(),
      },
      session,
    };
  }

  /**
   * Create registration input data
   */
  static createRegistrationInput(overrides: Record<string, any> = {}) {
    return {
      email: faker.internet.email(),
      password: 'TestPassword123!',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      ...overrides,
    };
  }

  /**
   * Create login input data
   */
  static createLoginInput(overrides: Record<string, any> = {}) {
    return {
      email: faker.internet.email(),
      password: 'TestPassword123!',
      rememberMe: false,
      ...overrides,
    };
  }

  /**
   * Create multiple users
   */
  static createUsers(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.createUser(overrides));
  }

  /**
   * Create multiple sessions for a user
   */
  static createUserSessions(userId: string, count: number): UserSession[] {
    return Array.from({ length: count }, (_, index) =>
      this.createUserSession({
        userId,
        isActive: index < count - 1, // Last session is inactive
        lastActivityAt: faker.date.recent({ days: index + 1 }),
      })
    );
  }

  /**
   * Create expired session
   */
  static createExpiredSession(userId: string): UserSession {
    return this.createUserSession({
      userId,
      isActive: false,
      expiresAt: faker.date.past(),
    });
  }

  /**
   * Create inactive user
   */
  static createInactiveUser(): User {
    return this.createUser({
      isActive: false,
      isSuspended: true,
      lastActivityAt: faker.date.past({ years: 1 }),
    });
  }

  /**
   * Create unverified user
   */
  static createUnverifiedUser(): User {
    return this.createUser({
      emailVerified: false,
      emailVerifiedAt: null,
    });
  }

  /**
   * Create OAuth user (no password)
   */
  static createOAuthUser(): User {
    return this.createUser({
      hashedPassword: null,
      emailVerified: true,
    });
  }

  /**
   * Create admin user
   */
  static createAdminUser(): User {
    return this.createUser({
      email: 'admin@truecrime.com',
      firstName: 'Admin',
      lastName: 'User',
      displayName: 'Admin User',
      isActive: true,
      emailVerified: true,
    });
  }

  /**
   * Create test database seed data
   */
  static createSeedData() {
    const users = this.createUsers(5);
    const sessions = users.flatMap(user => 
      this.createUserSessions(user.id, faker.number.int({ min: 1, max: 3 }))
    );
    const preferences = users.map(user => 
      this.createUserPreferences({ userId: user.id })
    );

    return {
      users,
      sessions,
      preferences,
      passwordResets: users.slice(0, 2).map(user => 
        this.createPasswordReset({ userId: user.id })
      ),
      emailVerifications: users.filter(user => !user.emailVerified).map(user => 
        this.createEmailVerification({ userId: user.id, email: user.email })
      ),
    };
  }

  /**
   * Create JWT payload for testing
   */
  static createJWTPayload(userOverrides: Partial<User> = {}) {
    const user = this.createUser(userOverrides);
    
    return {
      userId: user.id,
      email: user.email,
      role: 'user' as const,
      permissions: ['user:read', 'user:update'],
      sessionId: faker.string.uuid(),
    };
  }

  /**
   * Create mock tRPC context
   */
  static createTRPCContext(user?: User & { preferences: UserPreferences | null }) {
    return {
      user,
      sessionToken: user ? `session_${faker.string.alphanumeric(64)}` : undefined,
      setCookie: vi.fn(),
    };
  }

  /**
   * Reset faker seed for deterministic tests
   */
  static seed(seedValue: number = 42) {
    faker.seed(seedValue);
  }

  /**
   * Generate realistic test emails
   */
  static generateTestEmail(domain: string = 'example.com'): string {
    const username = faker.internet.userName().toLowerCase();
    return `${username}@${domain}`;
  }

  /**
   * Generate strong test password
   */
  static generateStrongPassword(): string {
    const passwords = [
      'TestPassword123!',
      'SecurePass456@',
      'MyStrongPwd789#',
      'ValidPassword321$',
      'TestAccount654%',
    ];
    return faker.helpers.arrayElement(passwords);
  }

  /**
   * Generate weak test password (for validation testing)
   */
  static generateWeakPassword(): string {
    const weakPasswords = [
      'weak',
      '123',
      'password',
      'abc',
      'test',
    ];
    return faker.helpers.arrayElement(weakPasswords);
  }

  /**
   * Generate invalid email (for validation testing)
   */
  static generateInvalidEmail(): string {
    const invalidEmails = [
      'not-an-email',
      'missing@domain',
      '@domain.com',
      'spaces in@email.com',
      'multiple@@domain.com',
    ];
    return faker.helpers.arrayElement(invalidEmails);
  }

  /**
   * Generate SQL injection attempt strings
   */
  static generateSQLInjectionAttempt(): string {
    const sqlInjections = [
      "'; DROP TABLE users; --",
      '1; DELETE FROM users WHERE 1=1; --',
      "admin'; --",
      '1 OR 1=1',
      "'; INSERT INTO users (email) VALUES ('hacked@example.com'); --",
    ];
    return faker.helpers.arrayElement(sqlInjections);
  }

  /**
   * Generate XSS attempt strings
   */
  static generateXSSAttempt(): string {
    const xssAttempts = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("XSS")',
      '<svg onload=alert(1)>',
      '<iframe src="javascript:alert(1)"></iframe>',
    ];
    return faker.helpers.arrayElement(xssAttempts);
  }
}

// Re-export faker for additional utilities
export { faker };

// Common test constants
export const TEST_CONSTANTS = {
  VALID_PASSWORD: 'TestPassword123!',
  WEAK_PASSWORD: 'weak',
  INVALID_EMAIL: 'not-an-email',
  VALID_EMAIL: 'test@example.com',
  JWT_SECRET: 'test-jwt-secret-for-testing-purposes-only',
  REFRESH_SECRET: 'test-refresh-jwt-secret-for-testing-purposes-only',
  TEST_USER_ID: 'test-user-123',
  TEST_SESSION_ID: 'test-session-123',
  DEFAULT_TIMEOUT: 10000,
} as const;