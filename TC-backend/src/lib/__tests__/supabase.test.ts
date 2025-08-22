import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  createUser,
  signInWithPassword,
  signOut,
  getUserFromToken,
  updateUserPassword,
  updateUserMetadata,
  deleteUser,
  sendPasswordResetEmail,
  verifyEmailToken,
  emailExists,
  generateVerificationToken,
  isValidJWTFormat,
  signInWithGoogle,
  signInWithApple,
  handleOAuthCallback,
  mapSupabaseError,
  supabaseAdmin,
  supabaseClient,
} from '../supabase';

// Mock the createClient function
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

const mockCreateClient = createClient as MockedFunction<typeof createClient>;

describe('Supabase Integration', () => {
  let mockSupabaseAdmin: any;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Create mock clients
    mockSupabaseAdmin = {
      auth: {
        admin: {
          createUser: vi.fn(),
          updateUserById: vi.fn(),
          deleteUser: vi.fn(),
          listUsers: vi.fn(),
        },
        getUser: vi.fn(),
      },
    };

    mockSupabaseClient = {
      auth: {
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        setSession: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        verifyOtp: vi.fn(),
        signInWithOAuth: vi.fn(),
        exchangeCodeForSession: vi.fn(),
      },
    };

    // Mock createClient to return our mock clients
    mockCreateClient.mockImplementation((url, key, options) => {
      // Return admin client for service role key, client for anon key
      if (key === process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return mockSupabaseAdmin;
      }
      return mockSupabaseClient;
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createUser', () => {
    it('should successfully create a new user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
      };

      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await createUser('test@example.com', 'password123');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toBeNull();
      expect(result.error).toBeNull();
      expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        email_confirm: false,
      });
    });

    it('should create user with metadata', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
      };

      const metadata = {
        first_name: 'John',
        last_name: 'Doe',
      };

      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await createUser('test@example.com', 'password123', metadata);

      expect(result.user).toEqual(mockUser);
      expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        email_confirm: false,
        user_metadata: metadata,
      });
    });

    it('should handle Supabase errors', async () => {
      const mockError = new Error('User already exists');

      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const result = await createUser('test@example.com', 'password123');

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should handle thrown exceptions', async () => {
      const mockError = new Error('Network error');
      mockSupabaseAdmin.auth.admin.createUser.mockRejectedValue(mockError);

      const result = await createUser('test@example.com', 'password123');

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('signInWithPassword', () => {
    it('should successfully sign in user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockSession = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await signInWithPassword('test@example.com', 'password123');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle invalid credentials', async () => {
      const mockError = new Error('Invalid credentials');

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await signInWithPassword('test@example.com', 'wrongpassword');

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it('should handle thrown exceptions', async () => {
      const mockError = new Error('Network error');
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(mockError);

      const result = await signInWithPassword('test@example.com', 'password123');

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('signOut', () => {
    it('should successfully sign out user', async () => {
      const mockTempClient = {
        auth: {
          setSession: vi.fn().mockResolvedValue({}),
          signOut: vi.fn().mockResolvedValue({ error: null }),
        },
      };

      mockCreateClient.mockReturnValue(mockTempClient);

      const result = await signOut('access-token');

      expect(result.error).toBeNull();
      expect(mockTempClient.auth.setSession).toHaveBeenCalledWith({
        access_token: 'access-token',
        refresh_token: '',
      });
      expect(mockTempClient.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      const mockError = new Error('Sign out failed');
      const mockTempClient = {
        auth: {
          setSession: vi.fn().mockResolvedValue({}),
          signOut: vi.fn().mockResolvedValue({ error: mockError }),
        },
      };

      mockCreateClient.mockReturnValue(mockTempClient);

      const result = await signOut('access-token');

      expect(result.error).toEqual(mockError);
    });

    it('should handle thrown exceptions', async () => {
      const mockError = new Error('Network error');
      mockCreateClient.mockImplementation(() => {
        throw mockError;
      });

      const result = await signOut('access-token');

      expect(result.error).toEqual(mockError);
    });
  });

  describe('getUserFromToken', () => {
    it('should successfully get user from token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await getUserFromToken('jwt-token');

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
      expect(mockSupabaseAdmin.auth.getUser).toHaveBeenCalledWith('jwt-token');
    });

    it('should handle invalid token', async () => {
      const mockError = new Error('Invalid token');

      mockSupabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: mockError,
      });

      const result = await getUserFromToken('invalid-token');

      expect(result.user).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('updateUserPassword', () => {
    it('should successfully update user password', async () => {
      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await updateUserPassword('user-123', 'newpassword123');

      expect(result.error).toBeNull();
      expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('user-123', {
        password: 'newpassword123',
      });
    });

    it('should handle update errors', async () => {
      const mockError = new Error('Update failed');

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
        data: {},
        error: mockError,
      });

      const result = await updateUserPassword('user-123', 'newpassword123');

      expect(result.error).toEqual(mockError);
    });
  });

  describe('updateUserMetadata', () => {
    it('should successfully update user metadata', async () => {
      const metadata = { display_name: 'John Doe' };

      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await updateUserMetadata('user-123', metadata);

      expect(result.error).toBeNull();
      expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('user-123', {
        user_metadata: metadata,
      });
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete user', async () => {
      mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await deleteUser('user-123');

      expect(result.error).toBeNull();
      expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user-123');
    });

    it('should handle delete errors', async () => {
      const mockError = new Error('Delete failed');

      mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValue({
        data: {},
        error: mockError,
      });

      const result = await deleteUser('user-123');

      expect(result.error).toEqual(mockError);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should successfully send password reset email', async () => {
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await sendPasswordResetEmail('test@example.com');

      expect(result.error).toBeNull();
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: `${process.env.FRONTEND_URL}/auth/reset-password`,
        }
      );
    });

    it('should handle email send errors', async () => {
      const mockError = new Error('Email send failed');

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: mockError,
      });

      const result = await sendPasswordResetEmail('test@example.com');

      expect(result.error).toEqual(mockError);
    });
  });

  describe('verifyEmailToken', () => {
    it('should successfully verify email token', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token' };

      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await verifyEmailToken('token123', 'test@example.com');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
      expect(mockSupabaseClient.auth.verifyOtp).toHaveBeenCalledWith({
        token: 'token123',
        type: 'email',
        email: 'test@example.com',
      });
    });

    it('should handle invalid token', async () => {
      const mockError = new Error('Invalid token');

      mockSupabaseClient.auth.verifyOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const result = await verifyEmailToken('invalid-token', 'test@example.com');

      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      const mockUsers = [
        { email: 'test@example.com' },
        { email: 'other@example.com' },
      ];

      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
      });

      const result = await emailExists('test@example.com');

      expect(result.exists).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return false for non-existing email', async () => {
      const mockUsers = [
        { email: 'other@example.com' },
      ];

      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: mockUsers },
        error: null,
      });

      const result = await emailExists('test@example.com');

      expect(result.exists).toBe(false);
      expect(result.error).toBeNull();
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API error');

      mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: [] },
        error: mockError,
      });

      const result = await emailExists('test@example.com');

      expect(result.exists).toBe(false);
      expect(result.error).toEqual(mockError);
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate a verification token', () => {
      const token1 = generateVerificationToken();
      const token2 = generateVerificationToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes * 2 (hex)
      expect(token1).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('isValidJWTFormat', () => {
    it('should validate correct JWT format', () => {
      const validJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2MTYyMzc0MjIsImV4cCI6MTY0Nzc3MzQyMiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.VwIH2YHat3CEwelAYecnshP8B8NLzOw4Mj6-ip66rMU';
      
      expect(isValidJWTFormat(validJWT)).toBe(true);
    });

    it('should reject invalid JWT format', () => {
      expect(isValidJWTFormat('invalid-jwt')).toBe(false);
      expect(isValidJWTFormat('header.payload')).toBe(false);
      expect(isValidJWTFormat('header.payload.signature.extra')).toBe(false);
      expect(isValidJWTFormat('')).toBe(false);
    });
  });

  describe('OAuth providers', () => {
    describe('signInWithGoogle', () => {
      it('should successfully initiate Google OAuth', async () => {
        const mockUrl = 'https://accounts.google.com/oauth/authorize?...';

        mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
          data: { url: mockUrl },
          error: null,
        });

        const result = await signInWithGoogle();

        expect(result.url).toBe(mockUrl);
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
            scopes: 'email profile',
          },
        });
      });

      it('should handle custom redirect URL', async () => {
        const customRedirect = 'https://example.com/callback';
        const mockUrl = 'https://accounts.google.com/oauth/authorize?...';

        mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
          data: { url: mockUrl },
          error: null,
        });

        const result = await signInWithGoogle(customRedirect);

        expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'google',
          options: {
            redirectTo: customRedirect,
            scopes: 'email profile',
          },
        });
      });
    });

    describe('signInWithApple', () => {
      it('should successfully initiate Apple OAuth', async () => {
        const mockUrl = 'https://appleid.apple.com/auth/authorize?...';

        mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
          data: { url: mockUrl },
          error: null,
        });

        const result = await signInWithApple();

        expect(result.url).toBe(mockUrl);
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'apple',
          options: {
            redirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
            scopes: 'email name',
          },
        });
      });
    });

    describe('handleOAuthCallback', () => {
      it('should successfully handle OAuth callback', async () => {
        const mockUser = { id: 'user-123', email: 'test@example.com' };
        const mockSession = { access_token: 'token' };

        mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        });

        const result = await handleOAuthCallback('auth-code');

        expect(result.user).toEqual(mockUser);
        expect(result.session).toEqual(mockSession);
        expect(result.error).toBeNull();
        expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('auth-code');
      });

      it('should handle invalid callback code', async () => {
        const mockError = new Error('Invalid code');

        mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
          data: { user: null, session: null },
          error: mockError,
        });

        const result = await handleOAuthCallback('invalid-code');

        expect(result.user).toBeNull();
        expect(result.session).toBeNull();
        expect(result.error).toEqual(mockError);
      });
    });
  });

  describe('mapSupabaseError', () => {
    it('should map common Supabase errors', () => {
      const testCases = [
        {
          input: { error_code: 'invalid_credentials' },
          expected: {
            code: 'invalid_credentials',
            message: 'Invalid email or password',
            statusCode: 401,
          },
        },
        {
          input: { code: 'user_already_registered' },
          expected: {
            code: 'user_already_registered',
            message: 'An account with this email address already exists',
            statusCode: 409,
          },
        },
        {
          input: { error_code: 'email_not_confirmed' },
          expected: {
            code: 'email_not_confirmed',
            message: 'Please verify your email address before signing in',
            statusCode: 401,
          },
        },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = mapSupabaseError(input);
        expect(result).toEqual(expected);
      });
    });

    it('should handle unknown errors', () => {
      const unknownError = { message: 'Custom error message' };
      const result = mapSupabaseError(unknownError);

      expect(result).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'Custom error message',
        statusCode: 500,
      });
    });

    it('should handle null/undefined errors', () => {
      const result1 = mapSupabaseError(null);
      const result2 = mapSupabaseError(undefined);

      const expected = {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        statusCode: 500,
      };

      expect(result1).toEqual(expected);
      expect(result2).toEqual(expected);
    });

    it('should prefer error_code over code', () => {
      const error = {
        error_code: 'invalid_credentials',
        code: 'different_code',
      };

      const result = mapSupabaseError(error);

      expect(result.code).toBe('invalid_credentials');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(timeoutError);

      const result = await signInWithPassword('test@example.com', 'password');

      expect(result.error).toEqual(timeoutError);
      expect(result.user).toBeNull();
      expect(result.session).toBeNull();
    });

    it('should handle malformed responses', async () => {
      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({
        data: null, // Malformed response
        error: null,
      });

      const result = await createUser('test@example.com', 'password');

      expect(result.user).toBeNull();
    });
  });
});