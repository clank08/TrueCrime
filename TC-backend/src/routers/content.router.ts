import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { 
  router, 
  publicProcedure, 
  protectedProcedure, 
  verifiedProcedure,
  withCaching,
  createUserCacheKey,
  invalidateCache,
  handleDatabaseError,
  Context
} from '@/lib/trpc';
import { cacheKeyGenerators, cacheDurations } from '@/lib/cache';
import { prisma } from '@/lib/prisma';
import { meilisearchService } from '@/lib/meilisearch';
import { watchmodeService } from '@/services/watchmode.service';
import { tmdbService } from '@/services/tmdb.service';
import { logger } from '@/lib/monitoring';

// ============================================================================
// TMDB API HELPERS
// ============================================================================

async function getTMDBPosterUrl(tmdbId: number, tmdbType: string): Promise<string | null> {
  if (!tmdbId) return null;
  
  try {
    const tmdbToken = process.env.TMDB_READ_ACCESS_TOKEN;
    if (!tmdbToken) return null;
    
    const mediaType = tmdbType === 'tv' ? 'tv' : 'movie';
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}`;
    
    const response = await fetch(tmdbUrl, {
      headers: {
        'Authorization': `Bearer ${tmdbToken}`,
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.poster_path) {
        return `https://image.tmdb.org/t/p/w500${data.poster_path}`;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('TMDB API error:', error);
    return null;
  }
}

// ============================================================================
// MOCK DATA (temporary for testing - to be removed when database is populated)
// ============================================================================

// Fallback mock content for Ted Bundy searches when Watchmode API fails
const mockBundyContent = [
  {
    id: 'cm5k1d3h4000008jo8r2rg5j3',
    externalId: 'tmdb_123456',
    title: 'Conversations with a Killer: The Ted Bundy Tapes',
    originalTitle: 'Conversations with a Killer: The Ted Bundy Tapes',
    description: 'A chilling documentary series featuring never-before-heard audio interviews between Stephen G. Michaud and Ted Bundy.',
    
    contentType: 'DOCUSERIES' as const,
    caseType: 'SERIAL_KILLER' as const,
    trueCrimeGenres: ['SERIAL_KILLER', 'DOCUMENTARY'],
    generalGenres: ['Documentary', 'Crime', 'Biography'],
    
    releaseDate: new Date('2019-01-24'),
    runtime: 60,
    
    tmdbRating: 7.8,
    userRatingAvg: 8.2,
    userRatingCount: 1524,
    
    posterUrl: 'https://image.tmdb.org/t/p/w500/4UgO7xiWlIKSF5PBuafFB6CXcl6.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/4UgO7xiWlIKSF5PBuafFB6CXcl6.jpg',
    
    slug: 'conversations-with-a-killer-ted-bundy-tapes',
    
    isActive: true,
    createdAt: new Date('2023-11-01'),
    updatedAt: new Date('2023-11-01'),
    lastSyncAt: new Date('2023-11-01'),
  },
  {
    id: 'cm5k1d3h4000009jo8r2rg5j4',
    externalId: 'tmdb_789012',
    title: 'Extremely Wicked, Shockingly Evil and Vile',
    originalTitle: 'Extremely Wicked, Shockingly Evil and Vile',
    description: 'A chronicle of the crimes of Ted Bundy from the perspective of Liz, his longtime girlfriend.',
    
    contentType: 'MOVIE' as const,
    caseType: 'SERIAL_KILLER' as const,
    trueCrimeGenres: ['SERIAL_KILLER', 'BIOGRAPHICAL'],
    generalGenres: ['Crime', 'Drama', 'Thriller'],
    
    releaseDate: new Date('2019-05-03'),
    runtime: 110,
    
    tmdbRating: 6.7,
    userRatingAvg: 7.1,
    userRatingCount: 2890,
    
    posterUrl: 'https://image.tmdb.org/t/p/w500/yQKW5wFELPRqL6c37c75FQ3BHeq.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/yQKW5wFELPRqL6c37c75FQ3BHeq.jpg',
    
    slug: 'extremely-wicked-shockingly-evil-vile',
    
    isActive: true,
    createdAt: new Date('2023-11-01'),
    updatedAt: new Date('2023-11-01'),
    lastSyncAt: new Date('2023-11-01'),
  },
];

// ============================================================================
// INPUT VALIDATION SCHEMAS
// ============================================================================

const GetContentSchema = z.object({
  id: z.string().min(1, 'Content ID is required'),
});

const GetContentByExternalIdSchema = z.object({
  externalId: z.string().min(1, 'External ID is required'),
});

const SearchContentSchema = z.object({
  query: z.string().min(1).max(100),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  filters: z.object({
    contentType: z.enum(['DOCUMENTARY', 'DOCUSERIES', 'DRAMATIZATION', 'PODCAST', 'BOOK', 'MOVIE', 'TV_SERIES']).optional(),
    caseType: z.enum(['SERIAL_KILLER', 'MASS_MURDER', 'MISSING_PERSON', 'COLD_CASE', 'SOLVED_MURDER', 'UNSOLVED_MURDER', 'FINANCIAL_CRIME', 'ORGANIZED_CRIME', 'CULT_CRIME', 'POLITICAL_ASSASSINATION', 'KIDNAPPING', 'TERRORISM', 'CYBER_CRIME', 'CORPORATE_CRIME', 'HISTORICAL_CRIME']).optional(),
    genres: z.array(z.string()).optional(),
    platforms: z.array(z.string()).optional(),
    yearFrom: z.number().min(1900).max(new Date().getFullYear()).optional(),
    yearTo: z.number().min(1900).max(new Date().getFullYear()).optional(),
    ratingFrom: z.number().min(0).max(10).optional(),
    ratingTo: z.number().min(0).max(10).optional(),
    factualityLevel: z.enum(['DOCUMENTARY', 'DOCUDRAMA', 'BASED_ON_TRUE_EVENTS', 'INSPIRED_BY', 'FICTIONAL']).optional(),
    sensitivityLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'EXTREME']).optional(),
    availabilityType: z.enum(['FREE', 'SUBSCRIPTION', 'PREMIUM_SUBSCRIPTION', 'PURCHASE', 'RENTAL']).optional(),
    region: z.string().default('US'),
    caseId: z.string().min(1).optional(),
    killerId: z.string().min(1).optional(),
    includeUnavailable: z.boolean().default(false),
  }).optional(),
  sort: z.enum(['relevance', 'rating_desc', 'rating_asc', 'release_date_desc', 'release_date_asc', 'popularity_desc', 'title_asc']).default('relevance'),
  facets: z.array(z.string()).optional(),
});

const ContentListSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
  category: z.enum(['trending', 'new', 'popular', 'recommended', 'highest_rated', 'recently_added']).default('trending'),
  timeframe: z.enum(['day', 'week', 'month', 'all']).default('week'),
  contentType: z.enum(['DOCUMENTARY', 'DOCUSERIES', 'DRAMATIZATION', 'PODCAST', 'MOVIE', 'TV_SERIES']).optional(),
  region: z.string().default('US'),
});

const AddToWatchlistSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  watchlistId: z.string().min(1).optional(), // If not provided, add to default watchlist
  notes: z.string().max(500).optional(),
});

const RateContentSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  rating: z.number().min(1).max(5).int(),
  review: z.string().max(2000).optional(),
});

const MarkAsWatchedSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  rating: z.number().min(1).max(5).int().optional(),
  review: z.string().max(2000).optional(),
  notes: z.string().max(1000).optional(),
});

const RemoveFromWatchlistSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  watchlistId: z.string().min(1).optional(), // If not provided, remove from default watchlist
});

const UpdateProgressSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  status: z.enum(['WANT_TO_WATCH', 'WATCHING', 'WATCHED', 'PAUSED', 'DROPPED', 'REWATCHING']).optional(),
  rating: z.number().min(1).max(5).optional(),
  review: z.string().max(2000).optional(),
  notes: z.string().max(1000).optional(),
  currentSeason: z.number().min(1).optional(),
  currentEpisode: z.number().min(1).optional(),
  progressPercent: z.number().min(0).max(1).optional(),
  isPublic: z.boolean().default(false),
});

const GetPlatformAvailabilitySchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  region: z.string().default('US'),
  refresh: z.boolean().default(false), // Force refresh from external APIs
});

const CreateWatchlistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

const UpdateWatchlistSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

const GetRelatedContentSchema = z.object({
  contentId: z.string().min(1, 'Content ID is required'),
  type: z.enum(['similar', 'same_case', 'same_killer', 'same_creator', 'sequel_prequel']).optional(),
  limit: z.number().min(1).max(20).default(10),
});

// ============================================================================
// ENHANCED API INTEGRATION HELPERS
// ============================================================================

/**
 * Get enhanced content details from TMDB
 */
async function getEnhancedTMDBDetails(tmdbId: number, tmdbType: string, contentId: string) {
  try {
    const tmdbData = tmdbType === 'tv' 
      ? await tmdbService.getTVShowDetails(tmdbId, {
          append_to_response: ['credits', 'videos', 'images', 'keywords', 'recommendations']
        })
      : await tmdbService.getMovieDetails(tmdbId, {
          append_to_response: ['credits', 'videos', 'images', 'keywords', 'recommendations']
        });

    if (!tmdbData) return null;

    // Extract trailer URL
    const trailer = tmdbData.videos?.results?.find(
      video => video.type === 'Trailer' && video.site === 'YouTube'
    );
    const trailerUrl = trailer ? `https://youtube.com/watch?v=${trailer.key}` : null;

    // Extract high-quality images
    const posterUrl = tmdbData.poster_path 
      ? tmdbService.getImageUrl(tmdbData.poster_path, 'w500')
      : null;
    const backdropUrl = tmdbData.backdrop_path 
      ? tmdbService.getImageUrl(tmdbData.backdrop_path, 'w1280')
      : null;

    return {
      tmdbData,
      trailerUrl,
      posterUrl,
      backdropUrl,
      cast: tmdbData.credits?.cast?.slice(0, 10) || [],
      crew: tmdbData.credits?.crew?.filter(c => 
        ['Director', 'Producer', 'Writer', 'Creator'].includes(c.job)
      ).slice(0, 10) || [],
      keywords: tmdbType === 'tv' 
        ? tmdbData.keywords?.results || []
        : tmdbData.keywords?.keywords || [],
    };
  } catch (error) {
    logger.warn('Failed to fetch enhanced TMDB details', { tmdbId, tmdbType, contentId, error });
    return null;
  }
}

/**
 * Get comprehensive platform availability from Watchmode
 */
async function getPlatformAvailability(watchmodeId: number, region: string = 'US') {
  try {
    if (!watchmodeId) return [];
    
    const sources = await watchmodeService.getTitleSources(watchmodeId, [region]);
    
    return sources.map(source => ({
      id: `watchmode_${source.id}`,
      name: source.name,
      type: source.type,
      availabilityType: source.type === 'free' ? 'FREE' 
        : source.type === 'sub' ? 'SUBSCRIPTION'
        : source.type === 'buy' ? 'PURCHASE'
        : source.type === 'rent' ? 'RENTAL'
        : 'PREMIUM_SUBSCRIPTION',
      isAvailable: true,
      deepLinkUrl: source.web_url || source.ios_url || source.android_url,
      price: source.price,
      currency: 'USD',
      region,
      format: source.format,
    }));
  } catch (error) {
    logger.warn('Failed to fetch platform availability', { watchmodeId, region, error });
    return [];
  }
}

/**
 * Get user-specific content data
 */
