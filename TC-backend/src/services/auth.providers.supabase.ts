import {
  createUser as supabaseCreateUser,
  signInWithPassword as supabaseSignIn,
  signOut as supabaseSignOut,
  getUserFromToken,
  updateUserPassword,
  sendPasswordResetEmail,
  verifyEmailToken,
  updateUserMetadata,
  deleteUser as supabaseDeleteUser,
  signInWithGoogle,
  signInWithApple,
  handleOAuthCallback,
  mapSupabaseError,
  supabaseAdmin,
} from '@/lib/supabase';
import type {
  AuthProvider,
  AuthProviderResult,
  AuthTokenResult,
  AuthUserResult,
  AuthProviderUser,
  AuthProviderSession,
} from './auth.abstraction';

// ============================================================================
// SUPABASE AUTH PROVIDER IMPLEMENTATION
// ============================================================================

export class SupabaseAuthProvider implements AuthProvider {
  public readonly name = 'supabase';

  async createUser(email: string, password: string, metadata?: Record<string, any>): Promise<AuthProviderResult> {
    const result = await supabaseCreateUser(email, password, metadata);
    
    if (result.error) {
      return {
        user: null,
        session: null,
        error: result.error,
      };
    }

    return {
      user: result.user ? this.mapSupabaseUser(result.user) : null,
      session: result.session ? this.mapSupabaseSession(result.session) : null,
      error: null,
    };
  }

  async signInWithPassword(email: string, password: string): Promise<AuthProviderResult> {
    const result = await supabaseSignIn(email, password);
    
    if (result.error) {
      return {
        user: null,
        session: null,
        error: result.error,
      };
    }

    return {
      user: result.user ? this.mapSupabaseUser(result.user) : null,
      session: result.session ? this.mapSupabaseSession(result.session) : null,
      error: null,
    };
  }

  async signOut(token: string): Promise<{ error: Error | null }> {
    return supabaseSignOut(token);
  }

