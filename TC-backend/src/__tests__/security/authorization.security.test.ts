import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestFactory, TestUtils, TestPatterns } from '@/test';

describe('Authorization Security Tests', () => {
  describe('Role-Based Access Control (RBAC)', () => {
    it('should enforce user role permissions correctly', async () => {
      const scenarios = [
        {
          role: 'user',
          permissions: ['read:own_profile', 'update:own_profile', 'read:content', 'manage:own_watchlist'],
          forbiddenActions: ['admin:users', 'admin:content', 'delete:any_user', 'manage:system_settings'],
        },
        {
          role: 'moderator',
          permissions: ['read:own_profile', 'update:own_profile', 'read:content', 'moderate:content', 'read:user_reports'],
          forbiddenActions: ['admin:users', 'delete:any_user', 'manage:system_settings', 'admin:billing'],
        },
        {
          role: 'admin',
          permissions: ['admin:users', 'admin:content', 'manage:system_settings', 'read:analytics', 'delete:any_user'],
          forbiddenActions: ['super_admin:system_config'], // Only super admin can do this
        },
        {
          role: 'super_admin',
          permissions: ['super_admin:system_config', 'admin:users', 'admin:content', 'manage:system_settings'],
          forbiddenActions: [], // Super admin has all permissions
        },
      ];

      for (const scenario of scenarios) {
        const user = TestFactory.createUser({ role: scenario.role });
        
        // Test allowed permissions
        for (const permission of scenario.permissions) {
          const hasPermission = await TestUtils.checkPermission(user, permission);
          expect(hasPermission).toBe(true);
        }

        // Test forbidden actions
        for (const action of scenario.forbiddenActions) {
          const hasPermission = await TestUtils.checkPermission(user, action);
          expect(hasPermission).toBe(false);
        }
      }
    });

    it('should prevent privilege escalation', async () => {
      const regularUser = TestFactory.createUser({ role: 'user' });
      
      // Attempt to escalate privileges through various methods
      const escalationAttempts = [
        { method: 'direct_role_change', payload: { role: 'admin' } },
        { method: 'permission_injection', payload: { permissions: ['admin:users'] } },
        { method: 'token_manipulation', payload: { claims: { role: 'admin' } } },
        { method: 'session_hijacking', payload: { sessionData: { role: 'moderator' } } },
      ];

      for (const attempt of escalationAttempts) {
        const result = await TestUtils.attemptPrivilegeEscalation(regularUser, attempt);
        expect(result.success).toBe(false);
        expect(result.securityViolation).toBe(true);
        expect(result.originalRole).toBe('user'); // Role should remain unchanged
      }
    });

    it('should enforce resource ownership rules', async () => {
      const user1 = TestFactory.createUser();
      const user2 = TestFactory.createUser();
      
      const user1Watchlist = TestFactory.createWatchlist({ userId: user1.id });
      const user1Preferences = TestFactory.createUserPreferences({ userId: user1.id });

      // User should be able to access their own resources
      expect(await TestUtils.canAccessResource(user1, 'watchlist', user1Watchlist.id)).toBe(true);
      expect(await TestUtils.canAccessResource(user1, 'preferences', user1Preferences.id)).toBe(true);

      // User should NOT be able to access another user's resources
      expect(await TestUtils.canAccessResource(user2, 'watchlist', user1Watchlist.id)).toBe(false);
      expect(await TestUtils.canAccessResource(user2, 'preferences', user1Preferences.id)).toBe(false);

      // Admin should be able to access any resources
      const admin = TestFactory.createUser({ role: 'admin' });
      expect(await TestUtils.canAccessResource(admin, 'watchlist', user1Watchlist.id)).toBe(true);
      expect(await TestUtils.canAccessResource(admin, 'preferences', user1Preferences.id)).toBe(true);
    });

    it('should handle permission inheritance correctly', async () => {
      // Create a hierarchical permission structure
      const permissions = {
        'content:read': { inherits: [] },
        'content:write': { inherits: ['content:read'] },
        'content:delete': { inherits: ['content:write'] },
        'content:admin': { inherits: ['content:delete'] },
      };

      const userWithWritePermission = TestFactory.createUser({
        permissions: ['content:write'],
      });

      // Should have inherited read permission
      expect(await TestUtils.checkPermission(userWithWritePermission, 'content:read')).toBe(true);
      expect(await TestUtils.checkPermission(userWithWritePermission, 'content:write')).toBe(true);
      
      // Should NOT have delete permission (not inherited)
      expect(await TestUtils.checkPermission(userWithWritePermission, 'content:delete')).toBe(false);
      expect(await TestUtils.checkPermission(userWithWritePermission, 'content:admin')).toBe(false);
    });
  });

  describe('API Endpoint Authorization', () => {
    it('should protect authenticated-only endpoints', async () => {
      const protectedEndpoints = [
        { method: 'GET', path: '/api/trpc/auth.me' },
        { method: 'POST', path: '/api/trpc/content.addToWatchlist' },
        { method: 'GET', path: '/api/trpc/content.getWatchlist' },
        { method: 'POST', path: '/api/trpc/content.updateProgress' },
        { method: 'POST', path: '/api/trpc/auth.logout' },
        { method: 'POST', path: '/api/trpc/auth.refresh' },
        { method: 'PUT', path: '/api/trpc/user.updateProfile' },
        { method: 'DELETE', path: '/api/trpc/user.deleteAccount' },
      ];

      for (const endpoint of protectedEndpoints) {
        // Request without authentication should fail
        const unauthenticatedResponse = await TestUtils.makeRequest(endpoint.path, {
          method: endpoint.method,
        });
        expect(unauthenticatedResponse.statusCode).toBe(401);
        expect(unauthenticatedResponse.error.code).toBe('UNAUTHORIZED');

        // Request with invalid token should fail
        const invalidTokenResponse = await TestUtils.makeRequest(endpoint.path, {
          method: endpoint.method,
          headers: { Authorization: 'Bearer invalid-token' },
        });
        expect(invalidTokenResponse.statusCode).toBe(401);
        expect(invalidTokenResponse.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('should allow public endpoints without authentication', async () => {
      const publicEndpoints = [
        { method: 'POST', path: '/api/trpc/auth.register' },
        { method: 'POST', path: '/api/trpc/auth.login' },
        { method: 'GET', path: '/api/trpc/content.search' },
        { method: 'GET', path: '/api/trpc/content.getById' },
        { method: 'GET', path: '/api/trpc/content.list' },
        { method: 'GET', path: '/health' },
      ];

      for (const endpoint of publicEndpoints) {
        const response = await TestUtils.makeRequest(endpoint.path, {
          method: endpoint.method,
          body: endpoint.method === 'POST' ? TestFactory.createValidRequestData(endpoint.path) : undefined,
        });
        
        // Should not return 401 Unauthorized
        expect(response.statusCode).not.toBe(401);
      }
    });

    it('should enforce email verification requirements', async () => {
      const unverifiedUser = TestFactory.createUser({ emailVerified: false });
      const verifiedUser = TestFactory.createUser({ emailVerified: true });

      const verificationRequiredEndpoints = [
        { method: 'POST', path: '/api/trpc/content.addToWatchlist' },
        { method: 'POST', path: '/api/trpc/content.updateProgress' },
        { method: 'POST', path: '/api/trpc/content.rate' },
        { method: 'POST', path: '/api/trpc/user.updateProfile' },
      ];

      for (const endpoint of verificationRequiredEndpoints) {
        // Unverified user should be rejected
        const unverifiedResponse = await TestUtils.makeAuthenticatedRequest(
          endpoint.path,
          unverifiedUser,
          {
            method: endpoint.method,
            body: TestFactory.createValidRequestData(endpoint.path),
          }
        );
        expect(unverifiedResponse.statusCode).toBe(403);
        expect(unverifiedResponse.error.code).toBe('EMAIL_NOT_VERIFIED');

        // Verified user should be allowed
        const verifiedResponse = await TestUtils.makeAuthenticatedRequest(
          endpoint.path,
          verifiedUser,
          {
            method: endpoint.method,
            body: TestFactory.createValidRequestData(endpoint.path),
          }
        );
        expect(verifiedResponse.statusCode).not.toBe(403);
      }
    });

    it('should enforce admin-only endpoints', async () => {
      const regularUser = TestFactory.createUser({ role: 'user' });
      const admin = TestFactory.createUser({ role: 'admin' });

      const adminOnlyEndpoints = [
        { method: 'GET', path: '/api/trpc/admin.getUsers' },
        { method: 'POST', path: '/api/trpc/admin.deleteUser' },
        { method: 'GET', path: '/api/trpc/admin.getAnalytics' },
        { method: 'POST', path: '/api/trpc/admin.moderateContent' },
        { method: 'PUT', path: '/api/trpc/admin.updateSystemSettings' },
      ];

      for (const endpoint of adminOnlyEndpoints) {
        // Regular user should be forbidden
        const userResponse = await TestUtils.makeAuthenticatedRequest(
          endpoint.path,
          regularUser,
          {
            method: endpoint.method,
            body: TestFactory.createValidRequestData(endpoint.path),
          }
        );
        expect(userResponse.statusCode).toBe(403);
        expect(userResponse.error.code).toBe('FORBIDDEN');

        // Admin should be allowed
        const adminResponse = await TestUtils.makeAuthenticatedRequest(
          endpoint.path,
          admin,
          {
            method: endpoint.method,
            body: TestFactory.createValidRequestData(endpoint.path),
          }
        );
        expect(adminResponse.statusCode).not.toBe(403);
      }
    });
  });

  describe('Data Access Control', () => {
    it('should implement row-level security for user data', async () => {
      const user1 = TestFactory.createUser();
      const user2 = TestFactory.createUser();
      
      // Create data for both users
      const user1Data = {
        watchlist: TestFactory.createWatchlist({ userId: user1.id }),
        preferences: TestFactory.createUserPreferences({ userId: user1.id }),
        progress: TestFactory.createProgressEntry({ userId: user1.id }),
      };

      const user2Data = {
        watchlist: TestFactory.createWatchlist({ userId: user2.id }),
        preferences: TestFactory.createUserPreferences({ userId: user2.id }),
        progress: TestFactory.createProgressEntry({ userId: user2.id }),
      };

      // User 1 should only see their own data
      const user1Results = await TestUtils.queryUserData(user1.id, user1);
      expect(user1Results.watchlist).toHaveLength(1);
      expect(user1Results.watchlist[0].userId).toBe(user1.id);
      expect(user1Results.preferences).toHaveLength(1);
      expect(user1Results.preferences[0].userId).toBe(user1.id);

      // User 2 should only see their own data
      const user2Results = await TestUtils.queryUserData(user2.id, user2);
      expect(user2Results.watchlist).toHaveLength(1);
      expect(user2Results.watchlist[0].userId).toBe(user2.id);
      expect(user2Results.preferences).toHaveLength(1);
      expect(user2Results.preferences[0].userId).toBe(user2.id);

      // Users should not be able to query other users' data
      const user1QueryingUser2 = await TestUtils.queryUserData(user2.id, user1);
      expect(user1QueryingUser2.watchlist).toHaveLength(0);
      expect(user1QueryingUser2.preferences).toHaveLength(0);
    });

    it('should prevent SQL injection in authorization checks', async () => {
      const maliciousInputs = [
        "1' OR '1'='1",
        "'; DROP TABLE users; --",
        "1 UNION SELECT * FROM users",
        "1'; UPDATE users SET role='admin' WHERE id=1; --",
      ];

      const user = TestFactory.createUser({ role: 'user' });

      for (const maliciousInput of maliciousInputs) {
        // Attempt to use malicious input in various authorization contexts
        const results = await Promise.allSettled([
          TestUtils.checkPermission(user, maliciousInput),
          TestUtils.queryUserData(maliciousInput, user),
          TestUtils.canAccessResource(user, 'watchlist', maliciousInput),
        ]);

        // All operations should either fail safely or return empty results
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            // If operation succeeded, it should return safe/empty results
            expect(result.value).not.toBe(true); // Should not grant permissions
            if (Array.isArray(result.value)) {
              expect(result.value).toHaveLength(0); // Should return empty arrays
            }
          }
          // If operation failed, that's also acceptable for security
        });
      }
    });

    it('should implement secure field-level permissions', async () => {
      const user = TestFactory.createUser();
      const admin = TestFactory.createUser({ role: 'admin' });

      const sensitiveUserFields = [
        'hashedPassword',
        'twoFactorSecret',
        'sessionTokens',
        'passwordResetToken',
        'emailVerificationToken',
      ];

      const publicUserFields = [
        'id',
        'email',
        'firstName',
        'lastName',
        'displayName',
        'avatar',
        'emailVerified',
        'createdAt',
      ];

      // Regular user querying their own data
      const userData = await TestUtils.getUserProfile(user.id, user);
      
      // Should include public fields
      publicUserFields.forEach(field => {
        expect(userData).toHaveProperty(field);
      });

      // Should NOT include sensitive fields
      sensitiveUserFields.forEach(field => {
        expect(userData).not.toHaveProperty(field);
      });

      // Admin querying user data
      const adminViewOfUser = await TestUtils.getUserProfile(user.id, admin);
      
      // Admin should see more fields but still not the most sensitive ones
      expect(adminViewOfUser).toHaveProperty('lastLoginAt');
      expect(adminViewOfUser).toHaveProperty('failedLoginAttempts');
      
      // But should still not see passwords or secrets
      expect(adminViewOfUser).not.toHaveProperty('hashedPassword');
      expect(adminViewOfUser).not.toHaveProperty('twoFactorSecret');
    });
  });

  describe('Content Access Control', () => {
    it('should implement content visibility rules', async () => {
      const publicContent = TestFactory.createContent({ visibility: 'public' });
      const restrictedContent = TestFactory.createContent({ visibility: 'restricted' });
      const privateContent = TestFactory.createContent({ visibility: 'private' });

      const anonymousUser = null;
      const regularUser = TestFactory.createUser({ role: 'user' });
      const moderator = TestFactory.createUser({ role: 'moderator' });

      // Test anonymous access
      expect(await TestUtils.canViewContent(anonymousUser, publicContent.id)).toBe(true);
      expect(await TestUtils.canViewContent(anonymousUser, restrictedContent.id)).toBe(false);
      expect(await TestUtils.canViewContent(anonymousUser, privateContent.id)).toBe(false);

      // Test regular user access
      expect(await TestUtils.canViewContent(regularUser, publicContent.id)).toBe(true);
      expect(await TestUtils.canViewContent(regularUser, restrictedContent.id)).toBe(true);
      expect(await TestUtils.canViewContent(regularUser, privateContent.id)).toBe(false);

      // Test moderator access
      expect(await TestUtils.canViewContent(moderator, publicContent.id)).toBe(true);
      expect(await TestUtils.canViewContent(moderator, restrictedContent.id)).toBe(true);
      expect(await TestUtils.canViewContent(moderator, privateContent.id)).toBe(true);
    });

    it('should enforce age restrictions', async () => {
      const matureContent = TestFactory.createContent({ 
        rating: 'R',
        ageRestriction: 17,
        contentWarnings: ['violence', 'mature_themes'],
      });

      const minorUser = TestFactory.createUser({ 
        dateOfBirth: new Date(Date.now() - 15 * 365 * 24 * 60 * 60 * 1000), // 15 years old
      });

      const adultUser = TestFactory.createUser({
        dateOfBirth: new Date(Date.now() - 25 * 365 * 24 * 60 * 60 * 1000), // 25 years old
      });

      // Minor should not be able to access mature content
      expect(await TestUtils.canViewContent(minorUser, matureContent.id)).toBe(false);

      // Adult should be able to access mature content
      expect(await TestUtils.canViewContent(adultUser, matureContent.id)).toBe(true);

      // Should require parental consent for minors
      const parentalConsentResult = await TestUtils.requestParentalConsent(
        minorUser.id,
        matureContent.id
      );
      expect(parentalConsentResult.requiresConsent).toBe(true);
    });

    it('should implement content moderation controls', async () => {
      const flaggedContent = TestFactory.createContent({ 
        moderationStatus: 'flagged',
        flags: ['inappropriate_content', 'copyright_violation'],
      });

      const suspendedContent = TestFactory.createContent({
        moderationStatus: 'suspended',
      });

      const regularUser = TestFactory.createUser({ role: 'user' });
      const moderator = TestFactory.createUser({ role: 'moderator' });

      // Regular users should not see flagged or suspended content
      expect(await TestUtils.canViewContent(regularUser, flaggedContent.id)).toBe(false);
      expect(await TestUtils.canViewContent(regularUser, suspendedContent.id)).toBe(false);

      // Moderators should be able to see flagged content for review
      expect(await TestUtils.canViewContent(moderator, flaggedContent.id)).toBe(true);
      expect(await TestUtils.canViewContent(moderator, suspendedContent.id)).toBe(true);
    });
  });

  describe('Cross-Origin and CSRF Protection', () => {
    it('should validate origin headers for sensitive operations', async () => {
      const user = TestFactory.createUser();
      const sensitiveOperations = [
        { method: 'POST', path: '/api/trpc/auth.logout' },
        { method: 'DELETE', path: '/api/trpc/user.deleteAccount' },
        { method: 'POST', path: '/api/trpc/user.changePassword' },
        { method: 'POST', path: '/api/trpc/admin.deleteUser' },
      ];

      const validOrigins = [
        'https://truecrime.app',
        'https://www.truecrime.app',
        'https://staging.truecrime.app',
      ];

      const invalidOrigins = [
        'https://malicious.com',
        'https://truecrime.evil.com',
        'http://localhost:3000', // HTTP not allowed in production
        null, // Missing origin
        '',
      ];

      for (const operation of sensitiveOperations) {
        // Valid origins should be accepted
        for (const origin of validOrigins) {
          const response = await TestUtils.makeAuthenticatedRequest(
            operation.path,
            user,
            {
              method: operation.method,
              headers: { Origin: origin },
            }
          );
          expect(response.statusCode).not.toBe(403);
        }

        // Invalid origins should be rejected
        for (const origin of invalidOrigins) {
          const response = await TestUtils.makeAuthenticatedRequest(
            operation.path,
            user,
            {
              method: operation.method,
              headers: { Origin: origin },
            }
          );
          expect(response.statusCode).toBe(403);
          expect(response.error.code).toBe('INVALID_ORIGIN');
        }
      }
    });

    it('should implement CSRF token validation', async () => {
      const user = TestFactory.createUser();
      
      // Get CSRF token first
      const tokenResponse = await TestUtils.makeAuthenticatedRequest(
        '/api/csrf-token',
        user,
        { method: 'GET' }
      );
      const csrfToken = tokenResponse.data.csrfToken;

      const protectedOperation = {
        method: 'POST',
        path: '/api/trpc/user.changePassword',
        body: {
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword456!',
        },
      };

      // Request with valid CSRF token should succeed
      const validResponse = await TestUtils.makeAuthenticatedRequest(
        protectedOperation.path,
        user,
        {
          ...protectedOperation,
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      expect(validResponse.statusCode).not.toBe(403);

      // Request without CSRF token should fail
      const noTokenResponse = await TestUtils.makeAuthenticatedRequest(
        protectedOperation.path,
        user,
        protectedOperation
      );
      expect(noTokenResponse.statusCode).toBe(403);
      expect(noTokenResponse.error.code).toBe('MISSING_CSRF_TOKEN');

      // Request with invalid CSRF token should fail
      const invalidTokenResponse = await TestUtils.makeAuthenticatedRequest(
        protectedOperation.path,
        user,
        {
          ...protectedOperation,
          headers: { 'X-CSRF-Token': 'invalid-token' },
        }
      );
      expect(invalidTokenResponse.statusCode).toBe(403);
      expect(invalidTokenResponse.error.code).toBe('INVALID_CSRF_TOKEN');
    });

    it('should implement same-site cookie policies', () => {
      const sessionCookie = TestUtils.createSessionCookie('test-session-token');
      
      // Session cookies should have secure attributes
      expect(sessionCookie).toMatch(/SameSite=Strict/);
      expect(sessionCookie).toMatch(/Secure/);
      expect(sessionCookie).toMatch(/HttpOnly/);

      // CSRF cookies should have different SameSite policy
      const csrfCookie = TestUtils.createCSRFCookie('csrf-token');
      expect(csrfCookie).toMatch(/SameSite=Lax/);
      expect(csrfCookie).toMatch(/Secure/);
    });
  });

  describe('Authorization Bypass Attempts', () => {
    it('should prevent parameter pollution attacks', async () => {
      const user = TestFactory.createUser({ role: 'user' });
      const adminUser = TestFactory.createUser({ role: 'admin' });

      // Attempt parameter pollution to escalate privileges
      const pollutionAttempts = [
        { userId: [user.id, adminUser.id] }, // Array injection
        { userId: user.id, role: 'admin' }, // Additional parameter
        { 'userId[]': user.id, 'role[]': 'admin' }, // Array notation
        { userId: `${user.id}&role=admin` }, // Query injection
      ];

      for (const attempt of pollutionAttempts) {
        const response = await TestUtils.makeAuthenticatedRequest(
          '/api/trpc/user.updateProfile',
          user,
          {
            method: 'PUT',
            body: attempt,
          }
        );

        // Should either fail or preserve original user context
        if (response.statusCode === 200) {
          expect(response.data.role).toBe('user'); // Role should not change
          expect(response.data.id).toBe(user.id); // Should not affect other users
        } else {
          expect(response.statusCode).toBe(400); // Should reject malformed request
        }
      }
    });

    it('should prevent HTTP method override attacks', async () => {
      const user = TestFactory.createUser({ role: 'user' });
      
      // Attempt to use method override to bypass restrictions
      const methodOverrideAttempts = [
        { method: 'POST', headers: { 'X-HTTP-Method-Override': 'DELETE' } },
        { method: 'GET', headers: { 'X-Method-Override': 'POST' } },
        { method: 'POST', body: { _method: 'DELETE' } },
      ];

      for (const attempt of methodOverrideAttempts) {
        const response = await TestUtils.makeAuthenticatedRequest(
          '/api/trpc/admin.deleteUser', // Admin-only endpoint
          user,
          attempt
        );

        // Should maintain original authorization check
        expect(response.statusCode).toBe(403);
        expect(response.error.code).toBe('FORBIDDEN');
      }
    });

    it('should prevent authorization header injection', async () => {
      const user = TestFactory.createUser({ role: 'user' });
      const adminToken = TestFactory.createJWTToken({
        userId: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
      });

      // Attempt to inject additional authorization headers
      const injectionAttempts = [
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'X-Authorization': `Bearer ${adminToken}`,
          },
        },
        {
          headers: {
            'Authorization': [`Bearer ${user.token}`, `Bearer ${adminToken}`],
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${user.token}\nAuthorization: Bearer ${adminToken}`,
          },
        },
      ];

      for (const attempt of injectionAttempts) {
        const response = await TestUtils.makeRequest(
          '/api/trpc/admin.getUsers',
          {
            method: 'GET',
            headers: attempt.headers,
          }
        );

        // Should use only the first/primary authorization header
        expect(response.statusCode).toBe(403);
        expect(response.error.code).toBe('FORBIDDEN');
      }
    });

    it('should prevent session fixation through authorization bypass', async () => {
      const maliciousSession = 'fixed-session-id-12345';
      
      // Attempt to fix session during login
      const loginResponse = await TestUtils.makeRequest('/api/trpc/auth.login', {
        method: 'POST',
        body: TestFactory.createLoginInput(),
        headers: {
          'Cookie': `session=${maliciousSession}`,
        },
      });

      // Should generate new session, not use the provided one
      expect(loginResponse.statusCode).toBe(200);
      expect(loginResponse.sessionToken).toBeDefined();
      expect(loginResponse.sessionToken).not.toBe(maliciousSession);
      
      // Response should include new session cookie
      const setCookieHeader = loginResponse.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader).not.toContain(maliciousSession);
    });
  });
});