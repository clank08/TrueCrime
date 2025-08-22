import type { User } from '@/lib/prisma';

// ============================================================================
// AUTH PROVIDER ABSTRACTION INTERFACE
// ============================================================================

/**
 * Abstract interface for authentication providers
 * This allows us to swap between Supabase, Auth0, AWS Cognito, etc.
 */
export interface AuthProvider {
  name: string;
  
  // User registration and authentication
  createUser(email: string, password: string, metadata?: Record<string, any>): Promise<AuthProviderResult>;
  signInWithPassword(email: string, password: string): Promise<AuthProviderResult>;
  signOut(token: string): Promise<{ error: Error | null }>;
  
  // Token management
  verifyToken(token: string): Promise<AuthTokenResult>;
  refreshToken(refreshToken: string): Promise<AuthTokenResult>;
  
  // Password management
  sendPasswordResetEmail(email: string): Promise<{ error: Error | null }>;
  updatePassword(userId: string, newPassword: string): Promise<{ error: Error | null }>;
  
  // Email verification
  sendEmailVerification(email: string): Promise<{ error: Error | null }>;
  verifyEmail(token: string, email: string): Promise<AuthProviderResult>;
  
  // User management
  getUserById(userId: string): Promise<AuthUserResult>;
  updateUserMetadata(userId: string, metadata: Record<string, any>): Promise<{ error: Error | null }>;
  deleteUser(userId: string): Promise<{ error: Error | null }>;
  
  // OAuth providers (optional)
  signInWithOAuth?(provider: string, redirectTo?: string): Promise<{ url: string | null; error: Error | null }>;
  handleOAuthCallback?(code: string): Promise<AuthProviderResult>;
}

export interface AuthProviderUser {
  id: string;
  email: string;
  emailVerified: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface AuthProviderSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
}

export interface AuthProviderResult {
  user: AuthProviderUser | null;
  session: AuthProviderSession | null;
  error: Error | null;
}

export interface AuthTokenResult {
  valid: boolean;
  user?: AuthProviderUser;
  error?: Error;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface AuthUserResult {
  user: AuthProviderUser | null;
  error: Error | null;
}

// ============================================================================
// AUTH PROVIDER REGISTRY
// ============================================================================

export class AuthProviderRegistry {
  private providers = new Map<string, AuthProvider>();
  private activeProvider: string | null = null;

  register(provider: AuthProvider): void {
    this.providers.set(provider.name, provider);
  }

  setActive(providerName: string): void {
    if (!this.providers.has(providerName)) {
      throw new Error(`Auth provider '${providerName}' is not registered`);
    }
    this.activeProvider = providerName;
  }

  getActive(): AuthProvider {
    if (!this.activeProvider) {
      throw new Error('No active auth provider set');
    }
    
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`Active auth provider '${this.activeProvider}' not found`);
    }
    