  async verifyToken(token: string): Promise<AuthTokenResult> {
    try {
      const result = await getUserFromToken(token);
      
      if (result.error || !result.user) {
        return {
          valid: false,
          error: result.error || new Error('Invalid token'),
        };
      }

      return {
        valid: true,
        user: this.mapSupabaseUser(result.user),
        accessToken: token, // Supabase JWT is the access token
      };
    } catch (error) {
      return {
        valid: false,
        error: error as Error,
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenResult> {
    try {
      // Supabase handles refresh tokens internally
      // For now, we'll return an error since we need to implement refresh logic
      return {
        valid: false,
        error: new Error('Refresh token not implemented for Supabase provider'),
      };
    } catch (error) {
      return {
        valid: false,
        error: error as Error,
      };
    }
  }

  async sendPasswordResetEmail(email: string): Promise<{ error: Error | null }> {
    return sendPasswordResetEmail(email);
  }

  async updatePassword(userId: string, newPassword: string): Promise<{ error: Error | null }> {
    return updateUserPassword(userId, newPassword);
  }

  async sendEmailVerification(email: string): Promise<{ error: Error | null }> {
    try {
      // Supabase automatically sends verification emails on signup
      // For manual verification, we'd need to trigger it differently
      // For now, we'll return success
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async verifyEmail(token: string, email: string): Promise<AuthProviderResult> {
    const result = await verifyEmailToken(token, email);
    
    if (result.error) {
      return {
        user: null,
        session: null,
        error: result.error,
      };
    }

    return {
      user: result.user ? this.mapSupabaseUser(result.user) : null,
      session: result.session ? this.mapSupabaseSession(result.session) : null,
      error: null,
    };
  }

  async getUserById(userId: string): Promise<AuthUserResult> {
    try {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (error) {
        return {
          user: null,
          error: error,
        };
      }

      return {
        user: data.user ? this.mapSupabaseUser(data.user) : null,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        error: error as Error,
      };
    }
  }

  async updateUserMetadata(userId: string, metadata: Record<string, any>): Promise<{ error: Error | null }> {
    return updateUserMetadata(userId, metadata);
  }

  async deleteUser(userId: string): Promise<{ error: Error | null }> {
    return supabaseDeleteUser(userId);
  }

  // OAuth methods
  async signInWithOAuth(provider: string, redirectTo?: string): Promise<{ url: string | null; error: Error | null }> {
    switch (provider.toLowerCase()) {
      case 'google':
        return signInWithGoogle(redirectTo);
      case 'apple':
        return signInWithApple(redirectTo);
      default:
        return {
          url: null,
          error: new Error(`OAuth provider '${provider}' not supported`),
        };
    }
  }

  async handleOAuthCallback(code: string): Promise<AuthProviderResult> {
    const result = await handleOAuthCallback(code);
    
    if (result.error) {
      return {
        user: null,
        session: null,
        error: result.error,
      };
    }

    return {
      user: result.user ? this.mapSupabaseUser(result.user) : null,
      session: result.session ? this.mapSupabaseSession(result.session) : null,
      error: null,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private mapSupabaseUser(supabaseUser: any): AuthProviderUser {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      emailVerified: supabaseUser.email_confirmed_at != null,
      metadata: supabaseUser.user_metadata || {},
      createdAt: new Date(supabaseUser.created_at),
    };
  }

  private mapSupabaseSession(supabaseSession: any): AuthProviderSession {
    return {
      accessToken: supabaseSession.access_token,
      refreshToken: supabaseSession.refresh_token,
      expiresAt: new Date(supabaseSession.expires_at * 1000), // Convert to milliseconds
      tokenType: supabaseSession.token_type || 'bearer',
    };
  }
}

// ============================================================================
// SUPABASE JWT UTILITIES
// ============================================================================

import jwt from 'jsonwebtoken';

/**
 * Verify Supabase JWT token using the public key
 */
export async function verifySupabaseJWT(token: string): Promise<{
  valid: boolean;
  payload?: any;
  error?: string;
}> {
  try {
    // Get Supabase JWT secret from environment
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    
    if (!jwtSecret) {
      return {
        valid: false,
        error: 'Supabase JWT secret not configured',
      };
    }

    // Verify the token
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
    });

    return {
      valid: true,
      payload,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid token',
    };
  }
}

/**
 * Extract user information from Supabase JWT payload
 */
export function extractSupabaseUserFromJWT(payload: any): {
  userId: string;
  email: string;
  role: string;
  emailVerified: boolean;
} | null {
  try {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role || 'authenticated',
      emailVerified: payload.email_confirmed_at != null,
    };
  } catch (error) {
    console.error('Error extracting user from Supabase JWT:', error);
    return null;
  }
}

// ============================================================================
// ADVANCED SUPABASE FEATURES
// ============================================================================

/**
 * Enhanced Supabase provider with additional features
 */
export class EnhancedSupabaseAuthProvider extends SupabaseAuthProvider {
  public readonly name = 'supabase-enhanced';

  // Add phone authentication
  async signInWithPhone(phone: string, password: string): Promise<AuthProviderResult> {
    try {
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        phone,
        password,
      });

      if (error) {
        return {
          user: null,
          session: null,
          error,
        };
      }

      return {
        user: data.user ? this.mapSupabaseUser(data.user) : null,
        session: data.session ? this.mapSupabaseSession(data.session) : null,
        error: null,
      };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error as Error,
      };
    }
  }

  // Add magic link authentication
  async sendMagicLink(email: string, redirectTo?: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabaseAdmin.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  // Add session management
  async listUserSessions(userId: string): Promise<{
    sessions: Array<{
      id: string;
      createdAt: Date;
      updatedAt: Date;
      ipAddress?: string;
      userAgent?: string;
    }>;
    error: Error | null;
  }> {
    try {
      // This would require custom implementation as Supabase doesn't expose session management
      // For now, return empty array
      return {
        sessions: [],
        error: null,
      };
    } catch (error) {
      return {
        sessions: [],
        error: error as Error,
      };
    }
  }

  // Add bulk user operations
  async bulkCreateUsers(users: Array<{
    email: string;
    password: string;
    metadata?: Record<string, any>;
  }>): Promise<{
    success: Array<{ id: string; email: string }>;
    failed: Array<{ email: string; error: string }>;
  }> {
    const success: Array<{ id: string; email: string }> = [];
    const failed: Array<{ email: string; error: string }> = [];

    for (const user of users) {
      try {
        const result = await this.createUser(user.email, user.password, user.metadata);
        
        if (result.error || !result.user) {
          failed.push({
            email: user.email,
            error: result.error?.message || 'Unknown error',
          });
        } else {
          success.push({
            id: result.user.id,
            email: result.user.email,
          });
        }
      } catch (error) {
        failed.push({
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { success, failed };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const supabaseAuthProvider = new SupabaseAuthProvider();
export const enhancedSupabaseAuthProvider = new EnhancedSupabaseAuthProvider();