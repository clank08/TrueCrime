import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from 'dotenv';
import { logger } from '@/lib/monitoring';
import pQueue from 'p-queue';

config();

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface WatchmodeTitle {
  id: number;
  title: string;
  original_title?: string;
  plot_overview?: string;
  type: 'movie' | 'tv_series' | 'tv_miniseries' | 'tv_special';
  runtime_minutes?: number;
  year?: number;
  end_year?: number;
  release_date?: string;
  imdb_id?: string;
  tmdb_id?: number;
  tmdb_type?: 'movie' | 'tv';
  genre_names?: string[];
  user_rating?: number;
  critic_score?: number;
  us_rating?: string; // Content rating like TV-MA, R, etc.
  poster?: string;
  backdrop?: string;
  trailer?: string;
  trailer_thumbnail?: string;
  relevance_percentile?: number;
  
  // Watchmode specific
  watchmode_id: number;
  source_ids: Record<string, string | number>;
}

export interface WatchmodeSource {
  id: number;
  name: string;
  logo_100px: string;
  type: 'sub' | 'buy' | 'rent' | 'free' | 'ads';
  region: string;
  ios_url?: string;
  android_url?: string;
  web_url?: string;
  format: 'SD' | 'HD' | '4K';
  price?: number;
  seasons?: number[];
}

export interface WatchmodeTitleSources {
  id: number;
  sources: WatchmodeSource[];
}

export interface WatchmodeSearchResponse {
  titles: WatchmodeTitle[];
  total_results: number;
  page: number;
  total_pages: number;
}

export interface WatchmodeGenre {
  id: number;
  name: string;
}

export interface WatchmodeNetwork {
  id: number;
  name: string;
  origin_country: string;
  logo_100px?: string;
}

// ============================================================================
// WATCHMODE API SERVICE
// ============================================================================

