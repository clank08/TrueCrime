import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import type { FastifyRequest, FastifyReply } from 'fastify';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { authService } from '@/services/auth.service';
import { extractTokenFromHeader } from '@/lib/jwt';
import { getUserFromSupabaseJWT } from '@/lib/supabase';
import type { User } from '@/lib/prisma';
import { cache, cacheDurations } from '@/lib/cache';
import { monitoring, performanceTimer } from '@/lib/monitoring';

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================


export interface Context {
  req: FastifyRequest;
  res: FastifyReply;
  user: User | undefined;
  sessionToken: string | undefined;
  tokenType: 'internal' | 'supabase' | undefined;
  setCookie: (name: string, value: string, options?: any) => void;
  cache: typeof cache;
  timer: typeof performanceTimer;
}

/**
 * Create tRPC context from Fastify request/response
 */
export async function createContext({
  req,
  res,
}: CreateFastifyContextOptions): Promise<Context> {
  // Extract authorization token
  let sessionToken: string | null = null;
  let user: User | null = null;
  let tokenType: 'internal' | 'supabase' | undefined;

  // Try to get token from Authorization header first
  sessionToken = extractTokenFromHeader(req.headers.authorization);
  
  // If no Authorization header, try to get from cookie
  if (!sessionToken && req.cookies?.session) {
    sessionToken = req.cookies.session;
  }

  // If we have a token, try to authenticate with multiple methods
  if (sessionToken) {
    try {
      // First, try internal JWT authentication
      user = await authService.getUserFromSession(sessionToken);
      if (user) {
        tokenType = 'internal';
      }
    } catch (error) {
      // Internal auth failed, try Supabase JWT
      if (process.env.NODE_ENV === 'development') {
        console.log('Internal JWT auth failed, attempting Supabase JWT validation...');
      }
    }

    // If internal auth failed, try Supabase JWT validation
    if (!user) {
      try {
        const supabaseResult = await getUserFromSupabaseJWT(sessionToken);
        if (supabaseResult.user && !supabaseResult.error) {
          // Try to find corresponding user in our database by Supabase ID
          user = await authService.getUserBySupabaseId(supabaseResult.user.id);
          if (user) {
            tokenType = 'supabase';
            if (process.env.NODE_ENV === 'development') {
              console.log(`Authenticated user ${user.email} via Supabase JWT`);
            }
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Supabase JWT validation also failed:', error);
        }
        // Don't throw here - let the protected procedures handle authentication
      }
    }
  }

  // Helper function to set cookies
  const setCookie = (name: string, value: string, options?: any) => {
    res.setCookie(name, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...options,
    });
  };

  return {
    req,
    res,
    user: user ?? undefined,
    sessionToken: sessionToken ?? undefined,
    tokenType,
    setCookie,
    cache,
    timer: performanceTimer,
  };
}

// ============================================================================
// TRPC INITIALIZATION
// ============================================================================

const t = initTRPC.context<Context>().create({
  // transformer: superjson, // Temporarily disabled for testing
  errorFormatter(opts) {
    const { shape, error } = opts;
    
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Performance monitoring middleware
 */
const performanceTracking = t.middleware(async ({ ctx, path, type, next }) => {
  const label = `trpc.${type}.${path}`;
  
  return ctx.timer.measure(label, async () => {
    const result = await next();
    
    await monitoring.trackAPIPerformance({
      endpoint: `/${path}`,
      method: type.toUpperCase(),
      statusCode: 200, // tRPC success
      duration: 0, // Will be filled by the timer
      timestamp: Date.now(),
    });
    
    return result;
  });
});

/**
 * Logging middleware
 */
const logging = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  
  try {
    const result = await next();
    const durationMs = Date.now() - start;
    
    console.log(`✅ ${type.toUpperCase()} ${path} - ${durationMs}ms`);
    
    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    
    console.error(`❌ ${type.toUpperCase()} ${path} - ${durationMs}ms`, error);
    
    throw error;
  }
});

/**
 * Authentication middleware
 */
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  if (!ctx.user.isActive) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Your account has been suspended. Please contact support.',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // Type-safe user object
    },
  });
});

/**
 * Email verification middleware
 */
const isEmailVerified = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  if (!ctx.user.emailVerified) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must verify your email address to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Admin role middleware
 */
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  // TODO: Implement role-based authorization
  // For now, we'll just check if user is active
  if (!ctx.user.isActive) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// ============================================================================
// PROCEDURE BUILDERS
// ============================================================================

/**
 * Base router factory
 */
export const router = t.router;

/**
 * Public procedure (no authentication required)
 */
export const publicProcedure = t.procedure
  .use(performanceTracking)
  .use(logging);

