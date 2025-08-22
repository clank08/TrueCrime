# TC Frontend Testing Documentation

## Overview

This document outlines the comprehensive testing strategy for the True Crime tracking app frontend. Our testing approach ensures high quality, accessibility, and reliability across all platforms while being sensitive to the nature of True Crime content.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Testing Stack](#testing-stack)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Mocking Strategies](#mocking-strategies)
- [Coverage Goals](#coverage-goals)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Testing Philosophy

### Core Principles

1. **User-Centric Testing**: Focus on real user journeys and interactions
2. **Accessibility First**: Ensure all features are accessible to users with disabilities
3. **Content Sensitivity**: Test content warning systems and privacy features thoroughly
4. **Cross-Platform Parity**: Ensure consistent behavior across iOS, Android, and Web
5. **Performance Awareness**: Monitor and test performance metrics
6. **Security Consciousness**: Validate data privacy and security measures

### Testing Pyramid

```
         /\
        /E2E\        (5%) - Critical user journeys
       /------\
      /  Integ  \    (25%) - Screen and navigation flows
     /------------\
    /     Unit      \ (70%) - Components, hooks, utilities
   /------------------\
```

## Testing Stack

### Core Dependencies

- **Jest**: Testing framework (v29.7.0)
- **React Native Testing Library**: Component testing (v12.7.2)
- **MSW (Mock Service Worker)**: API mocking (v2.4.11)
- **Detox**: E2E testing framework (v20.27.3)
- **jest-expo**: Expo-specific Jest preset (v53.0.0)

### Supporting Tools

- **@testing-library/jest-native**: Additional matchers
- **@testing-library/user-event**: User interaction simulation
- **react-test-renderer**: Component rendering for tests

## Test Structure

```
__tests__/
├── unit/                 # Unit tests
│   ├── components/       # Component tests
│   ├── hooks/           # Custom hook tests
│   ├── utils/           # Utility function tests
│   └── stores/          # State management tests
├── integration/         # Integration tests
│   ├── screens/         # Screen component tests
│   ├── navigation/      # Navigation flow tests
│   └── api/            # API integration tests
├── e2e/                # End-to-end tests
│   ├── onboarding.e2e.ts
│   ├── content-discovery.e2e.ts
│   ├── watchlist.e2e.ts
│   └── helpers/        # E2E test utilities
├── mocks/              # Mock data and handlers
│   ├── handlers.ts     # MSW request handlers
│   ├── data/          # Mock data fixtures
│   └── components/    # Component mocks
└── utils/             # Test utilities
    ├── test-utils.tsx # Custom render functions
    └── setup.ts      # Test environment setup
```

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # E2E tests

# Generate coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

### Platform-Specific E2E Tests

```bash
# iOS
npm run e2e:build:ios      # Build iOS app for testing
npm run e2e:test:ios       # Run iOS E2E tests

# Android
npm run e2e:build:android  # Build Android app for testing
npm run e2e:test:android   # Run Android E2E tests

# Both platforms
npm run e2e:test           # Run on default platform
```

### Debugging Tests

```bash
# Run tests with debugging
node --inspect-brk ./node_modules/.bin/jest --runInBand

# Run specific test file
npm test -- ThemedText.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should render"

# Update snapshots
npm test -- -u
```

## Writing Tests

### Unit Tests

#### Component Testing Example

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ContentCard } from '@/components/ContentCard';

describe('ContentCard', () => {
  const mockContent = {
    id: '1',
    title: 'Test Documentary',
    description: 'A test description',
    contentWarnings: ['violence'],
    platforms: ['Netflix'],
  };

  it('should render content information', () => {
    render(<ContentCard content={mockContent} />);
    
    expect(screen.getByText('Test Documentary')).toBeTruthy();
    expect(screen.getByText('A test description')).toBeTruthy();
  });

  it('should display content warnings', () => {
    render(<ContentCard content={mockContent} />);
    
    expect(screen.getByText('Content Warning')).toBeTruthy();
    expect(screen.getByText('violence')).toBeTruthy();
  });

  it('should handle press events', () => {
    const onPress = jest.fn();
    render(<ContentCard content={mockContent} onPress={onPress} />);
    
    fireEvent.press(screen.getByTestId('content-card'));
    expect(onPress).toHaveBeenCalledWith(mockContent);
  });
});
```

#### Hook Testing Example

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useWatchlist } from '@/hooks/useWatchlist';

describe('useWatchlist', () => {
  it('should add items to watchlist', () => {
    const { result } = renderHook(() => useWatchlist());
    
    act(() => {
      result.current.addToWatchlist({ id: '1', title: 'Test' });
    });
    
    expect(result.current.watchlist).toHaveLength(1);
    expect(result.current.watchlist[0].id).toBe('1');
  });
});
```

### Integration Tests

#### Screen Testing Example

```typescript
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DiscoveryScreen from '@/app/(tabs)/discover';

const Wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    <NavigationContainer>
      {children}
    </NavigationContainer>
  </QueryClientProvider>
);

describe('DiscoveryScreen', () => {
  it('should fetch and display content', async () => {
    render(<DiscoveryScreen />, { wrapper: Wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Discover Content')).toBeTruthy();
    });
    
    // Verify content is loaded
    await waitFor(() => {
      expect(screen.getAllByTestId('content-card')).toHaveLength(10);
    });
  });
});
```

### E2E Tests

#### Detox Test Example

```typescript
describe('Content Discovery E2E', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should search for content', async () => {
    // Navigate to search
    await element(by.id('search-tab')).tap();
    
    // Enter search query
    await element(by.id('search-input')).typeText('Serial Killer');
    await element(by.id('search-button')).tap();
    
    // Verify results
    await expect(element(by.id('search-results'))).toBeVisible();
    await expect(element(by.text('Serial Killer Documentary'))).toBeVisible();
  });
});
```

## Mocking Strategies

### API Mocking with MSW

```typescript
// __tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('*/api/content/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Mock Content',
      // ... other fields
    });
  }),
  
  // Error scenarios
  http.get('*/api/error', () => {
    return new HttpResponse(null, { status: 500 });
  }),
];
```

### Component Mocking

```typescript
// Mock expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
}));

// Mock navigation
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));
```

### Platform-Specific Mocking

```typescript
// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios', // or 'android', 'web'
  Version: 14,
  select: (objs) => objs.ios,
}));
```

## Coverage Goals

### Minimum Coverage Thresholds

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    },
    "critical": {
      "./components/ContentWarning": {
        "branches": 95,
        "functions": 95,
        "lines": 95,
        "statements": 95
      },
      "./screens/Onboarding": {
        "branches": 90,
        "functions": 90,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

### Viewing Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage

# Open coverage report
open coverage/lcov-report/index.html
```

## CI/CD Integration

### GitHub Actions Workflow

Our CI/CD pipeline runs the following test suites:

1. **Lint & Type Check**: Code quality and TypeScript validation
2. **Unit Tests**: Component and utility tests with coverage
3. **Integration Tests**: Screen and navigation tests
4. **E2E Tests**: Platform-specific end-to-end tests
5. **Accessibility Tests**: WCAG compliance validation
6. **Performance Tests**: Bundle size and runtime performance
7. **Security Scan**: Dependency vulnerabilities

### Pre-commit Hooks

```bash
# Install husky
npm install --save-dev husky

# Setup pre-commit hooks
npx husky add .husky/pre-commit "npm run lint"
npx husky add .husky/pre-commit "npm run test:unit"
```

## Best Practices

### Test Organization

1. **Descriptive Names**: Use clear, descriptive test names
2. **AAA Pattern**: Arrange, Act, Assert structure
3. **One Assertion**: Focus on single behavior per test
4. **DRY Principles**: Extract common setup to utilities

### True Crime Specific Testing

1. **Content Warnings**: Always test warning display and dismissal
2. **Privacy Features**: Verify privacy settings are respected
3. **Sensitive Content**: Test content filtering and preferences
4. **Age Restrictions**: Validate age-appropriate content filtering

### Accessibility Testing

1. **Screen Reader**: Test with VoiceOver (iOS) and TalkBack (Android)
2. **Keyboard Navigation**: Ensure all features are keyboard accessible
3. **Color Contrast**: Validate WCAG AA compliance
4. **Focus Management**: Test focus indicators and trap handling

### Performance Testing

1. **List Rendering**: Test with large datasets (100+ items)
2. **Image Loading**: Verify lazy loading and caching
3. **Animation Performance**: Ensure 60 FPS for animations
4. **Memory Leaks**: Monitor memory usage in long-running tests

### Common Pitfalls to Avoid

1. **Avoid Testing Implementation**: Focus on behavior, not internals
2. **Don't Mock Everything**: Keep mocks minimal and realistic
3. **Avoid Brittle Selectors**: Use testID over text/class selectors
4. **Don't Skip Cleanup**: Always clean up after tests
5. **Avoid Flaky Tests**: Use proper waits and assertions

## Troubleshooting

### Common Issues

#### Tests Failing on CI but Passing Locally

```bash
# Run tests in CI mode locally
npm run test:ci

# Check Node version matches CI
node --version

# Clear cache
npm run clean
npm install
```

#### Detox Build Failures

```bash
# Clean Detox build
detox clean-framework-cache
detox build-framework-cache

# Rebuild app
npm run e2e:build -- --configuration ios.sim.debug
```

#### MSW Not Intercepting Requests

```typescript
// Ensure server is started in setup
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Detox Documentation](https://wix.github.io/Detox/)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Contributing

When adding new features:

1. Write tests first (TDD approach encouraged)
2. Ensure all tests pass before submitting PR
3. Maintain or improve coverage percentages
4. Update this documentation for new testing patterns
5. Add E2E tests for critical user journeys

---

Last Updated: December 2024
Version: 1.0.0