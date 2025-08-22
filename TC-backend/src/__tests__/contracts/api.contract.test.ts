import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { ContractTestUtils, ContractSchemas } from '@/test/contract-utils';
import { TestFactory } from '@/test/factories';
import { createCallerFactory } from '@trpc/server';
import type { AppRouter } from '@/lib/trpc';

describe('API Contract Tests', () => {
  describe('Authentication API Contracts', () => {
    describe('POST /api/trpc/auth.register', () => {
      const registerInputSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
      });

      const registerOutputSchema = z.object({
        result: z.object({
          data: z.object({
            success: z.boolean(),
            user: ContractSchemas.user,
            tokens: ContractSchemas.authTokens,
          }),
        }),
      });

      ContractTestUtils.testEndpointContract(
        'auth.register',
        registerInputSchema,
        registerOutputSchema,
        [
          {
            name: 'should accept valid registration data',
            input: TestFactory.createRegistrationInput(),
            expectedOutput: {
              result: {
                data: {
                  success: true,
                  user: TestFactory.createUser({ emailVerified: false }),
                  tokens: {
                    accessToken: 'jwt-token',
                    refreshToken: 'refresh-token',
                    expiresAt: new Date(),
                    refreshExpiresAt: new Date(),
                  },
                },
              },
            },
          },
          {
            name: 'should reject invalid email format',
            input: { ...TestFactory.createRegistrationInput(), email: 'invalid-email' },
            expectError: true,
          },
          {
            name: 'should reject weak password',
            input: { ...TestFactory.createRegistrationInput(), password: 'weak' },
            expectError: true,
          },
          {
            name: 'should reject missing required fields',
            input: { email: 'test@example.com' },
            expectError: true,
          },
        ]
      );
    });

    describe('POST /api/trpc/auth.login', () => {
      const loginInputSchema = z.object({
        email: z.string().email(),
        password: z.string().min(1),
        rememberMe: z.boolean().optional(),
      });

      const loginOutputSchema = z.object({
        result: z.object({
          data: z.object({
            success: z.boolean(),
            user: ContractSchemas.user,
            tokens: ContractSchemas.authTokens,
          }),
        }),
      });

      ContractTestUtils.testEndpointContract(
        'auth.login',
        loginInputSchema,
        loginOutputSchema,
        [
          {
            name: 'should accept valid login credentials',
            input: TestFactory.createLoginInput(),
            expectedOutput: {
              result: {
                data: {
                  success: true,
                  user: TestFactory.createUser(),
                  tokens: {
                    accessToken: 'jwt-token',
                    refreshToken: 'refresh-token',
                    expiresAt: new Date(),
                    refreshExpiresAt: new Date(),
                  },
                },
              },
            },
          },
          {
            name: 'should reject invalid email format',
            input: { email: 'invalid-email', password: 'password' },
            expectError: true,
          },
          {
            name: 'should reject empty password',
            input: { email: 'test@example.com', password: '' },
            expectError: true,
          },
        ]
      );
    });

    describe('GET /api/trpc/auth.me', () => {
      const meOutputSchema = z.object({
        result: z.object({
          data: ContractSchemas.user.extend({
            preferences: ContractSchemas.userPreferences.nullable(),
          }),
        }),
      });

      ContractTestUtils.testEndpointContract(
        'auth.me',
        z.void(),
        meOutputSchema,
        [
          {
            name: 'should return authenticated user data',
            input: undefined,
            expectedOutput: {
              result: {
                data: {
                  ...TestFactory.createUser(),
                  preferences: TestFactory.createUserPreferences(),
                },
              },
            },
          },
        ]
      );
    });

    describe('POST /api/trpc/auth.logout', () => {
      const logoutOutputSchema = z.object({
        result: z.object({
          data: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        }),
      });

      ContractTestUtils.testEndpointContract(
        'auth.logout',
        z.void(),
        logoutOutputSchema,
        [
          {
            name: 'should return success confirmation',
            input: undefined,
            expectedOutput: {
              result: {
                data: {
                  success: true,
                  message: 'Logged out successfully',
                },
              },
            },
          },
        ]
      );
    });

    describe('POST /api/trpc/auth.refresh', () => {
      const refreshInputSchema = z.object({
        refreshToken: z.string(),
      });

      const refreshOutputSchema = z.object({
        result: z.object({
          data: z.object({
            success: z.boolean(),
            tokens: ContractSchemas.authTokens,
          }),
        }),
      });

      ContractTestUtils.testEndpointContract(
        'auth.refresh',
        refreshInputSchema,
        refreshOutputSchema,
        [
          {
            name: 'should accept valid refresh token',
            input: { refreshToken: 'valid-refresh-token' },
            expectedOutput: {
              result: {
                data: {
                  success: true,
                  tokens: {
                    accessToken: 'new-jwt-token',
                    refreshToken: 'new-refresh-token',
                    expiresAt: new Date(),
                    refreshExpiresAt: new Date(),
                  },
                },
              },
            },
          },
          {
            name: 'should reject empty refresh token',
            input: { refreshToken: '' },
            expectError: true,
          },
        ]
      );
    });
  });

  describe('Content API Contracts', () => {
    describe('GET /api/trpc/content.getById', () => {
      const getByIdInputSchema = z.object({
        id: z.string().uuid(),
      });

      const getByIdOutputSchema = z.object({
        result: z.object({
          data: ContractSchemas.content,
        }),
      });

      ContractTestUtils.testEndpointContract(
        'content.getById',
        getByIdInputSchema,
        getByIdOutputSchema,
        [
          {
            name: 'should accept valid UUID',
            input: { id: '123e4567-e89b-12d3-a456-426614174000' },
            expectedOutput: {
              result: {
                data: {
                  id: '123e4567-e89b-12d3-a456-426614174000',
                  title: 'Test Content',
                  description: 'Test Description',
                  type: 'series',
                  year: 2023,
                  rating: 4,
                  genres: ['True Crime'],
                  platforms: ['Netflix'],
                  metadata: {},
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
            },
          },
          {
            name: 'should reject invalid UUID format',
            input: { id: 'invalid-uuid' },
            expectError: true,
          },
          {
            name: 'should reject empty ID',
            input: { id: '' },
            expectError: true,
          },
        ]
      );
    });

    describe('GET /api/trpc/content.search', () => {
      ContractTestUtils.testProcedureContract(
        'content.search',
        {
          inputSchema: ContractSchemas.searchInput,
          outputSchema: ContractSchemas.paginatedResponse.extend({
            results: z.array(ContractSchemas.content),
          }),
          validInputs: [
            { query: 'Ted Bundy', page: 1, limit: 20 },
            { query: 'serial killer', page: 2, limit: 10 },
            {
              query: 'true crime',
              page: 1,
              limit: 50,
              filters: {
                type: 'series',
                genre: 'True Crime',
                year: 2023,
              },
            },
          ],
          invalidInputs: [
            { input: { query: '', page: 1, limit: 20 }, expectedError: 'Query is required' },
            { input: { query: 'test', page: 0, limit: 20 }, expectedError: 'Page must be positive' },
            { input: { query: 'test', page: 1, limit: 0 }, expectedError: 'Limit must be positive' },
            { input: { query: 'test', page: 1, limit: 101 }, expectedError: 'Limit too large' },
            { input: { query: 'a'.repeat(101), page: 1, limit: 20 }, expectedError: 'Query too long' },
          ],
          expectedOutputFormat: {
            results: [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                title: 'Test Content',
                description: 'Test Description',
                type: 'series',
                year: 2023,
                rating: 4,
                genres: ['True Crime'],
                platforms: ['Netflix'],
                metadata: {},
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 1,
              pages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        }
      );
    });

    describe('GET /api/trpc/content.list', () => {
      const listInputSchema = z.object({
        category: z.enum(['trending', 'new', 'popular', 'recommended']).optional(),
        timeframe: z.enum(['day', 'week', 'month', 'all']).optional(),
        page: z.number().min(1).optional(),
        limit: z.number().min(1).max(100).optional(),
      });

      ContractTestUtils.testProcedureContract(
        'content.list',
        {
          inputSchema: listInputSchema,
          outputSchema: ContractSchemas.paginatedResponse.extend({
            results: z.array(ContractSchemas.content),
            category: z.string(),
            timeframe: z.string(),
          }),
          validInputs: [
            {},
            { category: 'trending' },
            { category: 'new', timeframe: 'week' },
            { category: 'popular', page: 2, limit: 15 },
          ],
          invalidInputs: [
            { input: { category: 'invalid' }, expectedError: 'Invalid category' },
            { input: { timeframe: 'invalid' }, expectedError: 'Invalid timeframe' },
            { input: { page: 0 }, expectedError: 'Page must be positive' },
            { input: { limit: 101 }, expectedError: 'Limit too large' },
          ],
        }
      );
    });

    describe('POST /api/trpc/content.addToWatchlist', () => {
      const addToWatchlistInputSchema = z.object({
        contentId: z.string().uuid(),
      });

      const addToWatchlistOutputSchema = z.object({
        result: z.object({
          data: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        }),
      });

      ContractTestUtils.testEndpointContract(
        'content.addToWatchlist',
        addToWatchlistInputSchema,
        addToWatchlistOutputSchema,
        [
          {
            name: 'should accept valid content ID',
            input: { contentId: '123e4567-e89b-12d3-a456-426614174000' },
            expectedOutput: {
              result: {
                data: {
                  success: true,
                  message: 'Content added to your watchlist',
                },
              },
            },
          },
          {
            name: 'should reject invalid UUID',
            input: { contentId: 'invalid-uuid' },
            expectError: true,
          },
        ]
      );
    });

    describe('GET /api/trpc/content.getWatchlist', () => {
      const getWatchlistInputSchema = z.object({
        page: z.number().min(1).optional(),
        limit: z.number().min(1).max(100).optional(),
      });

      const getWatchlistOutputSchema = z.object({
        result: z.object({
          data: ContractSchemas.paginatedResponse.extend({
            results: z.array(
              ContractSchemas.content.extend({
                addedAt: z.date(),
              })
            ),
          }),
        }),
      });

      ContractTestUtils.testEndpointContract(
        'content.getWatchlist',
        getWatchlistInputSchema,
        getWatchlistOutputSchema,
        [
          {
            name: 'should accept valid pagination parameters',
            input: { page: 1, limit: 20 },
            expectedOutput: {
              result: {
                data: {
                  results: [
                    {
                      id: '123e4567-e89b-12d3-a456-426614174000',
                      title: 'Test Content',
                      description: 'Test Description',
                      type: 'series',
                      year: 2023,
                      rating: 4,
                      genres: ['True Crime'],
                      platforms: ['Netflix'],
                      metadata: {},
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      addedAt: new Date(),
                    },
                  ],
                  pagination: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    pages: 1,
                    hasNext: false,
                    hasPrev: false,
                  },
                },
              },
            },
          },
          {
            name: 'should accept empty parameters (use defaults)',
            input: {},
          },
          {
            name: 'should reject invalid page number',
            input: { page: 0 },
            expectError: true,
          },
          {
            name: 'should reject invalid limit',
            input: { limit: 101 },
            expectError: true,
          },
        ]
      );
    });

    describe('POST /api/trpc/content.updateProgress', () => {
      const updateProgressInputSchema = z.object({
        contentId: z.string().uuid(),
        progress: z.object({
          watched: z.boolean(),
          currentEpisode: z.number().min(0).optional(),
          totalEpisodes: z.number().min(0).optional(),
          rating: z.number().min(1).max(5).optional(),
          notes: z.string().max(1000).optional(),
        }),
      });

      ContractTestUtils.testProcedureContract(
        'content.updateProgress',
        {
          inputSchema: updateProgressInputSchema,
          validInputs: [
            {
              contentId: '123e4567-e89b-12d3-a456-426614174000',
              progress: { watched: true },
            },
            {
              contentId: '123e4567-e89b-12d3-a456-426614174000',
              progress: {
                watched: true,
                currentEpisode: 5,
                totalEpisodes: 10,
                rating: 4,
                notes: 'Great series!',
              },
            },
          ],
          invalidInputs: [
            {
              input: {
                contentId: 'invalid-uuid',
                progress: { watched: true },
              },
              expectedError: 'Invalid UUID',
            },
            {
              input: {
                contentId: '123e4567-e89b-12d3-a456-426614174000',
                progress: { watched: true, currentEpisode: -1 },
              },
              expectedError: 'Current episode must be non-negative',
            },
            {
              input: {
                contentId: '123e4567-e89b-12d3-a456-426614174000',
                progress: { watched: true, rating: 6 },
              },
              expectedError: 'Rating must be between 1 and 5',
            },
            {
              input: {
                contentId: '123e4567-e89b-12d3-a456-426614174000',
                progress: { watched: true, notes: 'a'.repeat(1001) },
              },
              expectedError: 'Notes too long',
            },
          ],
        }
      );
    });
  });

  describe('Error Response Contracts', () => {
    const errorScenarios = [
      {
        name: 'Validation Error',
        error: {
          error: {
            message: 'Invalid input data',
            code: 'BAD_REQUEST',
            data: {
              zodError: {
                fieldErrors: {
                  email: ['Invalid email format'],
                },
              },
            },
          },
        },
        expectedCode: 'BAD_REQUEST',
      },
      {
        name: 'Authentication Error',
        error: {
          error: {
            message: 'You must be logged in to access this resource',
            code: 'UNAUTHORIZED',
          },
        },
        expectedCode: 'UNAUTHORIZED',
      },
      {
        name: 'Authorization Error',
        error: {
          error: {
            message: 'You do not have permission to access this resource',
            code: 'FORBIDDEN',
          },
        },
        expectedCode: 'FORBIDDEN',
      },
      {
        name: 'Not Found Error',
        error: {
          error: {
            message: 'Content not found',
            code: 'NOT_FOUND',
          },
        },
        expectedCode: 'NOT_FOUND',
      },
      {
        name: 'Rate Limit Error',
        error: {
          error: {
            message: 'Too many requests. Please try again later.',
            code: 'TOO_MANY_REQUESTS',
            data: {
              retryAfter: 60,
            },
          },
        },
        expectedCode: 'TOO_MANY_REQUESTS',
      },
      {
        name: 'Internal Server Error',
        error: {
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR',
          },
        },
        expectedCode: 'INTERNAL_SERVER_ERROR',
      },
    ];

    ContractTestUtils.testErrorContract(errorScenarios);
  });

  describe('Pagination Contracts', () => {
    const paginationScenarios = [
      {
        name: 'First page with results',
        response: {
          results: [{ id: 1 }, { id: 2 }, { id: 3 }],
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            pages: 3,
            hasNext: true,
            hasPrev: false,
          },
        },
        expectedTotal: 25,
        expectedPage: 1,
        expectedLimit: 10,
      },
      {
        name: 'Middle page with results',
        response: {
          results: [{ id: 11 }, { id: 12 }, { id: 13 }],
          pagination: {
            page: 2,
            limit: 10,
            total: 25,
            pages: 3,
            hasNext: true,
            hasPrev: true,
          },
        },
        expectedTotal: 25,
        expectedPage: 2,
        expectedLimit: 10,
      },
      {
        name: 'Last page with results',
        response: {
          results: [{ id: 21 }, { id: 22 }, { id: 23 }, { id: 24 }, { id: 25 }],
          pagination: {
            page: 3,
            limit: 10,
            total: 25,
            pages: 3,
            hasNext: false,
            hasPrev: true,
          },
        },
        expectedTotal: 25,
        expectedPage: 3,
        expectedLimit: 10,
      },
      {
        name: 'Empty results',
        response: {
          results: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false,
          },
        },
        expectedTotal: 0,
        expectedPage: 1,
        expectedLimit: 10,
      },
      {
        name: 'Single page of results',
        response: {
          results: [{ id: 1 }, { id: 2 }],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            pages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
        expectedTotal: 2,
        expectedPage: 1,
        expectedLimit: 10,
      },
    ];

    ContractTestUtils.testPaginationContract(paginationScenarios);
  });

  describe('Rate Limiting Contracts', () => {
    const rateLimitScenarios = [
      {
        name: 'Standard API rate limiting',
        requests: 35,
        windowMs: 60000,
        limit: 30,
        responses: [
          // 30 successful responses
          ...Array.from({ length: 30 }, () => ({
            statusCode: 200,
            headers: {
              'x-ratelimit-limit': '30',
              'x-ratelimit-remaining': '10',
              'x-ratelimit-reset': '1640995200',
            },
          })),
          // 5 rate limited responses
          ...Array.from({ length: 5 }, () => ({
            statusCode: 429,
            headers: {
              'x-ratelimit-limit': '30',
              'x-ratelimit-remaining': '0',
              'x-ratelimit-reset': '1640995200',
              'retry-after': '60',
            },
          })),
        ],
      },
      {
        name: 'Authentication endpoint rate limiting',
        requests: 10,
        windowMs: 900000, // 15 minutes
        limit: 5,
        responses: [
          // 5 successful responses
          ...Array.from({ length: 5 }, () => ({
            statusCode: 200,
            headers: {
              'x-ratelimit-limit': '5',
              'x-ratelimit-remaining': '2',
              'x-ratelimit-reset': '1640995800',
            },
          })),
          // 5 rate limited responses
          ...Array.from({ length: 5 }, () => ({
            statusCode: 429,
            headers: {
              'x-ratelimit-limit': '5',
              'x-ratelimit-remaining': '0',
              'x-ratelimit-reset': '1640995800',
              'retry-after': '900',
            },
          })),
        ],
      },
    ];

    ContractTestUtils.testRateLimitContract(rateLimitScenarios);
  });

  describe('Authentication State Contracts', () => {
    const authScenarios = [
      {
        name: 'Valid authenticated user',
        token: 'valid-jwt-token',
        expectedResult: 'authenticated' as const,
        userData: TestFactory.createUser({ emailVerified: true }),
      },
      {
        name: 'Unauthenticated request',
        expectedResult: 'unauthenticated' as const,
      },
      {
        name: 'Expired token',
        token: 'expired-jwt-token',
        expectedResult: 'expired' as const,
      },
      {
        name: 'Invalid token format',
        token: 'invalid-token-format',
        expectedResult: 'invalid' as const,
      },
      {
        name: 'Malformed JWT',
        token: 'not.a.valid.jwt.token.structure',
        expectedResult: 'invalid' as const,
      },
    ];

    ContractTestUtils.testAuthContract(authScenarios);
  });

  describe('Response Format Consistency', () => {
    const apiResponses = [
      {
        endpoint: '/api/trpc/auth.login',
        method: 'POST',
        statusCode: 200,
        response: {
          result: {
            data: {
              success: true,
              user: TestFactory.createUser(),
              tokens: {
                accessToken: 'jwt-token',
                refreshToken: 'refresh-token',
                expiresAt: new Date(),
                refreshExpiresAt: new Date(),
              },
            },
          },
        },
      },
      {
        endpoint: '/api/trpc/content.search',
        method: 'GET',
        statusCode: 200,
        response: {
          result: {
            data: {
              results: [],
              pagination: {
                page: 1,
                limit: 20,
                total: 0,
                pages: 0,
                hasNext: false,
                hasPrev: false,
              },
            },
          },
        },
      },
      {
        endpoint: '/api/trpc/auth.login',
        method: 'POST',
        statusCode: 401,
        response: {
          error: {
            message: 'Invalid credentials',
            code: 'UNAUTHORIZED',
          },
        },
      },
      {
        endpoint: '/api/trpc/content.getById',
        method: 'GET',
        statusCode: 404,
        response: {
          error: {
            message: 'Content not found',
            code: 'NOT_FOUND',
          },
        },
      },
    ];

    ContractTestUtils.testResponseFormat(apiResponses, {
      success: ContractSchemas.successResponse,
      error: ContractSchemas.errorResponse,
    });
  });
});