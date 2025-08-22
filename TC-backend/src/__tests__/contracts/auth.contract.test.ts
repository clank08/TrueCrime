import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { authRouter } from '@/routers/auth.router';
import { authService } from '@/services/auth.service';
import { TestFactory } from '@/test/factories';
import { TestUtils } from '@/test/utils';
import type { inferProcedureInput, inferProcedureOutput } from '@trpc/server';

/**
 * API Contract Tests for Authentication Router
 * 
 * These tests ensure that the tRPC API contracts match the expected
 * input/output schemas and that responses maintain consistent structure.
 */

// Type inference helpers for better type checking
type AuthRouter = typeof authRouter;
type RegisterInput = inferProcedureInput<AuthRouter['register']>;
type RegisterOutput = inferProcedureOutput<AuthRouter['register']>;
type LoginInput = inferProcedureInput<AuthRouter['login']>;
type LoginOutput = inferProcedureOutput<AuthRouter['login']>;

describe('Auth API Contract Tests', () => {
  let testContext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    testContext = TestUtils.createUnauthenticatedContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Input Schema Validation', () => {
    describe('register endpoint', () => {
      it('should accept valid registration input', async () => {
        const validInput: RegisterInput = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'John Doe',
        };

        const mockResult = TestFactory.createAuthResult();
        (authService.registerUser as any).mockResolvedValue(mockResult);

        const caller = authRouter.createCaller(testContext);
        
        // Should not throw validation error
        await expect(caller.register(validInput)).resolves.toBeDefined();
      });

      it('should reject invalid email format', async () => {
        const invalidInput = {
          email: 'not-an-email',
          password: 'TestPassword123!',
        };

        const caller = authRouter.createCaller(testContext);
        
        await expect(caller.register(invalidInput))
          .rejects.toThrow(/email/i);
      });

      it('should reject weak passwords', async () => {
        const weakPasswordInput = {
          email: 'test@example.com',
          password: 'weak',
        };

        const caller = authRouter.createCaller(testContext);
        
        await expect(caller.register(weakPasswordInput))
          .rejects.toThrow(/password/i);
      });

      it('should reject passwords without required character types', async () => {
        const testCases = [
          { password: 'alllowercase123', description: 'no uppercase' },
          { password: 'ALLUPPERCASE123', description: 'no lowercase' },
          { password: 'NoNumbersHere!', description: 'no numbers' },
          { password: 'OnlyLettersAndNumbers123', description: 'no special characters (optional)' },
        ];

        const caller = authRouter.createCaller(testContext);

        for (const { password, description } of testCases.slice(0, 3)) { // Test first 3 (special chars are optional)
          await expect(caller.register({
            email: 'test@example.com',
            password,
          })).rejects.toThrow(/password/i);
        }
      });

      it('should trim and normalize string inputs', async () => {
        const inputWithSpaces = {
          email: '  test@example.com  ',
          password: 'TestPassword123!',
          firstName: '  John  ',
          lastName: '  Doe  ',
        };

        const mockResult = TestFactory.createAuthResult();
        (authService.registerUser as any).mockResolvedValue(mockResult);

        const caller = authRouter.createCaller(testContext);
        await caller.register(inputWithSpaces);

        expect(authService.registerUser).toHaveBeenCalledWith({
          email: 'test@example.com', // Trimmed and lowercased
          password: 'TestPassword123!',
          firstName: 'John', // Trimmed
          lastName: 'Doe', // Trimmed
        });
      });

      it('should handle optional fields correctly', async () => {
        const minimalInput = {
          email: 'test@example.com',
          password: 'TestPassword123!',
        };

        const mockResult = TestFactory.createAuthResult();
        (authService.registerUser as any).mockResolvedValue(mockResult);

        const caller = authRouter.createCaller(testContext);
        await caller.register(minimalInput);

        expect(authService.registerUser).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });
      });

      it('should enforce field length limits', async () => {
        const tooLongInput = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          firstName: 'A'.repeat(51), // Over 50 character limit
          lastName: 'B'.repeat(51), // Over 50 character limit
          displayName: 'C'.repeat(101), // Over 100 character limit
        };

        const caller = authRouter.createCaller(testContext);
        
        await expect(caller.register(tooLongInput))
          .rejects.toThrow();
      });
    });

    describe('login endpoint', () => {
      it('should accept valid login input', async () => {
        const validInput: LoginInput = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          rememberMe: false,
        };

        const mockResult = TestFactory.createAuthResult();
        (authService.loginUser as any).mockResolvedValue(mockResult);

        const caller = authRouter.createCaller(testContext);
        
        await expect(caller.login(validInput)).resolves.toBeDefined();
      });

      it('should default rememberMe to false', async () => {
        const inputWithoutRememberMe = {
          email: 'test@example.com',
          password: 'TestPassword123!',
        };

        const mockResult = TestFactory.createAuthResult();
        (authService.loginUser as any).mockResolvedValue(mockResult);

        const caller = authRouter.createCaller(testContext);
        await caller.login(inputWithoutRememberMe);

        expect(authService.loginUser).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'TestPassword123!',
          rememberMe: false,
        });
      });

      it('should require email and password', async () => {
        const caller = authRouter.createCaller(testContext);

        await expect(caller.login({
          email: 'test@example.com',
          // Missing password
        } as any)).rejects.toThrow();

        await expect(caller.login({
          password: 'TestPassword123!',
          // Missing email
        } as any)).rejects.toThrow();
      });
    });

    describe('other endpoint inputs', () => {
      it('should validate password reset input', async () => {
        const validInput = { email: 'test@example.com' };
        const invalidInput = { email: 'not-an-email' };

        (authService.requestPasswordReset as any).mockResolvedValue(undefined);

        const caller = authRouter.createCaller(testContext);

        await expect(caller.requestPasswordReset(validInput))
          .resolves.toBeDefined();

        await expect(caller.requestPasswordReset(invalidInput))
          .rejects.toThrow(/email/i);
      });

      it('should validate password reset confirmation input', async () => {
        const validInput = {
          token: 'valid-token',
          newPassword: 'NewPassword123!',
        };

        const invalidInputs = [
          { token: '', newPassword: 'NewPassword123!' }, // Empty token
          { token: 'valid-token', newPassword: 'weak' }, // Weak password
        ];

        (authService.confirmPasswordReset as any).mockResolvedValue(undefined);

        const caller = authRouter.createCaller(testContext);

        await expect(caller.confirmPasswordReset(validInput))
          .resolves.toBeDefined();

        for (const input of invalidInputs) {
          await expect(caller.confirmPasswordReset(input))
            .rejects.toThrow();
        }
      });

      it('should validate refresh token input', async () => {
        const validInput = { refreshToken: 'valid-refresh-token' };
        const invalidInput = { refreshToken: '' }; // Empty token

        const mockTokens = TestUtils.generateTestTokens();
        (authService.refreshTokens as any).mockResolvedValue(mockTokens);

        const caller = authRouter.createCaller(testContext);

        await expect(caller.refresh(validInput))
          .resolves.toBeDefined();

        await expect(caller.refresh(invalidInput))
          .rejects.toThrow();
      });

      it('should validate email verification input', async () => {
        const validInput = { token: 'verification-token' };
        const invalidInput = { token: '' }; // Empty token

        (authService.verifyEmail as any).mockResolvedValue(undefined);

        const caller = authRouter.createCaller(testContext);

        await expect(caller.verifyEmail(validInput))
          .resolves.toBeDefined();

        await expect(caller.verifyEmail(invalidInput))
          .rejects.toThrow();
      });
    });
  });

  describe('Output Schema Validation', () => {
    describe('authentication response structure', () => {
      it('should return consistent auth response structure', async () => {
        const mockResult = TestFactory.createAuthResult();
        (authService.registerUser as any).mockResolvedValue(mockResult);

        const caller = authRouter.createCaller(testContext);
        const result: RegisterOutput = await caller.register({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });

        // Validate response structure
        expect(result).toHaveProperty('user');
        expect(result).toHaveProperty('tokens');
        expect(result).toHaveProperty('session');

        // Validate user object structure
        expect(result.user).toHaveProperty('id');
        expect(result.user).toHaveProperty('email');
        expect(result.user).toHaveProperty('firstName');
        expect(result.user).toHaveProperty('lastName');
        expect(result.user).toHaveProperty('displayName');
        expect(result.user).toHaveProperty('emailVerified');
        expect(result.user).toHaveProperty('isActive');
        expect(result.user).toHaveProperty('createdAt');

        // Validate tokens object structure
        expect(result.tokens).toHaveProperty('accessToken');
        expect(result.tokens).toHaveProperty('refreshToken');
        expect(result.tokens).toHaveProperty('expiresAt');
        expect(result.tokens).toHaveProperty('refreshExpiresAt');

        // Validate session object structure
        expect(result.session).toHaveProperty('id');
        expect(result.session).toHaveProperty('expiresAt');

        // Validate data types
        expect(typeof result.user.id).toBe('string');
        expect(typeof result.user.email).toBe('string');
        expect(typeof result.user.emailVerified).toBe('boolean');
        expect(typeof result.user.isActive).toBe('boolean');
        expect(result.user.createdAt).toBeInstanceOf(Date);
        expect(result.tokens.expiresAt).toBeInstanceOf(Date);
        expect(result.tokens.refreshExpiresAt).toBeInstanceOf(Date);
      });

      it('should handle null values in user profile correctly', async () => {
        const mockResult = TestFactory.createAuthResult({
          firstName: null,
          lastName: null,
          displayName: null,
          avatar: null,
          lastLoginAt: null,
        });
        (authService.loginUser as any).mockResolvedValue(mockResult);

        const caller = authRouter.createCaller(testContext);
        const result: LoginOutput = await caller.login({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });

        expect(result.user.firstName).toBeNull();
        expect(result.user.lastName).toBeNull();
        expect(result.user.displayName).toBeNull();
        expect(result.user.avatar).toBeNull();
        expect(result.user.lastLoginAt).toBeNull();
      });

      it('should include preferences in response when available', async () => {
        const mockResult = TestFactory.createAuthResult();
        (authService.registerUser as any).mockResolvedValue(mockResult);

        const caller = authRouter.createCaller(testContext);
        const result: RegisterOutput = await caller.register({
          email: 'test@example.com',
          password: 'TestPassword123!',
        });

        if (result.user.preferences) {
          expect(result.user.preferences).toHaveProperty('theme');
          expect(result.user.preferences).toHaveProperty('emailNotifications');
          expect(result.user.preferences).toHaveProperty('pushNotifications');
          expect(typeof result.user.preferences.emailNotifications).toBe('boolean');
          expect(typeof result.user.preferences.pushNotifications).toBe('boolean');
        }
      });
    });

    describe('message response structure', () => {
      it('should return consistent message structure for password reset', async () => {
        (authService.requestPasswordReset as any).mockResolvedValue(undefined);

        const caller = authRouter.createCaller(testContext);
        const result = await caller.requestPasswordReset({
          email: 'test@example.com',
        });

        expect(result).toHaveProperty('message');
        expect(typeof result.message).toBe('string');
        expect(result.message.length).toBeGreaterThan(0);
      });

      it('should return consistent message structure for email verification', async () => {
        (authService.verifyEmail as any).mockResolvedValue(undefined);

        const caller = authRouter.createCaller(testContext);
        const result = await caller.verifyEmail({
          token: 'verification-token',
        });

        expect(result).toHaveProperty('message');
        expect(typeof result.message).toBe('string');
        expect(result.message.length).toBeGreaterThan(0);
      });
    });

    describe('token response structure', () => {
      it('should return consistent token structure for refresh', async () => {
        const mockTokens = TestUtils.generateTestTokens();
        (authService.refreshTokens as any).mockResolvedValue(mockTokens);

        const caller = authRouter.createCaller(testContext);
        const result = await caller.refresh({
          refreshToken: 'valid-refresh-token',
        });

        expect(result).toHaveProperty('accessToken');
        expect(result).toHaveProperty('refreshToken');
        expect(result).toHaveProperty('expiresAt');
        expect(result).toHaveProperty('refreshExpiresAt');

        expect(typeof result.accessToken).toBe('string');
        expect(typeof result.refreshToken).toBe('string');
        expect(result.expiresAt).toBeInstanceOf(Date);
        expect(result.refreshExpiresAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Protected Endpoint Contracts', () => {
    beforeEach(() => {
      const mockUser = TestFactory.createUserWithPreferences();
      testContext = TestUtils.createAuthenticatedContext(mockUser);
    });

    describe('me endpoint', () => {
      it('should return complete user profile structure', async () => {
        const caller = authRouter.createCaller(testContext);
        const result = await caller.me();

        // Validate all expected fields are present
        const expectedFields = [
          'id', 'email', 'firstName', 'lastName', 'displayName', 'avatar',
          'emailVerified', 'isActive', 'createdAt', 'lastLoginAt', 'lastActivityAt',
          'preferences'
        ];

        expectedFields.forEach(field => {
          expect(result).toHaveProperty(field);
        });

        // Validate preferences structure if present
        if (result.preferences) {
          const expectedPreferenceFields = [
            'theme', 'emailNotifications', 'pushNotifications', 'weeklyDigest',
            'newContentAlerts', 'socialNotifications', 'explicitContent',
            'contentWarnings', 'autoplayTrailers', 'recommendBasedOnFriends',
            'includeWatchedContent', 'language', 'region', 'compactMode'
          ];

          expectedPreferenceFields.forEach(field => {
            expect(result.preferences).toHaveProperty(field);
          });
        }
      });
    });

    describe('sessions endpoint', () => {
      it('should return consistent session array structure', async () => {
        const mockSessions = TestFactory.createUserSessions('user-123', 3);
        (authService.getUserSessions as any).mockResolvedValue(mockSessions);

        const caller = authRouter.createCaller(testContext);
        const result = await caller.sessions();

        expect(Array.isArray(result)).toBe(true);

        if (result.length > 0) {
          const session = result[0];
          const expectedFields = [
            'id', 'deviceInfo', 'userAgent', 'ipAddress', 'location',
            'isActive', 'createdAt', 'lastActivityAt', 'expiresAt', 'isCurrent'
          ];

          expectedFields.forEach(field => {
            expect(session).toHaveProperty(field);
          });

          expect(typeof session.isCurrent).toBe('boolean');
          expect(session.createdAt).toBeInstanceOf(Date);
          expect(session.lastActivityAt).toBeInstanceOf(Date);
          expect(session.expiresAt).toBeInstanceOf(Date);
        }
      });
    });
  });

  describe('Error Response Contracts', () => {
    it('should return consistent error structure for validation errors', async () => {
      const caller = authRouter.createCaller(testContext);

      try {
        await caller.register({
          email: 'invalid-email',
          password: 'weak',
        });
      } catch (error: any) {
        // Should be a validation error with specific structure
        expect(error).toHaveProperty('code');
        expect(error).toHaveProperty('message');
        expect(typeof error.message).toBe('string');
      }
    });

    it('should return consistent error structure for business logic errors', async () => {
      (authService.loginUser as any).mockRejectedValue(
        new Error('Invalid email or password')
      );

      const caller = authRouter.createCaller(testContext);

      try {
        await caller.login({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        });
      } catch (error: any) {
        expect(error).toHaveProperty('message');
        expect(typeof error.message).toBe('string');
      }
    });
  });

  describe('API Version Compatibility', () => {
    it('should maintain backward compatibility for core auth fields', async () => {
      const mockResult = TestFactory.createAuthResult();
      (authService.registerUser as any).mockResolvedValue(mockResult);

      const caller = authRouter.createCaller(testContext);
      const result = await caller.register({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      // These fields should always be present for backward compatibility
      const coreFields = ['id', 'email', 'emailVerified', 'isActive', 'createdAt'];
      coreFields.forEach(field => {
        expect(result.user).toHaveProperty(field);
      });

      const coreTokenFields = ['accessToken', 'refreshToken', 'expiresAt'];
      coreTokenFields.forEach(field => {
        expect(result.tokens).toHaveProperty(field);
      });
    });

    it('should handle optional new fields gracefully', async () => {
      // Future fields should be optional and not break existing clients
      const mockResult = TestFactory.createAuthResult();
      (authService.registerUser as any).mockResolvedValue(mockResult);

      const caller = authRouter.createCaller(testContext);
      const result = await caller.register({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      // Should not fail if new optional fields are added
      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
    });
  });

  describe('Data Type Consistency', () => {
    it('should maintain consistent date serialization', async () => {
      const mockResult = TestFactory.createAuthResult();
      (authService.registerUser as any).mockResolvedValue(mockResult);

      const caller = authRouter.createCaller(testContext);
      const result = await caller.register({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      // All date fields should be Date objects
      expect(result.user.createdAt).toBeInstanceOf(Date);
      expect(result.tokens.expiresAt).toBeInstanceOf(Date);
      expect(result.tokens.refreshExpiresAt).toBeInstanceOf(Date);
      expect(result.session.expiresAt).toBeInstanceOf(Date);
    });

    it('should maintain consistent boolean serialization', async () => {
      const mockResult = TestFactory.createAuthResult();
      (authService.registerUser as any).mockResolvedValue(mockResult);

      const caller = authRouter.createCaller(testContext);
      const result = await caller.register({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      // Boolean fields should be actual booleans, not strings
      expect(typeof result.user.emailVerified).toBe('boolean');
      expect(typeof result.user.isActive).toBe('boolean');
      
      if (result.user.preferences) {
        expect(typeof result.user.preferences.emailNotifications).toBe('boolean');
        expect(typeof result.user.preferences.pushNotifications).toBe('boolean');
      }
    });

    it('should handle null values consistently', async () => {
      const mockResult = TestFactory.createAuthResult({
        firstName: null,
        lastName: null,
        avatar: null,
        lastLoginAt: null,
      });
      (authService.registerUser as any).mockResolvedValue(mockResult);

      const caller = authRouter.createCaller(testContext);
      const result = await caller.register({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      // Null values should be properly serialized as null, not undefined
      expect(result.user.firstName).toBeNull();
      expect(result.user.lastName).toBeNull();
      expect(result.user.avatar).toBeNull();
      expect(result.user.lastLoginAt).toBeNull();
    });
  });
});