async function getUserContentData(contentId: string, userId?: string) {
  if (!userId) {
    return {
      isInWatchlist: false,
      isWatched: false,
      userRating: null,
      userProgress: null,
    };
  }

  try {
    const [watchlistItem, contentTracking] = await Promise.all([
      prisma.watchlistItem.findFirst({
        where: {
          contentId,
          watchlist: {
            userId,
          },
        },
      }),
      prisma.contentTracking.findUnique({
        where: {
          userId_contentId: {
            userId,
            contentId,
          },
        },
      }),
    ]);

    return {
      isInWatchlist: Boolean(watchlistItem),
      isWatched: contentTracking?.status === 'WATCHED',
      userRating: contentTracking?.rating,
      userProgress: contentTracking ? {
        status: contentTracking.status,
        currentSeason: contentTracking.currentSeason,
        currentEpisode: contentTracking.currentEpisode,
        progressPercent: contentTracking.progressPercent,
        lastWatchedAt: contentTracking.lastWatchedAt,
      } : null,
    };
  } catch (error) {
    logger.error('Failed to fetch user content data', { contentId, userId, error });
    return {
      isInWatchlist: false,
      isWatched: false,
      userRating: null,
      userProgress: null,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build Meilisearch filter string from user filters
 */
function buildSearchFilters(filters: any = {}, includeActive: boolean = true): string[] {
  const filterParts: string[] = [];
  
  if (includeActive) {
    filterParts.push('isActive = true');
  }
  
  if (filters.contentType) {
    filterParts.push(`contentType = "${filters.contentType}"`);
  }
  
  if (filters.caseType) {
    filterParts.push(`caseType = "${filters.caseType}"`);
  }
  
  if (filters.genres && filters.genres.length > 0) {
    const genreFilter = filters.genres.map((g: string) => `generalGenres = "${g}"`).join(' OR ');
    filterParts.push(`(${genreFilter})`);
  }
  
  if (filters.platforms && filters.platforms.length > 0) {
    const platformFilter = filters.platforms.map((p: string) => `platforms.name = "${p}"`).join(' OR ');
    filterParts.push(`(${platformFilter})`);
  }
  
  if (filters.yearFrom || filters.yearTo) {
    if (filters.yearFrom && filters.yearTo) {
      filterParts.push(`releaseYear >= ${filters.yearFrom} AND releaseYear <= ${filters.yearTo}`);
    } else if (filters.yearFrom) {
      filterParts.push(`releaseYear >= ${filters.yearFrom}`);
    } else if (filters.yearTo) {
      filterParts.push(`releaseYear <= ${filters.yearTo}`);
    }
  }
  
  if (filters.ratingFrom || filters.ratingTo) {
    if (filters.ratingFrom && filters.ratingTo) {
      filterParts.push(`userRatingAvg >= ${filters.ratingFrom} AND userRatingAvg <= ${filters.ratingTo}`);
    } else if (filters.ratingFrom) {
      filterParts.push(`userRatingAvg >= ${filters.ratingFrom}`);
    } else if (filters.ratingTo) {
      filterParts.push(`userRatingAvg <= ${filters.ratingTo}`);
    }
  }
  
  if (filters.factualityLevel) {
    filterParts.push(`factualityLevel = "${filters.factualityLevel}"`);
  }
  
  if (filters.sensitivityLevel) {
    filterParts.push(`sensitivityLevel = "${filters.sensitivityLevel}"`);
  }
  
  if (filters.availabilityType) {
    filterParts.push(`platforms.availabilityType = "${filters.availabilityType}"`);
  }
  
  if (filters.region && filters.region !== 'US') {
    filterParts.push(`platforms.region = "${filters.region}"`);
  }
  
  if (filters.caseId) {
    filterParts.push(`relatedCases = "${filters.caseId}"`);
  }
  
  if (filters.killerId) {
    filterParts.push(`relatedKillers = "${filters.killerId}"`);
  }
  
  if (!filters.includeUnavailable) {
    filterParts.push('platforms.isAvailable = true');
  }
  
  return filterParts;
}

/**
 * Convert sort parameter to Meilisearch sort array
 */
function buildSearchSort(sort: string): string[] {
  const sortMap: Record<string, string[]> = {
    'relevance': [], // Default Meilisearch ranking
    'rating_desc': ['userRatingAvg:desc'],
    'rating_asc': ['userRatingAvg:asc'],
    'release_date_desc': ['releaseDate:desc'],
    'release_date_asc': ['releaseDate:asc'],
    'popularity_desc': ['userRatingCount:desc'],
    'title_asc': ['title:asc'],
  };
  
  return sortMap[sort] || [];
}

/**
 * Get or create user's default watchlist
 */
async function getOrCreateDefaultWatchlist(userId: string) {
  let watchlist = await prisma.watchlist.findFirst({
    where: {
      userId,
      isDefault: true,
    },
  });
  
  if (!watchlist) {
    watchlist = await prisma.watchlist.create({
      data: {
        userId,
        name: 'Watch Later',
        isDefault: true,
        isPublic: false,
      },
    });
  }
  
  return watchlist;
}

// ============================================================================
// CONTENT ROUTER
// ============================================================================

export const contentRouter = router({
  /**
   * Get content by ID with comprehensive details for content detail screen
   */
  getById: withCaching(
    publicProcedure
      .input(GetContentSchema)
      .query(async ({ input, ctx }) => {
        const { id } = input;
        const userId = ctx.user?.id;
        
        try {
          ctx.timer.start('content.getById.query');
          
          // Fetch base content with all relations
          const content = await prisma.content.findUnique({
            where: { id },
            include: {
              platformAvailability: {
                where: {
                  isAvailable: true,
                  region: 'US', // TODO: Get from user preferences
                },
                orderBy: {
                  availabilityType: 'asc', // Free first, then subscription, then paid
                },
              },
              cast: {
                take: 15,
                include: {
                  person: {
                    select: {
                      id: true,
                      name: true,
                      profileImageUrl: true,
                    },
                  },
                },
                orderBy: {
                  orderIndex: 'asc',
                },
              },
              crew: {
                take: 15,
                include: {
                  person: {
                    select: {
                      id: true,
                      name: true,
                      profileImageUrl: true,
                    },
                  },
                },
                where: {
                  job: {
                    in: ['Director', 'Producer', 'Writer', 'Creator', 'Executive Producer', 'Cinematographer'],
                  },
                },
                orderBy: {
                  orderIndex: 'asc',
                },
              },
              relatedCases: {
                take: 5,
                include: {
                  case: {
                    select: {
                      id: true,
                      name: true,
                      caseType: true,
                      status: true,
                      slug: true,
                      description: true,
                      startDate: true,
                      endDate: true,
                      location: true,
                    },
                  },
                },
                where: {
                  case: {
                    isActive: true,
                  },
                },
                orderBy: {
                  relevanceScore: 'desc',
                },
              },
              relatedKillers: {
                take: 5,
                include: {
                  killer: {
                    select: {
                      id: true,
                      name: true,
                      aliases: true,
                      slug: true,
                      imageUrl: true,
                      birthDate: true,
                      deathDate: true,
                      isAlive: true,
                    },
                  },
                },
                where: {
                  killer: {
                    isActive: true,
                  },
                },
                orderBy: {
                  relevanceScore: 'desc',
                },
              },
              episodes: {
                take: 20,
                select: {
                  id: true,
                  episodeNumber: true,
                  seasonNumber: true,
                  title: true,
                  description: true,
                  runtime: true,
                  airDate: true,
                  stillUrl: true,
                },
                orderBy: [
                  { seasonNumber: 'asc' },
                  { episodeNumber: 'asc' },
                ],
              },
              images: {
                where: {
                  imageType: {
                    in: ['POSTER', 'BACKDROP', 'STILL'],
                  },
                },
                orderBy: [
                  { isDefault: 'desc' },
                  { createdAt: 'desc' },
                ],
              },
              _count: {
                select: {
                  contentTracking: true,
                  watchlists: true,
                  reviews: true,
                },
              },
            },
          });
          
          if (!content) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Content not found',
            });
          }

          // Fetch enhanced data in parallel
          const [enhancedTMDBData, platformAvailability, userData] = await Promise.all([
            // Enhanced TMDB data if we have TMDB ID
            content.tmdbId ? getEnhancedTMDBDetails(
              parseInt(content.tmdbId), 
              content.contentType === 'TV_SERIES' || content.contentType === 'DOCUSERIES' ? 'tv' : 'movie',
              content.id
            ) : Promise.resolve(null),
            
            // Enhanced platform availability from Watchmode
            content.watchmodeId ? getPlatformAvailability(
              parseInt(content.watchmodeId), 
              'US' // TODO: Get from user preferences
            ) : Promise.resolve([]),
            
            // User-specific data
            getUserContentData(content.id, userId),
          ]);

          ctx.timer.end('content.getById.query');
          
          // Merge enhanced data with existing content
          const enhancedPosterUrl = enhancedTMDBData?.posterUrl || content.posterUrl;
          const enhancedBackdropUrl = enhancedTMDBData?.backdropUrl || content.backdropUrl;
          const enhancedTrailerUrl = enhancedTMDBData?.trailerUrl || content.trailerUrl;
          
          // Combine database platforms with live availability data
          const allPlatforms = [
            ...content.platformAvailability.map(p => ({
              id: p.platformId,
              name: p.platformName,
              type: p.platformType,
              availabilityType: p.availabilityType,
              isAvailable: p.isAvailable,
              deepLinkUrl: p.deepLinkUrl,
              price: p.price,
              currency: p.currency,
              region: p.region,
              lastCheckedAt: p.lastCheckedAt,
            })),
            ...platformAvailability.filter(pa => 
              !content.platformAvailability.some(p => p.platformName === pa.name)
            ),
          ];

          // Enhanced cast with TMDB data
          const enhancedCast = enhancedTMDBData?.cast ? 
            enhancedTMDBData.cast.slice(0, 10).map(tmdbCast => ({
              id: tmdbCast.id.toString(),
              name: tmdbCast.name,
              role: tmdbCast.character,
              profileImageUrl: tmdbCast.profile_path ? 
                tmdbService.getImageUrl(tmdbCast.profile_path, 'w185') : null,
              orderIndex: tmdbCast.order,
            })) : 
            content.cast.map(c => ({
              id: c.person.id,
              name: c.person.name,
              role: c.role,
              profileImageUrl: c.person.profileImageUrl,
              orderIndex: c.orderIndex,
            }));

          // Enhanced crew with TMDB data
          const enhancedCrew = enhancedTMDBData?.crew ? 
            enhancedTMDBData.crew.slice(0, 10).map(tmdbCrew => ({
              id: tmdbCrew.id.toString(),
              name: tmdbCrew.name,
              job: tmdbCrew.job,
              department: tmdbCrew.department,
              profileImageUrl: tmdbCrew.profile_path ? 
                tmdbService.getImageUrl(tmdbCrew.profile_path, 'w185') : null,
            })) : 
            content.crew.map(c => ({
              id: c.person.id,
              name: c.person.name,
              job: c.job,
              department: c.department,
              profileImageUrl: c.person.profileImageUrl,
            }));

          // Build comprehensive response
          const transformedContent = {
            // Core content information
            id: content.id,
            externalId: content.externalId,
            title: content.title,
            originalTitle: content.originalTitle,
            description: content.description,
            synopsis: content.synopsis || enhancedTMDBData?.tmdbData?.overview || content.description,
            
            // Classification
            contentType: content.contentType,
            caseType: content.caseType,
            trueCrimeGenres: content.trueCrimeGenres,
            generalGenres: content.generalGenres,
            
            // Basic metadata
            releaseDate: content.releaseDate,
            runtime: content.runtime,
            
            // Ratings
            tmdbRating: enhancedTMDBData?.tmdbData?.vote_average || content.tmdbRating,
            userRatingAvg: content.userRatingAvg,
            userRatingCount: content.userRatingCount,
            
            // True Crime specific metadata
            caseName: content.caseName,
            location: content.location,
            timeframStart: content.timeframStart,
            timeframEnd: content.timeframEnd,
            factualityLevel: content.factualityLevel,
            sensitivityLevel: content.sensitivityLevel,
            contentWarnings: content.contentWarnings,
            
            // Media assets
            posterUrl: enhancedPosterUrl,
            backdropUrl: enhancedBackdropUrl,
            trailerUrl: enhancedTrailerUrl,
            
            // SEO
            slug: content.slug,
            
            // Series data
            totalSeasons: content.totalSeasons,
            totalEpisodes: content.totalEpisodes,
            
            // Platform availability
            platforms: allPlatforms,
            isAvailable: allPlatforms.length > 0,
            
            // Cast and crew
            cast: enhancedCast,
            crew: enhancedCrew,
            
            // Related content
            relatedCases: content.relatedCases.map(rc => ({
              id: rc.case.id,
              name: rc.case.name,
              caseType: rc.case.caseType,
              status: rc.case.status,
              slug: rc.case.slug,
              description: rc.case.description,
              startDate: rc.case.startDate,
              endDate: rc.case.endDate,
              location: rc.case.location,
              relevanceScore: rc.relevanceScore,
            })),
            
            relatedKillers: content.relatedKillers.map(rk => ({
              id: rk.killer.id,
              name: rk.killer.name,
              aliases: rk.killer.aliases,
              slug: rk.killer.slug,
              imageUrl: rk.killer.imageUrl,
              birthDate: rk.killer.birthDate,
              deathDate: rk.killer.deathDate,
              isAlive: rk.killer.isAlive,
              relevanceScore: rk.relevanceScore,
            })),
            
            // Episodes
            episodes: content.episodes,
            
            // Images
            images: content.images,
            
            // User-specific data
            isInWatchlist: userData.isInWatchlist,
            isWatched: userData.isWatched,
            userRating: userData.userRating,
            userProgress: userData.userProgress,
            
            // Statistics
            stats: {
              trackingCount: content._count.contentTracking,
              watchlistCount: content._count.watchlists,
              reviewCount: content._count.reviews,
            },
            
            // Metadata
            isActive: content.isActive,
            createdAt: content.createdAt,
            updatedAt: content.updatedAt,
            lastSyncAt: content.lastSyncAt,
          };
          
          return transformedContent;
        } catch (error) {
          logger.error('Failed to get content by ID', { id, error });
          throw handleDatabaseError(error);
        }
      }),
    (input: z.infer<typeof GetContentSchema>, ctx: Context) => 
      ctx.user?.id 
        ? createUserCacheKey('content-detail', ctx.user.id, input.id)
        : cacheKeyGenerators.content.detail(input.id),
    cacheDurations.standard,
    { tags: ['content'] }
  ),

  /**
   * Search content with caching and monitoring
   */
  search: withCaching(
    publicProcedure
      .input(SearchContentSchema)
      .query(async ({ input, ctx }) => {
        const { query, page, limit } = input;
        
        try {
          ctx.timer.start('content.search.query');
          
          // Try Watchmode API first for real data
          let results: any[] = [];
          
          try {
            const watchmodeApiKey = process.env.WATCHMODE_API_KEY;
            if (watchmodeApiKey && query.trim().length >= 2) {
              console.log('Searching Watchmode API for:', query);
              
              const watchmodeUrl = `https://api.watchmode.com/v1/search/?search_field=name&search_value=${encodeURIComponent(query)}&types=movie,tv`;
              
              const response = await fetch(watchmodeUrl, {
                headers: {
                  'X-API-Key': watchmodeApiKey,
                },
              });
              console.log('Watchmode response status:', response.status, response.statusText);
              
              if (response.ok) {
                const watchmodeData = await response.json();
                console.log('Watchmode response data keys:', Object.keys(watchmodeData));
                console.log('Number of results:', watchmodeData.title_results?.length || 0);
                
                if (watchmodeData.title_results?.length > 0) {
                  console.log('First result sample:', JSON.stringify(watchmodeData.title_results[0], null, 2));
                }
                
                // Transform Watchmode data to our format
                const watchmodeResults = watchmodeData.title_results?.slice(0, limit) || [];
                results = await Promise.all(watchmodeResults.map(async (item: any) => {
                  // Get real TMDB poster URL
                  const posterUrl = await getTMDBPosterUrl(item.tmdb_id, item.tmdb_type);
                  
                  return {
                  id: `watchmode_${item.id}`,
                  externalId: `watchmode_${item.id}`,
                  title: item.name,
                  originalTitle: item.original_name || item.name,
                  description: item.plot_overview || `${item.type === 'movie' ? 'Movie' : 'TV Series'} about ${item.name}`,
                  synopsis: item.plot_overview || '',
                  
                  contentType: item.type === 'movie' ? 'MOVIE' : (item.type === 'tv_series' || item.type === 'tv_miniseries') ? 'TV_SERIES' : 'DOCUMENTARY',
                  caseType: 'SERIAL_KILLER',
                  trueCrimeGenres: ['SERIAL_KILLER'],
                  generalGenres: item.genre_names || [],
                  
                  releaseDate: item.year ? new Date(`${item.year}-01-01`) : null,
                  runtime: null,
                  
                  tmdbRating: item.tmdb_rating || null,
                  userRatingAvg: item.imdb_rating || null,
                  userRatingCount: null,
                  
                  caseName: item.name.includes('Bundy') ? 'Ted Bundy Serial Murders' : null,
                  location: 'United States',
                  timeframStart: null,
                  timeframEnd: null,
                  factualityLevel: 'DOCUMENTARY',
                  sensitivityLevel: 'MODERATE',
                  contentWarnings: [],
                  
                  posterUrl: posterUrl || `https://via.placeholder.com/300x450/2C2C30/8B4B7F?text=${encodeURIComponent(item.name.replace(/[^a-zA-Z0-9]/g, '+'))}`,
                  backdropUrl: posterUrl ? posterUrl.replace('w500', 'w1280') : `https://via.placeholder.com/1280x720/2C2C30/8B4B7F?text=${encodeURIComponent(item.name.replace(/[^a-zA-Z0-9]/g, '+'))}`,
                  trailerUrl: null,
                  
                  slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  
                  totalSeasons: null,
                  totalEpisodes: null,
                  
                  platforms: [], // Would need additional Watchmode API call to get platform data
                  
                  isActive: true,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  lastSyncAt: new Date(),
                };
                }));
              } else {
                console.error('Watchmode API error - Status:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Watchmode API error response:', errorText);
              }
            }
          } catch (watchmodeError) {
            console.error('Watchmode API exception:', watchmodeError);
          }
          
          // Fallback to mock data if Watchmode fails or returns no results
          if (results.length === 0) {
            console.log('Using mock data fallback');
            results = query.toLowerCase().includes('ted') || 
                     query.toLowerCase().includes('bundy') ? mockBundyContent : [];
          }
          
          ctx.timer.end('content.search.query');

          return {
            results,
            pagination: {
              page,
              limit,
              total: results.length,
              pages: Math.ceil(results.length / limit),
              hasNext: page * limit < results.length,
              hasPrev: page > 1,
            },
          };
        } catch (error) {
          throw handleDatabaseError(error);
        }
      }),
    (input: z.infer<typeof SearchContentSchema>, _ctx: Context) => {
      const filtersKey = input.filters ? JSON.stringify(input.filters) : 'none';
      return cacheKeyGenerators.search.results(`${input.query}:${input.page}:${input.limit}`, filtersKey);
    },
    cacheDurations.medium,
    { tags: ['content', 'search'] }
  ),

  /**
   * Get content list (trending, popular, etc.)
   */
  list: withCaching(
    publicProcedure
      .input(ContentListSchema)
      .query(async ({ input }) => {
        const { page, limit, category, timeframe } = input;
        
        try {
          // TODO: Replace with actual database queries based on category and timeframe
          // For now, return mock data
          const results = mockBundyContent.slice(0, limit);

          return {
            results,
            pagination: {
              page,
              limit,
              total: results.length,
              pages: Math.ceil(results.length / limit),
              hasNext: page * limit < results.length,
              hasPrev: page > 1,
            },
            category,
            timeframe,
          };
        } catch (error) {
          throw handleDatabaseError(error);
        }
      }),
    (input: z.infer<typeof ContentListSchema>, _ctx: Context) => 
      cacheKeyGenerators.content.list(input.page, input.limit),
    cacheDurations.medium,
    { tags: ['content'] }
  ),

  /**
   * Add content to user's watchlist (requires authentication)
   */
  addToWatchlist: protectedProcedure
    .input(AddToWatchlistSchema)
    .mutation(async ({ input, ctx }) => {
      const { contentId, watchlistId, notes } = input;
      const userId = ctx.user!.id;
      
      try {
        // Verify content exists
        const content = await prisma.content.findUnique({
          where: { id: contentId },
          select: { id: true, title: true, isActive: true },
        });

        if (!content || !content.isActive) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Content not found',
          });
        }

        // Get or create default watchlist if no specific watchlist provided
        const targetWatchlist = watchlistId 
          ? await prisma.watchlist.findFirst({
              where: { id: watchlistId, userId },
            })
          : await getOrCreateDefaultWatchlist(userId);

        if (!targetWatchlist) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Watchlist not found',
          });
        }

        // Check if already in watchlist
        const existingItem = await prisma.watchlistItem.findUnique({
          where: {
            watchlistId_contentId: {
              watchlistId: targetWatchlist.id,
              contentId,
            },
          },
        });

        if (existingItem) {
          return {
            success: true,
            message: `"${content.title}" is already in your watchlist`,
            alreadyExists: true,
          };
        }

        // Add to watchlist
        await prisma.watchlistItem.create({
          data: {
            watchlistId: targetWatchlist.id,
            contentId,
            notes,
            orderIndex: 0, // Add to top of list
          },
        });

        // Update order indexes for other items
        await prisma.watchlistItem.updateMany({
          where: {
            watchlistId: targetWatchlist.id,
            contentId: { not: contentId },
          },
          data: {
            orderIndex: { increment: 1 },
          },
        });

        // Invalidate relevant caches
        await invalidateCache(
          [`user:${userId}:watchlist*`, `content-detail:${userId}:${contentId}`],
          ['watchlist', `user-${userId}`, 'content']
        );

        logger.info('Content added to watchlist', {
          userId,
          contentId,
          contentTitle: content.title,
          watchlistId: targetWatchlist.id,
        });

        return {
          success: true,
          message: `"${content.title}" added to your watchlist`,
          alreadyExists: false,
        };
      } catch (error) {
        logger.error('Failed to add content to watchlist', {
          userId,
          contentId,
          watchlistId,
          error,
        });
        throw handleDatabaseError(error);
      }
    }),

  /**
   * Remove content from user's watchlist (requires authentication)
   */
  removeFromWatchlist: protectedProcedure
    .input(RemoveFromWatchlistSchema)
    .mutation(async ({ input, ctx }) => {
      const { contentId, watchlistId } = input;
      const userId = ctx.user!.id;
      
      try {
        // Find the watchlist item to remove
        const watchlistItem = watchlistId 
          ? await prisma.watchlistItem.findFirst({
              where: {
                contentId,
                watchlistId,
                watchlist: { userId },
              },
              include: {
                content: { select: { title: true } },
                watchlist: { select: { name: true } },
              },
            })
          : await prisma.watchlistItem.findFirst({
              where: {
                contentId,
                watchlist: {
                  userId,
                  isDefault: true,
                },
              },
              include: {
                content: { select: { title: true } },
                watchlist: { select: { name: true } },
              },
            });

        if (!watchlistItem) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Content is not in your watchlist',
          });
        }

        // Remove the item
        await prisma.watchlistItem.delete({
          where: { id: watchlistItem.id },
        });

        // Invalidate relevant caches
        await invalidateCache(
          [`user:${userId}:watchlist*`, `content-detail:${userId}:${contentId}`],
          ['watchlist', `user-${userId}`, 'content']
        );

        logger.info('Content removed from watchlist', {
          userId,
          contentId,
          contentTitle: watchlistItem.content.title,
          watchlistName: watchlistItem.watchlist.name,
        });

        return {
          success: true,
          message: `"${watchlistItem.content.title}" removed from your watchlist`,
        };
      } catch (error) {
        logger.error('Failed to remove content from watchlist', {
          userId,
          contentId,
          watchlistId,
          error,
        });
        throw handleDatabaseError(error);
      }
    }),

  /**
   * Mark content as watched (requires authentication)
   */
  markAsWatched: protectedProcedure
    .input(MarkAsWatchedSchema)
    .mutation(async ({ input, ctx }) => {
      const { contentId, rating, review, notes } = input;
      const userId = ctx.user!.id;
      
      try {
        // Verify content exists
        const content = await prisma.content.findUnique({
          where: { id: contentId },
          select: { id: true, title: true, isActive: true },
        });

        if (!content || !content.isActive) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Content not found',
          });
        }

        // Update or create content tracking
        const trackingData = {
          status: 'WATCHED' as const,
          rating,
          review,
          notes,
          completedAt: new Date(),
          lastWatchedAt: new Date(),
          progressPercent: 1.0,
          isPublic: false,
        };

        const contentTracking = await prisma.contentTracking.upsert({
          where: {
            userId_contentId: {
              userId,
              contentId,
            },
          },
          update: trackingData,
          create: {
            userId,
            contentId,
            ...trackingData,
          },
        });

        // If a rating was provided, update the content's average rating
        if (rating) {
          const ratingStats = await prisma.contentTracking.aggregate({
            where: {
              contentId,
              rating: { not: null },
            },
            _avg: { rating: true },
            _count: { rating: true },
          });

          if (ratingStats._avg.rating && ratingStats._count.rating) {
            await prisma.content.update({
              where: { id: contentId },
              data: {
                userRatingAvg: ratingStats._avg.rating,
                userRatingCount: ratingStats._count.rating,
              },
            });
          }
        }

        // Invalidate relevant caches
        await invalidateCache(
          [`user:${userId}:progress*`, `content-detail:${userId}:${contentId}`, `content:${contentId}`],
          ['progress', `user-${userId}`, 'content']
        );

        logger.info('Content marked as watched', {
          userId,
          contentId,
          contentTitle: content.title,
          rating,
          hasReview: Boolean(review),
        });

        return {
          success: true,
          message: `"${content.title}" marked as watched`,
          trackingId: contentTracking.id,
        };
      } catch (error) {
        logger.error('Failed to mark content as watched', {
          userId,
          contentId,
          error,
        });
        throw handleDatabaseError(error);
      }
    }),

  /**
   * Rate content (requires authentication)
   */
  rateContent: protectedProcedure
    .input(RateContentSchema)
    .mutation(async ({ input, ctx }) => {
      const { contentId, rating, review } = input;
      const userId = ctx.user!.id;
      
      try {
        // Verify content exists
        const content = await prisma.content.findUnique({
          where: { id: contentId },
          select: { id: true, title: true, isActive: true },
        });

        if (!content || !content.isActive) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Content not found',
          });
        }

        // Update or create content tracking with rating
        const trackingData = {
          rating,
          review,
          lastWatchedAt: new Date(),
        };

        const contentTracking = await prisma.contentTracking.upsert({
          where: {
            userId_contentId: {
              userId,
              contentId,
            },
          },
          update: trackingData,
          create: {
            userId,
            contentId,
            status: 'WANT_TO_WATCH',
            ...trackingData,
          },
        });

        // Update the content's average rating
        const ratingStats = await prisma.contentTracking.aggregate({
          where: {
            contentId,
            rating: { not: null },
          },
          _avg: { rating: true },
          _count: { rating: true },
        });

        if (ratingStats._avg.rating && ratingStats._count.rating) {
          await prisma.content.update({
            where: { id: contentId },
            data: {
              userRatingAvg: ratingStats._avg.rating,
              userRatingCount: ratingStats._count.rating,
            },
          });
        }

        // Invalidate relevant caches
        await invalidateCache(
          [`user:${userId}:progress*`, `content-detail:${userId}:${contentId}`, `content:${contentId}`],
          ['progress', `user-${userId}`, 'content']
        );

        logger.info('Content rated', {
          userId,
          contentId,
          contentTitle: content.title,
          rating,
          hasReview: Boolean(review),
        });

        return {
          success: true,
          message: `"${content.title}" rated ${rating} stars`,
          trackingId: contentTracking.id,
        };
      } catch (error) {
        logger.error('Failed to rate content', {
          userId,
          contentId,
          error,
        });
        throw handleDatabaseError(error);
      }
    }),

  /**
   * Update user's progress on content (requires email verification)
   */
  updateProgress: verifiedProcedure
    .input(UpdateProgressSchema)
    .mutation(async ({ input, ctx }) => {
      const { contentId, status, rating, review, notes, currentSeason, currentEpisode, progressPercent, isPublic } = input;
      const userId = ctx.user!.id;
      
      try {
        // Verify content exists
        const content = await prisma.content.findUnique({
          where: { id: contentId },
          select: { id: true, title: true, isActive: true },
        });

        if (!content || !content.isActive) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Content not found',
          });
        }

        // Prepare update data
        const updateData: any = {
          lastWatchedAt: new Date(),
        };

        if (status !== undefined) updateData.status = status;
        if (rating !== undefined) updateData.rating = rating;
        if (review !== undefined) updateData.review = review;
        if (notes !== undefined) updateData.notes = notes;
        if (currentSeason !== undefined) updateData.currentSeason = currentSeason;
        if (currentEpisode !== undefined) updateData.currentEpisode = currentEpisode;
        if (progressPercent !== undefined) updateData.progressPercent = progressPercent;
        if (isPublic !== undefined) updateData.isPublic = isPublic;

        // Set completion data if marking as watched
        if (status === 'WATCHED') {
          updateData.completedAt = new Date();
          updateData.progressPercent = 1.0;
        }

        // Update or create content tracking
        const contentTracking = await prisma.contentTracking.upsert({
          where: {
            userId_contentId: {
              userId,
              contentId,
            },
          },
          update: updateData,
          create: {
            userId,
            contentId,
            status: status || 'WANT_TO_WATCH',
            ...updateData,
          },
        });

        // Update content average rating if rating was provided
        if (rating) {
          const ratingStats = await prisma.contentTracking.aggregate({
            where: {
              contentId,
              rating: { not: null },
            },
            _avg: { rating: true },
            _count: { rating: true },
          });

          if (ratingStats._avg.rating && ratingStats._count.rating) {
            await prisma.content.update({
              where: { id: contentId },
              data: {
                userRatingAvg: ratingStats._avg.rating,
                userRatingCount: ratingStats._count.rating,
              },
            });
          }
        }

        // Invalidate relevant caches
        await invalidateCache(
          [`user:${userId}:progress*`, `content-detail:${userId}:${contentId}`, `content:${contentId}`],
          ['progress', `user-${userId}`, 'content']
        );

        logger.info('Content progress updated', {
          userId,
          contentId,
          contentTitle: content.title,
          status,
          progressPercent,
          currentSeason,
          currentEpisode,
        });

        return {
          success: true,
          message: `Progress updated for "${content.title}"`,
          trackingId: contentTracking.id,
          status: contentTracking.status,
        };
      } catch (error) {
        logger.error('Failed to update content progress', {
          userId,
          contentId,
          error,
        });
        throw handleDatabaseError(error);
      }
    }),

  /**
   * Get user's watchlist (requires authentication)
   */
  getWatchlist: withCaching(
    protectedProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
      }))
      .query(async ({ input }) => {
        const { page, limit } = input;
        
        try {
          // TODO: Replace with actual database query
          // For now, return mock data
          const results = [
            {
              ...mockContent,
              addedAt: new Date('2023-11-01'),
            }
          ];

          return {
            results,
            pagination: {
              page,
              limit,
              total: results.length,
              pages: Math.ceil(results.length / limit),
              hasNext: page * limit < results.length,
              hasPrev: page > 1,
            },
          };
        } catch (error) {
          throw handleDatabaseError(error);
        }
      }),
    (input: z.infer<z.ZodObject<{ page: z.ZodDefault<z.ZodNumber>; limit: z.ZodDefault<z.ZodNumber> }>>, ctx: Context) => 
      createUserCacheKey('watchlist', ctx.user?.id, `${input.page}:${input.limit}`),
    cacheDurations.standard,
    { tags: ['watchlist'] }
  ),

  /**
   * Get related content based on various criteria
   */
  getRelated: withCaching(
    publicProcedure
      .input(GetRelatedContentSchema)
      .query(async ({ input, ctx }) => {
        const { contentId, type, limit } = input;
        
        try {
          ctx.timer.start('content.getRelated.query');
          
          // Get the base content to determine relationship criteria
          const baseContent = await prisma.content.findUnique({
            where: { id: contentId },
            select: {
              id: true,
              title: true,
              caseType: true,
              trueCrimeGenres: true,
              generalGenres: true,
              relatedCases: {
                select: { caseId: true },
              },
              relatedKillers: {
                select: { killerId: true },
              },
              cast: {
                select: { personId: true },
                take: 5,
              },
              crew: {
                select: { personId: true },
                where: {
                  job: { in: ['Director', 'Producer', 'Creator'] },
                },
                take: 3,
              },
            },
          });

          if (!baseContent) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Content not found',
            });
          }

          let relatedContent: any[] = [];

          switch (type) {
            case 'same_case':
              if (baseContent.relatedCases.length > 0) {
                relatedContent = await prisma.content.findMany({
                  where: {
                    id: { not: contentId },
                    isActive: true,
                    relatedCases: {
                      some: {
                        caseId: {
                          in: baseContent.relatedCases.map(rc => rc.caseId),
                        },
                      },
                    },
                  },
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    contentType: true,
                    caseType: true,
                    releaseDate: true,
                    runtime: true,
                    userRatingAvg: true,
                    posterUrl: true,
                    slug: true,
                  },
                  take: limit,
                  orderBy: { userRatingAvg: 'desc' },
                });
              }
              break;

            case 'same_killer':
              if (baseContent.relatedKillers.length > 0) {
                relatedContent = await prisma.content.findMany({
                  where: {
                    id: { not: contentId },
                    isActive: true,
                    relatedKillers: {
                      some: {
                        killerId: {
                          in: baseContent.relatedKillers.map(rk => rk.killerId),
                        },
                      },
                    },
                  },
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    contentType: true,
                    caseType: true,
                    releaseDate: true,
                    runtime: true,
                    userRatingAvg: true,
                    posterUrl: true,
                    slug: true,
                  },
                  take: limit,
                  orderBy: { userRatingAvg: 'desc' },
                });
              }
              break;

            case 'same_creator':
              if (baseContent.crew.length > 0) {
                relatedContent = await prisma.content.findMany({
                  where: {
                    id: { not: contentId },
                    isActive: true,
                    crew: {
                      some: {
                        personId: {
                          in: baseContent.crew.map(c => c.personId),
                        },
                        job: { in: ['Director', 'Producer', 'Creator'] },
                      },
                    },
                  },
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    contentType: true,
                    caseType: true,
                    releaseDate: true,
                    runtime: true,
                    userRatingAvg: true,
                    posterUrl: true,
                    slug: true,
                  },
                  take: limit,
                  orderBy: { userRatingAvg: 'desc' },
                });
              }
              break;

            case 'similar':
            default:
              // Find similar content based on case type and genres
              relatedContent = await prisma.content.findMany({
                where: {
                  id: { not: contentId },
                  isActive: true,
                  OR: [
                    {
                      caseType: baseContent.caseType,
                    },
                    {
                      trueCrimeGenres: {
                        hasSome: baseContent.trueCrimeGenres,
                      },
                    },
                    {
                      generalGenres: {
                        hasSome: baseContent.generalGenres,
                      },
                    },
                  ],
                },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  contentType: true,
                  caseType: true,
                  releaseDate: true,
                  runtime: true,
                  userRatingAvg: true,
                  posterUrl: true,
                  slug: true,
                },
                take: limit * 2, // Get more to filter and rank
                orderBy: [
                  { userRatingAvg: 'desc' },
                  { userRatingCount: 'desc' },
                ],
              });

              // Score and sort by similarity
              relatedContent = relatedContent
                .map(content => {
                  let score = 0;
                  
                  // Same case type gets highest score
                  if (content.caseType === baseContent.caseType) score += 10;
                  
                  // Shared true crime genres
                  const sharedTCGenres = baseContent.trueCrimeGenres.filter(g => 
                    content.trueCrimeGenres?.includes(g)
                  ).length;
                  score += sharedTCGenres * 3;
                  
                  // Shared general genres
                  const sharedGenres = baseContent.generalGenres.filter(g => 
                    content.generalGenres?.includes(g)
                  ).length;
                  score += sharedGenres * 2;
                  
                  // Boost for higher ratings
                  score += (content.userRatingAvg || 0) * 0.5;
                  
                  return { ...content, similarityScore: score };
                })
                .sort((a, b) => b.similarityScore - a.similarityScore)
                .slice(0, limit);
              break;
          }

          ctx.timer.end('content.getRelated.query');

          return {
            results: relatedContent,
            type: type || 'similar',
            baseContentId: contentId,
            count: relatedContent.length,
          };
        } catch (error) {
          logger.error('Failed to get related content', { contentId, type, error });
          throw handleDatabaseError(error);
        }
      }),
    (input: z.infer<typeof GetRelatedContentSchema>, _ctx: Context) => 
      cacheKeyGenerators.content.related(input.contentId, input.type || 'similar'),
    cacheDurations.long,
    { tags: ['content', 'related'] }
  ),

  /**
   * Get external content details (from Watchmode, TMDB, etc.)
   */
  getExternalContent: withCaching(
    publicProcedure
      .input(GetContentByExternalIdSchema)
      .query(async ({ input, ctx }) => {
        const { externalId } = input;
        const userId = ctx.user?.id;
        
        try {
          ctx.timer.start('content.getExternalContent.query');
          
          // Handle Watchmode external content
          if (externalId.startsWith('watchmode_')) {
            const watchmodeId = parseInt(externalId.replace('watchmode_', ''));
            // Fetch title details directly from Watchmode API
            let watchmodeTitle = null;
            try {
              const titleResponse = await fetch(`https://api.watchmode.com/v1/title/${watchmodeId}/details/?apikey=${process.env.WATCHMODE_API_KEY}`, {
                headers: {
                  'X-API-Key': process.env.WATCHMODE_API_KEY!,
                  'Accept': 'application/json',
                },
              });
              if (titleResponse.ok) {
                watchmodeTitle = await titleResponse.json();
              }
            } catch (error) {
              console.warn('Watchmode API call failed:', error);
            }
            
            const [platformAvailability, userData] = await Promise.all([
              getPlatformAvailability(watchmodeId, 'US').catch(() => []),
              getUserContentData(externalId, userId).catch(() => ({})),
            ]);
            
            if (!watchmodeTitle) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'External content not found',
              });
            }

            // Get enhanced TMDB data if available
            const enhancedTMDBData = watchmodeTitle.tmdb_id ? await getEnhancedTMDBDetails(
              watchmodeTitle.tmdb_id,
              watchmodeTitle.tmdb_type || 'movie',
              externalId
            ) : null;

            // Build response from external data
            const response = {
              id: externalId,
              externalId: externalId,
              title: watchmodeTitle.title || watchmodeTitle.name,
              originalTitle: watchmodeTitle.original_title,
              description: watchmodeTitle.plot_overview,
              synopsis: enhancedTMDBData?.tmdbData?.overview || watchmodeTitle.plot_overview,
              
              contentType: watchmodeService.mapWatchmodeTypeToContentType(watchmodeTitle.type),
              caseType: 'SERIAL_KILLER',
              trueCrimeGenres: ['SERIAL_KILLER'],
              generalGenres: watchmodeTitle.genre_names || [],
              
              releaseDate: watchmodeTitle.year ? new Date(`${watchmodeTitle.year}-01-01`) : null,
              runtime: watchmodeTitle.runtime_minutes,
              
              tmdbRating: enhancedTMDBData?.tmdbData?.vote_average || watchmodeTitle.user_rating,
              userRatingAvg: watchmodeTitle.critic_score || watchmodeTitle.user_rating || 0,
              userRatingCount: 0,
              
              caseName: null,
              location: null,
              timeframStart: null,
              timeframEnd: null,
              factualityLevel: 'DOCUMENTARY',
              sensitivityLevel: 'MODERATE',
              contentWarnings: [],
              
              posterUrl: enhancedTMDBData?.posterUrl || watchmodeTitle.poster,
              backdropUrl: enhancedTMDBData?.backdropUrl || watchmodeTitle.backdrop,
              trailerUrl: enhancedTMDBData?.trailerUrl || watchmodeTitle.trailer,
              
              slug: (watchmodeTitle.title || watchmodeTitle.name)?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || externalId,
              
              totalSeasons: null,
              totalEpisodes: null,
              
              platforms: platformAvailability,
              isAvailable: platformAvailability.length > 0,
              
              cast: enhancedTMDBData?.cast?.slice(0, 10).map(tmdbCast => ({
                id: tmdbCast.id.toString(),
                name: tmdbCast.name,
                role: tmdbCast.character,
                profileImageUrl: tmdbCast.profile_path ? 
                  tmdbService.getImageUrl(tmdbCast.profile_path, 'w185') : null,
              })) || [],
              
              crew: enhancedTMDBData?.crew?.slice(0, 10).map(tmdbCrew => ({
                id: tmdbCrew.id.toString(),
                name: tmdbCrew.name,
                job: tmdbCrew.job,
                department: tmdbCrew.department,
                profileImageUrl: tmdbCrew.profile_path ? 
                  tmdbService.getImageUrl(tmdbCrew.profile_path, 'w185') : null,
              })) || [],
              
              relatedCases: [],
              relatedKillers: [],
              episodes: [],
              images: [],
              
              // User-specific data
              isInWatchlist: userData.isInWatchlist,
              isWatched: userData.isWatched,
              userRating: userData.userRating,
              userProgress: userData.userProgress,
              
              stats: {
                trackingCount: 0,
                watchlistCount: 0,
                reviewCount: 0,
              },
              
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastSyncAt: new Date(),
            };
            
            ctx.timer.end('content.getExternalContent.query');
            return response;
          }
          
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'External content not found',
          });
        } catch (error) {
          console.error('Failed to get external content', { externalId, error });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to fetch external content',
            cause: error,
          });
        }
      }),
    (input: z.infer<typeof GetContentByExternalIdSchema>, ctx: Context) => 
      ctx.user?.id 
        ? createUserCacheKey('external-content', ctx.user.id, input.externalId)
        : cacheKeyGenerators.content.detail(input.externalId),
    cacheDurations.standard,
    { tags: ['content', 'external'] }
  ),
});

export type ContentRouter = typeof contentRouter;