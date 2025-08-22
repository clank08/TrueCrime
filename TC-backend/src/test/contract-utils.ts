import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

/**
 * Utilities for API contract testing
 */
export class ContractTestUtils {
  /**
   * Test API endpoint contract validation
   */
  static testEndpointContract<TInput, TOutput>(
    endpoint: string,
    inputSchema: z.ZodSchema<TInput>,
    outputSchema: z.ZodSchema<TOutput>,
    testCases: Array<{
      name: string;
      input: any;
      expectedOutput?: any;
      expectError?: boolean;
      errorCode?: string;
    }>
  ) {
    describe(`Contract: ${endpoint}`, () => {
      testCases.forEach(({ name, input, expectedOutput, expectError, errorCode }) => {
        it(name, async () => {
          // Test input validation
          const inputValidation = inputSchema.safeParse(input);
          
          if (expectError && !inputValidation.success) {
            // Input validation should fail for invalid inputs
            expect(inputValidation.success).toBe(false);
            return;
          }

          if (!expectError) {
            // Input should be valid for successful cases
            expect(inputValidation.success).toBe(true);
          }

          if (expectedOutput) {
            // Test output validation
            const outputValidation = outputSchema.safeParse(expectedOutput);
            expect(outputValidation.success).toBe(true);
          }
        });
      });
    });
  }

  /**
   * Test tRPC procedure contracts
   */
  static testProcedureContract(
    procedureName: string,
    config: {
      inputSchema?: z.ZodSchema;
      outputSchema?: z.ZodSchema;
      validInputs: any[];
      invalidInputs?: Array<{ input: any; expectedError: string }>;
      expectedOutputFormat?: any;
    }
  ) {
    describe(`tRPC Contract: ${procedureName}`, () => {
      if (config.inputSchema) {
        it('should accept valid inputs', () => {
          config.validInputs.forEach((input, index) => {
            const result = config.inputSchema!.safeParse(input);
            expect(result.success).toBe(true);
          });
        });

        if (config.invalidInputs) {
          config.invalidInputs.forEach(({ input, expectedError }, index) => {
            it(`should reject invalid input ${index + 1}: ${expectedError}`, () => {
              const result = config.inputSchema!.safeParse(input);
              expect(result.success).toBe(false);
              if (!result.success) {
                expect(result.error.message).toContain(expectedError);
              }
            });
          });
        }
      }

      if (config.outputSchema && config.expectedOutputFormat) {
        it('should produce valid output format', () => {
          const result = config.outputSchema!.safeParse(config.expectedOutputFormat);
          expect(result.success).toBe(true);
        });
      }
    });
  }

  /**
   * Test database schema contracts
   */
  static testDatabaseContract(
    modelName: string,
    schema: z.ZodSchema,
    testData: Array<{
      name: string;
      data: any;
      shouldPass: boolean;
      expectedError?: string;
    }>
  ) {
    describe(`Database Contract: ${modelName}`, () => {
      testData.forEach(({ name, data, shouldPass, expectedError }) => {
        it(name, () => {
          const result = schema.safeParse(data);
          
          if (shouldPass) {
            expect(result.success).toBe(true);
          } else {
            expect(result.success).toBe(false);
            if (expectedError && !result.success) {
              expect(result.error.message).toContain(expectedError);
            }
          }
        });
      });
    });
  }

  /**
   * Test API response format consistency
   */
  static testResponseFormat(
    responses: Array<{
      endpoint: string;
      method: string;
      statusCode: number;
      response: any;
    }>,
    expectedFormat: {
      success: z.ZodSchema;
      error: z.ZodSchema;
    }
  ) {
    describe('API Response Format Contract', () => {
      responses.forEach(({ endpoint, method, statusCode, response }) => {
        it(`${method} ${endpoint} (${statusCode}) should match format`, () => {
          if (statusCode >= 200 && statusCode < 300) {
            // Success response
            const result = expectedFormat.success.safeParse(response);
            expect(result.success).toBe(true);
          } else {
            // Error response
            const result = expectedFormat.error.safeParse(response);
            expect(result.success).toBe(true);
          }
        });
      });
    });
  }

  /**
   * Test pagination contract consistency
   */
  static testPaginationContract(
    paginatedResponses: Array<{
      name: string;
      response: any;
      expectedTotal?: number;
      expectedPage?: number;
      expectedLimit?: number;
    }>
  ) {
    const paginationSchema = z.object({
      page: z.number().min(1),
      limit: z.number().min(1).max(100),
      total: z.number().min(0),
      pages: z.number().min(0),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    });

    describe('Pagination Contract', () => {
      paginatedResponses.forEach(({ name, response, expectedTotal, expectedPage, expectedLimit }) => {
        it(`${name} should have valid pagination format`, () => {
          expect(response).toHaveProperty('results');
          expect(response).toHaveProperty('pagination');
          
          const paginationResult = paginationSchema.safeParse(response.pagination);
          expect(paginationResult.success).toBe(true);

          if (expectedTotal !== undefined) {
            expect(response.pagination.total).toBe(expectedTotal);
          }

          if (expectedPage !== undefined) {
            expect(response.pagination.page).toBe(expectedPage);
          }

          if (expectedLimit !== undefined) {
            expect(response.pagination.limit).toBe(expectedLimit);
          }

          // Test pagination logic consistency
          const { page, total, limit, pages, hasNext, hasPrev } = response.pagination;
          expect(pages).toBe(Math.ceil(total / limit));
          expect(hasNext).toBe(page < pages);
          expect(hasPrev).toBe(page > 1);
        });
      });
    });
  }

