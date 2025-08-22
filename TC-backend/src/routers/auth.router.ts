import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '@/lib/trpc';
import { authService } from '@/services/auth.service';
import { TRPCError } from '@trpc/server';
import type { User, UserPreferences } from '@/lib/prisma';

// Type for user with included preferences
type UserWithPreferences = User & { preferences: UserPreferences | null };

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const registerSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  firstName: z
    .string()
    .max(50, 'First name must be less than 50 characters')
    .optional()
    .transform(val => val?.trim() || undefined),
  lastName: z
    .string()
    .max(50, 'Last name must be less than 50 characters')
    .optional()
    .transform(val => val?.trim() || undefined),
  displayName: z
    .string()
    .max(100, 'Display name must be less than 100 characters')
    .optional()
    .transform(val => val?.trim() || undefined),
});

const loginSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

const passwordResetSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .toLowerCase()
    .trim(),
});

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

const authResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    displayName: z.string().nullable(),
    avatar: z.string().nullable(),
    emailVerified: z.boolean(),
    isActive: z.boolean(),
    createdAt: z.date(),
    lastLoginAt: z.date().nullable(),
    preferences: z.object({
      theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']),
      emailNotifications: z.boolean(),
      pushNotifications: z.boolean(),
    }).nullable(),
  }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.date(),
    refreshExpiresAt: z.date(),
  }),
  session: z.object({
    id: z.string(),
    expiresAt: z.date(),
  }),
});

const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  displayName: z.string().nullable(),
  avatar: z.string().nullable(),
  emailVerified: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.date(),
  lastLoginAt: z.date().nullable(),
  lastActivityAt: z.date().nullable(),
  preferences: z.object({
    theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']),
    emailNotifications: z.boolean(),
    pushNotifications: z.boolean(),
    weeklyDigest: z.boolean(),
    newContentAlerts: z.boolean(),
    socialNotifications: z.boolean(),
    explicitContent: z.boolean(),
    contentWarnings: z.boolean(),
    autoplayTrailers: z.boolean(),
    recommendBasedOnFriends: z.boolean(),
    includeWatchedContent: z.boolean(),
    language: z.string(),
    region: z.string(),
    compactMode: z.boolean(),
  }).nullable(),
});

// ============================================================================
// AUTHENTICATION ROUTER
// ============================================================================