/**
 * Protected procedure (authentication required)
 */
export const protectedProcedure = t.procedure
  .use(performanceTracking)
  .use(logging)
  .use(isAuthed);

/**
 * Verified procedure (authentication + email verification required)
 */
export const verifiedProcedure = t.procedure
  .use(performanceTracking)
  .use(logging)
  .use(isAuthed)
  .use(isEmailVerified);

/**
 * Admin procedure (admin role required)
 */
export const adminProcedure = t.procedure
  .use(performanceTracking)
  .use(logging)
  .use(isAuthed)
  .use(isAdmin);

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Router = typeof router;
export type Procedure = typeof publicProcedure;
export type ProtectedProcedure = typeof protectedProcedure;
export type VerifiedProcedure = typeof verifiedProcedure;
export type AdminProcedure = typeof adminProcedure;

// ============================================================================
// ERROR HANDLING HELPERS
// ============================================================================

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: TRPCError['code'],
  message: string,
  cause?: unknown
): TRPCError {
  return new TRPCError({
    code,
    message,
    cause,
  });
}

/**
 * Handle database errors
 */
export function handleDatabaseError(error: unknown): TRPCError {
  console.error('Database error:', error);
  
  if (error instanceof Error) {
    // Handle specific Prisma errors
    if (error.message.includes('Unique constraint')) {
      return new TRPCError({
        code: 'CONFLICT',
        message: 'A record with this information already exists',
        cause: error,
      });
    }
    
    if (error.message.includes('Record not found')) {
      return new TRPCError({
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
        cause: error,
      });
    }
    
    if (error.message.includes('Foreign key constraint')) {
      return new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid reference to related resource',
        cause: error,
      });
    }
  }
  
  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected database error occurred',
    cause: error,
  });
}

/**
 * Handle validation errors
 */
export function handleValidationError(error: ZodError): TRPCError {
  const firstError = error.errors[0];
  const message = firstError 
    ? `${firstError.path.join('.')}: ${firstError.message}`
    : 'Invalid input data';
    
  return new TRPCError({
    code: 'BAD_REQUEST',
    message,
    cause: error,
  });
}

// ============================================================================
// CONTEXT HELPERS
// ============================================================================

/**
 * Get client IP address from context
 */
export function getClientIP(ctx: Context): string {
  const forwarded = ctx.req.headers['x-forwarded-for'];
  const realIP = ctx.req.headers['x-real-ip'];
  const clientIP = ctx.req.ip;
  
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
 * Get user agent from context
 */
export function getUserAgent(ctx: Context): string {
  return ctx.req.headers['user-agent'] || 'unknown';
}

/**
 * Get request metadata for logging/analytics
 */
export function getRequestMetadata(ctx: Context) {
  return {
    ip: getClientIP(ctx),
    userAgent: getUserAgent(ctx),
    method: ctx.req.method,
    url: ctx.req.url,
    userId: ctx.user?.id || null,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// CACHING HELPERS
// ============================================================================

/**
 * Create a cached procedure that automatically caches results
 */
export function withCaching<TInput, TOutput>(
  procedure: any,
  keyGenerator: (input: TInput, ctx: Context) => string,
  ttl: number = cacheDurations.standard,
  options?: { tags?: string[] }
) {
  // If procedure doesn't have a use method, it's already built, so return it as is
  if (!procedure.use) {
    return procedure;
  }
  
  return procedure.use(async ({ ctx, input, next }: { ctx: Context; input: TInput; next: () => Promise<TOutput> }) => {
    const cacheKey = keyGenerator(input, ctx);
    
    // Try to get from cache first
    const cached = await ctx.cache.get<TOutput>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // If not in cache, execute the procedure
    const result = await next();
    
    // Cache the result
    const cacheOptions: { ttl: number; tags?: string[] } = { ttl };
    if (options?.tags) {
      cacheOptions.tags = options.tags;
    }
    await ctx.cache.set(cacheKey, result, cacheOptions);
    
    return result;
  });
}

/**
 * Invalidate cache for specific patterns or tags
 */
export async function invalidateCache(
  patterns?: string[],
  tags?: string[]
): Promise<void> {
  if (patterns) {
    for (const pattern of patterns) {
      await cache.invalidatePattern(pattern);
    }
  }
  
  if (tags) {
    for (const tag of tags) {
      await cache.invalidateTag(tag);
    }
  }
}

/**
 * User-specific cache key generator
 */
export function createUserCacheKey(
  prefix: string,
  userId: string | undefined,
  suffix?: string
): string {
  const userPart = userId || 'anonymous';
  return suffix ? `${prefix}:${userPart}:${suffix}` : `${prefix}:${userPart}`;
}