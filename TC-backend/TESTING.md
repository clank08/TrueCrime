# Testing Strategy

This document outlines the comprehensive testing strategy for the TrueCrime backend authentication system.

## Overview

Our testing strategy follows a multi-layered approach to ensure code quality, security, and performance:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between components and services
- **End-to-End Tests**: Test complete user workflows from start to finish
- **Contract Tests**: Verify API contracts and data structures
- **Performance Tests**: Ensure acceptable response times and resource usage
- **Security Tests**: Validate security measures and prevent vulnerabilities

## Test Structure

```
src/
├── __tests__/                     # Global test files
│   ├── e2e/                      # End-to-end test files
│   ├── contracts/                # API contract tests
│   ├── performance/              # Performance tests
│   └── security/                 # Security tests
├── lib/
│   └── __tests__/                # Unit tests for utilities
├── services/
│   └── __tests__/                # Unit tests for services
├── routers/
│   └── __tests__/                # Integration tests for routers
└── test/                         # Test utilities and helpers
    ├── factories.ts              # Test data factories
    ├── utils.ts                  # Test utility functions
    └── setup.ts                  # Global test setup
```

## Test Categories

### 1. Unit Tests

Test individual functions and methods in isolation with mocked dependencies.

**Location**: `src/**/__tests__/**/*.test.ts`

**Run**: `npm run test:unit`

**Examples**:
- JWT token generation and validation
- Password hashing utilities
- Input validation functions
- Database utilities

### 2. Integration Tests

Test the interaction between different components, services, and external dependencies.

**Location**: `src/**/*.integration.test.ts`

**Run**: `npm run test:integration`

**Examples**:
- Authentication router with real service calls
- Database operations with test database
- External API integrations

### 3. End-to-End Tests

Test complete user workflows from start to finish, simulating real user interactions.

**Location**: `src/__tests__/e2e/*.e2e.test.ts`

**Run**: `npm run test:e2e`

**Examples**:
- Complete registration flow: register → verify email → login
- Password reset flow: request → confirm → login
- Session management: login → activity → refresh → logout

### 4. Contract Tests

Verify API contracts, input/output schemas, and data structure consistency.

**Location**: `src/__tests__/contracts/*.contract.test.ts`

**Run**: `npm run test:contracts`

**Examples**:
- tRPC input validation schemas
- API response structure validation
- Type safety verification
- Backward compatibility checks

### 5. Performance Tests

Measure response times, throughput, and resource usage under various load conditions.

**Location**: `src/__tests__/performance/*.performance.test.ts`

**Run**: `npm run test:performance`

**Examples**:
- Authentication endpoint response times
- Concurrent user handling
- Memory usage patterns
- Database query performance

### 6. Security Tests

Validate security measures and test against common attack vectors.

**Location**: `src/__tests__/security/*.security.test.ts`

**Run**: `npm run test:security`

**Examples**:
- SQL injection prevention
- XSS attack prevention
- Rate limiting validation
- Authentication bypass attempts

## Test Commands

### Development Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:contracts
npm run test:performance
npm run test:security

# Run tests with coverage
npm run test:coverage

# Run unit tests in watch mode
npm run test:unit:watch
```

### CI/CD Commands

```bash
# Run all tests with verbose output
npm run test:ci

# Run specific test categories for CI
npm run test:ci:unit
npm run test:ci:integration
npm run test:ci:e2e
npm run test:ci:security
```

## Test Data Management

### Test Factories

Use the `TestFactory` class to create consistent test data:

```typescript
import { TestFactory } from '@/test/factories';

// Create a test user
const user = TestFactory.createUser({
  email: 'test@example.com',
  emailVerified: true,
});

// Create complete auth result
const authResult = TestFactory.createAuthResult();

// Create multiple test users
const users = TestFactory.createUsers(5);
```

### Test Utilities

Use the `TestUtils` class for common testing operations:

```typescript
import { TestUtils } from '@/test/utils';

// Create test contexts
const authContext = TestUtils.createAuthenticatedContext();
const unauthContext = TestUtils.createUnauthenticatedContext();

// Performance testing
const timer = TestUtils.createPerformanceTimer();
// ... perform operation ...
timer.expectFasterThan(1000); // Should complete in under 1 second

