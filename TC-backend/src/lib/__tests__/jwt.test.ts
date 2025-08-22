import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  generateTokenPair,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  refreshAccessToken,
  isTokenExpired,
  getTokenExpiration,
  createUserPayload,
  generateSecureToken,
  hashToken,
  compareHashedToken,
  decodeTokenUnsafe,
  generateSessionId,
  blacklistToken,
  isTokenBlacklisted,
  clearExpiredTokens,
  createMinimalPayload,
} from '../jwt';
import type { User } from '@prisma/client';

// Mock environment variables
vi.mock('process', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-for-testing-purposes-only',
    JWT_REFRESH_SECRET: 'test-refresh-jwt-secret-for-testing-purposes-only',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));

describe('JWT Utilities', () => {
  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'user',
    permissions: ['user:read', 'user:update'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', () => {
      const tokens = generateTokenPair(mockPayload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresAt');
      expect(tokens).toHaveProperty('refreshExpiresAt');

      // Verify tokens are valid JWT strings
      expect(tokens.accessToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);
      expect(tokens.refreshToken).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);

      // Verify expiration dates
      expect(tokens.expiresAt).toBeInstanceOf(Date);
      expect(tokens.refreshExpiresAt).toBeInstanceOf(Date);
      expect(tokens.refreshExpiresAt.getTime()).toBeGreaterThan(tokens.expiresAt.getTime());
    });

    it('should include sessionId in tokens when provided', () => {
      const sessionId = 'session-123';
      const tokens = generateTokenPair(mockPayload, sessionId);

      // Decode access token to check sessionId
      const decodedAccess = jwt.decode(tokens.accessToken) as any;
      expect(decodedAccess.sessionId).toBe(sessionId);

      // Decode refresh token to check sessionId
      const decodedRefresh = jwt.decode(tokens.refreshToken) as any;
      expect(decodedRefresh.sessionId).toBe(sessionId);
    });

    it('should generate unique sessionId when not provided', () => {
      const tokens1 = generateTokenPair(mockPayload);
      const tokens2 = generateTokenPair(mockPayload);

      const decoded1 = jwt.decode(tokens1.accessToken) as any;
      const decoded2 = jwt.decode(tokens2.accessToken) as any;

      expect(decoded1.sessionId).toBeDefined();
      expect(decoded2.sessionId).toBeDefined();
      expect(decoded1.sessionId).not.toBe(decoded2.sessionId);
    });
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockPayload);

      expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);

      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.role).toBe(mockPayload.role);
      expect(decoded.iss).toBe('truecrime-api');
      expect(decoded.aud).toBe('truecrime-app');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const userId = 'user-123';
      const sessionId = 'session-123';
      const token = generateRefreshToken(userId, sessionId);

      expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/);

      const decoded = jwt.decode(token) as any;
      expect(decoded.userId).toBe(userId);
      expect(decoded.sessionId).toBe(sessionId);
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = generateAccessToken(mockPayload);
      const result = verifyAccessToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.userId).toBe(mockPayload.userId);
      expect(result.payload?.email).toBe(mockPayload.email);
    });

    it('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const result = verifyAccessToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.payload).toBeUndefined();
    });

    it('should detect expired token', async () => {
      // Create token with very short expiry
      const shortLivedToken = jwt.sign(
        mockPayload,
        process.env.JWT_SECRET!,
        {
          expiresIn: '1ms',
          issuer: 'truecrime-api',
          audience: 'truecrime-app',
        }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = verifyAccessToken(shortLivedToken);

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.error).toContain('expired');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const userId = 'user-123';
      const sessionId = 'session-123';
      const token = generateRefreshToken(userId, sessionId);
      const result = verifyRefreshToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.userId).toBe(userId);
      expect(result.payload?.sessionId).toBe(sessionId);
    });

    it('should reject non-refresh token', () => {
      const accessToken = generateAccessToken(mockPayload);
      const result = verifyRefreshToken(accessToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid signature');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Authorization header', () => {
      const token = 'valid-jwt-token';
      const authHeader = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(authHeader);

      expect(extracted).toBe(token);
    });

    it('should return null for invalid header format', () => {
      expect(extractTokenFromHeader('InvalidFormat token')).toBeNull();
      expect(extractTokenFromHeader('Bearer')).toBeNull();
      expect(extractTokenFromHeader('')).toBeNull();
      expect(extractTokenFromHeader(undefined)).toBeNull();
    });

    it('should return null for malformed Bearer token', () => {
      expect(extractTokenFromHeader('Bearer token1 token2')).toBeNull();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const userId = 'user-123';
      const sessionId = 'session-123';
      const refreshToken = generateRefreshToken(userId, sessionId);
      const userPayload = { ...mockPayload, userId };

      const result = await refreshAccessToken(refreshToken, userPayload);

      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBeDefined();
      expect(result.tokens?.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const invalidToken = 'invalid.refresh.token';
      const result = await refreshAccessToken(invalidToken, mockPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.tokens).toBeUndefined();
    });

    it('should reject refresh token for different user', async () => {
      const userId = 'user-123';
      const sessionId = 'session-123';
      const refreshToken = generateRefreshToken(userId, sessionId);
      const differentUserPayload = { ...mockPayload, userId: 'different-user' };

      const result = await refreshAccessToken(refreshToken, differentUserPayload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token user mismatch');
    });
  });

  describe('isTokenExpired', () => {
    it('should detect expired token', async () => {
      const expiredToken = jwt.sign(
        mockPayload,
        process.env.JWT_SECRET!,
        {
          expiresIn: '1ms',
          issuer: 'truecrime-api',
          audience: 'truecrime-app',
        }
      );

      await new Promise(resolve => setTimeout(resolve, 200));
      expect(isTokenExpired(expiredToken)).toBe(true);
    });

    it('should detect valid token', () => {
      const validToken = generateAccessToken(mockPayload);
      expect(isTokenExpired(validToken)).toBe(false);
    });

    it('should return true for invalid token', () => {
      expect(isTokenExpired('invalid.token')).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const token = generateAccessToken(mockPayload);
      const expiration = getTokenExpiration(token);

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      expect(getTokenExpiration('invalid.token')).toBeNull();
    });
  });

  describe('createUserPayload', () => {
    it('should create payload from user object', () => {
      const user = mockUser as User;
      const sessionId = 'session-123';
      const payload = createUserPayload(user, sessionId);

      expect(payload).toEqual({
        userId: user.id,
        email: user.email,
        role: 'user',
        permissions: ['user:read', 'user:update'],
        sessionId,
      });
    });

    it('should create payload without sessionId', () => {
      const user = mockUser as User;
      const payload = createUserPayload(user);

      expect(payload).toEqual({
        userId: user.id,
        email: user.email,
        role: 'user',
        permissions: ['user:read', 'user:update'],
        sessionId: undefined,
      });
    });
  });

  describe('generateSecureToken', () => {
    it('should generate secure random token', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      expect(token1).toHaveLength(64); // 32 bytes * 2 (hex)
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
      expect(token1).toMatch(/^[a-f0-9]+$/);
    });

    it('should generate token with custom length', () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes * 2 (hex)
    });
  });

  describe('hashToken and compareHashedToken', () => {
    it('should hash token and verify correctly', () => {
      const token = 'test-token-123';
      const hashedToken = hashToken(token);

      expect(hashedToken).not.toBe(token);
      expect(hashedToken).toHaveLength(64); // SHA-256 hex length
      expect(compareHashedToken(token, hashedToken)).toBe(true);
    });

    it('should fail verification with wrong token', () => {
      const token = 'test-token-123';
      const wrongToken = 'wrong-token-456';
      const hashedToken = hashToken(token);

      expect(compareHashedToken(wrongToken, hashedToken)).toBe(false);
    });

    it('should produce same hash for same input', () => {
      const token = 'test-token-123';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2);
    });

    it('should handle empty string', () => {
      const emptyToken = '';
      const hashedToken = hashToken(emptyToken);

      expect(hashedToken).toHaveLength(64);
      expect(compareHashedToken(emptyToken, hashedToken)).toBe(true);
    });

    it('should handle unicode characters', () => {
      const unicodeToken = '🔒test-token-123🔑';
      const hashedToken = hashToken(unicodeToken);

      expect(hashedToken).toHaveLength(64);
      expect(compareHashedToken(unicodeToken, hashedToken)).toBe(true);
    });
  });

  describe('decodeTokenUnsafe', () => {
    it('should decode valid token without verification', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = decodeTokenUnsafe(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.format';
      const decoded = decodeTokenUnsafe(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should decode expired token', () => {
      const expiredToken = jwt.sign(
        mockPayload,
        process.env.JWT_SECRET!,
        {
          expiresIn: '1ms',
          issuer: 'truecrime-api',
          audience: 'truecrime-app',
        }
      );

      const decoded = decodeTokenUnsafe(expiredToken);
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(mockPayload.userId);
    });
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('blacklist functionality', () => {
    beforeEach(() => {
      // Clear blacklist before each test
      clearExpiredTokens();
    });

    it('should blacklist and check tokens', () => {
      const tokenId = 'test-token-id';

      expect(isTokenBlacklisted(tokenId)).toBe(false);
      
      blacklistToken(tokenId);
      
      expect(isTokenBlacklisted(tokenId)).toBe(true);
    });

    it('should clear blacklisted tokens', () => {
      const tokenId = 'test-token-id';
      
      blacklistToken(tokenId);
      expect(isTokenBlacklisted(tokenId)).toBe(true);
      
      clearExpiredTokens();
      expect(isTokenBlacklisted(tokenId)).toBe(false);
    });
  });

  describe('createMinimalPayload', () => {
    it('should create minimal payload correctly', () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      
      const payload = createMinimalPayload(userId, email);

      expect(payload).toEqual({
        userId,
        email,
        role: 'user',
        permissions: ['user:read'],
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed JWT in verifyAccessToken', () => {
      const malformedToken = 'not.a.valid.jwt.token';
      const result = verifyAccessToken(malformedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle JWT with wrong issuer', () => {
      const wrongIssuerToken = jwt.sign(
        mockPayload,
        process.env.JWT_SECRET!,
        {
          expiresIn: '15m',
          issuer: 'wrong-issuer',
          audience: 'truecrime-app',
        }
      );

      const result = verifyAccessToken(wrongIssuerToken);
      expect(result.valid).toBe(false);
    });

    it('should handle JWT with wrong audience', () => {
      const wrongAudienceToken = jwt.sign(
        mockPayload,
        process.env.JWT_SECRET!,
        {
          expiresIn: '15m',
          issuer: 'truecrime-api',
          audience: 'wrong-audience',
        }
      );

      const result = verifyAccessToken(wrongAudienceToken);
      expect(result.valid).toBe(false);
    });

    it('should handle empty authorization header parts', () => {
      expect(extractTokenFromHeader('Bearer ')).toBeNull();
      expect(extractTokenFromHeader(' Bearer token')).toBeNull();
      expect(extractTokenFromHeader('Bearer token extra parts')).toBeNull();
    });
  });
});