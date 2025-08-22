import { prisma } from '@/lib/prisma';
import { meilisearchService } from '@/lib/meilisearch';
import { watchmodeService } from './watchmode.service';
import { tmdbService } from './tmdb.service';
import { logger } from '@/lib/monitoring';
import pQueue from 'p-queue';
import { nanoid } from 'nanoid';

// ============================================================================
// CONTENT SYNCHRONIZATION SERVICE
// ============================================================================

export class ContentSyncService {
  private syncQueue: pQueue;

  constructor() {
    // Process sync operations with limited concurrency to respect API limits
    this.syncQueue = new pQueue({
      concurrency: 2,
      interval: 5000, // 5 second intervals between batches
      intervalCap: 1,
    });
  }

  // ============================================================================
  // EXTERNAL API CONTENT DISCOVERY
  // ============================================================================

  /**
   * Search and import True Crime content from external APIs
   */
  async discoverAndImportContent(
    query: string,
    options: {
      maxResults?: number;
      enrichWithTMDB?: boolean;
      syncToMeilisearch?: boolean;
    } = {}
  ): Promise<{ imported: number; updated: number; errors: number }> {
    const { maxResults = 50, enrichWithTMDB = true, syncToMeilisearch = true } = options;
    
    let imported = 0;
    let updated = 0;
    let errors = 0;

    try {
      logger.info('Starting content discovery', { query, options });

      // Step 1: Search Watchmode for True Crime content
      const watchmodeResults = await watchmodeService.searchTrueCrimeContent(query, {
        page: 1,
        includeGenres: true,
      });

      const limitedResults = watchmodeResults.slice(0, maxResults);
      logger.info('Watchmode search completed', { 
        totalResults: watchmodeResults.length,
        processingCount: limitedResults.length 
      });

      // Step 2: Process each result
      for (const watchmodeTitle of limitedResults) {
        try {
          const result = await this.syncQueue.add(() => 
            this.processWatchmodeContent(watchmodeTitle, { enrichWithTMDB })
          );
          
          if (result?.isNew) {
            imported++;
          } else if (result?.isUpdated) {
            updated++;
          }
        } catch (error) {
          logger.error('Failed to process Watchmode content', { 
            title: watchmodeTitle.title,
            error 
          });
          errors++;
        }
      }

      // Step 3: Sync to Meilisearch if requested
      if (syncToMeilisearch && (imported + updated) > 0) {
        await this.syncContentToMeilisearch();
      }

      logger.info('Content discovery completed', { imported, updated, errors });
      return { imported, updated, errors };

    } catch (error) {
      logger.error('Content discovery failed', { query, error });
      throw error;
    }
  }

  /**
   * Process individual Watchmode content item
   */
  private async processWatchmodeContent(
    watchmodeTitle: any,
    options: { enrichWithTMDB?: boolean } = {}
  ): Promise<{ isNew: boolean; isUpdated: boolean; contentId: string } | null> {
    try {
      // Check if content already exists
      let existingContent = await prisma.content.findFirst({
        where: {
          OR: [
            { externalId: watchmodeTitle.watchmode_id.toString() },
            { tmdbId: watchmodeTitle.tmdb_id?.toString() },
            { imdbId: watchmodeTitle.imdb_id },
          ],
        },
        include: {
          platformAvailability: true,
        },
      });

      let tmdbData = null;
      if (options.enrichWithTMDB && watchmodeTitle.tmdb_id) {
        try {
          if (watchmodeTitle.tmdb_type === 'movie') {
            tmdbData = await tmdbService.getMovieDetails(watchmodeTitle.tmdb_id);
          } else if (watchmodeTitle.tmdb_type === 'tv') {
            tmdbData = await tmdbService.getTVShowDetails(watchmodeTitle.tmdb_id);
          }
        } catch (error) {
          logger.warn('Failed to fetch TMDB data', { 
            tmdbId: watchmodeTitle.tmdb_id,
            error 
          });
        }
      }

      const contentData = this.buildContentData(watchmodeTitle, tmdbData);
      let contentId: string;
      let isNew = false;
      let isUpdated = false;

      if (existingContent) {
        // Update existing content
        const updatedContent = await prisma.content.update({
          where: { id: existingContent.id },
          data: contentData,
        });
        contentId = updatedContent.id;
        isUpdated = true;
      } else {
        // Create new content
        const newContent = await prisma.content.create({
          data: {
            id: nanoid(),
            ...contentData,
          },
        });
        contentId = newContent.id;
        isNew = true;
      }

      // Sync platform availability
      await this.syncPlatformAvailability(contentId, watchmodeTitle.watchmode_id);

      // Process cast and crew from TMDB if available
      if (tmdbData) {
        await this.processCastAndCrew(contentId, tmdbData);
      }

      return { isNew, isUpdated, contentId };

    } catch (error) {
      logger.error('Failed to process Watchmode content', { 
        title: watchmodeTitle.title,
        error 
      });
      return null;
    }
  }