export class WatchmodeService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string = 'https://api.watchmode.com/v1';
  private requestQueue: pQueue;

  constructor() {
    this.apiKey = process.env.WATCHMODE_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('Watchmode API key not configured - service will be limited');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrueCrimeApp/1.0',
      },
    });

    // Rate limiting: Watchmode allows 1000 requests/day on free tier
    // Conservative approach: 1 request per 5 seconds = ~17,000 requests/day max
    this.requestQueue = new pQueue({
      interval: 5000, // 5 seconds
      intervalCap: 1, // 1 request per interval
      concurrency: 1, // Only 1 concurrent request
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        config.params = {
          ...config.params,
          apikey: this.apiKey,
        };
        logger.debug('Watchmode API request', { url: config.url, params: config.params });
        return config;
      },
      (error) => {
        logger.error('Watchmode API request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug('Watchmode API response', { 
          status: response.status,
          url: response.config.url,
          dataLength: JSON.stringify(response.data).length,
        });
        return response;
      },
      (error) => {
        logger.error('Watchmode API response error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  // ============================================================================
  // SEARCH OPERATIONS
  // ============================================================================

  async searchTitles(
    query: string,
    options: {
      types?: Array<'movie' | 'tv_series' | 'tv_miniseries' | 'tv_special'>;
      genres?: number[];
      regions?: string[];
      page?: number;
      sort_by?: 'relevance_desc' | 'relevance_asc' | 'popularity_desc' | 'popularity_asc' | 'release_date_desc' | 'release_date_asc';
    } = {}
  ): Promise<WatchmodeSearchResponse> {
    if (!this.apiKey) {
      throw new Error('Watchmode API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<WatchmodeSearchResponse>('/search/', {
          params: {
            search_field: 'name',
            search_value: query,
            types: options.types?.join(','),
            genre: options.genres?.join(','),
            regions: options.regions?.join(',') || 'US',
            page: options.page || 1,
            sort_by: options.sort_by || 'relevance_desc',
          },
        });

        return response.data;
      } catch (error) {
        logger.error('Watchmode search failed', { query, options, error });
        throw error;
      }
    });
  }

  async searchTrueCrimeContent(
    query: string,
    options: {
      page?: number;
      includeGenres?: boolean;
    } = {}
  ): Promise<WatchmodeTitle[]> {
    try {
      // First, get True Crime genre IDs
      const genres = options.includeGenres ? await this.getGenres() : [];
      const trueCrimeGenres = genres.filter(g => 
        g.name.toLowerCase().includes('crime') ||
        g.name.toLowerCase().includes('documentary') ||
        g.name.toLowerCase().includes('mystery')
      );

      const searchResults = await this.searchTitles(query, {
        types: ['movie', 'tv_series', 'tv_miniseries', 'tv_special'],
        genres: trueCrimeGenres.map(g => g.id),
        page: options.page,
        sort_by: 'relevance_desc',
      });

      // Filter results for True Crime content by looking at titles and descriptions
      const trueCrimeKeywords = [
        'murder', 'killer', 'serial', 'crime', 'investigation', 'detective',
        'police', 'trial', 'cold case', 'missing', 'disappear', 'kidnap',
        'forensic', 'evidence', 'suspect', 'victim', 'criminal', 'justice',
        'documentary', 'true crime', 'real crime', 'unsolved'
      ];

      const filteredTitles = searchResults.titles.filter(title => {
        const titleText = `${title.title} ${title.plot_overview || ''}`.toLowerCase();
        return trueCrimeKeywords.some(keyword => titleText.includes(keyword));
      });

      logger.info('True Crime search completed', {
        query,
        totalResults: searchResults.total_results,
        filteredResults: filteredTitles.length,
      });

      return filteredTitles;
    } catch (error) {
      logger.error('True Crime search failed', { query, error });
      throw error;
    }
  }

  // ============================================================================
  // TITLE DETAILS
  // ============================================================================

  async getTitleDetails(titleId: number): Promise<WatchmodeTitle | null> {
    if (!this.apiKey) {
      throw new Error('Watchmode API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<WatchmodeTitle>(`/title/${titleId}/details/`);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          logger.warn('Title not found', { titleId });
          return null;
        }
        logger.error('Failed to get title details', { titleId, error });
        throw error;
      }
    });
  }

  async getTitleSources(titleId: number, regions: string[] = ['US']): Promise<WatchmodeSource[]> {
    if (!this.apiKey) {
      throw new Error('Watchmode API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<WatchmodeTitleSources>(`/title/${titleId}/sources/`, {
          params: {
            regions: regions.join(','),
          },
        });

        return response.data.sources || [];
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          logger.warn('Title sources not found', { titleId });
          return [];
        }
        logger.error('Failed to get title sources', { titleId, error });
        throw error;
      }
    });
  }

  // ============================================================================
  // METADATA OPERATIONS
  // ============================================================================

  async getGenres(): Promise<WatchmodeGenre[]> {
    if (!this.apiKey) {
      throw new Error('Watchmode API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<WatchmodeGenre[]>('/genres/');
        return response.data;
      } catch (error) {
        logger.error('Failed to get genres', { error });
        throw error;
      }
    });
  }

  async getNetworks(): Promise<WatchmodeNetwork[]> {
    if (!this.apiKey) {
      throw new Error('Watchmode API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<WatchmodeNetwork[]>('/networks/');
        return response.data;
      } catch (error) {
        logger.error('Failed to get networks', { error });
        throw error;
      }
    });
  }

  // ============================================================================
  // AVAILABILITY OPERATIONS
  // ============================================================================

  async checkAvailability(
    titleIds: number[],
    region: string = 'US'
  ): Promise<Record<number, WatchmodeSource[]>> {
    if (!this.apiKey) {
      throw new Error('Watchmode API key not configured');
    }

    const results: Record<number, WatchmodeSource[]> = {};

    // Process in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < titleIds.length; i += batchSize) {
      const batch = titleIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async titleId => {
        try {
          const sources = await this.getTitleSources(titleId, [region]);
          results[titleId] = sources;
        } catch (error) {
          logger.warn('Failed to get sources for title', { titleId, error });
          results[titleId] = [];
        }
      });

      await Promise.all(batchPromises);
    }

    return results;
  }

  // ============================================================================
  // DISCOVERY OPERATIONS
  // ============================================================================

  async getNewReleases(
    options: {
      types?: Array<'movie' | 'tv_series' | 'tv_miniseries' | 'tv_special'>;
      regions?: string[];
      limit?: number;
    } = {}
  ): Promise<WatchmodeTitle[]> {
    if (!this.apiKey) {
      throw new Error('Watchmode API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<{ titles: WatchmodeTitle[] }>('/list-titles/', {
          params: {
            types: options.types?.join(',') || 'movie,tv_series,tv_miniseries',
            regions: options.regions?.join(',') || 'US',
            sort_by: 'release_date_desc',
            limit: options.limit || 50,
          },
        });

        return response.data.titles;
      } catch (error) {
        logger.error('Failed to get new releases', { error });
        throw error;
      }
    });
  }

  async getTrendingContent(
    options: {
      types?: Array<'movie' | 'tv_series' | 'tv_miniseries' | 'tv_special'>;
      regions?: string[];
      limit?: number;
    } = {}
  ): Promise<WatchmodeTitle[]> {
    if (!this.apiKey) {
      throw new Error('Watchmode API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<{ titles: WatchmodeTitle[] }>('/list-titles/', {
          params: {
            types: options.types?.join(',') || 'movie,tv_series,tv_miniseries',
            regions: options.regions?.join(',') || 'US',
            sort_by: 'popularity_desc',
            limit: options.limit || 50,
          },
        });

        return response.data.titles;
      } catch (error) {
        logger.error('Failed to get trending content', { error });
        throw error;
      }
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async healthCheck(): Promise<{ status: string; error?: string }> {
    if (!this.apiKey) {
      return { status: 'not_configured' };
    }

    try {
      // Simple test request
      await this.client.get('/genres/', { timeout: 5000 });
      return { status: 'healthy' };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // DATA TRANSFORMATION
  // ============================================================================

  transformToContentDocument(watchmodeTitle: WatchmodeTitle): Partial<import('@/lib/meilisearch').ContentSearchDocument> {
    return {
      externalId: watchmodeTitle.watchmode_id.toString(),
      title: watchmodeTitle.title,
      originalTitle: watchmodeTitle.original_title,
      description: watchmodeTitle.plot_overview,
      
      contentType: this.mapWatchmodeTypeToContentType(watchmodeTitle.type),
      generalGenres: watchmodeTitle.genre_names || [],
      
      releaseDate: watchmodeTitle.release_date,
      releaseYear: watchmodeTitle.year,
      runtime: watchmodeTitle.runtime_minutes,
      
      tmdbRating: watchmodeTitle.user_rating,
      
      // Will be filled by other services
      platforms: [],
      cast: [],
      crew: [],
      relatedCases: [],
      relatedKillers: [],
      searchKeywords: [],
    };
  }

  private mapWatchmodeTypeToContentType(watchmodeType: string): string {
    const typeMap: Record<string, string> = {
      'movie': 'MOVIE',
      'tv_series': 'TV_SERIES', 
      'tv_miniseries': 'DOCUSERIES',
      'tv_special': 'SPECIAL',
    };

    return typeMap[watchmodeType] || 'MOVIE';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const watchmodeService = new WatchmodeService();