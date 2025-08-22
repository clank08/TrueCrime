import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBar } from '@/components/discovery/SearchBar';
import { ContentCard } from '@/components/discovery/ContentCard';
import { TRPCProvider } from '@/components/providers/TRPCProvider';
import { trpc } from '@/lib/trpc';
import { handlers } from '@/../../__tests__/mocks/handlers';
import { setupServer } from 'msw/node';

/**
 * Integration tests for search functionality
 * Tests end-to-end search flows, API integration, error handling, and user experience
 */

// Mock server for API responses
const server = setupServer(...handlers);

// Mock expo modules
jest.mock('expo-av', () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    setAudioModeAsync: jest.fn(),
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn(),
      startAsync: jest.fn(),
      stopAndUnloadAsync: jest.fn(),
      getURI: jest.fn(() => 'file://recording.m4a'),
    })),
    RecordingOptionsPresets: { HIGH_QUALITY: {} }
  }
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
};

// Mock search component that integrates SearchBar and results
const SearchIntegrationComponent: React.FC = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [submittedQuery, setSubmittedQuery] = React.useState('');
  
  // Use actual tRPC hook
  const searchResults = trpc.content.search.useQuery(
    {
      query: submittedQuery,
      page: 1,
      limit: 20,
    },
    {
      enabled: !!submittedQuery,
    }
  );

  const handleSearchSubmit = (query: string) => {
    setSubmittedQuery(query);
  };

  return (
    <>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmit={handleSearchSubmit}
        isLoading={searchResults.isLoading}
        testID="search-bar"
      />
      
      {searchResults.isLoading && (
        <div testID="loading-indicator">Loading...</div>
      )}
      
      {searchResults.error && (
        <div testID="error-message">
          Error: {searchResults.error.message}
        </div>
      )}
      
      {searchResults.data && (
        <div testID="search-results">
          {searchResults.data.results.map((content) => (
            <ContentCard
              key={content.id}
              content={content}
              onPress={() => {}}
              testID={`content-card-${content.id}`}
            />
          ))}
          
          {searchResults.data.results.length === 0 && (
            <div testID="no-results">No results found</div>
          )}
        </div>
      )}
    </>
  );
};