  /**
   * Build content data from external sources
   */
  private buildContentData(watchmodeTitle: any, tmdbData: any = null) {
    const slug = this.generateSlug(watchmodeTitle.title);
    
    const contentData = {
      externalId: watchmodeTitle.watchmode_id.toString(),
      tmdbId: watchmodeTitle.tmdb_id?.toString(),
      imdbId: watchmodeTitle.imdb_id,
      
      title: watchmodeTitle.title,
      originalTitle: watchmodeTitle.original_title !== watchmodeTitle.title 
        ? watchmodeTitle.original_title 
        : null,
      description: watchmodeTitle.plot_overview,
      synopsis: tmdbData?.overview || watchmodeTitle.plot_overview,
      
      contentType: this.mapToContentType(watchmodeTitle.type, tmdbData),
      trueCrimeGenres: this.extractTrueCrimeGenres(watchmodeTitle, tmdbData),
      generalGenres: this.extractGeneralGenres(watchmodeTitle, tmdbData),
      
      releaseDate: watchmodeTitle.release_date ? new Date(watchmodeTitle.release_date) : null,
      runtime: watchmodeTitle.runtime_minutes || tmdbData?.runtime,
      
      tmdbRating: tmdbData?.vote_average || watchmodeTitle.user_rating,
      userRatingAvg: null, // Will be calculated from user reviews
      userRatingCount: 0,
      
      // True Crime specific - to be enhanced with case/killer detection
      caseType: this.detectCaseType(watchmodeTitle, tmdbData),
      caseName: this.extractCaseName(watchmodeTitle, tmdbData),
      factualityLevel: this.determineFactualityLevel(watchmodeTitle, tmdbData),
      sensitivityLevel: 'MODERATE', // Default, can be updated based on content analysis
      contentWarnings: this.extractContentWarnings(watchmodeTitle, tmdbData),
      
      posterUrl: tmdbData?.poster_path 
        ? tmdbService.getImageUrl(tmdbData.poster_path, 'w500')
        : watchmodeTitle.poster,
      backdropUrl: tmdbData?.backdrop_path
        ? tmdbService.getImageUrl(tmdbData.backdrop_path, 'w780')
        : watchmodeTitle.backdrop,
      trailerUrl: this.extractTrailerUrl(tmdbData),
      
      slug,
      searchKeywords: this.generateSearchKeywords(watchmodeTitle, tmdbData),
      
      // Series specific
      totalSeasons: tmdbData?.number_of_seasons,
      totalEpisodes: tmdbData?.number_of_episodes,
      
      isActive: true,
      lastSyncAt: new Date(),
    };

    return contentData;
  }

  /**
   * Sync platform availability for content
   */
  private async syncPlatformAvailability(contentId: string, watchmodeId: number) {
    try {
      const sources = await watchmodeService.getTitleSources(watchmodeId, ['US']);
      
      // Clear existing availability
      await prisma.platformAvailability.deleteMany({
        where: { contentId },
      });

      // Add new availability data
      const availabilityData = sources.map(source => ({
        id: nanoid(),
        contentId,
        platformId: source.id.toString(),
        platformName: source.name,
        platformType: this.mapPlatformType(source.type),
        isAvailable: true,
        availabilityType: this.mapAvailabilityType(source.type),
        price: source.price,
        currency: 'USD',
        region: source.region || 'US',
        deepLinkUrl: source.web_url || source.ios_url || source.android_url,
        lastCheckedAt: new Date(),
      }));

      if (availabilityData.length > 0) {
        await prisma.platformAvailability.createMany({
          data: availabilityData,
        });
      }

    } catch (error) {
      logger.error('Failed to sync platform availability', { contentId, watchmodeId, error });
    }
  }

