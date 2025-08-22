import { FastifyRequest, FastifyReply } from 'fastify';
import { TRPCError } from '@trpc/server';
import { authService } from '@/services/auth.service';
import { extractTokenFromHeader, verifyAccessToken } from '@/lib/jwt';
import { getUserFromToken } from '@/lib/supabase';
import type { User } from '@/lib/prisma';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthenticatedRequest extends FastifyRequest {
  user?: User;
  sessionToken?: string;
  tokenType?: 'internal' | 'supabase';
}

export interface AuthOptions {
  required?: boolean;
  verifyEmail?: boolean;
  allowSupabase?: boolean;
  skipInactive?: boolean;
}

// ============================================================================
// MAIN AUTH MIDDLEWARE
// ============================================================================

/**
 * Main authentication middleware that handles both internal JWTs and Supabase JWTs
 * This provides flexibility for future migration while maintaining current functionality
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  options: AuthOptions = {}
): Promise<{ user?: User; sessionToken?: string; tokenType?: 'internal' | 'supabase' }> {
  const {
    required = false,
    verifyEmail = false,
    allowSupabase = true,
    skipInactive = false,
  } = options;

  let sessionToken: string | null = null;
  let user: User | null = null;
  let tokenType: 'internal' | 'supabase' | undefined;

  // Extract token from Authorization header or cookie
  sessionToken = extractTokenFromHeader(request.headers.authorization);
  
  if (!sessionToken && request.cookies?.session) {
    sessionToken = request.cookies.session;
  }

  if (!sessionToken) {
    if (required) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required',
      });
    }
    return { user: undefined, sessionToken: undefined, tokenType: undefined };
  }

  // Try to authenticate with our internal JWT system first
  try {
    user = await authService.getUserFromSession(sessionToken);
    if (user) {
      tokenType = 'internal';
    }
  } catch (error) {
    console.log('Internal JWT validation failed, trying Supabase JWT...');
  }

  // If internal auth failed and Supabase is allowed, try Supabase JWT
  if (!user && allowSupabase) {
    try {
      const supabaseResult = await getUserFromToken(sessionToken);
      if (supabaseResult.user && !supabaseResult.error) {
        // Try to find corresponding user in our database by Supabase ID
        user = await authService.getUserBySupabaseId(supabaseResult.user.id);
        if (user) {
          tokenType = 'supabase';
        }
      }
    } catch (error) {
      console.log('Supabase JWT validation failed:', error);
    }
  }

  // Handle authentication requirements
  if (!user) {
    if (required) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authentication token',
      });
    }
    return { user: undefined, sessionToken: undefined, tokenType: undefined };
  }

  // Check if user account is active
  if (!skipInactive && (!user.isActive || user.isSuspended)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Your account has been suspended. Please contact support.',
    });
  }

  // Check email verification if required
  if (verifyEmail && !user.emailVerified) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Please verify your email address to access this resource',
    });
  }

  return { user, sessionToken, tokenType };
}

// ============================================================================
// SPECIALIZED MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Middleware that requires authentication
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ user: User; sessionToken: string; tokenType: 'internal' | 'supabase' }> {
  const result = await authMiddleware(request, reply, { required: true });
  
  return {
    user: result.user!,
    sessionToken: result.sessionToken!,
    tokenType: result.tokenType!,
  };
}

/**
 * Middleware that requires authentication and email verification
 */
export async function requireVerifiedAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ user: User; sessionToken: string; tokenType: 'internal' | 'supabase' }> {
  const result = await authMiddleware(request, reply, { 
    required: true, 
    verifyEmail: true 
  });
  
  return {
    user: result.user!,
    sessionToken: result.sessionToken!,
    tokenType: result.tokenType!,
  };
}

/**
 * Middleware for optional authentication
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ user?: User; sessionToken?: string; tokenType?: 'internal' | 'supabase' }> {
  return authMiddleware(request, reply, { required: false });
}

/**
 * Middleware that only allows internal JWTs (not Supabase)
 */
export async function requireInternalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ user: User; sessionToken: string; tokenType: 'internal' }> {
  const result = await authMiddleware(request, reply, { 
    required: true, 
    allowSupabase: false 
  });
  
  if (result.tokenType !== 'internal') {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'This endpoint requires internal authentication',
    });
  }
  
  return {
    user: result.user!,
    sessionToken: result.sessionToken!,
    tokenType: 'internal',
  };
}

