import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { TRPCError } from '@trpc/server';
import { AuthService } from '../auth.service';
import { prisma } from '@/lib/prisma';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
  },
}));

// Mock Supabase functions
vi.mock('@/lib/supabase', () => ({
  createUser: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUserPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  mapSupabaseError: vi.fn(),
  emailExists: vi.fn(),
}));

// Mock JWT functions
vi.mock('@/lib/jwt', () => ({
  generateTokenPair: vi.fn(),
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  createUserPayload: vi.fn(),
  generateSecureToken: vi.fn(),
  hashToken: vi.fn(),
  compareHashedToken: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      // Mock data
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
        hashedPassword: 'hashed-password',
        emailVerified: false,
        isActive: true,
        createdAt: new Date(),
        lastLoginAt: null,
        preferences: {
          theme: 'DARK',
          emailNotifications: true,
          pushNotifications: true,
        },
      };

      const mockSession = {
        id: 'session-123',
        sessionToken: 'session-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      // Mock implementations
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (require('@/lib/supabase').createUser as any).mockResolvedValue({
        user: { id: 'supabase-user-123' },
        error: null,
      });
      (prisma.user.create as any).mockResolvedValue(mockUser);
      (require('@/lib/jwt').createUserPayload as any).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
      });
      (require('@/lib/jwt').generateTokenPair as any).mockReturnValue(mockTokens);
      (prisma.userSession.create as any).mockResolvedValue(mockSession);

      // Execute
      const result = await authService.registerUser(userData);

      // Assertions
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
      expect(result.session).toEqual(mockSession);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: userData.email.toLowerCase() },
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: userData.email.toLowerCase(),
            firstName: userData.firstName,
            lastName: userData.lastName,
          }),
        })
      );
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'TestPassword123!',
      };

      const existingUser = {
        id: 'existing-user',
        email: 'existing@example.com',
      };

      (prisma.user.findUnique as any).mockResolvedValue(existingUser);

      await expect(authService.registerUser(userData)).rejects.toThrow(TRPCError);
      await expect(authService.registerUser(userData)).rejects.toThrow(
        'An account with this email address already exists'
      );
    });

    it('should throw error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
      };

      await expect(authService.registerUser(userData)).rejects.toThrow(TRPCError);
      await expect(authService.registerUser(userData)).rejects.toThrow(
        'Please provide a valid email address'
      );
    });

    it('should throw error for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
      };

      await expect(authService.registerUser(userData)).rejects.toThrow(TRPCError);
      await expect(authService.registerUser(userData)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });
  });

  describe('loginUser', () => {
    it('should successfully login a user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        hashedPassword: 'hashed-password',
        isActive: true,
        isSuspended: false,
        preferences: null,
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const mockSession = {
        id: 'session-123',
        sessionToken: 'session-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      // Mock implementations
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      (require('@/lib/supabase').signInWithPassword as any).mockResolvedValue({
        user: mockUser,
        session: mockSession,
        error: null,
      });
      (require('@/lib/jwt').createUserPayload as any).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
      });
      (require('@/lib/jwt').generateTokenPair as any).mockReturnValue(mockTokens);
      (prisma.userSession.create as any).mockResolvedValue(mockSession);
      (prisma.user.update as any).mockResolvedValue(mockUser);

      // Execute
      const result = await authService.loginUser(loginData);

      // Assertions
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
      expect(result.session).toEqual(mockSession);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.hashedPassword);
    });

    it('should throw error for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(authService.loginUser(loginData)).rejects.toThrow(TRPCError);
      await expect(authService.loginUser(loginData)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        hashedPassword: 'hashed-password',
        isActive: true,
        isSuspended: false,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(authService.loginUser(loginData)).rejects.toThrow(TRPCError);
      await expect(authService.loginUser(loginData)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for suspended user', async () => {
      const loginData = {
        email: 'suspended@example.com',
        password: 'TestPassword123!',
      };

      const mockUser = {
        id: 'user-123',
        email: 'suspended@example.com',
        hashedPassword: 'hashed-password',
        isActive: false,
        isSuspended: true,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      await expect(authService.loginUser(loginData)).rejects.toThrow(TRPCError);
      await expect(authService.loginUser(loginData)).rejects.toThrow(
        'Your account has been suspended'
      );
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens', async () => {
      const refreshToken = 'valid-refresh-token';

      const mockTokenResult = {
        valid: true,
        payload: {
          userId: 'user-123',
          sessionId: 'session-123',
        },
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isActive: true,
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        refreshToken,
        isActive: true,
      };

      const mockNewTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      // Mock implementations
      (require('@/lib/jwt').verifyRefreshToken as any).mockReturnValue(mockTokenResult);
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.userSession.findFirst as any).mockResolvedValue(mockSession);
      (require('@/lib/jwt').createUserPayload as any).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
      });
      (require('@/lib/jwt').generateTokenPair as any).mockReturnValue(mockNewTokens);
      (prisma.userSession.update as any).mockResolvedValue(mockSession);
      (prisma.user.update as any).mockResolvedValue(mockUser);

      // Execute
      const result = await authService.refreshTokens(refreshToken);

      // Assertions
      expect(result).toEqual(mockNewTokens);
      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: expect.objectContaining({
          sessionToken: mockNewTokens.accessToken,
          refreshToken: mockNewTokens.refreshToken,
        }),
      });
    });

    it('should throw error for invalid refresh token', async () => {
      const invalidRefreshToken = 'invalid-refresh-token';

      (require('@/lib/jwt').verifyRefreshToken as any).mockReturnValue({
        valid: false,
        error: 'Invalid token',
      });

      await expect(authService.refreshTokens(invalidRefreshToken)).rejects.toThrow(TRPCError);
      await expect(authService.refreshTokens(invalidRefreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should send password reset email for existing user', async () => {
      const email = 'test@example.com';

      const mockUser = {
        id: 'user-123',
        email,
        isActive: true,
      };

      const mockToken = 'reset-token-123';
      const mockHashedToken = 'hashed-reset-token-123';

      // Mock implementations
      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.passwordReset.updateMany as any).mockResolvedValue({ count: 0 });
      (require('@/lib/jwt').generateSecureToken as any).mockReturnValue(mockToken);
      (require('@/lib/jwt').hashToken as any).mockReturnValue(mockHashedToken);
      (prisma.passwordReset.create as any).mockResolvedValue({
        id: 'reset-123',
        token: mockHashedToken,
      });
      (require('@/lib/supabase').sendPasswordResetEmail as any).mockResolvedValue({
        error: null,
      });

      // Execute
      await authService.requestPasswordReset({ email });

      // Assertions
      expect(prisma.passwordReset.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUser.id,
          isUsed: false,
        },
        data: { isUsed: true },
      });
      expect(prisma.passwordReset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUser.id,
            token: mockHashedToken,
          }),
        })
      );
    });

    it('should silently succeed for non-existent user (security)', async () => {
      const email = 'nonexistent@example.com';

      (prisma.user.findUnique as any).mockResolvedValue(null);

      // Execute - should not throw
      await expect(authService.requestPasswordReset({ email })).resolves.not.toThrow();

      // Should not create any password reset records
      expect(prisma.passwordReset.create).not.toHaveBeenCalled();
    });

    it('should silently succeed for inactive user (security)', async () => {
      const email = 'inactive@example.com';
      const inactiveUser = {
        id: 'user-123',
        email,
        isActive: false,
      };

      (prisma.user.findUnique as any).mockResolvedValue(inactiveUser);

      // Execute - should not throw
      await expect(authService.requestPasswordReset({ email })).resolves.not.toThrow();

      // Should not create any password reset records
      expect(prisma.passwordReset.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      const token = 'verification-token';
      const hashedToken = 'hashed-verification-token';

      const mockEmailVerification = {
        id: 'verification-123',
        userId: 'user-123',
        token: hashedToken,
        isUsed: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      // Mock implementations
      (require('@/lib/jwt').hashToken as any).mockReturnValue(hashedToken);
      (prisma.emailVerification.findFirst as any).mockResolvedValue(mockEmailVerification);
      (prisma.user.update as any).mockResolvedValue({});
      (prisma.emailVerification.update as any).mockResolvedValue({});

      // Execute
      await authService.verifyEmail({ token });

      // Assertions
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockEmailVerification.userId },
        data: expect.objectContaining({
          emailVerified: true,
          emailVerifiedAt: expect.any(Date),
        }),
      });
      expect(prisma.emailVerification.update).toHaveBeenCalledWith({
        where: { id: mockEmailVerification.id },
        data: expect.objectContaining({
          isUsed: true,
          usedAt: expect.any(Date),
        }),
      });
    });

    it('should throw error for invalid or expired token', async () => {
      const token = 'invalid-token';
      const hashedToken = 'hashed-invalid-token';

      (require('@/lib/jwt').hashToken as any).mockReturnValue(hashedToken);
      (prisma.emailVerification.findFirst as any).mockResolvedValue(null);

      await expect(authService.verifyEmail({ token })).rejects.toThrow(TRPCError);
      await expect(authService.verifyEmail({ token })).rejects.toThrow(
        'Invalid or expired verification token'
      );
    });

    it('should throw error for already used token', async () => {
      const token = 'verification-token';
      const hashedToken = 'hashed-verification-token';

      const usedEmailVerification = {
        id: 'verification-123',
        userId: 'user-123',
        token: hashedToken,
        isUsed: true, // Already used
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      (require('@/lib/jwt').hashToken as any).mockReturnValue(hashedToken);
      (prisma.emailVerification.findFirst as any).mockResolvedValue(null); // Won't find unused token

      await expect(authService.verifyEmail({ token })).rejects.toThrow(TRPCError);
      await expect(authService.verifyEmail({ token })).rejects.toThrow(
        'Invalid or expired verification token'
      );
    });
  });

  describe('getUserFromSession', () => {
    it('should return user for valid session token', async () => {
      const sessionToken = 'valid-session-token';

      const mockTokenResult = {
        valid: true,
        payload: {
          userId: 'user-123',
          sessionId: 'session-123',
        },
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isActive: true,
        preferences: {
          theme: 'DARK',
          emailNotifications: true,
        },
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        sessionToken,
        isActive: true,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: mockUser,
      };

      (require('@/lib/jwt').verifyAccessToken as any).mockReturnValue(mockTokenResult);
      (prisma.userSession.findFirst as any).mockResolvedValue(mockSession);
      (prisma.userSession.update as any).mockResolvedValue({});
      (prisma.user.update as any).mockResolvedValue({});

      const result = await authService.getUserFromSession(sessionToken);

      expect(result).toEqual(mockUser);
      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid-token';

      (require('@/lib/jwt').verifyAccessToken as any).mockReturnValue({
        valid: false,
        error: 'Invalid token',
      });

      const result = await authService.getUserFromSession(invalidToken);

      expect(result).toBeNull();
    });

    it('should return null for expired session', async () => {
      const sessionToken = 'expired-session-token';

      const mockTokenResult = {
        valid: true,
        payload: {
          userId: 'user-123',
          sessionId: 'session-123',
        },
      };

      (require('@/lib/jwt').verifyAccessToken as any).mockReturnValue(mockTokenResult);
      (prisma.userSession.findFirst as any).mockResolvedValue(null); // No active session found

      const result = await authService.getUserFromSession(sessionToken);

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const sessionToken = 'valid-session-token';

      const mockTokenResult = {
        valid: true,
        payload: {
          userId: 'user-123',
          sessionId: 'session-123',
        },
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        isActive: false, // Inactive user
      };

      const mockSession = {
        id: 'session-123',
        userId: 'user-123',
        sessionToken,
        isActive: true,
        user: mockUser,
      };

      (require('@/lib/jwt').verifyAccessToken as any).mockReturnValue(mockTokenResult);
      (prisma.userSession.findFirst as any).mockResolvedValue(mockSession);

      const result = await authService.getUserFromSession(sessionToken);

      expect(result).toBeNull();
    });
  });

  describe('getUserSessions', () => {
    it('should return active user sessions', async () => {
      const userId = 'user-123';
      const mockSessions = [
        {
          id: 'session-1',
          userId,
          isActive: true,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          lastActivityAt: new Date(),
        },
        {
          id: 'session-2',
          userId,
          isActive: true,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          lastActivityAt: new Date(Date.now() - 60 * 60 * 1000),
        },
      ];

      (prisma.userSession.findMany as any).mockResolvedValue(mockSessions);

      const result = await authService.getUserSessions(userId);

      expect(result).toEqual(mockSessions);
      expect(prisma.userSession.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { lastActivityAt: 'desc' },
      });
    });
  });

  describe('revokeUserSession', () => {
    it('should successfully revoke user session', async () => {
      const userId = 'user-123';
      const sessionId = 'session-123';

      const mockSession = {
        id: sessionId,
        userId,
        isActive: true,
      };

      (prisma.userSession.findFirst as any).mockResolvedValue(mockSession);
      (prisma.userSession.update as any).mockResolvedValue({});

      await authService.revokeUserSession(userId, sessionId);

      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { isActive: false },
      });
    });

    it('should throw error for non-existent session', async () => {
      const userId = 'user-123';
      const sessionId = 'non-existent-session';

      (prisma.userSession.findFirst as any).mockResolvedValue(null);

      await expect(authService.revokeUserSession(userId, sessionId)).rejects.toThrow(TRPCError);
      await expect(authService.revokeUserSession(userId, sessionId)).rejects.toThrow(
        'Session not found'
      );
    });
  });

  describe('logoutUser', () => {
    it('should successfully logout user', async () => {
      const sessionToken = 'session-token';

      const mockSession = {
        id: 'session-123',
        sessionToken,
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      (prisma.userSession.findUnique as any).mockResolvedValue(mockSession);
      (prisma.userSession.update as any).mockResolvedValue({});

      await authService.logoutUser(sessionToken);

      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: mockSession.id },
        data: { isActive: false },
      });
    });

    it('should handle logout gracefully when session not found', async () => {
      const sessionToken = 'non-existent-token';

      (prisma.userSession.findUnique as any).mockResolvedValue(null);

      // Should not throw error
      await expect(authService.logoutUser(sessionToken)).resolves.not.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      const sessionToken = 'session-token';

      (prisma.userSession.findUnique as any).mockRejectedValue(new Error('Database error'));

      // Should not throw error - logout should always succeed
      await expect(authService.logoutUser(sessionToken)).resolves.not.toThrow();
    });
  });

  describe('sendEmailVerification', () => {
    it('should send verification email to existing user', async () => {
      const email = 'test@example.com';

      const mockUser = {
        id: 'user-123',
        email,
        emailVerified: false,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      await authService.sendEmailVerification({ email });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
    });

    it('should throw error for non-existent user', async () => {
      const email = 'nonexistent@example.com';

      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(authService.sendEmailVerification({ email })).rejects.toThrow(TRPCError);
      await expect(authService.sendEmailVerification({ email })).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error for already verified email', async () => {
      const email = 'verified@example.com';

      const mockUser = {
        id: 'user-123',
        email,
        emailVerified: true, // Already verified
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      await expect(authService.sendEmailVerification({ email })).rejects.toThrow(TRPCError);
      await expect(authService.sendEmailVerification({ email })).rejects.toThrow(
        'Email is already verified'
      );
    });
  });

  describe('confirmPasswordReset', () => {
    it('should successfully reset password with valid token', async () => {
      const token = 'reset-token';
      const newPassword = 'NewPassword123!';
      const hashedToken = 'hashed-reset-token';

      const mockPasswordReset = {
        id: 'reset-123',
        userId: 'user-123',
        token: hashedToken,
        isUsed: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      (require('@/lib/jwt').hashToken as any).mockReturnValue(hashedToken);
      (prisma.passwordReset.findFirst as any).mockResolvedValue(mockPasswordReset);
      vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-new-password' as never);
      (prisma.user.update as any).mockResolvedValue({});
      (require('@/lib/supabase').updateUserPassword as any).mockResolvedValue({});
      (prisma.passwordReset.update as any).mockResolvedValue({});
      (prisma.userSession.updateMany as any).mockResolvedValue({});

      await authService.confirmPasswordReset({ token, newPassword });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockPasswordReset.userId },
        data: expect.objectContaining({
          hashedPassword: 'hashed-new-password',
          lastActivityAt: expect.any(Date),
        }),
      });

      expect(prisma.passwordReset.update).toHaveBeenCalledWith({
        where: { id: mockPasswordReset.id },
        data: expect.objectContaining({
          isUsed: true,
          usedAt: expect.any(Date),
        }),
      });

      // Should invalidate all user sessions
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: mockPasswordReset.userId },
        data: { isActive: false },
      });
    });

    it('should throw error for invalid password format', async () => {
      const token = 'reset-token';
      const weakPassword = 'weak';

      await expect(authService.confirmPasswordReset({ token, newPassword: weakPassword }))
        .rejects.toThrow(TRPCError);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle Supabase errors during registration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (require('@/lib/supabase').createUser as any).mockResolvedValue({
        user: null,
        error: { message: 'Supabase error' },
      });

      await expect(authService.registerUser(userData)).rejects.toThrow(TRPCError);
    });

    it('should handle database errors during registration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (require('@/lib/supabase').createUser as any).mockResolvedValue({
        user: { id: 'supabase-user-123' },
        error: null,
      });
      (prisma.user.create as any).mockRejectedValue(new Error('Database error'));

      await expect(authService.registerUser(userData)).rejects.toThrow(TRPCError);
      await expect(authService.registerUser(userData)).rejects.toThrow(
        'Failed to create account. Please try again.'
      );
    });

    it('should handle missing password during login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        hashedPassword: null, // No password set (OAuth user)
        isActive: true,
        isSuspended: false,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      await expect(authService.loginUser(loginData)).rejects.toThrow(TRPCError);
      await expect(authService.loginUser(loginData)).rejects.toThrow(
        'Please sign in using your social account or reset your password'
      );
    });
  });
});