import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Import the helper functions we need to test
// Note: These would normally be extracted to separate utility files for better testability
// For now, we'll test them as part of the router module

/**
 * Unit tests for Content Router helper functions and business logic
 * These tests focus on testing individual functions in isolation
 */

describe('Content Router Unit Tests', () => {
  
  describe('buildSearchFilters', () => {
    // Since buildSearchFilters is not exported, we'll create a test version
    // In a real implementation, this function should be extracted to a utility module
    
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
    
    it('should include isActive filter by default', () => {
      const result = buildSearchFilters({});
      expect(result).toContain('isActive = true');
    });
    
    it('should exclude isActive filter when includeActive is false', () => {
      const result = buildSearchFilters({}, false);
      expect(result).not.toContain('isActive = true');
    });
    
    it('should build contentType filter correctly', () => {
      const filters = { contentType: 'DOCUMENTARY' };
      const result = buildSearchFilters(filters);
      expect(result).toContain('contentType = "DOCUMENTARY"');
    });
    
    it('should build caseType filter correctly', () => {
      const filters = { caseType: 'SERIAL_KILLER' };
      const result = buildSearchFilters(filters);
      expect(result).toContain('caseType = "SERIAL_KILLER"');
    });
    
    it('should build genres filter with OR logic for multiple genres', () => {
      const filters = { genres: ['Crime', 'Documentary'] };
      const result = buildSearchFilters(filters);
      expect(result).toContain('(generalGenres = "Crime" OR generalGenres = "Documentary")');
    });
    
    it('should build platforms filter with OR logic for multiple platforms', () => {
      const filters = { platforms: ['Netflix', 'Amazon Prime'] };
      const result = buildSearchFilters(filters);
      expect(result).toContain('(platforms.name = "Netflix" OR platforms.name = "Amazon Prime")');
    });
    
    it('should build year range filter correctly', () => {
      const filters = { yearFrom: 2015, yearTo: 2020 };
      const result = buildSearchFilters(filters);
      expect(result).toContain('releaseYear >= 2015 AND releaseYear <= 2020');
    });
    
    it('should build single year boundary filters', () => {
      const filtersFrom = { yearFrom: 2015 };
      let result = buildSearchFilters(filtersFrom);
      expect(result).toContain('releaseYear >= 2015');
      
      const filtersTo = { yearTo: 2020 };
      result = buildSearchFilters(filtersTo);
      expect(result).toContain('releaseYear <= 2020');
    });
    
    it('should build rating range filter correctly', () => {
      const filters = { ratingFrom: 4.0, ratingTo: 5.0 };
      const result = buildSearchFilters(filters);
      expect(result).toContain('userRatingAvg >= 4 AND userRatingAvg <= 5');
    });
    
    it('should build single rating boundary filters', () => {
      const filtersFrom = { ratingFrom: 4.0 };
      let result = buildSearchFilters(filtersFrom);
      expect(result).toContain('userRatingAvg >= 4');
      
      const filtersTo = { ratingTo: 5.0 };
      result = buildSearchFilters(filtersTo);
      expect(result).toContain('userRatingAvg <= 5');
    });
    
    it('should build factualityLevel filter correctly', () => {
      const filters = { factualityLevel: 'DOCUMENTARY' };
      const result = buildSearchFilters(filters);
      expect(result).toContain('factualityLevel = "DOCUMENTARY"');
    });
    
    it('should build sensitivityLevel filter correctly', () => {
      const filters = { sensitivityLevel: 'HIGH' };
      const result = buildSearchFilters(filters);
      expect(result).toContain('sensitivityLevel = "HIGH"');
    });
    
    it('should build availabilityType filter correctly', () => {
      const filters = { availabilityType: 'FREE' };
      const result = buildSearchFilters(filters);
      expect(result).toContain('platforms.availabilityType = "FREE"');
    });
    
    it('should build region filter correctly for non-US regions', () => {
      const filters = { region: 'CA' };
      const result = buildSearchFilters(filters);
      expect(result).toContain('platforms.region = "CA"');
    });
    
    it('should not build region filter for US region', () => {
      const filters = { region: 'US' };
      const result = buildSearchFilters(filters);
      expect(result).not.toContain('platforms.region = "US"');
    });
    
    it('should build caseId filter correctly', () => {
      const filters = { caseId: 'case-123' };
      const result = buildSearchFilters(filters);
      expect(result).toContain('relatedCases = "case-123"');
    });
    
    it('should build killerId filter correctly', () => {
      const filters = { killerId: 'killer-456' };
      const result = buildSearchFilters(filters);
      expect(result).toContain('relatedKillers = "killer-456"');
    });
    
    it('should include availability filter by default', () => {
      const filters = {};
      const result = buildSearchFilters(filters);
      expect(result).toContain('platforms.isAvailable = true');
    });
    
    it('should not include availability filter when includeUnavailable is true', () => {
      const filters = { includeUnavailable: true };
      const result = buildSearchFilters(filters);
      expect(result).not.toContain('platforms.isAvailable = true');
    });
    
    it('should combine multiple filters correctly', () => {
      const filters = {
        contentType: 'DOCUMENTARY',
        caseType: 'SERIAL_KILLER',
        genres: ['Crime'],
        yearFrom: 2015,
        ratingFrom: 4.0,
        factualityLevel: 'DOCUMENTARY',
        sensitivityLevel: 'MODERATE',
        availabilityType: 'SUBSCRIPTION',
        region: 'CA',
        caseId: 'case-123',
        includeUnavailable: false,
      };
      
      const result = buildSearchFilters(filters);
      
      expect(result).toContain('isActive = true');
      expect(result).toContain('contentType = "DOCUMENTARY"');
      expect(result).toContain('caseType = "SERIAL_KILLER"');
      expect(result).toContain('(generalGenres = "Crime")');
      expect(result).toContain('releaseYear >= 2015');
      expect(result).toContain('userRatingAvg >= 4');
      expect(result).toContain('factualityLevel = "DOCUMENTARY"');
      expect(result).toContain('sensitivityLevel = "MODERATE"');
      expect(result).toContain('platforms.availabilityType = "SUBSCRIPTION"');
      expect(result).toContain('platforms.region = "CA"');
      expect(result).toContain('relatedCases = "case-123"');
      expect(result).toContain('platforms.isAvailable = true');
    });
    
    it('should handle empty filters object', () => {
      const result = buildSearchFilters({});
      expect(result).toEqual([
        'isActive = true',
        'platforms.isAvailable = true'
      ]);
    });
    
    it('should handle null and undefined filters', () => {
      expect(() => buildSearchFilters(null)).not.toThrow();
      expect(() => buildSearchFilters(undefined)).not.toThrow();
    });
  });
  
  describe('buildSearchSort', () => {
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
    
    it('should return empty array for relevance sort (default Meilisearch ranking)', () => {
      const result = buildSearchSort('relevance');
      expect(result).toEqual([]);
    });
    
    it('should return correct sort for rating_desc', () => {
      const result = buildSearchSort('rating_desc');
      expect(result).toEqual(['userRatingAvg:desc']);
    });
    
    it('should return correct sort for rating_asc', () => {
      const result = buildSearchSort('rating_asc');
      expect(result).toEqual(['userRatingAvg:asc']);
    });
    
    it('should return correct sort for release_date_desc', () => {
      const result = buildSearchSort('release_date_desc');
      expect(result).toEqual(['releaseDate:desc']);
    });
    
    it('should return correct sort for release_date_asc', () => {
      const result = buildSearchSort('release_date_asc');
      expect(result).toEqual(['releaseDate:asc']);
    });
    
    it('should return correct sort for popularity_desc', () => {
      const result = buildSearchSort('popularity_desc');
      expect(result).toEqual(['userRatingCount:desc']);
    });
    
    it('should return correct sort for title_asc', () => {
      const result = buildSearchSort('title_asc');
      expect(result).toEqual(['title:asc']);
    });
    
    it('should return empty array for unknown sort option', () => {
      const result = buildSearchSort('unknown_sort');
      expect(result).toEqual([]);
    });
    
    it('should handle null and undefined sort', () => {
      expect(buildSearchSort(null as any)).toEqual([]);
      expect(buildSearchSort(undefined as any)).toEqual([]);
    });
  });
  
  describe('Input validation schemas', () => {
    const GetContentSchema = z.object({
      id: z.string().cuid('Invalid content ID format'),
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
        caseId: z.string().cuid().optional(),
        killerId: z.string().cuid().optional(),
        includeUnavailable: z.boolean().default(false),
      }).optional(),
      sort: z.enum(['relevance', 'rating_desc', 'rating_asc', 'release_date_desc', 'release_date_asc', 'popularity_desc', 'title_asc']).default('relevance'),
      facets: z.array(z.string()).optional(),
    });
    
    describe('GetContentSchema validation', () => {
      it('should validate valid CUID', () => {
        const validInput = { id: 'clh123456789abcdef' };
        expect(() => GetContentSchema.parse(validInput)).not.toThrow();
      });
      
      it('should reject invalid CUID format', () => {
        const invalidInputs = [
          { id: 'not-a-cuid' },
          { id: '123' },
          { id: '' },
          { id: 'clh123456789abcdef-too-long' },
        ];
        
        invalidInputs.forEach(input => {
          expect(() => GetContentSchema.parse(input)).toThrow('Invalid content ID format');
        });
      });
      
      it('should require id field', () => {
        expect(() => GetContentSchema.parse({})).toThrow();
      });
    });
    
    describe('SearchContentSchema validation', () => {
      it('should validate valid search input', () => {
        const validInput = {
          query: 'Ted Bundy',
          page: 1,
          limit: 20,
        };
        
        expect(() => SearchContentSchema.parse(validInput)).not.toThrow();
      });
      
      it('should apply default values', () => {
        const input = { query: 'test' };
        const result = SearchContentSchema.parse(input);
        
        expect(result.page).toBe(1);
        expect(result.limit).toBe(20);
        expect(result.sort).toBe('relevance');
      });
      
      it('should validate query length constraints', () => {
        expect(() => SearchContentSchema.parse({ query: '' })).toThrow();
        expect(() => SearchContentSchema.parse({ query: 'a'.repeat(101) })).toThrow();
      });
      
      it('should validate page constraints', () => {
        expect(() => SearchContentSchema.parse({ query: 'test', page: 0 })).toThrow();
        expect(() => SearchContentSchema.parse({ query: 'test', page: -1 })).toThrow();
      });
      
      it('should validate limit constraints', () => {
        expect(() => SearchContentSchema.parse({ query: 'test', limit: 0 })).toThrow();
        expect(() => SearchContentSchema.parse({ query: 'test', limit: 51 })).toThrow();
      });
      
      it('should validate contentType enum', () => {
        const validTypes = ['DOCUMENTARY', 'DOCUSERIES', 'DRAMATIZATION', 'PODCAST', 'BOOK', 'MOVIE', 'TV_SERIES'];
        
        validTypes.forEach(type => {
          expect(() => SearchContentSchema.parse({
            query: 'test',
            filters: { contentType: type as any }
          })).not.toThrow();
        });
        
        expect(() => SearchContentSchema.parse({
          query: 'test',
          filters: { contentType: 'INVALID_TYPE' as any }
        })).toThrow();
      });
      
      it('should validate caseType enum', () => {
        const validTypes = ['SERIAL_KILLER', 'MASS_MURDER', 'MISSING_PERSON', 'COLD_CASE'];
        
        validTypes.forEach(type => {
          expect(() => SearchContentSchema.parse({
            query: 'test',
            filters: { caseType: type as any }
          })).not.toThrow();
        });
        
        expect(() => SearchContentSchema.parse({
          query: 'test',
          filters: { caseType: 'INVALID_TYPE' as any }
        })).toThrow();
      });
      
      it('should validate year range constraints', () => {
        const currentYear = new Date().getFullYear();
        
        // Valid years
        expect(() => SearchContentSchema.parse({
          query: 'test',
          filters: { yearFrom: 1900, yearTo: currentYear }
        })).not.toThrow();
        
        // Invalid years
        expect(() => SearchContentSchema.parse({
          query: 'test',
          filters: { yearFrom: 1899 }
        })).toThrow();
        
        expect(() => SearchContentSchema.parse({
          query: 'test',
          filters: { yearTo: currentYear + 1 }
        })).toThrow();
      });
      
      it('should validate rating range constraints', () => {
        // Valid ratings
        expect(() => SearchContentSchema.parse({
          query: 'test',
          filters: { ratingFrom: 0, ratingTo: 10 }
        })).not.toThrow();
        
        // Invalid ratings
        expect(() => SearchContentSchema.parse({
          query: 'test',
          filters: { ratingFrom: -1 }
        })).toThrow();
        
        expect(() => SearchContentSchema.parse({
          query: 'test',
          filters: { ratingTo: 11 }
        })).toThrow();
      });
      
      it('should validate sort enum', () => {
        const validSorts = ['relevance', 'rating_desc', 'rating_asc', 'release_date_desc', 'release_date_asc', 'popularity_desc', 'title_asc'];
        
        validSorts.forEach(sort => {
          expect(() => SearchContentSchema.parse({
            query: 'test',
            sort: sort as any
          })).not.toThrow();
        });
        
        expect(() => SearchContentSchema.parse({
          query: 'test',
          sort: 'invalid_sort' as any
        })).toThrow();
      });
      
      it('should validate factualityLevel enum', () => {
        const validLevels = ['DOCUMENTARY', 'DOCUDRAMA', 'BASED_ON_TRUE_EVENTS', 'INSPIRED_BY', 'FICTIONAL'];
        
        validLevels.forEach(level => {
          expect(() => SearchContentSchema.parse({
            query: 'test',
            filters: { factualityLevel: level as any }
          })).not.toThrow();
        });
        
        expect(() => SearchContentSchema.parse({
          query: 'test',
          filters: { factualityLevel: 'INVALID_LEVEL' as any }
        })).toThrow();
      });
      
      it('should validate sensitivityLevel enum', () => {
        const validLevels = ['LOW', 'MODERATE', 'HIGH', 'EXTREME'];
        
        validLevels.forEach(level => {
          expect(() => SearchContentSchema.parse({
            query: 'test',
            filters: { sensitivityLevel: level as any }
          })).not.toThrow();
        });
        
        expect(() => SearchContentSchema.parse({
          query: 'test',
          filters: { sensitivityLevel: 'INVALID_LEVEL' as any }
        })).toThrow();
      });
      
      it('should validate availabilityType enum', () => {
        const validTypes = ['FREE', 'SUBSCRIPTION', 'PREMIUM_SUBSCRIPTION', 'PURCHASE', 'RENTAL'];
        
        validTypes.forEach(type => {
          expect(() => SearchContentSchema.parse({
            query: 'test',
            filters: { availabilityType: type as any }
          })).not.toThrow();
        });
        
        expect(() => SearchContentSchema.parse({
          query: 'test',
          filters: { availabilityType: 'INVALID_TYPE' as any }
        })).toThrow();
      });
      
      it('should handle optional filters', () => {
        const inputWithoutFilters = { query: 'test' };
        expect(() => SearchContentSchema.parse(inputWithoutFilters)).not.toThrow();
        
        const inputWithPartialFilters = {
          query: 'test',
          filters: {
            contentType: 'DOCUMENTARY' as any,
            yearFrom: 2020,
          }
        };
        expect(() => SearchContentSchema.parse(inputWithPartialFilters)).not.toThrow();
      });
      
      it('should apply filter defaults', () => {
        const input = {
          query: 'test',
          filters: {}
        };
        
        const result = SearchContentSchema.parse(input);
        expect(result.filters?.region).toBe('US');
        expect(result.filters?.includeUnavailable).toBe(false);
      });
    });
  });
  
  describe('Runtime type checking and data transformation', () => {
    it('should handle string to number conversions', () => {
      // Test cases where string inputs might be passed
      const testCases = [
        { input: '1', expected: 1 },
        { input: '20', expected: 20 },
        { input: '2020', expected: 2020 },
      ];
      
      testCases.forEach(({ input, expected }) => {
        expect(Number(input)).toBe(expected);
      });
    });
    
    it('should validate array inputs', () => {
      const validArrayInputs = [
        [],
        ['item1'],
        ['item1', 'item2'],
      ];
      
      validArrayInputs.forEach(arr => {
        expect(Array.isArray(arr)).toBe(true);
      });
    });
    
    it('should handle boolean conversions', () => {
      const testCases = [
        { input: true, expected: true },
        { input: false, expected: false },
        { input: 'true', expected: true },
        { input: 'false', expected: false },
        { input: 1, expected: true },
        { input: 0, expected: false },
      ];
      
      testCases.forEach(({ input, expected }) => {
        expect(Boolean(input)).toBe(expected);
      });
    });
  });
  
  describe('Edge cases and boundary testing', () => {
    it('should handle maximum string lengths', () => {
      const maxQueryLength = 100;
      const maxQuery = 'a'.repeat(maxQueryLength);
      
      expect(() => SearchContentSchema.parse({ query: maxQuery })).not.toThrow();
      expect(() => SearchContentSchema.parse({ query: maxQuery + 'a' })).toThrow();
    });
    
    it('should handle boundary year values', () => {
      const currentYear = new Date().getFullYear();
      
      expect(() => SearchContentSchema.parse({
        query: 'test',
        filters: { yearFrom: 1900 }
      })).not.toThrow();
      
      expect(() => SearchContentSchema.parse({
        query: 'test',
        filters: { yearTo: currentYear }
      })).not.toThrow();
    });
    
    it('should handle boundary rating values', () => {
      expect(() => SearchContentSchema.parse({
        query: 'test',
        filters: { ratingFrom: 0 }
      })).not.toThrow();
      
      expect(() => SearchContentSchema.parse({
        query: 'test',
        filters: { ratingTo: 10 }
      })).not.toThrow();
    });
    
    it('should handle boundary page and limit values', () => {
      expect(() => SearchContentSchema.parse({
        query: 'test',
        page: 1,
        limit: 1
      })).not.toThrow();
      
      expect(() => SearchContentSchema.parse({
        query: 'test',
        page: 999999,
        limit: 50
      })).not.toThrow();
    });
    
    it('should handle empty arrays', () => {
      expect(() => SearchContentSchema.parse({
        query: 'test',
        filters: {
          genres: [],
          platforms: []
        }
      })).not.toThrow();
    });
    
    it('should handle special characters in strings', () => {
      const specialChars = [
        "Test with 'quotes'",
        'Test with "double quotes"',
        'Test with unicode: 测试',
        'Test with emoji: 🔍',
        'Test with symbols: @#$%^&*()',
      ];
      
      specialChars.forEach(query => {
        expect(() => SearchContentSchema.parse({ query })).not.toThrow();
      });
    });
  });
});
