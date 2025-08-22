import { z } from 'zod';

// User types matching backend schema
export const UserSchema = z.object({
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

export const AuthResponseSchema = z.object({
  user: UserSchema.omit({ 
    lastActivityAt: true,
    preferences: true 
  }).extend({
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

export const SessionSchema = z.object({
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
});

export type User = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type Session = z.infer<typeof SessionSchema>;

// Auth Router Type (simplified - matches backend auth.router.ts)
export type AuthRouter = {
  // Public procedures
  register: {
    input: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
    };
    output: AuthResponse;
  };
  login: {
    input: {
      email: string;
      password: string;
      rememberMe?: boolean;
    };
    output: AuthResponse;
  };
  requestPasswordReset: {
    input: { email: string };
    output: { message: string };
  };
  confirmPasswordReset: {
    input: { token: string; newPassword: string };
    output: { message: string };
  };
  refresh: {
    input: { refreshToken: string };
    output: {
      accessToken: string;
      refreshToken: string;
      expiresAt: Date;
      refreshExpiresAt: Date;
    };
  };
  verifyEmail: {
    input: { token: string };
    output: { message: string };
  };
  
  // Protected procedures
  me: {
    input: void;
    output: User;
  };
  logout: {
    input: void;
    output: { message: string };
  };
  resendVerification: {
    input: void;
    output: { message: string };
  };
  sessions: {
    input: void;
    output: Session[];
  };
  revokeSession: {
    input: { sessionId: string };
    output: { message: string };
  };
};

// Content types matching backend schema
export const ContentTypeEnum = z.enum(['DOCUMENTARY', 'DOCUSERIES', 'DRAMATIZATION', 'PODCAST', 'BOOK', 'MOVIE', 'TV_SERIES']);
export const CaseTypeEnum = z.enum(['SERIAL_KILLER', 'MASS_MURDER', 'MISSING_PERSON', 'COLD_CASE', 'SOLVED_MURDER', 'UNSOLVED_MURDER', 'FINANCIAL_CRIME', 'ORGANIZED_CRIME', 'CULT_CRIME', 'POLITICAL_ASSASSINATION', 'KIDNAPPING', 'TERRORISM', 'CYBER_CRIME', 'CORPORATE_CRIME', 'HISTORICAL_CRIME']);
export const FactualityLevelEnum = z.enum(['DOCUMENTARY', 'DOCUDRAMA', 'BASED_ON_TRUE_EVENTS', 'INSPIRED_BY', 'FICTIONAL']);
export const SensitivityLevelEnum = z.enum(['LOW', 'MODERATE', 'HIGH', 'EXTREME']);
export const AvailabilityTypeEnum = z.enum(['FREE', 'SUBSCRIPTION', 'PREMIUM_SUBSCRIPTION', 'PURCHASE', 'RENTAL']);
export const ContentStatusEnum = z.enum(['WANT_TO_WATCH', 'WATCHING', 'WATCHED', 'PAUSED', 'DROPPED', 'REWATCHING']);

export const ContentSchema = z.object({
  id: z.string(),
  externalId: z.string().nullable(),
  title: z.string(),
  originalTitle: z.string().nullable(),
  description: z.string().nullable(),
  synopsis: z.string().nullable(),
  
  contentType: ContentTypeEnum,
  caseType: CaseTypeEnum.nullable(),
  trueCrimeGenres: z.array(z.string()),
  generalGenres: z.array(z.string()),
  
  releaseDate: z.date().nullable(),
  runtime: z.number().nullable(),
  
  tmdbRating: z.number().nullable(),
  userRatingAvg: z.number().nullable(),
  userRatingCount: z.number().default(0),
  
  caseName: z.string().nullable(),
  location: z.string().nullable(),
  timeframStart: z.date().nullable(),
  timeframEnd: z.date().nullable(),
  factualityLevel: FactualityLevelEnum.nullable(),
  sensitivityLevel: SensitivityLevelEnum.nullable(),
  contentWarnings: z.array(z.string()),
  
  posterUrl: z.string().nullable(),
  backdropUrl: z.string().nullable(),
  trailerUrl: z.string().nullable(),
  
  slug: z.string(),
  
  totalSeasons: z.number().nullable(),
  totalEpisodes: z.number().nullable(),
  
  platforms: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    availabilityType: AvailabilityTypeEnum,
    isAvailable: z.boolean(),
    deepLinkUrl: z.string().nullable(),
    price: z.number().nullable(),
    currency: z.string().nullable(),
  })),
  
  cast: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.string().nullable(),
    profileImageUrl: z.string().nullable(),
  })),
  
  crew: z.array(z.object({
    id: z.string(),
    name: z.string(),
    job: z.string(),
    department: z.string(),
    profileImageUrl: z.string().nullable(),
  })),
  
  relatedCases: z.array(z.object({
    id: z.string(),
    name: z.string(),
    caseType: CaseTypeEnum,
    status: z.string(),
    slug: z.string(),
    relevanceScore: z.number(),
  })),
  
  relatedKillers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    aliases: z.array(z.string()),
    slug: z.string(),
    imageUrl: z.string().nullable(),
    relevanceScore: z.number(),
  })),
  
  episodes: z.array(z.object({
    id: z.string(),
    episodeNumber: z.number(),
    seasonNumber: z.number(),
    title: z.string(),
    description: z.string().nullable(),
    runtime: z.number().nullable(),
    airDate: z.date().nullable(),
  })),
  
  images: z.array(z.object({
    id: z.string(),
    imageType: z.string(),
    url: z.string(),
    isDefault: z.boolean(),
    createdAt: z.date(),
  })),
  
  stats: z.object({
    trackingCount: z.number(),
    watchlistCount: z.number(),
    reviewCount: z.number(),
  }),
  
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastSyncAt: z.date().nullable(),
});