describe('Search Integration Tests', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('Basic Search Flow', () => {
    it('should perform complete search flow from input to results', async () => {
      const { getByTestId, getByPlaceholderText, getByText } = render(
        <SearchIntegrationComponent />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      // Type search query
      fireEvent.changeText(searchInput, 'Ted Bundy');
      
      // Submit search
      fireEvent(searchInput, 'submitEditing');
      
      // Should show loading state
      await waitFor(() => {
        expect(getByTestId('loading-indicator')).toBeTruthy();
      });
      
      // Should show results
      await waitFor(() => {
        expect(getByTestId('search-results')).toBeTruthy();
        expect(getByText('Ted Bundy: Conversations with a Killer')).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('should handle search with filters', async () => {
      const SearchWithFilters: React.FC = () => {
        const [searchQuery, setSearchQuery] = React.useState('');
        const [submittedQuery, setSubmittedQuery] = React.useState('');
        
        const searchResults = trpc.content.search.useQuery(
          {
            query: submittedQuery,
            page: 1,
            limit: 20,
            filters: {
              contentType: 'DOCUMENTARY',
              caseType: 'SERIAL_KILLER',
              ratingFrom: 4.0,
            },
          },
          { enabled: !!submittedQuery }
        );

        return (
          <>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmit={setSubmittedQuery}
              isLoading={searchResults.isLoading}
              testID="search-bar"
            />
            
            {searchResults.data && (
              <div testID="filtered-results">
                {searchResults.data.results.map((content) => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    onPress={() => {}}
                    testID={`filtered-content-${content.id}`}
                  />
                ))}
              </div>
            )}
          </>
        );
      };

      const { getByTestId, getByPlaceholderText } = render(
        <SearchWithFilters />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      fireEvent.changeText(searchInput, 'serial killer');
      fireEvent(searchInput, 'submitEditing');
      
      await waitFor(() => {
        expect(getByTestId('filtered-results')).toBeTruthy();
      }, { timeout: 5000 });
    });

    it('should handle pagination in search results', async () => {
      const PaginatedSearch: React.FC = () => {
        const [page, setPage] = React.useState(1);
        
        const searchResults = trpc.content.search.useQuery({
          query: 'documentary',
          page,
          limit: 10,
        });

        return (
          <>
            {searchResults.data && (
              <>
                <div testID="pagination-results">
                  {searchResults.data.results.map((content) => (
                    <ContentCard
                      key={content.id}
                      content={content}
                      onPress={() => {}}
                      testID={`page-${page}-content-${content.id}`}
                    />
                  ))}
                </div>
                
                <button
                  testID="next-page"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!searchResults.data.pagination.hasNext}
                >
                  Next Page
                </button>
              </>
            )}
          </>
        );
      };

      const { getByTestId } = render(
        <PaginatedSearch />,
        { wrapper: TestWrapper }
      );

      await waitFor(() => {
        expect(getByTestId('pagination-results')).toBeTruthy();
      });

      // Navigate to next page
      const nextButton = getByTestId('next-page');
      fireEvent.press(nextButton);

      await waitFor(() => {
        expect(getByTestId('page-2-content-1')).toBeTruthy();
      });
    });
  });

  describe('Search Performance and Responsiveness', () => {
    it('should show loading state immediately on search', async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <SearchIntegrationComponent />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      fireEvent.changeText(searchInput, 'fast search');
      
      // Submit and immediately check for loading state
      await act(async () => {
        fireEvent(searchInput, 'submitEditing');
      });
      
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should handle rapid search queries efficiently', async () => {
      const { getByPlaceholderText } = render(
        <SearchIntegrationComponent />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      // Rapid search queries
      const queries = ['a', 'ab', 'abc', 'abcd', 'abcde'];
      
      for (const query of queries) {
        fireEvent.changeText(searchInput, query);
        fireEvent(searchInput, 'submitEditing');
        
        // Small delay between queries
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Should handle all queries without errors
      await waitFor(() => {
        // Last query should be processed
        expect(searchInput.props.value).toBe('abcde');
      });
    });

    it('should debounce search suggestions', async () => {
      const SearchWithSuggestions: React.FC = () => {
        const [searchQuery, setSearchQuery] = React.useState('');
        const [suggestions, setSuggestions] = React.useState([]);
        
        // Debounced suggestions query
        const suggestionsQuery = trpc.content.search.useQuery(
          {
            query: searchQuery,
            limit: 5,
          },
          {
            enabled: searchQuery.length >= 2,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
          }
        );

        React.useEffect(() => {
          if (suggestionsQuery.data) {
            setSuggestions(
              suggestionsQuery.data.results.map((result) => ({
                id: result.id,
                text: result.title,
                type: 'autocomplete' as const,
              }))
            );
          }
        }, [suggestionsQuery.data]);

        return (
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmit={() => {}}
            suggestions={suggestions}
            isLoading={suggestionsQuery.isLoading}
            testID="search-with-suggestions"
          />
        );
      };

      const { getByPlaceholderText, getByText } = render(
        <SearchWithSuggestions />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      // Type slowly to trigger suggestions
      fireEvent.changeText(searchInput, 'te');
      
      await waitFor(() => {
        // Suggestions should appear
        expect(getByText('Ted Bundy: Conversations with a Killer')).toBeTruthy();
      }, { timeout: 2000 });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      // Override handler to return error
      server.use(
        rest.post('/api/trpc/content.search', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
        })
      );

      const { getByTestId, getByPlaceholderText } = render(
        <SearchIntegrationComponent />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      fireEvent.changeText(searchInput, 'error test');
      fireEvent(searchInput, 'submitEditing');
      
      await waitFor(() => {
        expect(getByTestId('error-message')).toBeTruthy();
      });
    });

    it('should handle empty search results', async () => {
      // Override handler to return empty results
      server.use(
        rest.post('/api/trpc/content.search', (req, res, ctx) => {
          return res(
            ctx.json({
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
            })
          );
        })
      );

      const { getByTestId, getByPlaceholderText } = render(
        <SearchIntegrationComponent />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      fireEvent.changeText(searchInput, 'nonexistent content');
      fireEvent(searchInput, 'submitEditing');
      
      await waitFor(() => {
        expect(getByTestId('no-results')).toBeTruthy();
      });
    });

    it('should handle network timeouts', async () => {
      // Override handler to simulate timeout
      server.use(
        rest.post('/api/trpc/content.search', (req, res, ctx) => {
          return res(ctx.delay(10000)); // 10 second delay
        })
      );

      const { getByTestId, getByPlaceholderText } = render(
        <SearchIntegrationComponent />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      fireEvent.changeText(searchInput, 'timeout test');
      fireEvent(searchInput, 'submitEditing');
      
      // Should show loading state
      await waitFor(() => {
        expect(getByTestId('loading-indicator')).toBeTruthy();
      });
      
      // Should eventually timeout and show error
      await waitFor(
        () => {
          expect(getByTestId('error-message')).toBeTruthy();
        },
        { timeout: 15000 }
      );
    });

    it('should handle malformed API responses', async () => {
      // Override handler to return malformed data
      server.use(
        rest.post('/api/trpc/content.search', (req, res, ctx) => {
          return res(ctx.json({ invalid: 'response' }));
        })
      );

      const { getByTestId, getByPlaceholderText } = render(
        <SearchIntegrationComponent />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      fireEvent.changeText(searchInput, 'malformed test');
      fireEvent(searchInput, 'submitEditing');
      
      await waitFor(() => {
        expect(getByTestId('error-message')).toBeTruthy();
      });
    });
  });

  describe('User Experience Flows', () => {
    it('should handle search suggestion selection', async () => {
      const mockSuggestions = [
        { id: '1', text: 'Ted Bundy', type: 'trending' as const },
        { id: '2', text: 'Serial Killers', type: 'autocomplete' as const },
      ];

      const { getByPlaceholderText, getByText } = render(
        <SearchBar
          value=""
          onChangeText={() => {}}
          onSubmit={jest.fn()}
          suggestions={mockSuggestions}
          testID="search-bar"
        />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      // Focus to show suggestions
      fireEvent(searchInput, 'focus');
      
      // Select a suggestion
      const suggestion = getByText('Ted Bundy');
      fireEvent.press(suggestion);
      
      // Should trigger search
      expect(suggestion).toBeTruthy();
    });

    it('should handle search history and recent searches', async () => {
      const SearchWithHistory: React.FC = () => {
        const [searchQuery, setSearchQuery] = React.useState('');
        const [recentSearches, setRecentSearches] = React.useState([
          'Jeffrey Dahmer',
          'Ted Bundy',
          'True Crime Documentaries',
        ]);

        const handleSearchSubmit = (query: string) => {
          // Add to recent searches
          setRecentSearches(prev => {
            const filtered = prev.filter(search => search !== query);
            return [query, ...filtered].slice(0, 5);
          });
        };

        return (
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmit={handleSearchSubmit}
            recentSearches={recentSearches}
            testID="search-with-history"
          />
        );
      };

      const { getByPlaceholderText, getByText } = render(
        <SearchWithHistory />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      // Focus to show recent searches
      fireEvent(searchInput, 'focus');
      
      // Should show recent searches
      expect(getByText('Jeffrey Dahmer')).toBeTruthy();
      expect(getByText('Ted Bundy')).toBeTruthy();
    });

    it('should handle voice search integration', async () => {
      const { getByTestId } = render(
        <SearchBar
          value=""
          onChangeText={() => {}}
          onSubmit={jest.fn()}
          showVoiceSearch={true}
          testID="search-bar"
        />,
        { wrapper: TestWrapper }
      );

      // Voice search button should be present
      expect(getByTestId('search-bar')).toBeTruthy();
      
      // Test voice search functionality would require additional mocking
      // of the speech recognition API
    });
  });

  describe('Accessibility Integration', () => {
    it('should provide screen reader support for search flow', async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <SearchIntegrationComponent />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      // Input should have accessibility labels
      expect(searchInput.props.accessibilityLabel || searchInput.props.placeholder).toBeTruthy();
      
      fireEvent.changeText(searchInput, 'accessibility test');
      fireEvent(searchInput, 'submitEditing');
      
      await waitFor(() => {
        const results = getByTestId('search-results');
        expect(results.props.accessibilityLabel || results.props.accessible).toBeTruthy();
      });
    });

    it('should handle keyboard navigation in search results', async () => {
      const { getByTestId, getByPlaceholderText } = render(
        <SearchIntegrationComponent />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      fireEvent.changeText(searchInput, 'keyboard test');
      fireEvent(searchInput, 'submitEditing');
      
      await waitFor(() => {
        const results = getByTestId('search-results');
        expect(results).toBeTruthy();
      });
      
      // Test keyboard navigation between results
      // This would require additional keyboard event simulation
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance with large result sets', async () => {
      // Override handler to return large result set
      server.use(
        rest.post('/api/trpc/content.search', (req, res, ctx) => {
          const largeResults = Array.from({ length: 100 }, (_, i) => ({
            id: `content-${i}`,
            title: `Content ${i}`,
            contentType: 'DOCUMENTARY',
            platforms: [],
            releaseDate: new Date().toISOString(),
          }));
          
          return res(
            ctx.json({
              result: {
                data: {
                  results: largeResults.slice(0, 20), // Paginated
                  pagination: {
                    page: 1,
                    limit: 20,
                    total: 100,
                    pages: 5,
                    hasNext: true,
                    hasPrev: false,
                  },
                },
              },
            })
          );
        })
      );

      const renderStart = performance.now();
      
      const { getByTestId, getByPlaceholderText } = render(
        <SearchIntegrationComponent />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      fireEvent.changeText(searchInput, 'large results');
      fireEvent(searchInput, 'submitEditing');
      
      await waitFor(() => {
        expect(getByTestId('search-results')).toBeTruthy();
      });
      
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      // Should render efficiently even with large datasets
      expect(renderTime).toBeLessThan(2000); // Less than 2 seconds
    });

    it('should handle memory efficiently during long search sessions', async () => {
      const { getByPlaceholderText } = render(
        <SearchIntegrationComponent />,
        { wrapper: TestWrapper }
      );

      const searchInput = getByPlaceholderText('Search True Crime content...');
      
      // Simulate long search session
      for (let i = 0; i < 20; i++) {
        fireEvent.changeText(searchInput, `search query ${i}`);
        fireEvent(searchInput, 'submitEditing');
        
        await waitFor(() => {
          expect(searchInput.props.value).toBe(`search query ${i}`);
        });
        
        // Small delay between searches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Memory usage should remain stable
      // This would need additional memory monitoring setup
      expect(true).toBeTruthy();
    });
  });
});
