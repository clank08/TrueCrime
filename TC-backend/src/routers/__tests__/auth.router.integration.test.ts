import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { TRPCError } from '@trpc/server';
import { authRouter } from '../auth.router';
import { authService } from '@/services/auth.service';
import type { AuthResult } from '@/services/auth.service';
import type { User, UserPreferences } from '@prisma/client';

// Mock the auth service
vi.mock('@/services/auth.service', () => ({
  authService: {
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    refreshTokens: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
    verifyEmail: vi.fn(),
    logoutUser: vi.fn(),
    getUserFromSession: vi.fn(),
    sendEmailVerification: vi.fn(),
    getUserSessions: vi.fn(),
    revokeUserSession: vi.fn(),
  },
}));

describe('Auth Router Integration Tests', () => {
  let mockContext: {
    user?: User & { preferences: UserPreferences | null };
    sessionToken?: string;
    setCookie?: (name: string, value: string, options?: any) => void;
  };

  const mockUser: User & { preferences: UserPreferences | null } = {
    id: 'user-123',
    email: 'test@example.com',
    hashedPassword: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    displayName: 'Test User',
    avatar: null,
    emailVerified: true,
    emailVerifiedAt: new Date(),
    isActive: true,
    isSuspended: false,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    lastActivityAt: new Date(),
    preferences: {
      id: 'pref-123',
      userId: 'user-123',
      theme: 'DARK' as const,
      emailNotifications: true,
      pushNotifications: true,
      weeklyDigest: true,
      newContentAlerts: true,
      socialNotifications: true,
      explicitContent: false,
      contentWarnings: true,
      autoplayTrailers: true,
      recommendBasedOnFriends: true,
      includeWatchedContent: false,
      language: 'en',
      region: 'US',
      compactMode: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockTokens = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-123',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  const mockSession = {
    id: 'session-123',
    userId: 'user-123',
    sessionToken: 'session-token-123',
    refreshToken: 'refresh-token-123',
    deviceInfo: null,
    userAgent: null,
    ipAddress: null,
    location: null,
    isActive: true,
    createdAt: new Date(),
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockContext = {
      setCookie: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Public Endpoints', () => {
    describe('register', () => {
      it('should successfully register a new user', async () => {
        const registerInput = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
        };

        const mockAuthResult: AuthResult = {
          user: mockUser,
          tokens: mockTokens,
          session: mockSession,
        };

        (authService.registerUser as any).mockResolvedValue(mockAuthResult);

        const caller = authRouter.createCaller(mockContext);
        const result = await caller.register(registerInput);

        expect(authService.registerUser).toHaveBeenCalledWith({
          email: registerInput.email,
          password: registerInput.password,
          firstName: registerInput.firstName,
          lastName: registerInput.lastName,
        });

        expect(result.user.id).toBe(mockUser.id);
        expect(result.user.email).toBe(mockUser.email);
        expect(result.tokens).toBeDefined();
        expect(result.session).toBeDefined();
        expect(mockContext.setCookie).toHaveBeenCalledWith(
          'session',
          mockTokens.accessToken,
          expect.objectContaining({
            httpOnly: true,
            sameSite: 'lax',
          })
        );
      });

      it('should handle registration errors', async () => {
        const registerInput = {
          email: 'test@example.com',
          password: 'TestPassword123!',
        };

        const registrationError = new TRPCError({
          code: 'CONFLICT',
          message: 'User already exists',
        });

        (authService.registerUser as any).mockRejectedValue(registrationError);

        const caller = authRouter.createCaller(mockContext);

        await expect(caller.register(registerInput))
          .rejects.toThrow('User already exists');
      });

      it('should validate input schema', async () => {
        const invalidInput = {
          email: 'invalid-email',
          password: 'weak',
        };

        const caller = authRouter.createCaller(mockContext);

        await expect(caller.register(invalidInput))
          .rejects.toThrow(); // Zod validation error
      });

      it('should handle optional display name', async () => {
        const registerInput = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          displayName: 'Custom Display Name',
        };

        const mockAuthResult: AuthResult = {
          user: mockUser,
          tokens: mockTokens,
          session: mockSession,
        };

        (authService.registerUser as any).mockResolvedValue(mockAuthResult);

        const caller = authRouter.createCaller(mockContext);
        await caller.register(registerInput);

        expect(authService.registerUser).toHaveBeenCalledWith({
          email: registerInput.email,
          password: registerInput.password,
          displayName: registerInput.displayName,
        });
      });
    });

    describe('login', () => {
      it('should successfully login user', async () => {
        const loginInput = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          rememberMe: false,
        };

        const mockAuthResult: AuthResult = {
          user: mockUser,
          tokens: mockTokens,
          session: mockSession,
        };

        (authService.loginUser as any).mockResolvedValue(mockAuthResult);

        const caller = authRouter.createCaller(mockContext);
        const result = await caller.login(loginInput);

        expect(authService.loginUser).toHaveBeenCalledWith(loginInput);
        expect(result.user.id).toBe(mockUser.id);
        expect(result.tokens).toBeDefined();
        expect(mockContext.setCookie).toHaveBeenCalled();
      });

      it('should handle remember me option', async () => {
        const loginInput = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          rememberMe: true,
        };

        const mockAuthResult: AuthResult = {
          user: mockUser,
          tokens: mockTokens,
          session: mockSession,
        };

        (authService.loginUser as any).mockResolvedValue(mockAuthResult);

        const caller = authRouter.createCaller(mockContext);
        await caller.login(loginInput);

        expect(mockContext.setCookie).toHaveBeenCalledWith(
          'session',
          mockTokens.accessToken,
          expect.objectContaining({
            expires: expect.any(Date),
          })
        );
      });

      it('should handle login errors', async () => {
        const loginInput = {
          email: 'test@example.com',
          password: 'wrongpassword',
        };

        const loginError = new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });

        (authService.loginUser as any).mockRejectedValue(loginError);

        const caller = authRouter.createCaller(mockContext);

        await expect(caller.login(loginInput))
          .rejects.toThrow('Invalid credentials');
      });
    });

    describe('requestPasswordReset', () => {
      it('should successfully request password reset', async () => {
        const resetInput = {
          email: 'test@example.com',
        };

        (authService.requestPasswordReset as any).mockResolvedValue(undefined);

        const caller = authRouter.createCaller(mockContext);
        const result = await caller.requestPasswordReset(resetInput);

        expect(authService.requestPasswordReset).toHaveBeenCalledWith(resetInput);
        expect(result.message).toContain('password reset link has been sent');
      });

      it('should always return success message for security', async () => {
        const resetInput = {
          email: 'nonexistent@example.com',
        };

        (authService.requestPasswordReset as any).mockRejectedValue(
          new Error('User not found')
        );

        const caller = authRouter.createCaller(mockContext);
        const result = await caller.requestPasswordReset(resetInput);

        // Should return success message even for errors
        expect(result.message).toContain('password reset link has been sent');
      });
    });

    describe('confirmPasswordReset', () => {
      it('should successfully confirm password reset', async () => {
        const confirmInput = {
          token: 'reset-token-123',
          newPassword: 'NewPassword123!',
        };

        (authService.confirmPasswordReset as any).mockResolvedValue(undefined);

        const caller = authRouter.createCaller(mockContext);
        const result = await caller.confirmPasswordReset(confirmInput);

        expect(authService.confirmPasswordReset).toHaveBeenCalledWith(confirmInput);
        expect(result.message).toContain('password has been successfully reset');
      });

      it('should handle invalid reset tokens', async () => {
        const confirmInput = {
          token: 'invalid-token',
          newPassword: 'NewPassword123!',
        };

        const resetError = new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired reset token',
        });

        (authService.confirmPasswordReset as any).mockRejectedValue(resetError);

        const caller = authRouter.createCaller(mockContext);

        await expect(caller.confirmPasswordReset(confirmInput))
          .rejects.toThrow('Invalid or expired reset token');
      });
    });

    describe('refresh', () => {
      it('should successfully refresh tokens', async () => {
        const refreshInput = {
          refreshToken: 'refresh-token-123',
        };

        const newTokens = {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };

        (authService.refreshTokens as any).mockResolvedValue(newTokens);

        const caller = authRouter.createCaller(mockContext);
        const result = await caller.refresh(refreshInput);

        expect(authService.refreshTokens).toHaveBeenCalledWith(refreshInput.refreshToken);
        expect(result.accessToken).toBe(newTokens.accessToken);
        expect(mockContext.setCookie).toHaveBeenCalledWith(
          'session',
          newTokens.accessToken,
          expect.any(Object)
        );
      });

      it('should handle invalid refresh tokens', async () => {
        const refreshInput = {
          refreshToken: 'invalid-refresh-token',
        };

        const refreshError = new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid refresh token',
        });

        (authService.refreshTokens as any).mockRejectedValue(refreshError);

        const caller = authRouter.createCaller(mockContext);

        await expect(caller.refresh(refreshInput))
          .rejects.toThrow('Invalid refresh token');
      });
    });

    describe('verifyEmail', () => {
      it('should successfully verify email', async () => {
        const verifyInput = {
          token: 'verification-token-123',
        };

        (authService.verifyEmail as any).mockResolvedValue(undefined);

        const caller = authRouter.createCaller(mockContext);
        const result = await caller.verifyEmail(verifyInput);

        expect(authService.verifyEmail).toHaveBeenCalledWith(verifyInput);
        expect(result.message).toContain('email address has been successfully verified');
      });

      it('should handle invalid verification tokens', async () => {
        const verifyInput = {
          token: 'invalid-token',
        };

        const verifyError = new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired verification token',
        });

        (authService.verifyEmail as any).mockRejectedValue(verifyError);

        const caller = authRouter.createCaller(mockContext);

        await expect(caller.verifyEmail(verifyInput))
          .rejects.toThrow('Invalid or expired verification token');
      });
    });
  });

  describe('Protected Endpoints', () => {
    beforeEach(() => {
      // Set up authenticated context
      mockContext.user = mockUser;
      mockContext.sessionToken = 'session-token-123';
    });

    describe('me', () => {
      it('should return current user profile', async () => {
        const caller = authRouter.createCaller(mockContext);
        const result = await caller.me();

        expect(result.id).toBe(mockUser.id);
        expect(result.email).toBe(mockUser.email);
        expect(result.preferences).toBeDefined();
        expect(result.preferences?.theme).toBe('DARK');
      });

      it('should include user preferences', async () => {
        const caller = authRouter.createCaller(mockContext);
        const result = await caller.me();

        expect(result.preferences).toEqual(mockUser.preferences);
      });

      it('should require authentication', async () => {
        const unauthenticatedContext = { setCookie: vi.fn() };
        const caller = authRouter.createCaller(unauthenticatedContext);

        await expect(caller.me())
          .rejects.toThrow(); // Should throw authentication error
      });
    });

    describe('logout', () => {
      it('should successfully logout user', async () => {
        (authService.logoutUser as any).mockResolvedValue(undefined);

        const caller = authRouter.createCaller(mockContext);
        const result = await caller.logout();

        expect(authService.logoutUser).toHaveBeenCalledWith('session-token-123');
        expect(result.message).toBe('Successfully logged out');
        expect(mockContext.setCookie).toHaveBeenCalledWith(
          'session',
          '',
          expect.objectContaining({
            expires: new Date(0),
          })
        );
      });

      it('should handle logout gracefully even with errors', async () => {
        (authService.logoutUser as any).mockRejectedValue(new Error('Logout failed'));

        const caller = authRouter.createCaller(mockContext);
        const result = await caller.logout();

        expect(result.message).toBe('Successfully logged out');
      });
    });

    describe('resendVerification', () => {
      it('should resend verification email', async () => {
        const unverifiedUser = { ...mockUser, emailVerified: false };
        mockContext.user = unverifiedUser;

        (authService.sendEmailVerification as any).mockResolvedValue(undefined);

        const caller = authRouter.createCaller(mockContext);
        const result = await caller.resendVerification();

        expect(authService.sendEmailVerification).toHaveBeenCalledWith({
          email: unverifiedUser.email,
        });
        expect(result.message).toContain('verification email has been sent');
      });

      it('should handle already verified email', async () => {
        const verifiedUser = { ...mockUser, emailVerified: true };
        mockContext.user = verifiedUser;

        const caller = authRouter.createCaller(mockContext);

        await expect(caller.resendVerification())
          .rejects.toThrow('Your email is already verified');
      });
    });

    describe('sessions', () => {
      it('should return user sessions', async () => {
        const mockSessions = [
          {
            ...mockSession,
            isCurrent: true,
          },
          {
            ...mockSession,
            id: 'session-456',
            sessionToken: 'different-token',
            isCurrent: false,
          },
        ];

        (authService.getUserSessions as any).mockResolvedValue([
          mockSession,
          { ...mockSession, id: 'session-456', sessionToken: 'different-token' },
        ]);

        const caller = authRouter.createCaller(mockContext);
        const result = await caller.sessions();

        expect(authService.getUserSessions).toHaveBeenCalledWith(mockUser.id);
        expect(result).toHaveLength(2);
        expect(result[0].isCurrent).toBe(true);
        expect(result[1].isCurrent).toBe(false);
      });
    });

    describe('revokeSession', () => {
      it('should revoke user session', async () => {
        const revokeInput = {
          sessionId: 'session-456',
        };

        (authService.revokeUserSession as any).mockResolvedValue(undefined);

        const caller = authRouter.createCaller(mockContext);
        const result = await caller.revokeSession(revokeInput);

        expect(authService.revokeUserSession).toHaveBeenCalledWith(
          mockUser.id,
          revokeInput.sessionId
        );
        expect(result.message).toBe('Session has been successfully revoked');
      });

      it('should handle non-existent session', async () => {
        const revokeInput = {
          sessionId: 'non-existent-session',
        };

        const revokeError = new TRPCError({
          code: 'NOT_FOUND',
          message: 'Session not found',
        });

        (authService.revokeUserSession as any).mockRejectedValue(revokeError);

        const caller = authRouter.createCaller(mockContext);

        await expect(caller.revokeSession(revokeInput))
          .rejects.toThrow('Session not found');
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate email format', async () => {
      const invalidInput = {
        email: 'not-an-email',
        password: 'ValidPassword123!',
      };

      const caller = authRouter.createCaller(mockContext);

      await expect(caller.register(invalidInput))
        .rejects.toThrow(); // Zod validation error
    });

    it('should validate password strength', async () => {
      const weakPasswordInput = {
        email: 'test@example.com',
        password: 'weak',
      };

      const caller = authRouter.createCaller(mockContext);

      await expect(caller.register(weakPasswordInput))
        .rejects.toThrow(); // Zod validation error
    });

    it('should validate required fields', async () => {
      const missingFieldsInput = {
        email: 'test@example.com',
        // Missing password
      };

      const caller = authRouter.createCaller(mockContext);

      await expect(caller.register(missingFieldsInput as any))
        .rejects.toThrow(); // Zod validation error
    });

    it('should sanitize input strings', async () => {
      const inputWithSpaces = {
        email: '  test@example.com  ',
        password: 'TestPassword123!',
        firstName: '  John  ',
        lastName: '  Doe  ',
      };

      const mockAuthResult: AuthResult = {
        user: mockUser,
        tokens: mockTokens,
        session: mockSession,
      };

      (authService.registerUser as any).mockResolvedValue(mockAuthResult);

      const caller = authRouter.createCaller(mockContext);
      await caller.register(inputWithSpaces);

      expect(authService.registerUser).toHaveBeenCalledWith({
        email: 'test@example.com', // Trimmed and lowercased
        password: 'TestPassword123!',
        firstName: 'John', // Trimmed
        lastName: 'Doe', // Trimmed
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const registerInput = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const unexpectedError = new Error('Unexpected database error');
      (authService.registerUser as any).mockRejectedValue(unexpectedError);

      const caller = authRouter.createCaller(mockContext);

      await expect(caller.register(registerInput))
        .rejects.toThrow('An unexpected error occurred during registration');
    });

    it('should preserve TRPCError details', async () => {
      const registerInput = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const trpcError = new TRPCError({
        code: 'CONFLICT',
        message: 'User already exists',
      });

      (authService.registerUser as any).mockRejectedValue(trpcError);

      const caller = authRouter.createCaller(mockContext);

      await expect(caller.register(registerInput))
        .rejects.toThrow('User already exists');
    });
  });
});