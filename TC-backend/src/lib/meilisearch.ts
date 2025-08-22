import { MeiliSearch, Index } from 'meilisearch';
import { config } from 'dotenv';
import { logger } from './monitoring';

config();

// ============================================================================
// MEILISEARCH CLIENT CONFIGURATION
// ============================================================================

export const meilisearchClient = new MeiliSearch({
  host: process.env.MEILISEARCH_URL || 'http://127.0.0.1:7700',
  apiKey: process.env.MEILISEARCH_API_KEY,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// INDEX NAMES
// ============================================================================

export const INDEX_NAMES = {
  CONTENT: 'content',
  CASES: 'true_crime_cases', 
  KILLERS: 'serial_killers',
  PEOPLE: 'people',
} as const;

// ============================================================================
// SEARCH DOCUMENT INTERFACES
// ============================================================================

export interface ContentSearchDocument {
  id: string;
  externalId: string;
  title: string;
  originalTitle?: string;
  description?: string;
  synopsis?: string;
  
  // Classification
  contentType: string;
  caseType?: string;
  trueCrimeGenres: string[];
  generalGenres: string[];
  
  // Metadata
  releaseDate?: string;
  releaseYear?: number;
  runtime?: number;
  
  // Ratings
  tmdbRating?: number;
  userRatingAvg?: number;
  userRatingCount: number;
  
  // True Crime specifics
  caseName?: string;
  location?: string;
  timeframStart?: string;
  timeframEnd?: string;
  factualityLevel: string;
  sensitivityLevel: string;
  contentWarnings: string[];
  
  // Platform availability
  platforms: Array<{
    id: string;
    name: string;
    type: string;
    availabilityType: string;
    isAvailable: boolean;
    region: string;
  }>;
  
  // People
  cast: Array<{
    id: string;
    name: string;
    role?: string;
  }>;
  
  crew: Array<{
    id: string;
    name: string;
    job: string;
    department: string;
  }>;
  
  // Related entities
  relatedCases: string[];
  relatedKillers: string[];
  
  // Search optimization
  searchKeywords: string[];
  slug: string;
  
  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
}

export interface CaseSearchDocument {
  id: string;
  name: string;
  alternativeNames: string[];
  description?: string;
  
  // Classification
  caseType: string;
  status: string;
  
  // Location
  location?: string;
  locations: string[];
  region?: string;
  
  // Timeline
  startDate?: string;
  endDate?: string;
  solvedDate?: string;
  
  // Statistics
  victimCount?: number;
  suspectCount?: number;
  
  // Search optimization
  searchKeywords: string[];
  slug: string;
  
  // Content count
  contentCount: number;
  
  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KillerSearchDocument {
  id: string;
  name: string;
  aliases: string[];
  description?: string;
  biography?: string;
  
  // Personal info
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  
  // Criminal activity
  knownVictimCount?: number;
  suspectedVictimCount?: number;
  crimeTypes: string[];
  
  // Status
  isAlive?: boolean;
  inPrison?: boolean;
  
  // Geography
  primaryLocation?: string;
  activeRegions: string[];
  
  // Timeline
  crimeStartDate?: string;
  crimeEndDate?: string;
  captureDate?: string;
  
  // Search optimization
  searchKeywords: string[];
  slug: string;
  
  // Content count
  contentCount: number;
  
  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PersonSearchDocument {
  id: string;
  externalId?: string;
  name: string;
  biography?: string;
  
  // Personal info
  birthDate?: string;
  deathDate?: string;
  
  // Career info
  knownFor: string[]; // Array of content titles
  departments: string[]; // Acting, Directing, etc.
  jobs: string[]; // Director, Actor, etc.
  
  // Content count
  contentCount: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SEARCH CONFIGURATION
// ============================================================================

export const SEARCH_CONFIG = {
  CONTENT: {
    searchableAttributes: [
      'title',
      'originalTitle', 
      'description',
      'synopsis',
      'caseName',
      'searchKeywords',
      'cast.name',
      'crew.name',
      'trueCrimeGenres',
      'generalGenres',
      'location',
    ],
    filterableAttributes: [
      'contentType',
      'caseType',
      'releaseYear',
      'factualityLevel',
      'sensitivityLevel',
      'trueCrimeGenres',
      'generalGenres',
      'platforms.name',
      'platforms.type',
      'platforms.availabilityType',
      'platforms.isAvailable',
      'platforms.region',
      'contentWarnings',
      'isActive',
      'relatedCases',
      'relatedKillers',
      'cast.id',
      'crew.id',
    ],
    sortableAttributes: [
      'releaseDate',
      'tmdbRating', 
      'userRatingAvg',
      'userRatingCount',
      'createdAt',
      'updatedAt',
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'userRatingAvg:desc',
      'releaseDate:desc',
    ],
    distinctAttribute: 'id',
    displayedAttributes: ['*'],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 3,
        twoTypos: 7,
      },
      disableOnWords: [],
      disableOnAttributes: ['platforms.name'],
    },
    faceting: {
      maxValuesPerFacet: 100,
    },
    pagination: {
      maxTotalHits: 10000,
    },
  },
  
  CASES: {
    searchableAttributes: [
      'name',
      'alternativeNames',
      'description', 
      'searchKeywords',
      'location',
      'locations',
    ],
    filterableAttributes: [
      'caseType',
      'status',
      'region',
      'victimCount',
      'suspectCount',
      'isActive',
    ],
    sortableAttributes: [
      'startDate',
      'endDate',
      'solvedDate',
      'victimCount',
      'contentCount',
      'createdAt',
    ],
    rankingRules: [
      'words',
      'typo', 
      'proximity',
      'attribute',
      'sort',
      'exactness',
      'contentCount:desc',
    ],
  },
  
  KILLERS: {
    searchableAttributes: [
      'name',
      'aliases',
      'description',
      'biography',
      'searchKeywords',
      'primaryLocation',
      'activeRegions',
    ],
    filterableAttributes: [
      'isAlive',
      'inPrison',
      'crimeTypes',
      'primaryLocation',
      'activeRegions',
      'isActive',
    ],
    sortableAttributes: [
      'knownVictimCount',
      'suspectedVictimCount',
      'crimeStartDate',
      'crimeEndDate',
      'captureDate',
      'contentCount',
      'createdAt',
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity', 
      'attribute',
      'sort',
      'exactness',
      'contentCount:desc',
    ],
  },
  
  PEOPLE: {
    searchableAttributes: [
      'name',
      'biography',
      'knownFor',
      'departments',
      'jobs',
    ],
    filterableAttributes: [
      'departments',
      'jobs',
    ],
    sortableAttributes: [
      'contentCount',
      'createdAt',
    ],
    rankingRules: [
      'words',
      'typo',
      'proximity',
      'attribute', 
      'sort',
      'exactness',
      'contentCount:desc',
    ],
  },
} as const;

// ============================================================================
// INDEX MANAGEMENT
// ============================================================================

export class MeilisearchService {
  private contentIndex: Index;
  private casesIndex: Index;
  private killersIndex: Index;
  private peopleIndex: Index;

  constructor() {
    this.contentIndex = meilisearchClient.index(INDEX_NAMES.CONTENT);
    this.casesIndex = meilisearchClient.index(INDEX_NAMES.CASES);
    this.killersIndex = meilisearchClient.index(INDEX_NAMES.KILLERS);
    this.peopleIndex = meilisearchClient.index(INDEX_NAMES.PEOPLE);
  }

  // ============================================================================
  // INDEX INITIALIZATION
  // ============================================================================

  async initializeIndexes(): Promise<void> {
    try {
      logger.info('Initializing Meilisearch indexes...');

      // Create indexes with initial settings
      await this.setupContentIndex();
      await this.setupCasesIndex();
      await this.setupKillersIndex(); 
      await this.setupPeopleIndex();

      logger.info('Meilisearch indexes initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Meilisearch indexes', { error });
      throw error;
    }
  }

  private async setupContentIndex(): Promise<void> {
    const index = this.contentIndex;
    const config = SEARCH_CONFIG.CONTENT;

    await Promise.all([
      index.updateSearchableAttributes(config.searchableAttributes),
      index.updateFilterableAttributes(config.filterableAttributes),
      index.updateSortableAttributes(config.sortableAttributes),
      index.updateRankingRules(config.rankingRules),
      index.updateDistinctAttribute(config.distinctAttribute),
      index.updateDisplayedAttributes(config.displayedAttributes),
      index.updateTypoTolerance(config.typoTolerance),
      index.updateFaceting(config.faceting),
      index.updatePagination(config.pagination),
    ]);
  }

  private async setupCasesIndex(): Promise<void> {
    const index = this.casesIndex;
    const config = SEARCH_CONFIG.CASES;

    await Promise.all([
      index.updateSearchableAttributes(config.searchableAttributes),
      index.updateFilterableAttributes(config.filterableAttributes),
      index.updateSortableAttributes(config.sortableAttributes),
      index.updateRankingRules(config.rankingRules),
    ]);
  }

  private async setupKillersIndex(): Promise<void> {
    const index = this.killersIndex;
    const config = SEARCH_CONFIG.KILLERS;

    await Promise.all([
      index.updateSearchableAttributes(config.searchableAttributes),
      index.updateFilterableAttributes(config.filterableAttributes),
      index.updateSortableAttributes(config.sortableAttributes),
      index.updateRankingRules(config.rankingRules),
    ]);
  }

  private async setupPeopleIndex(): Promise<void> {
    const index = this.peopleIndex;
    const config = SEARCH_CONFIG.PEOPLE;

    await Promise.all([
      index.updateSearchableAttributes(config.searchableAttributes),
      index.updateFilterableAttributes(config.filterableAttributes),
      index.updateSortableAttributes(config.sortableAttributes),
      index.updateRankingRules(config.rankingRules),
    ]);
  }

  // ============================================================================
  // DOCUMENT MANAGEMENT
  // ============================================================================

  async addOrUpdateContent(documents: ContentSearchDocument[]): Promise<void> {
    try {
      const task = await this.contentIndex.addDocuments(documents, { primaryKey: 'id' });
      logger.info(`Added/updated ${documents.length} content documents`, { taskUid: task.taskUid });
    } catch (error) {
      logger.error('Failed to add/update content documents', { error });
      throw error;
    }
  }

  async addOrUpdateCases(documents: CaseSearchDocument[]): Promise<void> {
    try {
      const task = await this.casesIndex.addDocuments(documents, { primaryKey: 'id' });
      logger.info(`Added/updated ${documents.length} case documents`, { taskUid: task.taskUid });
    } catch (error) {
      logger.error('Failed to add/update case documents', { error });
      throw error;
    }
  }

  async addOrUpdateKillers(documents: KillerSearchDocument[]): Promise<void> {
    try {
      const task = await this.killersIndex.addDocuments(documents, { primaryKey: 'id' });
      logger.info(`Added/updated ${documents.length} killer documents`, { taskUid: task.taskUid });
    } catch (error) {
      logger.error('Failed to add/update killer documents', { error });
      throw error;
    }
  }

  async addOrUpdatePeople(documents: PersonSearchDocument[]): Promise<void> {
    try {
      const task = await this.peopleIndex.addDocuments(documents, { primaryKey: 'id' });
      logger.info(`Added/updated ${documents.length} people documents`, { taskUid: task.taskUid });
    } catch (error) {
      logger.error('Failed to add/update people documents', { error });
      throw error;
    }
  }

  async deleteContent(documentIds: string[]): Promise<void> {
    try {
      const task = await this.contentIndex.deleteDocuments(documentIds);
      logger.info(`Deleted ${documentIds.length} content documents`, { taskUid: task.taskUid });
    } catch (error) {
      logger.error('Failed to delete content documents', { error });
      throw error;
    }
  }

  async deleteAllDocuments(): Promise<void> {
    try {
      await Promise.all([
        this.contentIndex.deleteAllDocuments(),
        this.casesIndex.deleteAllDocuments(),
        this.killersIndex.deleteAllDocuments(),
        this.peopleIndex.deleteAllDocuments(),
      ]);
      logger.info('Deleted all documents from all indexes');
    } catch (error) {
      logger.error('Failed to delete all documents', { error });
      throw error;
    }
  }

  // ============================================================================
  // SEARCH OPERATIONS
  // ============================================================================

  async searchContent(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      filter?: string[];
      sort?: string[];
      facets?: string[];
      attributesToHighlight?: string[];
    } = {}
  ) {
    try {
      const {
        limit = 20,
        offset = 0,
        filter,
        sort,
        facets,
        attributesToHighlight = ['title', 'description', 'caseName'],
      } = options;

      const result = await this.contentIndex.search(query, {
        limit,
        offset,
        filter,
        sort,
        facets,
        attributesToHighlight,
        cropLength: 150,
        cropMarker: '...',
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
      });

      return result;
    } catch (error) {
      logger.error('Content search failed', { query, options, error });
      throw error;
    }
  }

  async searchCases(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      filter?: string[];
      sort?: string[];
    } = {}
  ) {
    try {
      const { limit = 20, offset = 0, filter, sort } = options;

      const result = await this.casesIndex.search(query, {
        limit,
        offset,
        filter,
        sort,
        attributesToHighlight: ['name', 'description'],
        cropLength: 100,
      });

      return result;
    } catch (error) {
      logger.error('Cases search failed', { query, options, error });
      throw error;
    }
  }

  async searchKillers(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      filter?: string[];
      sort?: string[];
    } = {}
  ) {
    try {
      const { limit = 20, offset = 0, filter, sort } = options;

      const result = await this.killersIndex.search(query, {
        limit,
        offset,
        filter,
        sort,
        attributesToHighlight: ['name', 'description'],
        cropLength: 100,
      });

      return result;
    } catch (error) {
      logger.error('Killers search failed', { query, options, error });
      throw error;
    }
  }

  async searchPeople(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      filter?: string[];
      sort?: string[];
    } = {}
  ) {
    try {
      const { limit = 20, offset = 0, filter, sort } = options;

      const result = await this.peopleIndex.search(query, {
        limit,
        offset,
        filter,
        sort,
        attributesToHighlight: ['name', 'biography'],
        cropLength: 100,
      });

      return result;
    } catch (error) {
      logger.error('People search failed', { query, options, error });
      throw error;
    }
  }

  // ============================================================================
  // MULTI-INDEX SEARCH
  // ============================================================================

  async multiSearch(queries: Array<{
    indexName: keyof typeof INDEX_NAMES;
    query: string;
    options?: any;
  }>) {
    try {
      const searchQueries = queries.map(({ indexName, query, options = {} }) => ({
        indexUid: INDEX_NAMES[indexName],
        q: query,
        ...options,
      }));

      const results = await meilisearchClient.multiSearch({
        queries: searchQueries,
      });

      return results;
    } catch (error) {
      logger.error('Multi-search failed', { queries, error });
      throw error;
    }
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  async healthCheck(): Promise<{ status: string; version?: string; error?: string }> {
    try {
      const health = await meilisearchClient.health();
      const version = await meilisearchClient.getVersion();
      
      return {
        status: health.status,
        version: version.pkgVersion,
      };
    } catch (error) {
      logger.error('Meilisearch health check failed', { error });
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ============================================================================
  // INDEX STATISTICS
  // ============================================================================

  async getIndexStats() {
    try {
      const [contentStats, casesStats, killersStats, peopleStats] = await Promise.all([
        this.contentIndex.getStats(),
        this.casesIndex.getStats(),
        this.killersIndex.getStats(),
        this.peopleIndex.getStats(),
      ]);

      return {
        content: contentStats,
        cases: casesStats,
        killers: killersStats,
        people: peopleStats,
      };
    } catch (error) {
      logger.error('Failed to get index statistics', { error });
      throw error;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const meilisearchService = new MeilisearchService();

// Export types for use in other modules
export type {
  ContentSearchDocument,
  CaseSearchDocument, 
  KillerSearchDocument,
  PersonSearchDocument,
};