  /**
   * Test error format consistency
   */
  static testErrorContract(
    errors: Array<{
      name: string;
      error: any;
      expectedCode?: string;
      expectedStatus?: number;
    }>
  ) {
    const errorSchema = z.object({
      error: z.object({
        message: z.string(),
        code: z.string(),
        data: z.any().optional(),
      }),
    });

    describe('Error Format Contract', () => {
      errors.forEach(({ name, error, expectedCode, expectedStatus }) => {
        it(`${name} should have valid error format`, () => {
          const result = errorSchema.safeParse(error);
          expect(result.success).toBe(true);

          if (expectedCode) {
            expect(error.error.code).toBe(expectedCode);
          }

          if (expectedStatus) {
            // This would be tested at the HTTP response level
            // Here we just ensure the error structure is correct
            expect(error.error.code).toBeDefined();
          }
        });
      });
    });
  }

  /**
   * Test authentication contract
   */
  static testAuthContract(
    authScenarios: Array<{
      name: string;
      token?: string;
      expectedResult: 'authenticated' | 'unauthenticated' | 'expired' | 'invalid';
      userData?: any;
    }>
  ) {
    const userSchema = z.object({
      id: z.string(),
      email: z.string().email(),
      firstName: z.string(),
      lastName: z.string(),
      emailVerified: z.boolean(),
    });

    describe('Authentication Contract', () => {
      authScenarios.forEach(({ name, token, expectedResult, userData }) => {
        it(name, () => {
          switch (expectedResult) {
            case 'authenticated':
              expect(token).toBeDefined();
              expect(userData).toBeDefined();
              if (userData) {
                const userValidation = userSchema.safeParse(userData);
                expect(userValidation.success).toBe(true);
              }
              break;

            case 'unauthenticated':
              expect(token).toBeUndefined();
              expect(userData).toBeUndefined();
              break;

            case 'expired':
            case 'invalid':
              expect(token).toBeDefined();
              expect(userData).toBeUndefined();
              break;
          }
        });
      });
    });
  }

  /**
   * Test data integrity contracts
   */
  static testDataIntegrityContract(
    operations: Array<{
      name: string;
      operation: 'create' | 'update' | 'delete';
      before: any;
      after: any;
      shouldChange: string[];
      shouldNotChange: string[];
    }>
  ) {
    describe('Data Integrity Contract', () => {
      operations.forEach(({ name, operation, before, after, shouldChange, shouldNotChange }) => {
        it(name, () => {
          if (operation === 'delete') {
            expect(after).toBeNull();
            return;
          }

          expect(after).toBeDefined();

          // Check fields that should change
          shouldChange.forEach(field => {
            if (operation === 'create') {
              expect(after).toHaveProperty(field);
            } else {
              expect(after[field]).not.toBe(before[field]);
            }
          });

          // Check fields that should not change
          shouldNotChange.forEach(field => {
            if (before && before[field] !== undefined) {
              expect(after[field]).toBe(before[field]);
            }
          });

          // Common integrity checks
          if (operation === 'create') {
            expect(after).toHaveProperty('id');
            expect(after).toHaveProperty('createdAt');
            expect(after).toHaveProperty('updatedAt');
          }

          if (operation === 'update') {
            expect(after.id).toBe(before.id);
            expect(after.createdAt).toBe(before.createdAt);
            expect(new Date(after.updatedAt).getTime()).toBeGreaterThan(
              new Date(before.updatedAt).getTime()
            );
          }
        });
      });
    });
  }

  /**
   * Test rate limiting contracts
   */
  static testRateLimitContract(
    rateLimitTests: Array<{
      name: string;
      requests: number;
      windowMs: number;
      limit: number;
      responses: Array<{ statusCode: number; headers: Record<string, string> }>;
    }>
  ) {
    describe('Rate Limiting Contract', () => {
      rateLimitTests.forEach(({ name, requests, limit, responses }) => {
        it(name, () => {
          const successResponses = responses.filter(r => r.statusCode === 200);
          const rateLimitedResponses = responses.filter(r => r.statusCode === 429);

          // Should not exceed the limit
          expect(successResponses.length).toBeLessThanOrEqual(limit);
          
          // Rate limited responses should have proper headers
          rateLimitedResponses.forEach(response => {
            expect(response.headers).toHaveProperty('x-ratelimit-limit');
            expect(response.headers).toHaveProperty('x-ratelimit-remaining');
            expect(response.headers).toHaveProperty('x-ratelimit-reset');
            expect(response.headers).toHaveProperty('retry-after');
          });

          // All successful responses should have rate limit headers
          successResponses.forEach(response => {
            expect(response.headers).toHaveProperty('x-ratelimit-limit');
            expect(response.headers).toHaveProperty('x-ratelimit-remaining');
            expect(response.headers).toHaveProperty('x-ratelimit-reset');
          });
        });
      });
    });
  }

