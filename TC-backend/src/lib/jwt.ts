import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import type { User } from '@prisma/client';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

if (!JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required');
}

// ============================================================================
// TYPES
// ============================================================================

export interface JWTPayload {
  userId: string;
  email: string;
  supabaseId?: string;
  role?: string;
  permissions?: string[];
  sessionId?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

export interface DecodedToken extends JWTPayload {
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface DecodedRefreshToken {
  userId: string;
  sessionId: string;
  type: 'refresh';
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: DecodedToken | DecodedRefreshToken;
  error?: string;
  expired?: boolean;
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate JWT token pair (access + refresh tokens)
 */
export function generateTokenPair(
  payload: JWTPayload,
  sessionId?: string
): TokenPair {
  const now = new Date();
  const accessTokenPayload = {
    ...payload,
    sessionId: sessionId || crypto.randomUUID(),
  };

  // Generate access token
  const secret = JWT_SECRET as string;
  const options: SignOptions = {
    expiresIn: parseExpirationTime(JWT_EXPIRES_IN) / 1000, // Convert to seconds
    issuer: 'truecrime-api',
    audience: 'truecrime-app',
  };
  const accessToken = jwt.sign(accessTokenPayload, secret, options);

  // Generate refresh token with different payload
  const refreshTokenPayload = {
    userId: payload.userId,
    sessionId: accessTokenPayload.sessionId,
    type: 'refresh',
  };

  const refreshSecret = JWT_REFRESH_SECRET as string;
  const refreshOptions: SignOptions = {
    expiresIn: parseExpirationTime(JWT_REFRESH_EXPIRES_IN) / 1000, // Convert to seconds
    issuer: 'truecrime-api',
    audience: 'truecrime-app',
  };
  const refreshToken = jwt.sign(refreshTokenPayload, refreshSecret, refreshOptions);

  // Calculate expiration dates
  const accessExpiresAt = new Date(now.getTime() + parseExpirationTime(JWT_EXPIRES_IN));
  const refreshExpiresAt = new Date(now.getTime() + parseExpirationTime(JWT_REFRESH_EXPIRES_IN));

  return {
    accessToken,
    refreshToken,
    expiresAt: accessExpiresAt,
    refreshExpiresAt: refreshExpiresAt,
  };
}

/**
 * Generate a simple access token (for specific use cases)
 */
export function generateAccessToken(payload: JWTPayload): string {
  const secret = JWT_SECRET as string;
  const options: SignOptions = {
    expiresIn: parseExpirationTime(JWT_EXPIRES_IN) / 1000, // Convert to seconds
    issuer: 'truecrime-api',
    audience: 'truecrime-app',
  };
  return jwt.sign(payload, secret, options);
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(userId: string, sessionId: string): string {
  const payload = {
    userId,
    sessionId,
    type: 'refresh',
  };

  const refreshSecret = JWT_REFRESH_SECRET as string;
  const refreshOptions: SignOptions = {
    expiresIn: parseExpirationTime(JWT_REFRESH_EXPIRES_IN) / 1000, // Convert to seconds
    issuer: 'truecrime-api',
    audience: 'truecrime-app',
  };
  return jwt.sign(payload, refreshSecret, refreshOptions);
}

// ============================================================================
// TOKEN VALIDATION
// ============================================================================

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token: string): TokenValidationResult {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string, {
      issuer: 'truecrime-api',
      audience: 'truecrime-app',
    }) as DecodedToken;

    return {
      valid: true,
      payload: decoded,
    };
  } catch (error: unknown) {
    const expired = error instanceof Error && error.name === 'TokenExpiredError';
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      valid: false,
      error: message,
      expired,
    };
  }
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string): TokenValidationResult {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET as string, {
      issuer: 'truecrime-api',
      audience: 'truecrime-app',
    }) as DecodedRefreshToken;

    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      return {
        valid: false,
        error: 'Invalid token type',
      };
    }

    return {
      valid: true,
      payload: decoded,
    };
  } catch (error: unknown) {
    const expired = error instanceof Error && error.name === 'TokenExpiredError';
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      valid: false,
      error: message,
      expired,
    };
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  const token = parts[1];
  // Return null if token is empty or just whitespace
  return token && token.trim() ? token : null;
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeTokenUnsafe(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

// ============================================================================
// TOKEN REFRESH
// ============================================================================

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  userPayload: JWTPayload
): Promise<{
  success: boolean;
  tokens?: TokenPair;
  error?: string;
}> {
  // Verify refresh token
  const refreshResult = verifyRefreshToken(refreshToken);
  
  if (!refreshResult.valid) {
    return {
      success: false,
      error: refreshResult.error || 'Invalid refresh token',
    };
  }

  // Ensure refresh token belongs to the user
  if (refreshResult.payload?.userId !== userPayload.userId) {
    return {
      success: false,
      error: 'Token user mismatch',
    };
  }

  // Generate new token pair
  const newTokens = generateTokenPair(userPayload, refreshResult.payload?.sessionId);

  return {
    success: true,
    tokens: newTokens,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse expiration time string to milliseconds
 */
function parseExpirationTime(expiresIn: string): number {
  const units: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiration time format: ${expiresIn}`);
  }

  const [, value, unit] = match;
  
  if (!unit || !value) {
    throw new Error(`Invalid expiration time format: ${expiresIn}`);
  }
  
  const multiplier = units[unit];
  
  if (multiplier === undefined) {
    throw new Error(`Unknown time unit: ${unit}`);
  }

  return parseInt(value, 10) * multiplier;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
}

/**
 * Get token expiration date
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
}

/**
 * Generate secure session ID
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash token for secure storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Compare hashed token
 */
export function compareHashedToken(token: string, hashedToken: string): boolean {
  const tokenHash = hashToken(token);
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash, 'hex'),
    Buffer.from(hashedToken, 'hex')
  );
}

// ============================================================================
// USER PAYLOAD BUILDERS
// ============================================================================

/**
 * Create JWT payload from User model
 */
export function createUserPayload(
  user: User,
  sessionId?: string
): JWTPayload {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: 'user', // Default role, could be extended
    permissions: ['user:read', 'user:update'], // Basic permissions
  };
  
  if (sessionId !== undefined) {
    payload.sessionId = sessionId;
  }
  
  return payload;
}

/**
 * Create minimal JWT payload for refresh operations
 */
export function createMinimalPayload(userId: string, email: string): JWTPayload {
  return {
    userId,
    email,
    role: 'user',
    permissions: ['user:read'],
  };
}

// ============================================================================
// BLACKLIST MANAGEMENT (for token revocation)
// ============================================================================

// In-memory blacklist (in production, use Redis)
const tokenBlacklist = new Set<string>();

/**
 * Add token to blacklist
 */
export function blacklistToken(tokenId: string): void {
  tokenBlacklist.add(tokenId);
}

/**
 * Check if token is blacklisted
 */
export function isTokenBlacklisted(tokenId: string): boolean {
  return tokenBlacklist.has(tokenId);
}

/**
 * Clear expired tokens from blacklist
 */
export function clearExpiredTokens(): void {
  // This would be more sophisticated in a real implementation
  // For now, we'll clear the entire blacklist periodically
  // const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
  
  // In a real implementation, we'd store token expiration times
  // and only remove truly expired tokens
  tokenBlacklist.clear();
}