// Error testing
await TestUtils.expectTRPCError(
  () => caller.login({ email: 'invalid', password: 'wrong' }),
  'UNAUTHORIZED',
  'Invalid credentials'
);
```

## Test Environment Setup

### Environment Variables

Tests require the following environment variables:

```bash
NODE_ENV=test
JWT_SECRET=test-jwt-secret-for-testing-purposes-only-minimum-256-bits
JWT_REFRESH_SECRET=test-refresh-jwt-secret-for-testing-purposes-only-different
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SUPABASE_URL=https://test.supabase.co
SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
FRONTEND_URL=http://localhost:3000
```

### Database Setup

For integration and E2E tests, set up a test database:

```bash
# Generate Prisma client
npm run db:generate

# Apply database schema
npm run db:push

# Seed test data (for E2E tests)
npm run db:seed
```

## Best Practices

### 1. Test Independence

- Each test should be completely independent
- Use `beforeEach` and `afterEach` for setup and cleanup
- Clear all mocks between tests

### 2. Test Data

- Use factories for consistent test data creation
- Avoid hardcoded test data in test files
- Use meaningful test data that reflects real scenarios

### 3. Mocking Strategy

- Mock external dependencies (databases, APIs, file system)
- Use real implementations for unit under test
- Keep mocks simple and focused

### 4. Test Descriptions

- Use descriptive test names that explain what is being tested
- Follow the pattern: "should [expected behavior] when [conditions]"
- Group related tests using `describe` blocks

### 5. Assertions

- Make specific assertions about expected behavior
- Test both success and failure cases
- Verify side effects (database changes, API calls, etc.)

### 6. Performance Considerations

- Keep unit tests fast (< 100ms each)
- Use timeouts for integration and E2E tests
- Monitor test execution time and optimize slow tests

## Coverage Requirements

Our coverage thresholds are set in `vitest.config.ts`:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Generating Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/index.html
```

## Continuous Integration

### GitHub Actions Workflow

Our CI pipeline runs different test suites in parallel:

1. **Setup**: Lint, type-check, and formatting
2. **Unit Tests**: Fast isolated tests with coverage
3. **Integration Tests**: Tests with real database
4. **E2E Tests**: Complete workflow tests
5. **Security Tests**: Security validation
6. **Contract Tests**: API contract verification
7. **Performance Tests**: Performance benchmarks (on main/develop only)

### Test Artifacts

Test results and coverage reports are uploaded as artifacts:

- Unit test coverage reports
- Integration test results
- E2E test results
- Security test results
- Performance benchmarks

## Debugging Tests

### Running Individual Tests

```bash
# Run specific test file
npx vitest src/lib/__tests__/jwt.test.ts

# Run tests matching pattern
npx vitest --grep "should generate valid tokens"

# Run tests in debug mode
npx vitest --inspect-brk
```

### Common Issues

1. **Mock not working**: Ensure mocks are cleared between tests
2. **Async tests failing**: Use `async/await` properly and handle promises
3. **Database tests failing**: Check database connection and cleanup
4. **Timing issues**: Use `waitFor` utilities for async operations

## Maintenance

### Regular Tasks

1. **Update test data**: Keep test factories in sync with schema changes
2. **Review coverage**: Ensure new code has adequate test coverage
3. **Performance monitoring**: Track test execution times
4. **Security updates**: Keep security tests updated with new threats

### Adding New Tests

When adding new functionality:

1. Start with unit tests for individual functions
2. Add integration tests for component interactions
3. Include E2E tests for new user workflows
4. Verify API contracts for new endpoints
5. Add security tests for new attack surfaces

## Troubleshooting

### Common Test Failures

**"Module not found" errors**:
- Check import paths and aliases
- Ensure test setup is correct

**"Mock function not called" errors**:
- Verify mock setup and clearing
- Check if the actual code path calls the mocked function

**"Timeout" errors**:
- Increase test timeout for slow operations
- Check for unresolved promises

**"Database connection" errors**:
- Ensure test database is running
- Check DATABASE_URL environment variable

### Getting Help

1. Check this documentation first
2. Look at existing test examples
3. Review test utilities and factories
4. Ask team members for guidance

## Related Documentation

- [Vitest Documentation](https://vitest.dev/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [tRPC Testing](https://trpc.io/docs/testing)
- [Project Architecture](./README.md)