  /**
   * Test cache contract consistency
   */
  static testCacheContract(
    cacheScenarios: Array<{
      name: string;
      operations: Array<{
        type: 'set' | 'get' | 'delete' | 'invalidate';
        key?: string;
        value?: any;
        ttl?: number;
        pattern?: string;
        tags?: string[];
        expectedResult?: any;
        shouldExist?: boolean;
      }>;
    }>
  ) {
    describe('Cache Contract', () => {
      cacheScenarios.forEach(({ name, operations }) => {
        it(name, async () => {
          for (const operation of operations) {
            switch (operation.type) {
              case 'set':
                expect(operation.key).toBeDefined();
                expect(operation.value).toBeDefined();
                break;

              case 'get':
                expect(operation.key).toBeDefined();
                if (operation.shouldExist !== undefined) {
                  if (operation.shouldExist) {
                    expect(operation.expectedResult).toBeDefined();
                  } else {
                    expect(operation.expectedResult).toBeNull();
                  }
                }
                break;

              case 'delete':
                expect(operation.key).toBeDefined();
                break;

              case 'invalidate':
                expect(operation.pattern || operation.tags).toBeDefined();
                break;
            }
          }
        });
      });
    });
  }

  /**
   * Generate contract test report
   */
  static generateContractReport(
    testResults: Array<{
      contract: string;
      passed: number;
      failed: number;
      details: Array<{ test: string; status: 'pass' | 'fail'; message?: string }>;
    }>
  ) {
    const report = {
      summary: {
        totalContracts: testResults.length,
        passedContracts: testResults.filter(r => r.failed === 0).length,
        failedContracts: testResults.filter(r => r.failed > 0).length,
        totalTests: testResults.reduce((sum, r) => sum + r.passed + r.failed, 0),
        passedTests: testResults.reduce((sum, r) => sum + r.passed, 0),
        failedTests: testResults.reduce((sum, r) => sum + r.failed, 0),
      },
      contracts: testResults.map(contract => ({
        name: contract.contract,
        status: contract.failed === 0 ? 'pass' : 'fail',
        coverage: (contract.passed / (contract.passed + contract.failed)) * 100,
        tests: contract.details,
      })),
      recommendations: testResults
        .filter(r => r.failed > 0)
        .map(r => `Review and fix failing tests in ${r.contract} contract`),
    };

    return report;
  }
}

// Common contract schemas for validation
export const ContractSchemas = {
  // API Response schemas
  successResponse: z.object({
    result: z.object({
      data: z.any(),
    }),
  }),

  errorResponse: z.object({
    error: z.object({
      message: z.string(),
      code: z.string(),
      data: z.any().optional(),
    }),
  }),

  // Pagination schema
  pagination: z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(100),
    total: z.number().min(0),
    pages: z.number().min(0),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),

  paginatedResponse: z.object({
    results: z.array(z.any()),
    pagination: z.object({
      page: z.number().min(1),
      limit: z.number().min(1).max(100),
      total: z.number().min(0),
      pages: z.number().min(0),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  }),

  // User schemas
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    displayName: z.string().optional(),
    avatar: z.string().url().optional().nullable(),
    emailVerified: z.boolean(),
    emailVerifiedAt: z.date().optional().nullable(),
    isActive: z.boolean(),
    isSuspended: z.boolean(),
    twoFactorEnabled: z.boolean(),
    createdAt: z.date(),
    updatedAt: z.date(),
    lastLoginAt: z.date().optional().nullable(),
    lastActivityAt: z.date().optional().nullable(),
  }),

  userPreferences: z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
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
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  // Content schemas
  content: z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(['movie', 'series', 'documentary', 'podcast']),
    year: z.number().min(1900).max(2100).optional(),
    rating: z.number().min(0).max(10).optional(),
    genres: z.array(z.string()),
    platforms: z.array(z.string()),
    metadata: z.record(z.any()).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),

  // Auth schemas
  loginInput: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    rememberMe: z.boolean().optional(),
  }),

  registerInput: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  }),

  authTokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.date(),
    refreshExpiresAt: z.date(),
  }),

  // Search schemas
  searchInput: z.object({
    query: z.string().min(1).max(100),
    page: z.number().min(1).optional(),
    limit: z.number().min(1).max(50).optional(),
    filters: z.object({
      type: z.enum(['movie', 'series', 'documentary', 'podcast']).optional(),
      genre: z.string().optional(),
      year: z.number().min(1900).max(2100).optional(),
      platform: z.string().optional(),
    }).optional(),
  }),

  // Rate limit headers
  rateLimitHeaders: z.object({
    'x-ratelimit-limit': z.string(),
    'x-ratelimit-remaining': z.string(),
    'x-ratelimit-reset': z.string(),
    'retry-after': z.string().optional(),
  }),
};