// ============================================================================
// FASTIFY HOOK HELPERS
// ============================================================================

/**
 * Create a Fastify preHandler hook for authentication
 */
export function createAuthHook(options: AuthOptions = {}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await authMiddleware(request, reply, options);
    
    // Attach auth info to request
    (request as AuthenticatedRequest).user = result.user;
    (request as AuthenticatedRequest).sessionToken = result.sessionToken;
    (request as AuthenticatedRequest).tokenType = result.tokenType;
  };
}

/**
 * Create a hook that requires authentication
 */
export const requireAuthHook = createAuthHook({ required: true });

/**
 * Create a hook that requires verified authentication
 */
export const requireVerifiedAuthHook = createAuthHook({ 
  required: true, 
  verifyEmail: true 
});

/**
 * Create a hook for optional authentication
 */
export const optionalAuthHook = createAuthHook({ required: false });

// ============================================================================
// ROLE-BASED ACCESS CONTROL (Future Extension)
// ============================================================================

export interface RoleOptions {
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

/**
 * Middleware for role-based access control
 * This is a placeholder for future implementation
 */
export async function requireRole(
  request: FastifyRequest,
  reply: FastifyReply,
  roleOptions: RoleOptions
): Promise<{ user: User; sessionToken: string; tokenType: 'internal' | 'supabase' }> {
  const authResult = await requireAuth(request, reply);
  
  // TODO: Implement role checking when we add role system
  // For now, just return the auth result
  const { requiredRoles, requiredPermissions } = roleOptions;
  
  if (requiredRoles && requiredRoles.length > 0) {
    // Future: Check user roles against required roles
    console.log('Role checking not yet implemented for:', requiredRoles);
  }
  
  if (requiredPermissions && requiredPermissions.length > 0) {
    // Future: Check user permissions against required permissions
    console.log('Permission checking not yet implemented for:', requiredPermissions);
  }
  
  return authResult;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract user IP address from request
 */
export function extractClientIP(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  const realIP = request.headers['x-real-ip'];
  const clientIP = request.ip;
  
  if (typeof forwarded === 'string') {
    const firstIP = forwarded.split(',')[0];
    return firstIP?.trim() ?? 'unknown';
  }
  
  if (typeof realIP === 'string') {
    return realIP;
  }
  
  return clientIP || 'unknown';
}

/**
 * Extract user agent from request
 */
export function extractUserAgent(request: FastifyRequest): string {
  return request.headers['user-agent'] || 'unknown';
}

/**
 * Create session metadata from request
 */
export function createSessionMetadata(request: FastifyRequest): {
  ipAddress: string;
  userAgent: string;
  deviceInfo?: string;
} {
  const ipAddress = extractClientIP(request);
  const userAgent = extractUserAgent(request);
  
  // Basic device detection (could be enhanced)
  let deviceInfo: string | undefined;
  if (userAgent.toLowerCase().includes('mobile')) {
    deviceInfo = 'Mobile';
  } else if (userAgent.toLowerCase().includes('tablet')) {
    deviceInfo = 'Tablet';
  } else {
    deviceInfo = 'Desktop';
  }
  
  return {
    ipAddress,
    userAgent,
    deviceInfo,
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Standardized auth error responses
 */
export const AuthErrors = {
  MISSING_TOKEN: new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'Authentication token is required',
  }),
  
  INVALID_TOKEN: new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'Invalid or expired authentication token',
  }),
  
  EMAIL_NOT_VERIFIED: new TRPCError({
    code: 'FORBIDDEN',
    message: 'Please verify your email address to access this resource',
  }),
  
  ACCOUNT_SUSPENDED: new TRPCError({
    code: 'FORBIDDEN',
    message: 'Your account has been suspended. Please contact support.',
  }),
  
  INSUFFICIENT_PERMISSIONS: new TRPCError({
    code: 'FORBIDDEN',
    message: 'You do not have permission to access this resource',
  }),
  
  INTERNAL_AUTH_REQUIRED: new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'This endpoint requires internal authentication',
  }),
} as const;