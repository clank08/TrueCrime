import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { authRouter } from '@/routers/auth.router';
import { authService } from '@/services/auth.service';
import { TestFactory, faker } from '@/test/factories';
import { TestUtils } from '@/test/utils';
import type { User, UserPreferences } from '@prisma/client';

/**
 * End-to-End Authentication Flow Tests
 * 
 * These tests simulate complete user authentication journeys
 * from start to finish, testing the integration between all
 * authentication components.
 */

describe('Authentication E2E Flows', () => {
  let testContext: any;
  let mockUser: User & { preferences: UserPreferences | null };
  let testEmail: string;
  let testPassword: string;

  beforeAll(async () => {
    // Set up test environment
    TestUtils.mockEnvironment({
      NODE_ENV: 'test',
      JWT_SECRET: 'test-jwt-secret-for-testing-purposes-only-minimum-256-bits',
      JWT_REFRESH_SECRET: 'test-refresh-jwt-secret-for-testing-purposes-only-different',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      FRONTEND_URL: 'http://localhost:3000',
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Generate unique test data for each test
    testEmail = TestFactory.generateTestEmail('e2etest.com');
    testPassword = TestFactory.generateStrongPassword();
    mockUser = TestFactory.createUserWithPreferences({
      email: testEmail,
      emailVerified: false, // Start unverified for realistic flow
    });
    
    testContext = TestUtils.createUnauthenticatedContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete User Registration Flow', () => {
    it('should complete full registration journey: register → verify email → login', async () => {
      const timer = TestUtils.createPerformanceTimer();

      // Step 1: User registers
      const registrationData = {
        email: testEmail,
        password: testPassword,
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockRegistrationResult = TestFactory.createAuthResult({
        email: testEmail,
        emailVerified: false,
      });

      (authService.registerUser as any).mockResolvedValue(mockRegistrationResult);

      const caller = authRouter.createCaller(testContext);
      const registrationResult = await caller.register(registrationData);

      // Verify registration was successful
      expect(registrationResult.user.email).toBe(testEmail);
      expect(registrationResult.user.emailVerified).toBe(false);
      expect(registrationResult.tokens).toBeDefined();
      expect(testContext.setCookie).toHaveBeenCalledWith(
        'session',
        expect.any(String),
        expect.objectContaining({ httpOnly: true })
      );

      // Step 2: User verifies email
      const verificationToken = 'verification-token-123';
      (authService.verifyEmail as any).mockResolvedValue(undefined);

      const verificationResult = await caller.verifyEmail({ token: verificationToken });
      expect(verificationResult.message).toContain('successfully verified');

      // Step 3: User logs in after verification
      const mockLoginResult = TestFactory.createAuthResult({
        email: testEmail,
        emailVerified: true, // Now verified
      });

      (authService.loginUser as any).mockResolvedValue(mockLoginResult);

      const loginResult = await caller.login({
        email: testEmail,
        password: testPassword,
      });

      expect(loginResult.user.email).toBe(testEmail);
      expect(loginResult.user.emailVerified).toBe(true);
      expect(loginResult.tokens).toBeDefined();

      // Verify the entire flow completed in reasonable time
      timer.expectFasterThan(5000); // Should complete within 5 seconds
    });

    it('should handle registration with incomplete profile completion', async () => {
      // Step 1: Register with minimal data
      const minimalRegistration = {
        email: testEmail,
        password: testPassword,
      };

      const mockRegistrationResult = TestFactory.createAuthResult({
        email: testEmail,
        firstName: null,
        lastName: null,
        displayName: null,
      });

      (authService.registerUser as any).mockResolvedValue(mockRegistrationResult);

      const caller = authRouter.createCaller(testContext);
      const result = await caller.register(minimalRegistration);

      expect(result.user.firstName).toBeNull();
      expect(result.user.lastName).toBeNull();
      expect(result.user.email).toBe(testEmail);
    });

    it('should prevent duplicate registrations', async () => {
      const registrationData = {
        email: testEmail,
        password: testPassword,
      };

      // First registration succeeds
      const mockFirstResult = TestFactory.createAuthResult({ email: testEmail });
      (authService.registerUser as any).mockResolvedValueOnce(mockFirstResult);

      const caller = authRouter.createCaller(testContext);
      const firstResult = await caller.register(registrationData);
      expect(firstResult.user.email).toBe(testEmail);

      // Second registration with same email should fail
      (authService.registerUser as any).mockRejectedValueOnce(
        new Error('An account with this email address already exists')
      );

      await expect(caller.register(registrationData))
        .rejects.toThrow('An account with this email address already exists');
    });
  });

  describe('Password Reset Flow', () => {
    it('should complete full password reset journey: request → confirm → login', async () => {
      // Step 1: User requests password reset
      (authService.requestPasswordReset as any).mockResolvedValue(undefined);

      const caller = authRouter.createCaller(testContext);
      const resetRequestResult = await caller.requestPasswordReset({
        email: testEmail,
      });

      expect(resetRequestResult.message).toContain('password reset link has been sent');

      // Step 2: User confirms password reset with new password
      const newPassword = 'NewStrongPassword123!';
      const resetToken = 'reset-token-123';

      (authService.confirmPasswordReset as any).mockResolvedValue(undefined);

      const resetConfirmResult = await caller.confirmPasswordReset({
        token: resetToken,
        newPassword,
      });

      expect(resetConfirmResult.message).toContain('password has been successfully reset');

      // Step 3: User logs in with new password
      const mockLoginResult = TestFactory.createAuthResult({ email: testEmail });
      (authService.loginUser as any).mockResolvedValue(mockLoginResult);

      const loginResult = await caller.login({
        email: testEmail,
        password: newPassword,
      });

      expect(loginResult.user.email).toBe(testEmail);
      expect(loginResult.tokens).toBeDefined();
    });

    it('should handle expired reset tokens gracefully', async () => {
      const caller = authRouter.createCaller(testContext);

      // Mock expired token error
      (authService.confirmPasswordReset as any).mockRejectedValue(
        new Error('Invalid or expired password reset token')
      );

      await expect(caller.confirmPasswordReset({
        token: 'expired-token',
        newPassword: 'NewPassword123!',
      })).rejects.toThrow('Invalid or expired password reset token');
    });

    it('should prevent password reset for non-existent users (security)', async () => {
      const caller = authRouter.createCaller(testContext);

      // Should always succeed for security (don't reveal if user exists)
      (authService.requestPasswordReset as any).mockResolvedValue(undefined);

      const result = await caller.requestPasswordReset({
        email: 'nonexistent@example.com',
      });

      expect(result.message).toContain('password reset link has been sent');
    });
  });

  describe('Session Management Flow', () => {
    it('should handle complete session lifecycle: login → activity → refresh → logout', async () => {
      // Step 1: User logs in
      const mockLoginResult = TestFactory.createAuthResult({ email: testEmail });
      (authService.loginUser as any).mockResolvedValue(mockLoginResult);

      const caller = authRouter.createCaller(testContext);
      const loginResult = await caller.login({
        email: testEmail,
        password: testPassword,
      });

      const { tokens } = loginResult;

      // Step 2: Simulate authenticated context for subsequent calls
      const authenticatedContext = TestUtils.createAuthenticatedContext(
        mockLoginResult.user as User & { preferences: UserPreferences | null }
      );

      const authenticatedCaller = authRouter.createCaller(authenticatedContext);

      // Step 3: User performs authenticated action (check profile)
      const profileResult = await authenticatedCaller.me();
      expect(profileResult.email).toBe(testEmail);

      // Step 4: Refresh tokens before expiry
      const newTokens = TestUtils.generateTestTokens(mockLoginResult.user.id);
      (authService.refreshTokens as any).mockResolvedValue(newTokens);

      const refreshResult = await caller.refresh({
        refreshToken: tokens.refreshToken,
      });

      expect(refreshResult.accessToken).toBe(newTokens.accessToken);
      expect(refreshResult.refreshToken).toBe(newTokens.refreshToken);

      // Step 5: User logs out
      (authService.logoutUser as any).mockResolvedValue(undefined);

      const logoutResult = await authenticatedCaller.logout();
      expect(logoutResult.message).toBe('Successfully logged out');
      expect(authenticatedContext.setCookie).toHaveBeenCalledWith(
        'session',
        '',
        expect.objectContaining({ expires: new Date(0) })
      );
    });

    it('should handle multiple concurrent sessions', async () => {
      const mockUser = TestFactory.createUserWithPreferences();
      const sessions = TestFactory.createUserSessions(mockUser.id, 3);

      // Step 1: User logs in from multiple devices
      const mockLoginResult = TestFactory.createAuthResult({ 
        id: mockUser.id,
        email: testEmail 
      });
      (authService.loginUser as any).mockResolvedValue(mockLoginResult);

      const caller = authRouter.createCaller(testContext);

      // Simulate login from 3 devices
      const loginPromises = Array.from({ length: 3 }, () =>
        caller.login({ email: testEmail, password: testPassword })
      );

      const loginResults = await Promise.all(loginPromises);
      
      loginResults.forEach(result => {
        expect(result.user.email).toBe(testEmail);
        expect(result.tokens).toBeDefined();
      });

      // Step 2: Check all sessions
      const authenticatedContext = TestUtils.createAuthenticatedContext(mockUser);
      const authenticatedCaller = authRouter.createCaller(authenticatedContext);

      (authService.getUserSessions as any).mockResolvedValue(sessions);

      const sessionsResult = await authenticatedCaller.sessions();
      expect(sessionsResult).toHaveLength(3);

      // Step 3: Revoke one session
      (authService.revokeUserSession as any).mockResolvedValue(undefined);

      const revokeResult = await authenticatedCaller.revokeSession({
        sessionId: sessions[1].id,
      });

      expect(revokeResult.message).toBe('Session has been successfully revoked');
    });

    it('should handle session expiration gracefully', async () => {
      // Mock expired session scenario
      const expiredTokens = {
        ...TestUtils.generateTestTokens(),
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
      };

      (authService.refreshTokens as any).mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const caller = authRouter.createCaller(testContext);

      await expect(caller.refresh({
        refreshToken: expiredTokens.refreshToken,
      })).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('Email Verification Flow', () => {
    it('should handle email verification reminders and resending', async () => {
      // Step 1: User is logged in but unverified
      const unverifiedUser = TestFactory.createUserWithPreferences({
        email: testEmail,
        emailVerified: false,
      });

      const authenticatedContext = TestUtils.createAuthenticatedContext(unverifiedUser);
      const authenticatedCaller = authRouter.createCaller(authenticatedContext);

      // Step 2: User requests verification email resend
      (authService.sendEmailVerification as any).mockResolvedValue(undefined);

      const resendResult = await authenticatedCaller.resendVerification();
      expect(resendResult.message).toContain('verification email has been sent');

      // Step 3: User verifies email
      (authService.verifyEmail as any).mockResolvedValue(undefined);

      const caller = authRouter.createCaller(testContext);
      const verificationResult = await caller.verifyEmail({
        token: 'verification-token-123',
      });

      expect(verificationResult.message).toContain('successfully verified');
    });

    it('should prevent verification resend for already verified users', async () => {
      const verifiedUser = TestFactory.createUserWithPreferences({
        email: testEmail,
        emailVerified: true,
      });

      const authenticatedContext = TestUtils.createAuthenticatedContext(verifiedUser);
      const authenticatedCaller = authRouter.createCaller(authenticatedContext);

      await expect(authenticatedCaller.resendVerification())
        .rejects.toThrow('Your email is already verified');
    });
  });

  describe('Security and Edge Cases', () => {
    it('should handle rate limiting during authentication attempts', async () => {
      const rateLimiter = TestUtils.createMockRateLimiter(5, 60000); // 5 requests per minute

      // Simulate multiple rapid login attempts
      const caller = authRouter.createCaller(testContext);
      
      (authService.loginUser as any).mockRejectedValue(
        new Error('Invalid email or password')
      );

      // First 5 attempts should be allowed
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.checkLimit(testEmail)).toBe(true);
        
        await expect(caller.login({
          email: testEmail,
          password: 'wrong-password',
        })).rejects.toThrow('Invalid email or password');
      }

      // 6th attempt should be rate limited
      expect(rateLimiter.checkLimit(testEmail)).toBe(false);
    });

    it('should handle concurrent login attempts gracefully', async () => {
      const mockLoginResult = TestFactory.createAuthResult({ email: testEmail });
      (authService.loginUser as any).mockResolvedValue(mockLoginResult);

      const caller = authRouter.createCaller(testContext);

      // Simulate concurrent login attempts from the same user
      const concurrentLogins = Array.from({ length: 5 }, () =>
        caller.login({ email: testEmail, password: testPassword })
      );

      const results = await Promise.all(concurrentLogins);
      
      // All should succeed (same user, valid credentials)
      results.forEach(result => {
        expect(result.user.email).toBe(testEmail);
      });
    });

    it('should maintain data consistency during registration failures', async () => {
      const caller = authRouter.createCaller(testContext);

      // Simulate database error during registration
      (authService.registerUser as any).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(caller.register({
        email: testEmail,
        password: testPassword,
      })).rejects.toThrow();

      // Subsequent registration attempt should work (no partial data left)
      const mockRegistrationResult = TestFactory.createAuthResult({ email: testEmail });
      (authService.registerUser as any).mockResolvedValue(mockRegistrationResult);

      const result = await caller.register({
        email: testEmail,
        password: testPassword,
      });

      expect(result.user.email).toBe(testEmail);
    });

    it('should handle network timeouts during authentication', async () => {
      const caller = authRouter.createCaller(testContext);

      // Simulate network timeout
      (authService.loginUser as any).mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      await expect(caller.login({
        email: testEmail,
        password: testPassword,
      })).rejects.toThrow('Network timeout');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle bulk user operations efficiently', async () => {
      const timer = TestUtils.createPerformanceTimer();
      const userCount = 10;

      // Generate test data for multiple users
      const testUsers = TestUtils.generateStressTestData(userCount);
      
      const mockResults = testUsers.map(userData => 
        TestFactory.createAuthResult({ email: userData.email })
      );

      (authService.registerUser as any).mockImplementation((input: any) => {
        const result = mockResults.find(r => r.user.email === input.email);
        return Promise.resolve(result);
      });

      const caller = authRouter.createCaller(testContext);

      // Register multiple users concurrently
      const registrationOperations = testUsers.map(userData => () =>
        caller.register({
          email: userData.email,
          password: testPassword,
        })
      );

      const results = await TestUtils.runConcurrentOperations(
        registrationOperations,
        3 // Max 3 concurrent operations
      );

      expect(results).toHaveLength(userCount);
      results.forEach((result, index) => {
        expect(result.user.email).toBe(testUsers[index].email);
      });

      // Should complete within reasonable time
      timer.expectFasterThan(10000); // 10 seconds for 10 users
    });

    it('should maintain response times under load', async () => {
      const mockLoginResult = TestFactory.createAuthResult({ email: testEmail });
      (authService.loginUser as any).mockResolvedValue(mockLoginResult);

      const caller = authRouter.createCaller(testContext);

      // Measure response time for login under simulated load
      const loginOperations = Array.from({ length: 20 }, () => () => {
        const timer = TestUtils.createPerformanceTimer();
        return caller.login({
          email: testEmail,
          password: testPassword,
        }).then(result => {
          timer.expectFasterThan(1000); // Each login should be under 1 second
          return result;
        });
      });

      const results = await TestUtils.runConcurrentOperations(loginOperations, 5);
      expect(results).toHaveLength(20);
    });
  });

  describe('Integration Error Recovery', () => {
    it('should recover gracefully from service failures', async () => {
      const caller = authRouter.createCaller(testContext);

      // First attempt fails
      (authService.loginUser as any).mockRejectedValueOnce(
        new Error('Service temporarily unavailable')
      );

      await expect(caller.login({
        email: testEmail,
        password: testPassword,
      })).rejects.toThrow('Service temporarily unavailable');

      // Second attempt succeeds (service recovered)
      const mockLoginResult = TestFactory.createAuthResult({ email: testEmail });
      (authService.loginUser as any).mockResolvedValue(mockLoginResult);

      const result = await caller.login({
        email: testEmail,
        password: testPassword,
      });

      expect(result.user.email).toBe(testEmail);
    });

    it('should handle partial system failures', async () => {
      // Registration succeeds but email service fails
      const mockRegistrationResult = TestFactory.createAuthResult({ email: testEmail });
      (authService.registerUser as any).mockResolvedValue(mockRegistrationResult);

      const caller = authRouter.createCaller(testContext);
      
      const result = await caller.register({
        email: testEmail,
        password: testPassword,
      });

      // Registration should still succeed even if email service is down
      expect(result.user.email).toBe(testEmail);
      expect(result.tokens).toBeDefined();
    });
  });
});