export const authRouter = router({
  // ============================================================================
  // PUBLIC ENDPOINTS (No authentication required)
  // ============================================================================

  /**
   * Register a new user account
   */
  register: publicProcedure
    .input(registerSchema)
    .output(authResponseSchema)
    .meta({
      openapi: {
        method: 'POST',
        path: '/auth/register',
        tags: ['Authentication'],
        summary: 'Register a new user account',
        description: 'Create a new user account with email and password',
      },
    })
    .mutation(async ({ input, ctx }) => {
      try {
        // Transform input to match service interface
        const serviceInput: {
          email: string;
          password: string;
          firstName?: string;
          lastName?: string;
          displayName?: string;
        } = {
          email: input.email,
          password: input.password,
        };
        
        if (input.firstName !== undefined) {
          serviceInput.firstName = input.firstName;
        }
        if (input.lastName !== undefined) {
          serviceInput.lastName = input.lastName;
        }
        if (input.displayName !== undefined) {
          serviceInput.displayName = input.displayName;
        }
        
        const result = await authService.registerUser(serviceInput);
        
        // Set session cookie
        if (ctx.setCookie) {
          ctx.setCookie('session', result.tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: result.tokens.expiresAt,
          });
        }

        return {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            displayName: result.user.displayName,
            avatar: result.user.avatar,
            emailVerified: result.user.emailVerified,
            isActive: result.user.isActive,
            createdAt: result.user.createdAt,
            lastLoginAt: result.user.lastLoginAt,
            preferences: (result.user as UserWithPreferences).preferences ? {
              theme: (result.user as UserWithPreferences).preferences!.theme,
              emailNotifications: (result.user as UserWithPreferences).preferences!.emailNotifications,
              pushNotifications: (result.user as UserWithPreferences).preferences!.pushNotifications,
            } : null,
          },
          tokens: result.tokens,
          session: {
            id: result.session.id,
            expiresAt: result.session.expiresAt,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Registration error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during registration',
        });
      }
    }),

  /**
   * Login with email and password
   */
  login: publicProcedure
    .input(loginSchema)
    .output(authResponseSchema)
    .meta({
      openapi: {
        method: 'POST',
        path: '/auth/login',
        tags: ['Authentication'],
        summary: 'Login with email and password',
        description: 'Authenticate user and return access tokens',
      },
    })
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await authService.loginUser(input);

        // Set session cookie
        if (ctx.setCookie) {
          const cookieExpiry = input.rememberMe 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            : result.tokens.expiresAt;

          ctx.setCookie('session', result.tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: cookieExpiry,
          });
        }

        return {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            displayName: result.user.displayName,
            avatar: result.user.avatar,
            emailVerified: result.user.emailVerified,
            isActive: result.user.isActive,
            createdAt: result.user.createdAt,
            lastLoginAt: result.user.lastLoginAt,
            preferences: (result.user as UserWithPreferences).preferences ? {
              theme: (result.user as UserWithPreferences).preferences!.theme,
              emailNotifications: (result.user as UserWithPreferences).preferences!.emailNotifications,
              pushNotifications: (result.user as UserWithPreferences).preferences!.pushNotifications,
            } : null,
          },
          tokens: result.tokens,
          session: {
            id: result.session.id,
            expiresAt: result.session.expiresAt,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Login error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during login',
        });
      }
    }),

  /**
   * Request password reset
   */
  requestPasswordReset: publicProcedure
    .input(passwordResetSchema)
    .output(z.object({ message: z.string() }))
    .meta({
      openapi: {
        method: 'POST',
        path: '/auth/password-reset/request',
        tags: ['Authentication'],
        summary: 'Request password reset',
        description: 'Send password reset email to user',
      },
    })
    .mutation(async ({ input }) => {
      try {
        await authService.requestPasswordReset(input);
        
        return {
          message: 'If an account with this email exists, a password reset link has been sent.',
        };
      } catch (error) {
        console.error('Password reset request error:', error);
        // Always return success message for security
        return {
          message: 'If an account with this email exists, a password reset link has been sent.',
        };
      }
    }),

  /**
   * Confirm password reset with token
   */
  confirmPasswordReset: publicProcedure
    .input(passwordResetConfirmSchema)
    .output(z.object({ message: z.string() }))
    .meta({
      openapi: {
        method: 'POST',
        path: '/auth/password-reset/confirm',
        tags: ['Authentication'],
        summary: 'Confirm password reset',
        description: 'Reset password using token from email',
      },
    })
    .mutation(async ({ input }) => {
      try {
        await authService.confirmPasswordReset(input);
        
        return {
          message: 'Your password has been successfully reset. You can now sign in with your new password.',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Password reset confirmation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while resetting your password',
        });
      }
    }),

  /**
   * Refresh access token
   */
  refresh: publicProcedure
    .input(refreshTokenSchema)
    .output(z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      expiresAt: z.date(),
      refreshExpiresAt: z.date(),
    }))
    .meta({
      openapi: {
        method: 'POST',
        path: '/auth/refresh',
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description: 'Get new access token using refresh token',
      },
    })
    .mutation(async ({ input, ctx }) => {
      try {
        const tokens = await authService.refreshTokens(input.refreshToken);

        // Update session cookie
        if (ctx.setCookie) {
          ctx.setCookie('session', tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: tokens.expiresAt,
          });
        }

        return tokens;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Token refresh error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while refreshing token',
        });
      }
    }),

  /**
   * Verify email address
   */
  verifyEmail: publicProcedure
    .input(verifyEmailSchema)
    .output(z.object({ message: z.string() }))
    .meta({
      openapi: {
        method: 'POST',
        path: '/auth/verify-email',
        tags: ['Authentication'],
        summary: 'Verify email address',
        description: 'Verify user email using token from email',
      },
    })
    .mutation(async ({ input }) => {
      try {
        await authService.verifyEmail(input);
        
        return {
          message: 'Your email address has been successfully verified.',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Email verification error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while verifying your email',
        });
      }
    }),

  // ============================================================================
  // PROTECTED ENDPOINTS (Authentication required)
  // ============================================================================

  /**
   * Get current user profile
   */
  me: protectedProcedure
    .output(userResponseSchema)
    .meta({
      openapi: {
        method: 'GET',
        path: '/auth/me',
        tags: ['Authentication'],
        summary: 'Get current user',
        description: 'Get authenticated user profile information',
      },
    })
    .query(async ({ ctx }) => {
      const user = ctx.user;
      
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        lastActivityAt: user.lastActivityAt,
        preferences: (user as UserWithPreferences).preferences,
      };
    }),

  /**
   * Logout current user
   */
  logout: protectedProcedure
    .output(z.object({ message: z.string() }))
    .meta({
      openapi: {
        method: 'POST',
        path: '/auth/logout',
        tags: ['Authentication'],
        summary: 'Logout current user',
        description: 'Invalidate current session and logout user',
      },
    })
    .mutation(async ({ ctx }) => {
      try {
        const sessionToken = ctx.sessionToken;
        
        if (sessionToken) {
          await authService.logoutUser(sessionToken);
        }

        // Clear session cookie
        if (ctx.setCookie) {
          ctx.setCookie('session', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: new Date(0),
          });
        }

        return {
          message: 'Successfully logged out',
        };
      } catch (error) {
        console.error('Logout error:', error);
        // Always return success for logout
        return {
          message: 'Successfully logged out',
        };
      }
    }),

  /**
   * Resend email verification
   */
  resendVerification: protectedProcedure
    .output(z.object({ message: z.string() }))
    .meta({
      openapi: {
        method: 'POST',
        path: '/auth/resend-verification',
        tags: ['Authentication'],
        summary: 'Resend email verification',
        description: 'Send new email verification link to user',
      },
    })
    .mutation(async ({ ctx }) => {
      try {
        const user = ctx.user;
        
        if (user.emailVerified) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Your email is already verified',
          });
        }

        await authService.sendEmailVerification({ email: user.email });
        
        return {
          message: 'A new verification email has been sent to your email address.',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Resend verification error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while sending verification email',
        });
      }
    }),

  /**
   * Get user sessions
   */
  sessions: protectedProcedure
    .output(z.array(z.object({
      id: z.string(),
      deviceInfo: z.string().nullable(),
      userAgent: z.string().nullable(),
      ipAddress: z.string().nullable(),
      location: z.string().nullable(),
      isActive: z.boolean(),
      createdAt: z.date(),
      lastActivityAt: z.date(),
      expiresAt: z.date(),
      isCurrent: z.boolean(),
    })))
    .meta({
      openapi: {
        method: 'GET',
        path: '/auth/sessions',
        tags: ['Authentication'],
        summary: 'Get user sessions',
        description: 'List all active sessions for the current user',
      },
    })
    .query(async ({ ctx }) => {
      const user = ctx.user;
      const currentSessionToken = ctx.sessionToken;

      const sessions = await authService.getUserSessions(user.id);
      
      return sessions.map(session => ({
        id: session.id,
        deviceInfo: session.deviceInfo,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        location: session.location,
        isActive: session.isActive,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt,
        isCurrent: session.sessionToken === currentSessionToken,
      }));
    }),

  /**
   * Revoke a session
   */
  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .output(z.object({ message: z.string() }))
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/auth/sessions/{sessionId}',
        tags: ['Authentication'],
        summary: 'Revoke user session',
        description: 'Invalidate a specific user session',
      },
    })
    .mutation(async ({ input, ctx }) => {
      try {
        const user = ctx.user;
        
        await authService.revokeUserSession(user.id, input.sessionId);
        
        return {
          message: 'Session has been successfully revoked',
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('Session revocation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred while revoking the session',
        });
      }
    }),
});