  /**
   * Process cast and crew from TMDB data
   */
  private async processCastAndCrew(contentId: string, tmdbData: any) {
    if (!tmdbData?.credits) return;

    try {
      // Process cast (top 10)
      const castData = tmdbData.credits.cast?.slice(0, 10) || [];
      for (const [index, castMember] of castData.entries()) {
        const person = await this.upsertPerson({
          externalId: castMember.id.toString(),
          name: castMember.name,
          profileImageUrl: castMember.profile_path 
            ? tmdbService.getImageUrl(castMember.profile_path, 'w185')
            : null,
        });

        await prisma.contentCast.upsert({
          where: {
            contentId_personId: {
              contentId,
              personId: person.id,
            },
          },
          create: {
            id: nanoid(),
            contentId,
            personId: person.id,
            role: castMember.character,
            orderIndex: index,
          },
          update: {
            role: castMember.character,
            orderIndex: index,
          },
        });
      }

      // Process crew (key roles only)
      const keyCrewJobs = ['Director', 'Producer', 'Writer', 'Creator', 'Executive Producer'];
      const crewData = tmdbData.credits.crew?.filter((c: any) => 
        keyCrewJobs.includes(c.job)
      ).slice(0, 10) || [];

      for (const [index, crewMember] of crewData.entries()) {
        const person = await this.upsertPerson({
          externalId: crewMember.id.toString(),
          name: crewMember.name,
          profileImageUrl: crewMember.profile_path 
            ? tmdbService.getImageUrl(crewMember.profile_path, 'w185')
            : null,
        });

        await prisma.contentCrew.upsert({
          where: {
            contentId_personId: {
              contentId,
              personId: person.id,
            },
          },
          create: {
            id: nanoid(),
            contentId,
            personId: person.id,
            job: crewMember.job,
            department: crewMember.department,
            orderIndex: index,
          },
          update: {
            job: crewMember.job,
            department: crewMember.department,
            orderIndex: index,
          },
        });
      }

    } catch (error) {
      logger.error('Failed to process cast and crew', { contentId, error });
    }
  }

  /**
   * Upsert person record
   */
  private async upsertPerson(personData: {
    externalId: string;
    name: string;
    profileImageUrl?: string | null;
  }) {
    return prisma.person.upsert({
      where: {
        externalId: personData.externalId,
      },
      create: {
        id: nanoid(),
        ...personData,
      },
      update: {
        name: personData.name,
        profileImageUrl: personData.profileImageUrl,
      },
    });
  }

  // ============================================================================
  // MEILISEARCH SYNCHRONIZATION
  // ============================================================================

