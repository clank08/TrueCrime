import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestFactory, TestUtils, TestPatterns } from '@/test';
import { createCallerFactory } from '@trpc/server';
import type { AppRouter } from '@/lib/trpc';

describe('Authentication Security Tests', () => {
  describe('JWT Token Security', () => {
    it('should reject malformed JWT tokens', async () => {
      const malformedTokens = [
        'not-a-jwt-token',
        'header.payload', // Missing signature
        'header.payload.signature.extra', // Too many parts
        '.payload.signature', // Empty header
        'header..signature', // Empty payload
        'header.payload.', // Empty signature
        'eyJhbGciOiJIUzI1NiJ9.invalid-base64.signature', // Invalid base64 payload
        'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9', // Missing payload and signature
        '', // Empty string
        'null',
        'undefined',
      ];

      malformedTokens.forEach(async (token) => {
        const result = await TestUtils.validateJWTToken(token);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(['MALFORMED_TOKEN', 'INVALID_FORMAT', 'DECODE_ERROR']).toContain(result.error);
      });
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = TestFactory.createJWTToken({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      });

      const result = await TestUtils.validateJWTToken(expiredToken);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOKEN_EXPIRED');
      expect(result.expired).toBe(true);
    });

    it('should reject tokens with invalid signature', async () => {
      const validToken = TestFactory.createJWTToken({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      });

      // Tamper with the signature
      const [header, payload] = validToken.split('.');
      const tamperedToken = `${header}.${payload}.invalid-signature`;

      const result = await TestUtils.validateJWTToken(tamperedToken);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');
    });

    it('should reject tokens with modified payload', async () => {
      const originalToken = TestFactory.createJWTToken({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        role: 'user',
      });

      // Extract parts and modify payload
      const [header, payload, signature] = originalToken.split('.');
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
      const modifiedPayload = { ...decodedPayload, role: 'admin' }; // Privilege escalation attempt
      const encodedModifiedPayload = Buffer.from(JSON.stringify(modifiedPayload)).toString('base64url');
      const tamperedToken = `${header}.${encodedModifiedPayload}.${signature}`;

      const result = await TestUtils.validateJWTToken(tamperedToken);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');
    });

    it('should validate token claims correctly', async () => {
      const validToken = TestFactory.createJWTToken({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'truecrime-api',
        aud: 'truecrime-app',
      });

      const result = await TestUtils.validateJWTToken(validToken);
      expect(result.valid).toBe(true);
      expect(result.claims).toBeDefined();
      expect(result.claims.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.claims.email).toBe('test@example.com');
      expect(result.claims.iss).toBe('truecrime-api');
      expect(result.claims.aud).toBe('truecrime-app');
    });

    it('should handle token without required claims', async () => {
      const tokenWithoutUserId = TestFactory.createJWTToken({
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        // Missing userId
      });

      const result = await TestUtils.validateJWTToken(tokenWithoutUserId);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_REQUIRED_CLAIMS');
    });

    it('should enforce token expiration window', async () => {
      // Test tokens that expire too far in the future (potential attack)
      const tokenWithExcessiveExpiration = TestFactory.createJWTToken({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
      });

      const result = await TestUtils.validateJWTToken(tokenWithExcessiveExpiration);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('EXCESSIVE_EXPIRATION');
    });

    it('should prevent token reuse after logout', async () => {
      const user = TestFactory.createUser();
      const token = TestFactory.createJWTToken({
        userId: user.id,
        email: user.email,
      });

      // Token should be valid initially
      let result = await TestUtils.validateJWTToken(token);
      expect(result.valid).toBe(true);

      // Simulate logout (add token to blacklist)
      await TestUtils.addTokenToBlacklist(token);

      // Token should be invalid after logout
      result = await TestUtils.validateJWTToken(token);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('TOKEN_BLACKLISTED');
    });

    it('should handle concurrent token validation', async () => {
      const tokens = Array.from({ length: 100 }, (_, index) =>
        TestFactory.createJWTToken({
          userId: `user-${index}`,
          email: `user${index}@example.com`,
        })
      );

      // Validate all tokens concurrently
      const validationPromises = tokens.map(token =>
        TestUtils.validateJWTToken(token)
      );

      const results = await Promise.all(validationPromises);

      // All tokens should be valid
      results.forEach((result, index) => {
        expect(result.valid).toBe(true);
        expect(result.claims.userId).toBe(`user-${index}`);
      });
    });
  });

  describe('Session Security', () => {
    it('should generate secure session tokens', () => {
      const sessionTokens = Array.from({ length: 100 }, () =>
        TestFactory.generateSessionToken()
      );

      sessionTokens.forEach(token => {
        // Token should be sufficiently long
        expect(token.length).toBeGreaterThanOrEqual(32);
        
        // Token should be cryptographically random (no obvious patterns)
        expect(token).not.toMatch(/(.)\1{5,}/); // No repeated characters
        expect(token).not.toMatch(/^[a-f0-9]+$/); // Not just hex
        expect(token).not.toMatch(/^[A-Za-z0-9]+$/); // Should include special chars
      });

      // All tokens should be unique
      const uniqueTokens = new Set(sessionTokens);
      expect(uniqueTokens.size).toBe(sessionTokens.length);
    });

    it('should enforce session expiration', async () => {
      const session = TestFactory.createUserSession({
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      const isValid = await TestUtils.validateSession(session.sessionToken);
      expect(isValid).toBe(false);
    });

    it('should invalidate sessions on password change', async () => {
      const user = TestFactory.createUser();
      const session1 = TestFactory.createUserSession({ userId: user.id });
      const session2 = TestFactory.createUserSession({ userId: user.id });

      // Both sessions should be valid initially
      expect(await TestUtils.validateSession(session1.sessionToken)).toBe(true);
      expect(await TestUtils.validateSession(session2.sessionToken)).toBe(true);

      // Simulate password change
      await TestUtils.simulatePasswordChange(user.id);

      // All sessions should be invalidated
      expect(await TestUtils.validateSession(session1.sessionToken)).toBe(false);
      expect(await TestUtils.validateSession(session2.sessionToken)).toBe(false);
    });

    it('should prevent session fixation attacks', async () => {
      const attackerSession = TestFactory.createUserSession({
        userId: null, // Not authenticated yet
        sessionToken: 'attacker-controlled-token',
      });

      // Attempt to authenticate with the attacker's session
      const loginResult = await TestUtils.simulateLogin({
        email: 'victim@example.com',
        password: 'password123',
        sessionToken: attackerSession.sessionToken,
      });

      // New session should be generated, not reuse the existing one
      expect(loginResult.sessionToken).not.toBe(attackerSession.sessionToken);
      expect(loginResult.sessionToken).toBeDefined();
    });

    it('should implement secure session storage', () => {
      const session = TestFactory.createUserSession();
      
      // Session data should not contain sensitive information
      expect(session).not.toHaveProperty('password');
      expect(session).not.toHaveProperty('hashedPassword');
      expect(session).not.toHaveProperty('twoFactorSecret');
      
      // Session should have security metadata
      expect(session).toHaveProperty('createdAt');
      expect(session).toHaveProperty('expiresAt');
      expect(session).toHaveProperty('lastActivityAt');
    });
  });

  describe('Password Security', () => {
    it('should enforce strong password requirements', () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'abc123',
        'password123',
        'test',
        '', // Empty password
        'a'.repeat(7), // Too short
        'PASSWORD', // No lowercase
        'password', // No uppercase
        'Password', // No numbers
        'Password1', // No special characters
      ];

      weakPasswords.forEach(password => {
        const validation = TestUtils.validatePasswordStrength(password);
        expect(validation.isStrong).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    it('should accept strong passwords', () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecure#Password456',
        'C0mpl3x_P@ssw0rd',
        'Unguessable!2023$Password',
      ];

      strongPasswords.forEach(password => {
        const validation = TestUtils.validatePasswordStrength(password);
        expect(validation.isStrong).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
    });

    it('should hash passwords securely', async () => {
      const password = 'TestPassword123!';
      const hash = await TestUtils.hashPassword(password);

      // Hash should not contain plaintext password
      expect(hash).not.toContain(password);
      expect(hash).not.toContain('TestPassword');
      expect(hash).not.toContain('123');

      // Hash should be sufficiently long (bcrypt produces 60 character hashes)
      expect(hash.length).toBeGreaterThanOrEqual(60);

      // Hash should start with bcrypt identifier
      expect(hash).toMatch(/^\$2[ab]\$/);
    });

    it('should verify passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await TestUtils.hashPassword(password);

      // Correct password should verify
      const validResult = await TestUtils.verifyPassword(password, hash);
      expect(validResult).toBe(true);

      // Wrong password should not verify
      const invalidResult = await TestUtils.verifyPassword('WrongPassword123!', hash);
      expect(invalidResult).toBe(false);
    });

    it('should prevent timing attacks on password verification', async () => {
      const password = 'TestPassword123!';
      const hash = await TestUtils.hashPassword(password);

      const timings: number[] = [];

      // Test multiple incorrect passwords
      const incorrectPasswords = [
        'a',
        'wrong',
        'completely-different-password',
        'TestPassword123!wrong',
        '',
      ];

      for (const wrongPassword of incorrectPasswords) {
        const startTime = process.hrtime.bigint();
        await TestUtils.verifyPassword(wrongPassword, hash);
        const endTime = process.hrtime.bigint();
        
        timings.push(Number(endTime - startTime) / 1000000); // Convert to ms
      }

      // Timing differences should be minimal (within reasonable variance)
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      const timingVariance = (maxTiming - minTiming) / minTiming;

      // Variance should be small (less than 50% difference)
      expect(timingVariance).toBeLessThan(0.5);
    });
  });

  describe('Two-Factor Authentication Security', () => {
    it('should generate secure TOTP secrets', () => {
      const secrets = Array.from({ length: 50 }, () =>
        TestFactory.generateTOTPSecret()
      );

      secrets.forEach(secret => {
        // Secret should be base32 encoded
        expect(secret).toMatch(/^[A-Z2-7]+$/);
        
        // Secret should be sufficiently long (160 bits = 32 base32 chars)
        expect(secret.length).toBeGreaterThanOrEqual(26);
      });

      // All secrets should be unique
      const uniqueSecrets = new Set(secrets);
      expect(uniqueSecrets.size).toBe(secrets.length);
    });

    it('should validate TOTP codes correctly', () => {
      const secret = TestFactory.generateTOTPSecret();
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Generate valid TOTP code for current time
      const validCode = TestUtils.generateTOTPCode(secret, currentTime);
      expect(TestUtils.validateTOTPCode(secret, validCode, currentTime)).toBe(true);

      // Code from 30 seconds ago should still be valid (time window)
      const oldCode = TestUtils.generateTOTPCode(secret, currentTime - 30);
      expect(TestUtils.validateTOTPCode(secret, oldCode, currentTime)).toBe(true);

      // Code from 90 seconds ago should be invalid
      const veryOldCode = TestUtils.generateTOTPCode(secret, currentTime - 90);
      expect(TestUtils.validateTOTPCode(secret, veryOldCode, currentTime)).toBe(false);

      // Invalid codes should be rejected
      expect(TestUtils.validateTOTPCode(secret, '000000', currentTime)).toBe(false);
      expect(TestUtils.validateTOTPCode(secret, '123456', currentTime)).toBe(false);
      expect(TestUtils.validateTOTPCode(secret, '', currentTime)).toBe(false);
    });

    it('should prevent TOTP code reuse', async () => {
      const user = TestFactory.createUser({ twoFactorEnabled: true });
      const secret = TestFactory.generateTOTPSecret();
      const code = TestUtils.generateTOTPCode(secret);

      // First use should succeed
      const firstAttempt = await TestUtils.consumeTOTPCode(user.id, code);
      expect(firstAttempt.success).toBe(true);

      // Second use of same code should fail
      const secondAttempt = await TestUtils.consumeTOTPCode(user.id, code);
      expect(secondAttempt.success).toBe(false);
      expect(secondAttempt.error).toBe('CODE_ALREADY_USED');
    });

    it('should implement backup codes securely', () => {
      const backupCodes = TestFactory.generateBackupCodes(10);

      expect(backupCodes).toHaveLength(10);
      
      backupCodes.forEach(code => {
        // Each code should be sufficiently long and random
        expect(code.length).toBeGreaterThanOrEqual(8);
        expect(code).toMatch(/^[A-Z0-9]+$/); // Alphanumeric, easy to type
      });

      // All codes should be unique
      const uniqueCodes = new Set(backupCodes);
      expect(uniqueCodes.size).toBe(backupCodes.length);
    });

    it('should handle backup code consumption', async () => {
      const user = TestFactory.createUser({ twoFactorEnabled: true });
      const backupCodes = TestFactory.generateBackupCodes(5);
      await TestUtils.storeBackupCodes(user.id, backupCodes);

      // Should be able to use each backup code once
      for (let i = 0; i < backupCodes.length; i++) {
        const result = await TestUtils.useBackupCode(user.id, backupCodes[i]);
        expect(result.success).toBe(true);
        expect(result.remainingCodes).toBe(backupCodes.length - i - 1);
      }

      // All codes should now be consumed
      const finalResult = await TestUtils.useBackupCode(user.id, backupCodes[0]);
      expect(finalResult.success).toBe(false);
      expect(finalResult.error).toBe('CODE_ALREADY_USED');
    });
  });

  describe('Account Security Policies', () => {
    it('should implement account lockout after failed login attempts', async () => {
      const user = TestFactory.createUser();
      const maxAttempts = 5;

      // Make failed login attempts
      for (let i = 0; i < maxAttempts; i++) {
        const result = await TestUtils.attemptLogin({
          email: user.email,
          password: 'wrong-password',
        });
        expect(result.success).toBe(false);
      }

      // Account should now be locked
      const lockoutResult = await TestUtils.attemptLogin({
        email: user.email,
        password: 'wrong-password',
      });
      expect(lockoutResult.success).toBe(false);
      expect(lockoutResult.error).toBe('ACCOUNT_LOCKED');

      // Even correct password should fail when locked
      const correctPasswordResult = await TestUtils.attemptLogin({
        email: user.email,
        password: 'TestPassword123!',
      });
      expect(correctPasswordResult.success).toBe(false);
      expect(correctPasswordResult.error).toBe('ACCOUNT_LOCKED');
    });

    it('should automatically unlock accounts after lockout period', async () => {
      const user = TestFactory.createUser();
      
      // Lock the account
      await TestUtils.lockAccount(user.id);
      
      // Should be locked immediately
      let result = await TestUtils.attemptLogin({
        email: user.email,
        password: 'TestPassword123!',
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe('ACCOUNT_LOCKED');

      // Advance time past lockout period (15 minutes)
      TestUtils.advanceTime(16 * 60 * 1000);

      // Should be unlocked after lockout period
      result = await TestUtils.attemptLogin({
        email: user.email,
        password: 'TestPassword123!',
      });
      expect(result.success).toBe(true);
    });

    it('should reset failed attempt counter on successful login', async () => {
      const user = TestFactory.createUser();

      // Make some failed attempts (but not enough to lock)
      for (let i = 0; i < 3; i++) {
        await TestUtils.attemptLogin({
          email: user.email,
          password: 'wrong-password',
        });
      }

      // Successful login should reset counter
      const successResult = await TestUtils.attemptLogin({
        email: user.email,
        password: 'TestPassword123!',
      });
      expect(successResult.success).toBe(true);

      // Should be able to make failed attempts again before locking
      for (let i = 0; i < 4; i++) {
        const result = await TestUtils.attemptLogin({
          email: user.email,
          password: 'wrong-password',
        });
        expect(result.success).toBe(false);
        expect(result.error).not.toBe('ACCOUNT_LOCKED'); // Should not be locked yet
      }
    });

    it('should enforce password expiration policies', async () => {
      const user = TestFactory.createUser({
        passwordUpdatedAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000), // 91 days ago
      });

      const loginResult = await TestUtils.attemptLogin({
        email: user.email,
        password: 'TestPassword123!',
      });

      expect(loginResult.success).toBe(false);
      expect(loginResult.error).toBe('PASSWORD_EXPIRED');
      expect(loginResult.requiresPasswordReset).toBe(true);
    });

    it('should detect suspicious login patterns', async () => {
      const user = TestFactory.createUser();

      // Simulate login from different locations rapidly
      const suspiciousAttempts = [
        { ip: '192.168.1.1', userAgent: 'Chrome/Windows', location: 'New York' },
        { ip: '10.0.0.1', userAgent: 'Firefox/Linux', location: 'London' },
        { ip: '172.16.0.1', userAgent: 'Safari/macOS', location: 'Tokyo' },
      ];

      const loginResults = await Promise.all(
        suspiciousAttempts.map(attempt =>
          TestUtils.attemptLogin({
            email: user.email,
            password: 'TestPassword123!',
            ip: attempt.ip,
            userAgent: attempt.userAgent,
          })
        )
      );

      // Should detect suspicious activity
      const lastResult = loginResults[loginResults.length - 1];
      expect(lastResult.suspiciousActivity).toBe(true);
      expect(lastResult.requiresAdditionalVerification).toBe(true);
    });
  });

  describe('Rate Limiting Security', () => {
    it('should implement progressive rate limiting for failed logins', async () => {
      const email = 'test@example.com';
      
      // First few attempts should have standard rate limit
      for (let i = 0; i < 3; i++) {
        const result = await TestUtils.attemptLogin({ email, password: 'wrong' });
        expect(result.rateLimitDelay).toBeLessThan(5000); // Less than 5 seconds
      }

      // After more failures, delay should increase
      for (let i = 3; i < 6; i++) {
        const result = await TestUtils.attemptLogin({ email, password: 'wrong' });
        expect(result.rateLimitDelay).toBeGreaterThan(5000); // More than 5 seconds
      }

      // After many failures, should have significant delay
      const result = await TestUtils.attemptLogin({ email, password: 'wrong' });
      expect(result.rateLimitDelay).toBeGreaterThan(30000); // More than 30 seconds
    });

    it('should implement IP-based rate limiting', async () => {
      const ip = '192.168.1.100';
      const requests = 50; // Above normal limit
      
      // Make many requests from same IP
      const results = await Promise.all(
        Array.from({ length: requests }, () =>
          TestUtils.makeRequest('/api/auth/login', { ip })
        )
      );

      // Should start rate limiting after threshold
      const rateLimitedResults = results.filter(r => r.statusCode === 429);
      expect(rateLimitedResults.length).toBeGreaterThan(10);
    });

    it('should implement CAPTCHA after suspicious activity', async () => {
      const ip = '192.168.1.101';
      
      // Generate suspicious activity (many rapid requests)
      await Promise.all(
        Array.from({ length: 20 }, () =>
          TestUtils.attemptLogin({
            email: 'nonexistent@example.com',
            password: 'password',
            ip,
          })
        )
      );

      // Next request should require CAPTCHA
      const result = await TestUtils.attemptLogin({
        email: 'real@example.com',
        password: 'password',
        ip,
      });

      expect(result.requiresCaptcha).toBe(true);
      expect(result.captchaChallenge).toBeDefined();
    });
  });
});