export const SearchFiltersSchema = z.object({
  contentType: ContentTypeEnum.optional(),
  caseType: CaseTypeEnum.optional(),
  genres: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  yearFrom: z.number().min(1900).max(new Date().getFullYear()).optional(),
  yearTo: z.number().min(1900).max(new Date().getFullYear()).optional(),
  ratingFrom: z.number().min(0).max(10).optional(),
  ratingTo: z.number().min(0).max(10).optional(),
  factualityLevel: FactualityLevelEnum.optional(),
  sensitivityLevel: SensitivityLevelEnum.optional(),
  availabilityType: AvailabilityTypeEnum.optional(),
  region: z.string().default('US'),
  caseId: z.string().optional(),
  killerId: z.string().optional(),
  includeUnavailable: z.boolean().default(false),
});

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  pages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type Content = z.infer<typeof ContentSchema>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type ContentType = z.infer<typeof ContentTypeEnum>;
export type CaseType = z.infer<typeof CaseTypeEnum>;
export type FactualityLevel = z.infer<typeof FactualityLevelEnum>;
export type SensitivityLevel = z.infer<typeof SensitivityLevelEnum>;
export type AvailabilityType = z.infer<typeof AvailabilityTypeEnum>;
export type ContentStatus = z.infer<typeof ContentStatusEnum>;

// Content Router Type (matches backend content.router.ts)
export type ContentRouter = {
  getById: {
    input: { id: string };
    output: Content;
  };
  getExternalContent: {
    input: { externalId: string };
    output: Content;
  };
  search: {
    input: {
      query: string;
      page?: number;
      limit?: number;
      filters?: SearchFilters;
      sort?: 'relevance' | 'rating_desc' | 'rating_asc' | 'release_date_desc' | 'release_date_asc' | 'popularity_desc' | 'title_asc';
      facets?: string[];
    };
    output: {
      results: Content[];
      pagination: Pagination;
    };
  };
  list: {
    input: {
      page?: number;
      limit?: number;
      category?: 'trending' | 'new' | 'popular' | 'recommended' | 'highest_rated' | 'recently_added';
      timeframe?: 'day' | 'week' | 'month' | 'all';
      contentType?: ContentType;
      region?: string;
    };
    output: {
      results: Content[];
      pagination: Pagination;
      category: string;
      timeframe: string;
    };
  };
  addToWatchlist: {
    input: {
      contentId: string;
      watchlistId?: string;
      notes?: string;
    };
    output: {
      success: boolean;
      message: string;
    };
  };
  removeFromWatchlist: {
    input: {
      contentId: string;
      watchlistId?: string;
    };
    output: {
      success: boolean;
      message: string;
    };
  };
  updateProgress: {
    input: {
      contentId: string;
      status?: ContentStatus;
      rating?: number;
      review?: string;
      notes?: string;
      currentSeason?: number;
      currentEpisode?: number;
      progressPercent?: number;
      isPublic?: boolean;
    };
    output: {
      success: boolean;
      message: string;
    };
  };
  getWatchlist: {
    input: {
      page?: number;
      limit?: number;
    };
    output: {
      results: (Content & { addedAt: Date })[];
      pagination: Pagination;
    };
  };
};

// Import the actual router types from backend
// Note: In a real implementation, these would be generated or imported from backend
export interface AppRouter {
  auth: {
    register: any;
    login: any;
    logout: any;
    me: any;
    refresh: any;
    requestPasswordReset: any;
    confirmPasswordReset: any;
    verifyEmail: any;
    resendVerification: any;
    sessions: any;
    revokeSession: any;
  };
  content: {
    search: any;
    getById: any;
    getExternalContent: any;
    list: any;
    addToWatchlist: any;
    removeFromWatchlist: any;
    updateProgress: any;
    getWatchlist: any;
  };
}

// Form validation schemas
export const LoginFormSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

export const RegisterFormSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const PasswordResetFormSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
});

export type LoginFormData = z.infer<typeof LoginFormSchema>;
export type RegisterFormData = z.infer<typeof RegisterFormSchema>;
export type PasswordResetFormData = z.infer<typeof PasswordResetFormSchema>;