    return provider;
  }

  get(providerName: string): AuthProvider | undefined {
    return this.providers.get(providerName);
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

// ============================================================================
// UNIFIED AUTH SERVICE
// ============================================================================

/**
 * Unified auth service that works with any auth provider
 * This is the main interface that the rest of the app uses
 */
export class UnifiedAuthService {
  constructor(private registry: AuthProviderRegistry) {}

  // Delegate all methods to the active provider
  get provider(): AuthProvider {
    return this.registry.getActive();
  }

  async createUser(email: string, password: string, metadata?: Record<string, any>): Promise<AuthProviderResult> {
    return this.provider.createUser(email, password, metadata);
  }

  async signInWithPassword(email: string, password: string): Promise<AuthProviderResult> {
    return this.provider.signInWithPassword(email, password);
  }

  async signOut(token: string): Promise<{ error: Error | null }> {
    return this.provider.signOut(token);
  }

  async verifyToken(token: string): Promise<AuthTokenResult> {
    return this.provider.verifyToken(token);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenResult> {
    return this.provider.refreshToken(refreshToken);
  }

  async sendPasswordResetEmail(email: string): Promise<{ error: Error | null }> {
    return this.provider.sendPasswordResetEmail(email);
  }

  async updatePassword(userId: string, newPassword: string): Promise<{ error: Error | null }> {
    return this.provider.updatePassword(userId, newPassword);
  }

  async sendEmailVerification(email: string): Promise<{ error: Error | null }> {
    return this.provider.sendEmailVerification(email);
  }

  async verifyEmail(token: string, email: string): Promise<AuthProviderResult> {
    return this.provider.verifyEmail(token, email);
  }

  async getUserById(userId: string): Promise<AuthUserResult> {
    return this.provider.getUserById(userId);
  }

  async updateUserMetadata(userId: string, metadata: Record<string, any>): Promise<{ error: Error | null }> {
    return this.provider.updateUserMetadata(userId, metadata);
  }

  async deleteUser(userId: string): Promise<{ error: Error | null }> {
    return this.provider.deleteUser(userId);
  }

  // OAuth methods (if supported)
  async signInWithOAuth(provider: string, redirectTo?: string): Promise<{ url: string | null; error: Error | null }> {
    if (!this.provider.signInWithOAuth) {
      return { url: null, error: new Error('OAuth not supported by current provider') };
    }
    return this.provider.signInWithOAuth(provider, redirectTo);
  }

  async handleOAuthCallback(code: string): Promise<AuthProviderResult> {
    if (!this.provider.handleOAuthCallback) {
      return { user: null, session: null, error: new Error('OAuth not supported by current provider') };
    }
    return this.provider.handleOAuthCallback(code);
  }

  // Provider management
  switchProvider(providerName: string): void {
    this.registry.setActive(providerName);
  }

  getCurrentProvider(): string {
    return this.provider.name;
  }

  listProviders(): string[] {
    return this.registry.list();
  }
}

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

export interface MigrationOptions {
  batchSize?: number;
  dryRun?: boolean;
  skipVerification?: boolean;
}

export interface MigrationResult {
  success: boolean;
  migratedUsers: number;
  failedUsers: number;
  errors: Array<{ userId: string; error: string }>;
}

/**
 * Utility for migrating users between auth providers
 */
export class AuthMigrationUtility {
  constructor(
    private sourceProvider: AuthProvider,
    private targetProvider: AuthProvider,
    private userService: any // Your user service to get local users
  ) {}

  async migrateUsers(userIds: string[], options: MigrationOptions = {}): Promise<MigrationResult> {
    const { batchSize = 10, dryRun = false } = options;
    const result: MigrationResult = {
      success: true,
      migratedUsers: 0,
      failedUsers: 0,
      errors: [],
    };

    // Process in batches
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      for (const userId of batch) {
        try {
          await this.migrateUser(userId, dryRun);
          result.migratedUsers++;
        } catch (error) {
          result.failedUsers++;
          result.errors.push({
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    result.success = result.failedUsers === 0;
    return result;
  }

  private async migrateUser(userId: string, dryRun: boolean): Promise<void> {
    // Get user from source provider
    const sourceResult = await this.sourceProvider.getUserById(userId);
    if (!sourceResult.user || sourceResult.error) {
      throw new Error(`Failed to get user from source provider: ${sourceResult.error?.message}`);
    }

    const user = sourceResult.user;

    if (dryRun) {
      console.log(`[DRY RUN] Would migrate user ${user.email} (${user.id})`);
      return;
    }

    // Create user in target provider
    // Note: This is a simplified migration - real migrations would need
    // to handle password hashing, email verification status, etc.
    const targetResult = await this.targetProvider.createUser(
      user.email,
      'temporary-password', // Would need proper password handling
      user.metadata
    );

    if (targetResult.error) {
      throw new Error(`Failed to create user in target provider: ${targetResult.error.message}`);
    }

    console.log(`Successfully migrated user ${user.email} (${user.id})`);
  }
}

// ============================================================================
// FEATURE FLAGS FOR GRADUAL MIGRATION
// ============================================================================

export interface AuthFeatureFlags {
  useSupabaseAuth: boolean;
  useInternalAuth: boolean;
  allowDualMode: boolean;
  migrateOnLogin: boolean;
  requireEmailVerification: boolean;
}

export class AuthFeatureFlagService {
  private flags: AuthFeatureFlags = {
    useSupabaseAuth: true,
    useInternalAuth: true,
    allowDualMode: true,
    migrateOnLogin: false,
    requireEmailVerification: true,
  };

  setFlags(flags: Partial<AuthFeatureFlags>): void {
    this.flags = { ...this.flags, ...flags };
  }

  getFlags(): AuthFeatureFlags {
    return { ...this.flags };
  }

  isSupabaseEnabled(): boolean {
    return this.flags.useSupabaseAuth;
  }

  isInternalEnabled(): boolean {
    return this.flags.useInternalAuth;
  }

  isDualModeEnabled(): boolean {
    return this.flags.allowDualMode && this.flags.useSupabaseAuth && this.flags.useInternalAuth;
  }

  shouldMigrateOnLogin(): boolean {
    return this.flags.migrateOnLogin;
  }

  requiresEmailVerification(): boolean {
    return this.flags.requireEmailVerification;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Global instances
export const authProviderRegistry = new AuthProviderRegistry();
export const unifiedAuthService = new UnifiedAuthService(authProviderRegistry);
export const authFeatureFlags = new AuthFeatureFlagService();