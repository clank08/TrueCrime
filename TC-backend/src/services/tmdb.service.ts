import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from 'dotenv';
import { logger } from '@/lib/monitoring';
import pQueue from 'p-queue';

config();

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface TMDBMovie {
  id: number;
  imdb_id?: string;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  runtime?: number;
  genres: TMDBGenre[];
  production_companies: TMDBProductionCompany[];
  production_countries: TMDBProductionCountry[];
  spoken_languages: TMDBSpokenLanguage[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  poster_path?: string;
  backdrop_path?: string;
  adult: boolean;
  belongs_to_collection?: TMDBCollection;
  budget?: number;
  revenue?: number;
  homepage?: string;
  tagline?: string;
  status: string;
  videos?: TMDBVideoResponse;
  credits?: TMDBCreditsResponse;
  images?: TMDBImagesResponse;
  keywords?: TMDBKeywordsResponse;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string;
  last_air_date?: string;
  episode_run_time: number[];
  number_of_episodes: number;
  number_of_seasons: number;
  seasons: TMDBSeason[];
  genres: TMDBGenre[];
  production_companies: TMDBProductionCompany[];
  production_countries: TMDBProductionCountry[];
  spoken_languages: TMDBSpokenLanguage[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  poster_path?: string;
  backdrop_path?: string;
  adult: boolean;
  homepage?: string;
  status: string;
  tagline?: string;
  type: string;
  created_by: TMDBCreator[];
  networks: TMDBNetwork[];
  origin_country: string[];
  original_language: string;
  videos?: TMDBVideoResponse;
  credits?: TMDBCreditsResponse;
  images?: TMDBImagesResponse;
  keywords?: TMDBKeywordsResponse;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBProductionCompany {
  id: number;
  name: string;
  logo_path?: string;
  origin_country: string;
}

export interface TMDBProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TMDBSpokenLanguage {
  iso_639_1: string;
  name: string;
  english_name: string;
}

export interface TMDBCollection {
  id: number;
  name: string;
  poster_path?: string;
  backdrop_path?: string;
}

export interface TMDBSeason {
  id: number;
  name: string;
  overview: string;
  air_date?: string;
  episode_count: number;
  poster_path?: string;
  season_number: number;
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  air_date?: string;
  episode_number: number;
  season_number: number;
  runtime?: number;
  still_path?: string;
  vote_average: number;
  vote_count: number;
  crew: TMDBCrewMember[];
  guest_stars: TMDBCastMember[];
}

export interface TMDBCreator {
  id: number;
  name: string;
  profile_path?: string;
  credit_id: string;
  gender?: number;
}

export interface TMDBNetwork {
  id: number;
  name: string;
  logo_path?: string;
  origin_country: string;
}

export interface TMDBPerson {
  id: number;
  imdb_id?: string;
  name: string;
  biography?: string;
  birthday?: string;
  deathday?: string;
  place_of_birth?: string;
  profile_path?: string;
  adult: boolean;
  also_known_as: string[];
  gender: number;
  homepage?: string;
  known_for_department: string;
  popularity: number;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  original_name: string;
  profile_path?: string;
  character: string;
  credit_id: string;
  order: number;
  adult: boolean;
  gender?: number;
  known_for_department: string;
  popularity: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  original_name: string;
  profile_path?: string;
  job: string;
  department: string;
  credit_id: string;
  adult: boolean;
  gender?: number;
  known_for_department: string;
  popularity: number;
}

export interface TMDBCreditsResponse {
  id: number;
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}

export interface TMDBVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  official: boolean;
  published_at: string;
  site: string;
  size: number;
  type: string;
}

export interface TMDBVideoResponse {
  id: number;
  results: TMDBVideo[];
}

export interface TMDBImage {
  aspect_ratio: number;
  height: number;
  iso_639_1?: string;
  file_path: string;
  vote_average: number;
  vote_count: number;
  width: number;
}

export interface TMDBImagesResponse {
  id: number;
  backdrops: TMDBImage[];
  logos: TMDBImage[];
  posters: TMDBImage[];
}

export interface TMDBKeyword {
  id: number;
  name: string;
}

export interface TMDBKeywordsResponse {
  id: number;
  keywords?: TMDBKeyword[]; // For movies
  results?: TMDBKeyword[];  // For TV shows
}

export interface TMDBSearchResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// ============================================================================
// TMDB API SERVICE
// ============================================================================

export class TMDBService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string = 'https://api.themoviedb.org/3';
  private imageBaseUrl: string = 'https://image.tmdb.org/t/p';
  private requestQueue: pQueue;

  constructor() {
    this.apiKey = process.env.TMDB_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('TMDB API key not configured - service will be limited');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrueCrimeApp/1.0',
      },
    });

    // TMDB rate limiting: 40 requests per 10 seconds
    this.requestQueue = new pQueue({
      interval: 10000, // 10 seconds
      intervalCap: 35, // Leave some buffer
      concurrency: 5,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        config.params = {
          ...config.params,
          api_key: this.apiKey,
        };
        logger.debug('TMDB API request', { url: config.url, params: config.params });
        return config;
      },
      (error) => {
        logger.error('TMDB API request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug('TMDB API response', {
          status: response.status,
          url: response.config.url,
          dataLength: JSON.stringify(response.data).length,
        });
        return response;
      },
      (error) => {
        logger.error('TMDB API response error', {
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

  async searchMovies(
    query: string,
    options: {
      page?: number;
      year?: number;
      primary_release_year?: number;
      region?: string;
      include_adult?: boolean;
    } = {}
  ): Promise<TMDBSearchResponse<TMDBMovie>> {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<TMDBSearchResponse<TMDBMovie>>('/search/movie', {
          params: {
            query,
            page: options.page || 1,
            year: options.year,
            primary_release_year: options.primary_release_year,
            region: options.region,
            include_adult: options.include_adult || false,
          },
        });

        return response.data;
      } catch (error) {
        logger.error('TMDB movie search failed', { query, options, error });
        throw error;
      }
    });
  }

  async searchTVShows(
    query: string,
    options: {
      page?: number;
      first_air_date_year?: number;
      include_adult?: boolean;
    } = {}
  ): Promise<TMDBSearchResponse<TMDBTVShow>> {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<TMDBSearchResponse<TMDBTVShow>>('/search/tv', {
          params: {
            query,
            page: options.page || 1,
            first_air_date_year: options.first_air_date_year,
            include_adult: options.include_adult || false,
          },
        });

        return response.data;
      } catch (error) {
        logger.error('TMDB TV search failed', { query, options, error });
        throw error;
      }
    });
  }

  async searchMulti(
    query: string,
    options: {
      page?: number;
      include_adult?: boolean;
      region?: string;
    } = {}
  ): Promise<TMDBSearchResponse<any>> {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<TMDBSearchResponse<any>>('/search/multi', {
          params: {
            query,
            page: options.page || 1,
            include_adult: options.include_adult || false,
            region: options.region,
          },
        });

        return response.data;
      } catch (error) {
        logger.error('TMDB multi search failed', { query, options, error });
        throw error;
      }
    });
  }

  // ============================================================================
  // CONTENT DETAILS
  // ============================================================================

  async getMovieDetails(
    movieId: number,
    options: {
      append_to_response?: string[];
      language?: string;
    } = {}
  ): Promise<TMDBMovie | null> {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<TMDBMovie>(`/movie/${movieId}`, {
          params: {
            append_to_response: options.append_to_response?.join(',') || 'credits,videos,images,keywords',
            language: options.language || 'en-US',
          },
        });

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          logger.warn('TMDB movie not found', { movieId });
          return null;
        }
        logger.error('Failed to get TMDB movie details', { movieId, error });
        throw error;
      }
    });
  }

  async getTVShowDetails(
    showId: number,
    options: {
      append_to_response?: string[];
      language?: string;
    } = {}
  ): Promise<TMDBTVShow | null> {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<TMDBTVShow>(`/tv/${showId}`, {
          params: {
            append_to_response: options.append_to_response?.join(',') || 'credits,videos,images,keywords',
            language: options.language || 'en-US',
          },
        });

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          logger.warn('TMDB TV show not found', { showId });
          return null;
        }
        logger.error('Failed to get TMDB TV show details', { showId, error });
        throw error;
      }
    });
  }

  async getSeasonDetails(
    showId: number,
    seasonNumber: number,
    options: {
      append_to_response?: string[];
      language?: string;
    } = {}
  ): Promise<TMDBSeason | null> {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<TMDBSeason>(`/tv/${showId}/season/${seasonNumber}`, {
          params: {
            append_to_response: options.append_to_response?.join(','),
            language: options.language || 'en-US',
          },
        });

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          logger.warn('TMDB season not found', { showId, seasonNumber });
          return null;
        }
        logger.error('Failed to get TMDB season details', { showId, seasonNumber, error });
        throw error;
      }
    });
  }

  async getEpisodeDetails(
    showId: number,
    seasonNumber: number,
    episodeNumber: number,
    options: {
      append_to_response?: string[];
      language?: string;
    } = {}
  ): Promise<TMDBEpisode | null> {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<TMDBEpisode>(`/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}`, {
          params: {
            append_to_response: options.append_to_response?.join(','),
            language: options.language || 'en-US',
          },
        });

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          logger.warn('TMDB episode not found', { showId, seasonNumber, episodeNumber });
          return null;
        }
        logger.error('Failed to get TMDB episode details', { showId, seasonNumber, episodeNumber, error });
        throw error;
      }
    });
  }

  // ============================================================================
  // PEOPLE OPERATIONS
  // ============================================================================

  async getPersonDetails(
    personId: number,
    options: {
      append_to_response?: string[];
      language?: string;
    } = {}
  ): Promise<TMDBPerson | null> {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<TMDBPerson>(`/person/${personId}`, {
          params: {
            append_to_response: options.append_to_response?.join(','),
            language: options.language || 'en-US',
          },
        });

        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          logger.warn('TMDB person not found', { personId });
          return null;
        }
        logger.error('Failed to get TMDB person details', { personId, error });
        throw error;
      }
    });
  }

  // ============================================================================
  // TRUE CRIME SPECIFIC OPERATIONS
  // ============================================================================

  async searchTrueCrimeContent(
    query: string,
    options: {
      page?: number;
      includeMovies?: boolean;
      includeTv?: boolean;
      year?: number;
    } = {}
  ): Promise<{ movies: TMDBMovie[]; tvShows: TMDBTVShow[] }> {
    const { includeMovies = true, includeTv = true } = options;
    
    const results: { movies: TMDBMovie[]; tvShows: TMDBTVShow[] } = {
      movies: [],
      tvShows: [],
    };

    try {
      // Search both movies and TV shows
      const searchPromises: Promise<any>[] = [];
      
      if (includeMovies) {
        searchPromises.push(this.searchMovies(query, options));
      }
      
      if (includeTv) {
        searchPromises.push(this.searchTVShows(query, options));
      }

      const searchResults = await Promise.all(searchPromises);
      
      if (includeMovies) {
        results.movies = searchResults[0].results;
      }
      if (includeTv) {
        results.tvShows = searchResults[includeTv ? 1 : 0].results;
      }

      // Filter for True Crime related content
      const trueCrimeKeywords = [
        'crime', 'murder', 'killer', 'serial', 'investigation', 'detective',
        'police', 'trial', 'case', 'missing', 'disappear', 'kidnap',
        'forensic', 'evidence', 'suspect', 'victim', 'criminal', 'justice',
        'documentary', 'true', 'real'
      ];

      results.movies = results.movies.filter(movie => {
        const text = `${movie.title} ${movie.overview}`.toLowerCase();
        return trueCrimeKeywords.some(keyword => text.includes(keyword)) ||
               movie.genres?.some(genre => genre.name.toLowerCase().includes('crime') || genre.name.toLowerCase().includes('documentary'));
      });

      results.tvShows = results.tvShows.filter(show => {
        const text = `${show.name} ${show.overview}`.toLowerCase();
        return trueCrimeKeywords.some(keyword => text.includes(keyword)) ||
               show.genres?.some(genre => genre.name.toLowerCase().includes('crime') || genre.name.toLowerCase().includes('documentary'));
      });

      logger.info('True Crime TMDB search completed', {
        query,
        moviesFound: results.movies.length,
        tvShowsFound: results.tvShows.length,
      });

      return results;
    } catch (error) {
      logger.error('TMDB True Crime search failed', { query, error });
      throw error;
    }
  }

  // ============================================================================
  // DISCOVERY OPERATIONS
  // ============================================================================

  async getPopularMovies(options: { page?: number; region?: string } = {}): Promise<TMDBSearchResponse<TMDBMovie>> {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<TMDBSearchResponse<TMDBMovie>>('/movie/popular', {
          params: {
            page: options.page || 1,
            region: options.region,
          },
        });

        return response.data;
      } catch (error) {
        logger.error('Failed to get popular movies', { error });
        throw error;
      }
    });
  }

  async getPopularTVShows(options: { page?: number } = {}): Promise<TMDBSearchResponse<TMDBTVShow>> {
    if (!this.apiKey) {
      throw new Error('TMDB API key not configured');
    }

    return this.requestQueue.add(async () => {
      try {
        const response = await this.client.get<TMDBSearchResponse<TMDBTVShow>>('/tv/popular', {
          params: {
            page: options.page || 1,
          },
        });

        return response.data;
      } catch (error) {
        logger.error('Failed to get popular TV shows', { error });
        throw error;
      }
    });
  }

  // ============================================================================
  // IMAGE OPERATIONS
  // ============================================================================

  getImageUrl(
    path: string,
    size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'
  ): string {
    return `${this.imageBaseUrl}/${size}${path}`;
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
      await this.client.get('/genre/movie/list', { timeout: 5000 });
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

  transformMovieToContentDocument(movie: TMDBMovie): Partial<import('@/lib/meilisearch').ContentSearchDocument> {
    return {
      externalId: movie.id.toString(),
      title: movie.title,
      originalTitle: movie.original_title !== movie.title ? movie.original_title : undefined,
      description: movie.overview,
      
      contentType: 'MOVIE',
      generalGenres: movie.genres?.map(g => g.name) || [],
      
      releaseDate: movie.release_date,
      releaseYear: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
      runtime: movie.runtime,
      
      tmdbRating: movie.vote_average,
      
      cast: movie.credits?.cast?.slice(0, 10).map(cast => ({
        id: cast.id.toString(),
        name: cast.name,
        role: cast.character,
      })) || [],
      
      crew: movie.credits?.crew?.slice(0, 10).map(crew => ({
        id: crew.id.toString(),
        name: crew.name,
        job: crew.job,
        department: crew.department,
      })) || [],
      
      searchKeywords: movie.keywords?.keywords?.map(k => k.name) || [],
      
      // Will be filled by other services
      platforms: [],
      relatedCases: [],
      relatedKillers: [],
    };
  }

  transformTVShowToContentDocument(show: TMDBTVShow): Partial<import('@/lib/meilisearch').ContentSearchDocument> {
    return {
      externalId: show.id.toString(),
      title: show.name,
      originalTitle: show.original_name !== show.name ? show.original_name : undefined,
      description: show.overview,
      
      contentType: this.mapTVTypeToContentType(show.type),
      generalGenres: show.genres?.map(g => g.name) || [],
      
      releaseDate: show.first_air_date,
      releaseYear: show.first_air_date ? new Date(show.first_air_date).getFullYear() : undefined,
      runtime: show.episode_run_time?.[0],
      
      tmdbRating: show.vote_average,
      
      cast: show.credits?.cast?.slice(0, 10).map(cast => ({
        id: cast.id.toString(),
        name: cast.name,
        role: cast.character,
      })) || [],
      
      crew: show.credits?.crew?.slice(0, 10).map(crew => ({
        id: crew.id.toString(),
        name: crew.name,
        job: crew.job,
        department: crew.department,
      })) || [],
      
      searchKeywords: show.keywords?.results?.map(k => k.name) || [],
      
      // Will be filled by other services
      platforms: [],
      relatedCases: [],
      relatedKillers: [],
    };
  }

  private mapTVTypeToContentType(tvType: string): string {
    const typeMap: Record<string, string> = {
      'Documentary': 'DOCUMENTARY',
      'Miniseries': 'DOCUSERIES',
      'Reality': 'TV_SERIES',
      'Scripted': 'TV_SERIES',
      'Talk Show': 'TV_SERIES',
      'Video': 'SPECIAL',
    };

    return typeMap[tvType] || 'TV_SERIES';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const tmdbService = new TMDBService();