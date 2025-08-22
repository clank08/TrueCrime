import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AuthUser, Session } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// Environment variables validation
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

// Service role client for admin operations
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Anonymous client for public operations
export const supabaseClient: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

export interface SupabaseAuthResult {
  user: AuthUser | null;
  session: Session | null;
  error: Error | null;
}

/**
 * Create a user using email and password
 */
export async function createUser(
  email: string,
  password: string,
  metadata?: Record<string, any>
): Promise<SupabaseAuthResult> {
  try {
    const createUserData: {
      email: string;
      password: string;
      email_confirm: boolean;
      user_metadata?: Record<string, any>;
    } = {
      email,
      password,
      email_confirm: false, // We'll handle email verification separately
    };
    
    if (metadata !== undefined) {
      createUserData.user_metadata = metadata;
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser(createUserData);

    return {
      user: data.user,
      session: null,
      error: error,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as Error,
    };
  }
}

/**
 * Sign in a user with email and password
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<SupabaseAuthResult> {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error: error,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as Error,
    };
  }
}

/**
 * Sign out a user
 */
export async function signOut(accessToken: string): Promise<{ error: Error | null }> {
  try {
    // Create a temporary client with the user's session
    const userClient = createClient(supabaseUrl!, supabaseAnonKey!);
    await userClient.auth.setSession({
      access_token: accessToken,
      refresh_token: '', // We don't need the refresh token for sign out
    });

    const { error } = await userClient.auth.signOut();
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Get user by JWT token
 */
export async function getUserFromToken(token: string): Promise<{
  user: AuthUser | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    
    return {
      user: data.user,
      error: error,
    };
  } catch (error) {
    return {
      user: null,
      error: error as Error,
    };
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(
  userId: string,
  metadata: Record<string, any>
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: metadata,
    });

    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Confirm a user's email address in Supabase (admin function)
 */
export async function confirmUserEmail(userId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
    });

    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Verify email confirmation token
 */
export async function verifyEmailToken(
  token: string,
  email: string
): Promise<SupabaseAuthResult> {
  try {
    const { data, error } = await supabaseClient.auth.verifyOtp({
      token,
      type: 'email',
      email,
    });

    return {
      user: data.user,
      session: data.session,
      error: error,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as Error,
    };
  }
}

/**
 * Check if email is already registered
 */
export async function emailExists(email: string): Promise<{
  exists: boolean;
  error: Error | null;
}> {
  try {
    // Try to get user by email using admin client
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      return { exists: false, error };
    }

    const userExists = data.users.some(user => user.email === email);
    return { exists: userExists, error: null };
  } catch (error) {
    return { exists: false, error: error as Error };
  }
}

/**
 * Generate secure verification token
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate JWT token structure (basic validation)
 */
export function isValidJWTFormat(token: string): boolean {
  const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  return jwtRegex.test(token);
}

/**
 * Verify Supabase JWT token using the secret
 */
export async function verifySupabaseJWT(token: string): Promise<{
  valid: boolean;
  payload?: any;
  error?: string;
  user?: any;
}> {
  try {
    import('jsonwebtoken').then(async (jwt) => {
      const jwtSecret = process.env.SUPABASE_JWT_SECRET;
      
      if (!jwtSecret) {
        return {
          valid: false,
          error: 'Supabase JWT secret not configured',
        };
      }

      try {
        // Verify the token using Supabase JWT secret
        const payload = jwt.verify(token, jwtSecret, {
          algorithms: ['HS256'],
        }) as any;

        // Extract user information from the payload
        const user = {
          id: payload.sub,
          email: payload.email,
          emailVerified: payload.email_confirmed_at != null,
          role: payload.role || 'authenticated',
          aud: payload.aud,
          exp: payload.exp,
          iat: payload.iat,
          iss: payload.iss,
        };

        return {
          valid: true,
          payload,
          user,
        };
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : 'Invalid token',
        };
      }
    });

    // For now, use a synchronous version
    const jwt = require('jsonwebtoken');
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    
    if (!jwtSecret) {
      return {
        valid: false,
        error: 'Supabase JWT secret not configured',
      };
    }

    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
    }) as any;

    // Extract user information from the payload
    const user = {
      id: payload.sub,
      email: payload.email,
      emailVerified: payload.email_confirmed_at != null,
      role: payload.role || 'authenticated',
      aud: payload.aud,
      exp: payload.exp,
      iat: payload.iat,
      iss: payload.iss,
    };

    return {
      valid: true,
      payload,
      user,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}

/**
 * Get user from Supabase JWT token (alternative to API call)
 */
export async function getUserFromSupabaseJWT(token: string): Promise<{
  user: any | null;
  error: Error | null;
}> {
  try {
    const verification = await verifySupabaseJWT(token);
    
    if (!verification.valid || !verification.user) {
      return {
        user: null,
        error: new Error(verification.error || 'Invalid token'),
      };
    }

    return {
      user: verification.user,
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error as Error,
    };
  }
}

// ============================================================================
// OAUTH PROVIDERS
// ============================================================================

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(redirectTo?: string): Promise<{
  url: string | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || `${process.env.FRONTEND_URL}/auth/callback`,
        scopes: 'email profile',
      },
    });

    return {
      url: data.url,
      error: error,
    };
  } catch (error) {
    return {
      url: null,
      error: error as Error,
    };
  }
}

/**
 * Sign in with Apple OAuth
 */
export async function signInWithApple(redirectTo?: string): Promise<{
  url: string | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectTo || `${process.env.FRONTEND_URL}/auth/callback`,
        scopes: 'email name',
      },
    });

    return {
      url: data.url,
      error: error,
    };
  } catch (error) {
    return {
      url: null,
      error: error as Error,
    };
  }
}

/**
 * Handle OAuth callback
 */
export async function handleOAuthCallback(
  code: string,
  _codeVerifier?: string
): Promise<SupabaseAuthResult> {
  try {
    const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);

    return {
      user: data.user,
      session: data.session,
      error: error,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as Error,
    };
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface AuthError {
  code: string;
  message: string;
  statusCode: number;
}

export function mapSupabaseError(error: unknown): AuthError {
  if (!error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      statusCode: 500,
    };
  }

  const errorObj = error as Record<string, unknown>;
  const errorCode = (errorObj?.error_code as string) || (errorObj?.code as string) || 'UNKNOWN_ERROR';
  const errorMessage = (errorObj?.message as string) || 'An error occurred during authentication';

  // Map common Supabase errors to our error codes
  const errorMap: Record<string, { message: string; statusCode: number }> = {
    'invalid_credentials': {
      message: 'Invalid email or password',
      statusCode: 401,
    },
    'email_not_confirmed': {
      message: 'Please verify your email address before signing in',
      statusCode: 401,
    },
    'signup_disabled': {
      message: 'Account registration is currently disabled',
      statusCode: 403,
    },
    'email_address_invalid': {
      message: 'Please enter a valid email address',
      statusCode: 400,
    },
    'password_too_short': {
      message: 'Password must be at least 8 characters long',
      statusCode: 400,
    },
    'user_already_registered': {
      message: 'An account with this email address already exists',
      statusCode: 409,
    },
    'user_not_found': {
      message: 'No account found with this email address',
      statusCode: 404,
    },
    'session_not_found': {
      message: 'Your session has expired. Please sign in again',
      statusCode: 401,
    },
  };

  const mapped = errorMap[errorCode];
  
  return {
    code: errorCode,
    message: mapped?.message || errorMessage,
    statusCode: mapped?.statusCode || 500,
  };
}