  /**
   * Sync content to Meilisearch for instant search
   */
  async syncContentToMeilisearch(batchSize: number = 100): Promise<void> {
    try {
      logger.info('Starting Meilisearch content sync');

      let offset = 0;
      let totalSynced = 0;

      while (true) {
        const contentBatch = await prisma.content.findMany({
          where: { isActive: true },
          skip: offset,
          take: batchSize,
          include: {
            platformAvailability: {
              where: { isAvailable: true },
            },
            cast: {
              take: 10,
              include: {
                person: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            crew: {
              take: 10,
              include: {
                person: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            relatedCases: {
              include: {
                case: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            relatedKillers: {
              include: {
                killer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        if (contentBatch.length === 0) break;

        const searchDocuments = contentBatch.map(content => 
          this.transformContentForSearch(content)
        );

        await meilisearchService.addOrUpdateContent(searchDocuments);
        
        totalSynced += contentBatch.length;
        offset += batchSize;

        logger.info('Meilisearch batch synced', { 
          batchSize: contentBatch.length,
          totalSynced 
        });
      }

      logger.info('Meilisearch content sync completed', { totalSynced });

    } catch (error) {
      logger.error('Meilisearch content sync failed', { error });
      throw error;
    }
  }

  /**
   * Transform content for Meilisearch indexing
   */
  private transformContentForSearch(content: any): any {
    return {
      id: content.id,
      externalId: content.externalId,
      title: content.title,
      originalTitle: content.originalTitle,
      description: content.description,
      synopsis: content.synopsis,
      
      contentType: content.contentType,
      caseType: content.caseType,
      trueCrimeGenres: content.trueCrimeGenres,
      generalGenres: content.generalGenres,
      
      releaseDate: content.releaseDate?.toISOString(),
      releaseYear: content.releaseDate ? content.releaseDate.getFullYear() : null,
      runtime: content.runtime,
      
      tmdbRating: content.tmdbRating,
      userRatingAvg: content.userRatingAvg,
      userRatingCount: content.userRatingCount,
      
      caseName: content.caseName,
      location: content.location,
      timeframStart: content.timeframStart?.toISOString(),
      timeframEnd: content.timeframEnd?.toISOString(),
      factualityLevel: content.factualityLevel,
      sensitivityLevel: content.sensitivityLevel,
      contentWarnings: content.contentWarnings,
      
      platforms: content.platformAvailability.map((p: any) => ({
        id: p.platformId,
        name: p.platformName,
        type: p.platformType,
        availabilityType: p.availabilityType,
        isAvailable: p.isAvailable,
        region: p.region,
      })),
      
      cast: content.cast.map((c: any) => ({
        id: c.person.id,
        name: c.person.name,
        role: c.role,
      })),
      
      crew: content.crew.map((c: any) => ({
        id: c.person.id,
        name: c.person.name,
        job: c.job,
        department: c.department,
      })),
      
      relatedCases: content.relatedCases.map((rc: any) => rc.case.name),
      relatedKillers: content.relatedKillers.map((rk: any) => rk.killer.name),
      
      searchKeywords: content.searchKeywords,
      slug: content.slug,
      
      isActive: content.isActive,
      createdAt: content.createdAt.toISOString(),
      updatedAt: content.updatedAt.toISOString(),
      lastSyncAt: content.lastSyncAt?.toISOString(),
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  }

  private mapToContentType(watchmodeType: string, tmdbData: any): string {
    if (tmdbData?.genres?.some((g: any) => g.name === 'Documentary')) {
      return 'DOCUMENTARY';
    }
    
    const typeMap: Record<string, string> = {
      'movie': 'MOVIE',
      'tv_series': 'TV_SERIES',
      'tv_miniseries': 'DOCUSERIES',
      'tv_special': 'SPECIAL',
    };
    
    return typeMap[watchmodeType] || 'MOVIE';
  }

  private mapPlatformType(sourceType: string): string {
    const typeMap: Record<string, string> = {
      'sub': 'STREAMING',
      'buy': 'DIGITAL_PURCHASE',
      'rent': 'DIGITAL_RENTAL',
      'free': 'FREE_VOD',
      'ads': 'FREE_VOD',
    };
    
    return typeMap[sourceType] || 'STREAMING';
  }

  private mapAvailabilityType(sourceType: string): string {
    const typeMap: Record<string, string> = {
      'sub': 'SUBSCRIPTION',
      'buy': 'PURCHASE',
      'rent': 'RENTAL',
      'free': 'FREE',
      'ads': 'FREE',
    };
    
    return typeMap[sourceType] || 'SUBSCRIPTION';
  }

  private extractTrueCrimeGenres(watchmodeTitle: any, tmdbData: any): string[] {
    const genres: string[] = [];
    const allGenres = [
      ...(watchmodeTitle.genre_names || []),
      ...(tmdbData?.genres?.map((g: any) => g.name) || []),
    ];
    
    const trueCrimeGenreMap: Record<string, string> = {
      'Crime': 'Crime Investigation',
      'Documentary': 'True Crime Documentary',
      'Mystery': 'Mystery Case',
      'Thriller': 'Crime Thriller',
      'Drama': 'Crime Drama',
    };
    
    for (const genre of allGenres) {
      if (trueCrimeGenreMap[genre]) {
        genres.push(trueCrimeGenreMap[genre]);
      }
    }
    
    return [...new Set(genres)]; // Remove duplicates
  }

  private extractGeneralGenres(watchmodeTitle: any, tmdbData: any): string[] {
    return [
      ...(watchmodeTitle.genre_names || []),
      ...(tmdbData?.genres?.map((g: any) => g.name) || []),
    ].filter((genre, index, array) => array.indexOf(genre) === index);
  }

  private detectCaseType(watchmodeTitle: any, tmdbData: any): string | null {
    const text = `${watchmodeTitle.title} ${watchmodeTitle.plot_overview || ''} ${tmdbData?.overview || ''}`.toLowerCase();
    
    const caseTypeKeywords: Record<string, string> = {
      'SERIAL_KILLER': ['serial killer', 'serial murder', 'multiple murders', 'killing spree'],
      'MISSING_PERSON': ['missing person', 'disappeared', 'vanished', 'abduction'],
      'COLD_CASE': ['cold case', 'unsolved', 'mystery', 'decades old'],
      'MASS_MURDER': ['mass murder', 'mass shooting', 'massacre'],
      'KIDNAPPING': ['kidnap', 'abduct', 'hostage'],
      'ORGANIZED_CRIME': ['mafia', 'cartel', 'organized crime', 'gang'],
    };
    
    for (const [caseType, keywords] of Object.entries(caseTypeKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return caseType;
      }
    }
    
    return null;
  }

  private extractCaseName(watchmodeTitle: any, tmdbData: any): string | null {
    // Extract potential case names from title and description
    // This is a simplified implementation - could be enhanced with NLP
    const title = watchmodeTitle.title;
    
    // Common patterns for case names in True Crime content
    const casePatterns = [
      /(.+) Case/i,
      /The (.+) Murders/i,
      /(.+) Killer/i,
      /(.+) Investigation/i,
    ];
    
    for (const pattern of casePatterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  private determineFactualityLevel(watchmodeTitle: any, tmdbData: any): string {
    const genres = [
      ...(watchmodeTitle.genre_names || []),
      ...(tmdbData?.genres?.map((g: any) => g.name) || []),
    ];
    
    if (genres.includes('Documentary')) {
      return 'DOCUMENTARY';
    }
    
    if (genres.includes('Drama')) {
      return 'BASED_ON_TRUE_EVENTS';
    }
    
    return 'DOCUMENTARY'; // Default for True Crime content
  }

  private extractContentWarnings(watchmodeTitle: any, tmdbData: any): string[] {
    const warnings: string[] = [];
    
    // Based on content rating
    const rating = watchmodeTitle.us_rating || tmdbData?.content_rating;
    if (['TV-MA', 'R', 'NC-17'].includes(rating)) {
      warnings.push('Mature Content');
    }
    
    // Default warnings for True Crime content
    warnings.push('Violence', 'Disturbing Content');
    
    return warnings;
  }

  private extractTrailerUrl(tmdbData: any): string | null {
    const videos = tmdbData?.videos?.results || [];
    const trailer = videos.find((video: any) => 
      video.type === 'Trailer' && video.site === 'YouTube'
    );
    
    return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
  }

  private generateSearchKeywords(watchmodeTitle: any, tmdbData: any): string[] {
    const keywords: string[] = [];
    
    // Add title variations
    keywords.push(watchmodeTitle.title);
    if (watchmodeTitle.original_title) {
      keywords.push(watchmodeTitle.original_title);
    }
    
    // Add TMDB keywords if available
    if (tmdbData?.keywords?.keywords) {
      keywords.push(...tmdbData.keywords.keywords.map((k: any) => k.name));
    }
    
    // Add genre-based keywords
    const genres = [
      ...(watchmodeTitle.genre_names || []),
      ...(tmdbData?.genres?.map((g: any) => g.name) || []),
    ];
    keywords.push(...genres);
    
    // Add True Crime specific keywords
    keywords.push('true crime', 'investigation', 'case study');
    
    return [...new Set(keywords)]; // Remove duplicates
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const contentSyncService = new ContentSyncService();