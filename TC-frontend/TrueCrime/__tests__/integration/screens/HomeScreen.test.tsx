import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomeScreen from '@/app/(tabs)/index';
import { server } from '@/jest-setup';
import { http, HttpResponse } from 'msw';

// Create a wrapper with all necessary providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('HomeScreen Integration', () => {
  const Wrapper = createWrapper();

  describe('Initial Load', () => {
    it('should render the home screen with correct layout', async () => {
      render(<HomeScreen />, { wrapper: Wrapper });
      
      // Check for main sections
      await waitFor(() => {
        expect(screen.getByText(/Welcome to/i)).toBeTruthy();
        expect(screen.getByText(/True Crime Tracker/i)).toBeTruthy();
      });
    });

    it('should display loading state while fetching content', () => {
      render(<HomeScreen />, { wrapper: Wrapper });
      
      // Should show loading indicators initially
      expect(screen.queryByTestId('loading-indicator')).toBeTruthy();
    });

    it('should fetch and display recommended content', async () => {
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        expect(screen.getByText(/Recommended for You/i)).toBeTruthy();
      });
      
      // Check for content cards
      await waitFor(() => {
        expect(screen.getAllByTestId('content-card')).toHaveLength(expect.any(Number));
      });
    });

    it('should fetch and display trending content', async () => {
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        expect(screen.getByText(/Trending Now/i)).toBeTruthy();
      });
    });
  });

  describe('User Interactions', () => {
    it('should navigate to content details when card is pressed', async () => {
      const { getByTestId } = render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        const contentCard = getByTestId('content-card-0');
        fireEvent.press(contentCard);
      });
      
      // Verify navigation occurred
      await waitFor(() => {
        expect(screen.queryByTestId('content-detail')).toBeTruthy();
      });
    });

    it('should add content to watchlist when button is pressed', async () => {
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        const addButton = screen.getByTestId('add-watchlist-0');
        fireEvent.press(addButton);
      });
      
      // Check for success feedback
      await waitFor(() => {
        expect(screen.getByText(/Added to Watchlist/i)).toBeTruthy();
      });
    });

    it('should handle pull-to-refresh', async () => {
      const { getByTestId } = render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        const scrollView = getByTestId('home-scroll-view');
        fireEvent.scroll(scrollView, {
          nativeEvent: {
            contentOffset: { y: -100 },
          },
        });
      });
      
      // Check for refresh indicator
      expect(screen.queryByTestId('refresh-control')).toBeTruthy();
    });

    it('should navigate to search when search bar is pressed', async () => {
      const { getByTestId } = render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        const searchBar = getByTestId('search-bar');
        fireEvent.press(searchBar);
      });
      
      // Should navigate to search tab
      await waitFor(() => {
        expect(screen.queryByTestId('search-screen')).toBeTruthy();
      });
    });
  });

  describe('Content Categories', () => {
    it('should display different content categories', async () => {
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        expect(screen.getByText(/Serial Killers/i)).toBeTruthy();
        expect(screen.getByText(/Cold Cases/i)).toBeTruthy();
        expect(screen.getByText(/Documentaries/i)).toBeTruthy();
        expect(screen.getByText(/New Releases/i)).toBeTruthy();
      });
    });

    it('should navigate to category view when category is selected', async () => {
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        const categoryButton = screen.getByText(/Serial Killers/i);
        fireEvent.press(categoryButton);
      });
      
      // Should show filtered content
      await waitFor(() => {
        expect(screen.getByText(/Serial Killers Content/i)).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when content fetch fails', async () => {
      // Override handler to return error
      server.use(
        http.get('*/api/content', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );
      
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/i)).toBeTruthy();
        expect(screen.getByText(/Try Again/i)).toBeTruthy();
      });
    });

    it('should retry fetch when retry button is pressed', async () => {
      server.use(
        http.get('*/api/content', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );
      
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        const retryButton = screen.getByText(/Try Again/i);
        fireEvent.press(retryButton);
      });
      
      // Should show loading state again
      expect(screen.queryByTestId('loading-indicator')).toBeTruthy();
    });

    it('should handle network timeout gracefully', async () => {
      server.use(
        http.get('*/api/content', async () => {
          await new Promise(resolve => setTimeout(resolve, 10000));
          return new HttpResponse(null, { status: 200 });
        })
      );
      
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        expect(screen.getByText(/Taking longer than expected/i)).toBeTruthy();
      }, { timeout: 5000 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', async () => {
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Home Screen/i)).toBeTruthy();
        expect(screen.getByLabelText(/Search for content/i)).toBeTruthy();
        expect(screen.getByLabelText(/Add to watchlist/i)).toBeTruthy();
      });
    });

    it('should announce screen changes to screen readers', async () => {
      const { getByTestId } = render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        const announcement = getByTestId('screen-announcement');
        expect(announcement.props.accessibilityLiveRegion).toBe('polite');
      });
    });

    it('should support keyboard navigation on web', async () => {
      // Mock platform as web
      jest.spyOn(require('react-native').Platform, 'OS', 'get').mockReturnValue('web');
      
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        const focusableElements = screen.getAllByTestId(/focusable-/);
        expect(focusableElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Content Warnings', () => {
    it('should display content warnings for sensitive content', async () => {
      server.use(
        http.get('*/api/content', () => {
          return HttpResponse.json({
            data: [{
              id: '1',
              title: 'Test Content',
              contentWarnings: ['graphic violence', 'disturbing imagery'],
              // ... other properties
            }],
          });
        })
      );
      
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        expect(screen.getByText(/Content Warning/i)).toBeTruthy();
        expect(screen.getByText(/graphic violence/i)).toBeTruthy();
      });
    });

    it('should allow user to acknowledge content warnings', async () => {
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        const acknowledgeButton = screen.getByText(/I Understand/i);
        fireEvent.press(acknowledgeButton);
      });
      
      // Warning should be dismissed
      await waitFor(() => {
        expect(screen.queryByText(/Content Warning/i)).toBeFalsy();
      });
    });
  });

  describe('Performance', () => {
    it('should lazy load images', async () => {
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        const images = screen.getAllByTestId(/content-image-/);
        images.forEach(image => {
          expect(image.props.source).toBeDefined();
          expect(image.props.resizeMode).toBe('cover');
        });
      });
    });

    it('should virtualize long lists', async () => {
      // Mock a large dataset
      server.use(
        http.get('*/api/content', () => {
          const largeDataset = Array.from({ length: 100 }, (_, i) => ({
            id: `content-${i}`,
            title: `Content ${i}`,
            // ... other properties
          }));
          return HttpResponse.json({ data: largeDataset });
        })
      );
      
      render(<HomeScreen />, { wrapper: Wrapper });
      
      await waitFor(() => {
        const list = screen.getByTestId('content-list');
        expect(list.props.removeClippedSubviews).toBe(true);
        expect(list.props.maxToRenderPerBatch).toBeDefined();
      });
    });
  });
});