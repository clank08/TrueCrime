import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';
import type { User, UserSession } from '@/lib/prisma';
import {
  createUser,
  signInWithPassword,
  updateUserPassword,
  sendPasswordResetEmail,
  confirmUserEmail,
  mapSupabaseError,
} from '@/lib/supabase';
import {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  createUserPayload,
  generateSecureToken,
  hashToken,
  type TokenPair,
} from '@/lib/jwt';

// ============================================================================
// INTERFACES
// ============================================================================

export interface RegisterUserInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResult {
  user: User;
  tokens: TokenPair;
  session: UserSession;
}

export interface PasswordResetInput {
  email: string;
}

export interface PasswordResetConfirmInput {
  token: string;
  newPassword: string;
}

export interface EmailVerificationInput {
  email: string;
}

export interface VerifyEmailInput {
  token: string;
}

// ============================================================================
// AUTHENTICATION SERVICE CLASS
// ============================================================================

export class AuthService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly PASSWORD_MIN_LENGTH = 8;
  private readonly TOKEN_EXPIRY_HOURS = 24;

  /**
   * Register a new user
   */
  async registerUser(input: RegisterUserInput): Promise<AuthResult> {
    const { email, password, firstName, lastName, displayName } = input;

    // Validate input
    await this.validateRegistrationInput(input);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'An account with this email address already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.BCRYPT_ROUNDS);

    try {
      // Create user in Supabase
      const supabaseResult = await createUser(email, password, {
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
      });

      if (supabaseResult.error) {
        const mappedError = mapSupabaseError(supabaseResult.error);
        throw new TRPCError({
          code: mappedError.statusCode === 409 ? 'CONFLICT' : 'BAD_REQUEST',
          message: mappedError.message,
        });
      }

      // Create user in our database
      const user = await prisma.user.create({
        data: {
          id: supabaseResult.user?.id || crypto.randomUUID(),
          email: email.toLowerCase(),
          hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          displayName: displayName || `${firstName} ${lastName}`.trim() || null,
          emailVerified: false,
          isActive: true,
          preferences: {
            create: {
              // Default preferences
              emailNotifications: true,
              pushNotifications: true,
              theme: 'DARK',
            },
          },
        },
        include: {
          preferences: true,
        },
      });

      // Generate tokens
      const payload = createUserPayload(user);
      const tokens = generateTokenPair(payload);

      // Create session
      const session = await this.createUserSession(user.id, tokens);

      // Send verification email
      await this.sendVerificationEmail(user.email);

      return { user, tokens, session };
    } catch (error) {
      // Cleanup if database creation fails
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error('Registration error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create account. Please try again.',
      });
    }
  }

  /**
   * Login user with email and password
   */
  async loginUser(input: LoginUserInput): Promise<AuthResult> {
    const { email, password, rememberMe = false } = input;

    // Find user in our database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { preferences: true },
    });

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    // Check if account is active
    if (!user.isActive || user.isSuspended) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    // Verify password
    if (!user.hashedPassword) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Please sign in using your social account or reset your password',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordValid) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      });
    }

    // Sign in with Supabase
    const supabaseResult = await signInWithPassword(email, password);
    if (supabaseResult.error) {
      const mappedError = mapSupabaseError(supabaseResult.error);
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: mappedError.message,
      });
    }

    // Generate our tokens
    const payload = createUserPayload(user);
    const tokens = generateTokenPair(payload);

    // Create session
    const session = await this.createUserSession(user.id, tokens, { rememberMe });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

    return { user, tokens, session };
  }

  /**
   * Logout user
   */
  async logoutUser(sessionToken: string): Promise<void> {
    try {
      // Find and deactivate session
      const session = await prisma.userSession.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (session) {
        // Deactivate session in our database
        await prisma.userSession.update({
          where: { id: session.id },
          data: { isActive: false },
        });

        // Sign out from Supabase if we have a token
        // Note: We'd need to store the Supabase access token in the session
        // For now, we'll just handle our local session
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw error for logout - it should always succeed
    }
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const tokenResult = verifyRefreshToken(refreshToken);
    if (!tokenResult.valid || !tokenResult.payload) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid refresh token',
      });
    }

    // Find user and session
    const user = await prisma.user.findUnique({
      where: { id: tokenResult.payload.userId },
    });

    if (!user || !user.isActive) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not found or inactive',
      });
    }

    // Find session
    const session = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        refreshToken,
        isActive: true,
      },
    });

    if (!session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Session not found or expired',
      });
    }

    // Generate new tokens
    const payload = createUserPayload(user, session.id);
    const newTokens = generateTokenPair(payload);

    // Update session with new tokens
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        sessionToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresAt: newTokens.expiresAt,
        lastActivityAt: new Date(),
      },
    });

    // Update user activity
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActivityAt: new Date() },
    });

    return newTokens;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(input: PasswordResetInput): Promise<void> {
    const { email } = input;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return;
    }

    // Check if account is active
    if (!user.isActive) {
      return;
    }

    // Invalidate existing password reset tokens
    await prisma.passwordReset.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    // Generate reset token
    const token = generateSecureToken();
    const hashedToken = hashToken(token);

    // Create password reset record
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
      },
    });

    // Send reset email via Supabase
    await sendPasswordResetEmail(email);

    // TODO: Send our custom email with the token
    // For now, we rely on Supabase's email system
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(input: PasswordResetConfirmInput): Promise<void> {
    const { token, newPassword } = input;

    // Validate password
    this.validatePassword(newPassword);

    const hashedToken = hashToken(token);

    // Find valid password reset token
    const passwordReset = await prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!passwordReset) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid or expired password reset token',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    try {
      // Update password in our database
      await prisma.user.update({
        where: { id: passwordReset.userId },
        data: {
          hashedPassword,
          lastActivityAt: new Date(),
        },
      });

      // Update password in Supabase
      await updateUserPassword(passwordReset.userId, newPassword);

      // Mark token as used
      await prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      // Invalidate all user sessions (force re-login)
      await prisma.userSession.updateMany({
        where: { userId: passwordReset.userId },
        data: { isActive: false },
      });
    } catch (error) {
      console.error('Password reset error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reset password. Please try again.',
      });
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(input: EmailVerificationInput): Promise<void> {
    const { email } = input;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    if (user.emailVerified) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Email is already verified',
      });
    }

    await this.sendVerificationEmail(email);
  }

  /**
   * Verify email with token
   */
  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const { token } = input;

    const hashedToken = hashToken(token);

    // Find valid email verification token
    const emailVerification = await prisma.emailVerification.findFirst({
      where: {
        token: hashedToken,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!emailVerification) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid or expired verification token',
      });
    }

    try {
      // Update user as verified in our database
      await prisma.user.update({
        where: { id: emailVerification.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          lastActivityAt: new Date(),
        },
      });

      // Also confirm the user in Supabase
      const supabaseResult = await confirmUserEmail(emailVerification.userId);
      if (supabaseResult.error) {
        console.warn('Failed to confirm user in Supabase:', supabaseResult.error);
        // Don't throw error here - user is still verified in our system
      }

      // Mark token as used
      await prisma.emailVerification.update({
        where: { id: emailVerification.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Email verification error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to verify email. Please try again.',
      });
    }
  }

  /**
   * Get user from session token
   */
  async getUserFromSession(sessionToken: string): Promise<User | null> {
    // Verify token
    const tokenResult = verifyAccessToken(sessionToken);
    if (!tokenResult.valid || !tokenResult.payload) {
      return null;
    }

    // Find session
    const session = await prisma.userSession.findFirst({
      where: {
        sessionToken,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            preferences: true,
          },
        },
      },
    });

    if (!session || !session.user.isActive) {
      return null;
    }

    // Update last activity
    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastActivityAt: new Date() },
    });

    return session.user;
  }

  /**
   * Get user by Supabase ID (for Supabase JWT validation)
   */
  async getUserBySupabaseId(supabaseId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: supabaseId },
        include: { preferences: true },
      });

      if (user && user.isActive && !user.isSuspended) {
        // Update last activity for Supabase-authenticated users
        await prisma.user.update({
          where: { id: user.id },
          data: { lastActivityAt: new Date() },
        });

        return user;
      }

      return null;
    } catch (error) {
      console.error('Error fetching user by Supabase ID:', error);
      return null;
    }
  }

  /**
   * Get user by email (helper method)
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { preferences: true },
      });
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    return prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  /**
   * Revoke a user session
   */
  async revokeUserSession(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
        isActive: true,
      },
    });

    if (!session) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Session not found',
      });
    }

    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async validateRegistrationInput(input: RegisterUserInput): Promise<void> {
    const { email, password, firstName, lastName } = input;

    // Validate email
    if (!email || !this.isValidEmail(email)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Please provide a valid email address',
      });
    }

    // Validate password
    this.validatePassword(password);

    // Validate names (if provided)
    if (firstName && firstName.length > 50) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'First name must be less than 50 characters',
      });
    }

    if (lastName && lastName.length > 50) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Last name must be less than 50 characters',
      });
    }
  }

  private validatePassword(password: string): void {
    if (!password || password.length < this.PASSWORD_MIN_LENGTH) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Password must be at least ${this.PASSWORD_MIN_LENGTH} characters long`,
      });
    }

    // Additional password strength requirements
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      });
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async createUserSession(
    userId: string,
    tokens: TokenPair,
    options: { rememberMe?: boolean } = {}
  ): Promise<UserSession> {
    const { rememberMe = false } = options;

    // Calculate expiration (longer for "remember me")
    const expirationTime = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 7 * 24 * 60 * 60 * 1000;  // 7 days

    const expiresAt = new Date(Date.now() + expirationTime);

    return prisma.userSession.create({
      data: {
        userId,
        sessionToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        isActive: true,
      },
    });
  }

  private async sendVerificationEmail(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return;
    }

    // Invalidate existing verification tokens
    await prisma.emailVerification.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    // Generate verification token
    const token = generateSecureToken();
    const hashedToken = hashToken(token);

    // Create verification record
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        email: user.email,
        token: hashedToken,
        expiresAt: new Date(Date.now() + this.TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
      },
    });

    // TODO: Send verification email
    // For now, we'll log the token for development (only in dev mode)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Email verification token for ${email}: ${token}`);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();