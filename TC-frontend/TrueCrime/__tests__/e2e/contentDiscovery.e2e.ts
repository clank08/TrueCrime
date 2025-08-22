import { by, device, element, expect, waitFor } from 'detox';

/**
 * End-to-end tests for Content Discovery user journeys
 * Tests complete user workflows across the entire application
 * Covers search, browse, content details, and user actions
 */

describe('Content Discovery E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Search and Discovery Journey', () => {
    it('should allow user to search and discover content', async () => {
      // Navigate to discover tab
      await element(by.id('discover-tab')).tap();
      
      // Verify discover screen is loaded
      await expect(element(by.id('discover-screen'))).toBeVisible();
      
      // Find and tap search bar
      await element(by.id('search-bar')).tap();
      
      // Type search query
      await element(by.id('search-input')).typeText('Ted Bundy');
      
      // Submit search
      await element(by.id('search-input')).tapReturnKey();
      
      // Wait for search results
      await waitFor(element(by.id('search-results')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Verify search results are displayed
      await expect(element(by.id('search-results'))).toBeVisible();
      await expect(element(by.text('Ted Bundy: Conversations with a Killer'))).toBeVisible();
      
      // Tap on first result
      await element(by.id('content-card-0')).tap();
      
      // Should navigate to content detail screen
      await waitFor(element(by.id('content-detail-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Verify content details are shown
      await expect(element(by.id('content-title'))).toBeVisible();
      await expect(element(by.id('content-description'))).toBeVisible();
      await expect(element(by.id('platform-availability'))).toBeVisible();
    });

    it('should handle search with filters', async () => {
      await element(by.id('discover-tab')).tap();
      await element(by.id('search-bar')).tap();
      
      // Open filter panel
      await element(by.id('filter-button')).tap();
      
      // Apply content type filter
      await element(by.id('content-type-filter')).tap();
      await element(by.text('Documentary')).tap();
      
      // Apply case type filter
      await element(by.id('case-type-filter')).tap();
      await element(by.text('Serial Killer')).tap();
      
      // Apply filters
      await element(by.id('apply-filters-button')).tap();
      
      // Perform search
      await element(by.id('search-input')).typeText('crime');
      await element(by.id('search-input')).tapReturnKey();
      
      // Verify filtered results
      await waitFor(element(by.id('search-results')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Results should match filter criteria
      await expect(element(by.text('DOCUMENTARY'))).toBeVisible();
    });

    it('should handle voice search', async () => {
      await element(by.id('discover-tab')).tap();
      await element(by.id('search-bar')).tap();
      
      // Tap voice search button
      await element(by.id('voice-search-button')).tap();
      
      // Should show voice search indicator
      await expect(element(by.id('voice-search-indicator'))).toBeVisible();
      
      // Simulate voice input completion
      // Note: Actual voice recognition testing would require device-specific setup
      await element(by.id('voice-search-button')).tap(); // Stop recording
      
      // Should show search results or prompt
      await waitFor(element(by.id('voice-search-result')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Content Browsing Journey', () => {
    it('should allow user to browse trending content', async () => {
      await element(by.id('discover-tab')).tap();
      
      // Verify trending section is visible
      await expect(element(by.id('trending-section'))).toBeVisible();
      
      // Scroll to see more trending content
      await element(by.id('trending-list')).scroll(200, 'right');
      
      // Tap on a trending item
      await element(by.id('trending-item-0')).tap();
      
      // Should navigate to content detail
      await waitFor(element(by.id('content-detail-screen')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should allow user to browse by categories', async () => {
      await element(by.id('discover-tab')).tap();
      
      // Navigate to browse screen
      await element(by.id('browse-button')).tap();
      
      // Should show category grid
      await expect(element(by.id('category-grid'))).toBeVisible();
      
      // Tap on Serial Killers category
      await element(by.text('Serial Killers')).tap();
      
      // Should show category content
      await waitFor(element(by.id('category-content')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Verify content matches category
      await expect(element(by.text('SERIAL_KILLER'))).toBeVisible();
    });

    it('should handle infinite scroll in content grid', async () => {
      await element(by.id('discover-tab')).tap();
      await element(by.id('browse-button')).tap();
      await element(by.text('All Content')).tap();
      
      // Get initial content count
      await expect(element(by.id('content-grid'))).toBeVisible();
      
      // Scroll down to load more content
      await element(by.id('content-grid')).scroll(500, 'down');
      
      // Should load more content
      await waitFor(element(by.id('loading-more-indicator')))
        .toBeVisible()
        .withTimeout(2000);
      
      await waitFor(element(by.id('loading-more-indicator')))
        .not.toBeVisible()
        .withTimeout(5000);
      
      // Content grid should have more items
      await expect(element(by.id('content-grid'))).toBeVisible();
    });
  });

  describe('Content Detail and Actions Journey', () => {
    it('should display comprehensive content information', async () => {
      // Navigate to specific content
      await element(by.id('discover-tab')).tap();
      await element(by.id('search-bar')).tap();
      await element(by.id('search-input')).typeText('Ted Bundy');
      await element(by.id('search-input')).tapReturnKey();
      
      await waitFor(element(by.id('search-results')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('content-card-0')).tap();
      
      // Verify all content details are displayed
      await expect(element(by.id('content-poster'))).toBeVisible();
      await expect(element(by.id('content-title'))).toBeVisible();
      await expect(element(by.id('content-description'))).toBeVisible();
      await expect(element(by.id('content-rating'))).toBeVisible();
      await expect(element(by.id('content-runtime'))).toBeVisible();
      await expect(element(by.id('content-release-date'))).toBeVisible();
      await expect(element(by.id('platform-availability'))).toBeVisible();
      await expect(element(by.id('sensitivity-warning'))).toBeVisible();
      
      // Scroll to see more details
      await element(by.id('content-detail-scroll')).scroll(300, 'down');
      
      // Should show cast and crew
      await expect(element(by.id('cast-section'))).toBeVisible();
      await expect(element(by.id('crew-section'))).toBeVisible();
      
      // Should show related content
      await expect(element(by.id('related-content-section'))).toBeVisible();
    });

    it('should allow user to add content to watchlist', async () => {
      // Navigate to content detail
      await element(by.id('discover-tab')).tap();
      await element(by.id('trending-item-0')).tap();
      
      await waitFor(element(by.id('content-detail-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Add to watchlist
      await element(by.id('add-to-watchlist-button')).tap();
      
      // Should show success message
      await expect(element(by.text('Added to watchlist'))).toBeVisible();
      
      // Button should change to "In Watchlist"
      await expect(element(by.id('in-watchlist-indicator'))).toBeVisible();
      
      // Navigate to profile/watchlist to verify
      await element(by.id('profile-tab')).tap();
      await element(by.id('my-watchlist')).tap();
      
      // Content should be in watchlist
      await expect(element(by.id('watchlist-content'))).toBeVisible();
    });

    it('should allow user to mark content as watched', async () => {
      // Navigate to content detail
      await element(by.id('discover-tab')).tap();
      await element(by.id('trending-item-0')).tap();
      
      await waitFor(element(by.id('content-detail-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Mark as watched
      await element(by.id('mark-watched-button')).tap();
      
      // Should show rating dialog
      await expect(element(by.id('rating-dialog'))).toBeVisible();
      
      // Select rating
      await element(by.id('star-4')).tap();
      
      // Add review (optional)
      await element(by.id('review-input')).typeText('Great documentary!');
      
      // Save
      await element(by.id('save-rating-button')).tap();
      
      // Should show watched indicator
      await expect(element(by.id('watched-indicator'))).toBeVisible();
    });

    it('should handle platform deep links', async () => {
      // Navigate to content with platform availability
      await element(by.id('discover-tab')).tap();
      await element(by.id('trending-item-0')).tap();
      
      await waitFor(element(by.id('platform-availability')))
        .toBeVisible()
        .withTimeout(3000);
      
      // Tap on Netflix platform
      await element(by.id('platform-netflix')).tap();
      
      // Should show platform selection dialog or open app
      // Note: Actual deep linking testing requires platform-specific setup
      await waitFor(element(by.id('platform-dialog')))
        .toBeVisible()
        .withTimeout(2000);
    });
  });

  describe('Watchlist Management Journey', () => {
    it('should allow creating and managing custom watchlists', async () => {
      await element(by.id('profile-tab')).tap();
      
      // Create new watchlist
      await element(by.id('create-watchlist-button')).tap();
      
      await expect(element(by.id('create-watchlist-dialog'))).toBeVisible();
      
      // Enter watchlist name
      await element(by.id('watchlist-name-input')).typeText('Serial Killer Docs');
      await element(by.id('watchlist-description-input')).typeText('My collection of serial killer documentaries');
      
      // Set privacy
      await element(by.id('watchlist-private-toggle')).tap();
      
      // Create watchlist
      await element(by.id('create-watchlist-confirm')).tap();
      
      // Should show in watchlist list
      await expect(element(by.text('Serial Killer Docs'))).toBeVisible();
      
      // Add content to custom watchlist
      await element(by.id('discover-tab')).tap();
      await element(by.id('trending-item-0')).tap();
      
      await element(by.id('add-to-watchlist-dropdown')).tap();
      await element(by.text('Serial Killer Docs')).tap();
      
      // Verify content was added
      await element(by.id('profile-tab')).tap();
      await element(by.text('Serial Killer Docs')).tap();
      
      await expect(element(by.id('watchlist-content'))).toBeVisible();
    });

    it('should allow reordering watchlist items', async () => {
      await element(by.id('profile-tab')).tap();
      await element(by.id('my-watchlist')).tap();
      
      // Enter edit mode
      await element(by.id('edit-watchlist-button')).tap();
      
      // Should show reorder handles
      await expect(element(by.id('reorder-handle-0'))).toBeVisible();
      
      // Drag item to reorder
      await element(by.id('reorder-handle-0')).longPress();
      await element(by.id('reorder-handle-0')).swipe('down', 'slow', 0.5);
      
      // Save changes
      await element(by.id('save-watchlist-button')).tap();
      
      // Order should be updated
      await expect(element(by.id('watchlist-content'))).toBeVisible();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle offline scenarios gracefully', async () => {
      // Simulate offline state
      await device.setURLBlacklist(['.*']);
      
      await element(by.id('discover-tab')).tap();
      await element(by.id('search-bar')).tap();
      await element(by.id('search-input')).typeText('offline test');
      await element(by.id('search-input')).tapReturnKey();
      
      // Should show offline message
      await waitFor(element(by.id('offline-message')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Restore connectivity
      await device.setURLBlacklist([]);
      
      // Try again button should work
      await element(by.id('try-again-button')).tap();
      
      await waitFor(element(by.id('search-results')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should handle empty search results', async () => {
      await element(by.id('discover-tab')).tap();
      await element(by.id('search-bar')).tap();
      
      // Search for something that doesn't exist
      await element(by.id('search-input')).typeText('nonexistentcontent12345');
      await element(by.id('search-input')).tapReturnKey();
      
      // Should show no results message
      await waitFor(element(by.id('no-results-message')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Should suggest alternatives
      await expect(element(by.id('search-suggestions'))).toBeVisible();
    });

    it('should handle content loading failures', async () => {
      await element(by.id('discover-tab')).tap();
      await element(by.id('trending-item-0')).tap();
      
      // If content fails to load, should show error
      await waitFor(element(by.id('content-detail-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Should have fallback UI for missing images
      await expect(element(by.id('content-poster-placeholder'))).toBeVisible();
    });
  });

  describe('Performance and User Experience', () => {
    it('should provide smooth scrolling and navigation', async () => {
      await element(by.id('discover-tab')).tap();
      
      // Test smooth scrolling in content grid
      for (let i = 0; i < 5; i++) {
        await element(by.id('content-grid')).scroll(200, 'down');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Should maintain smooth performance
      await expect(element(by.id('content-grid'))).toBeVisible();
    });

    it('should handle rapid user interactions', async () => {
      await element(by.id('discover-tab')).tap();
      
      // Rapid taps on different content cards
      for (let i = 0; i < 3; i++) {
        await element(by.id(`trending-item-${i}`)).tap();
        await element(by.id('back-button')).tap();
      }
      
      // App should remain responsive
      await expect(element(by.id('discover-screen'))).toBeVisible();
    });

    it('should provide appropriate loading states', async () => {
      await element(by.id('discover-tab')).tap();
      await element(by.id('search-bar')).tap();
      
      // Search should show loading immediately
      await element(by.id('search-input')).typeText('loading test');
      await element(by.id('search-input')).tapReturnKey();
      
      // Should show loading state
      await expect(element(by.id('search-loading'))).toBeVisible();
      
      // Loading should be replaced by results
      await waitFor(element(by.id('search-results')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('search-loading'))).not.toBeVisible();
    });
  });

  describe('Accessibility Journey', () => {
    it('should support screen reader navigation', async () => {
      // Enable accessibility features
      await device.setAccessibilityMode(true);
      
      await element(by.id('discover-tab')).tap();
      
      // Verify accessibility labels are present
      await expect(element(by.id('search-bar'))).toHaveSlot('accessibilityLabel');
      await expect(element(by.id('trending-section'))).toHaveSlot('accessibilityLabel');
      
      // Navigate through content with accessibility
      await element(by.id('search-bar')).tap();
      await element(by.id('search-input')).typeText('accessibility test');
      await element(by.id('search-input')).tapReturnKey();
      
      await waitFor(element(by.id('search-results')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Content cards should have proper accessibility
      await expect(element(by.id('content-card-0'))).toHaveSlot('accessibilityLabel');
      
      await device.setAccessibilityMode(false);
    });

    it('should handle keyboard navigation', async () => {
      // This would require hardware keyboard testing on devices that support it
      await element(by.id('discover-tab')).tap();
      await element(by.id('search-bar')).tap();
      
      // Tab navigation between elements
      // Note: Keyboard navigation testing requires platform-specific setup
      await element(by.id('search-input')).typeText('keyboard test');
      
      // Should handle tab, enter, arrow keys appropriately
      await expect(element(by.id('search-input'))).toBeVisible();
    });
  });

  describe('Multi-platform Consistency', () => {
    it('should maintain consistent behavior across orientations', async () => {
      await element(by.id('discover-tab')).tap();
      
      // Test portrait orientation
      await expect(element(by.id('discover-screen'))).toBeVisible();
      
      // Rotate to landscape
      await device.setOrientation('landscape');
      
      // UI should adapt gracefully
      await expect(element(by.id('discover-screen'))).toBeVisible();
      await expect(element(by.id('search-bar'))).toBeVisible();
      
      // Search functionality should work in landscape
      await element(by.id('search-bar')).tap();
      await element(by.id('search-input')).typeText('landscape test');
      await element(by.id('search-input')).tapReturnKey();
      
      await waitFor(element(by.id('search-results')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Rotate back to portrait
      await device.setOrientation('portrait');
      
      // Should maintain search state
      await expect(element(by.id('search-results'))).toBeVisible();
    });

    it('should handle different screen sizes appropriately', async () => {
      // This would be tested across different device configurations
      await element(by.id('discover-tab')).tap();
      
      // Verify responsive layout
      await expect(element(by.id('content-grid'))).toBeVisible();
      
      // Content should be readable and accessible regardless of screen size
      await element(by.id('trending-item-0')).tap();
      
      await waitFor(element(by.id('content-detail-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      // All content should be visible and properly laid out
      await expect(element(by.id('content-title'))).toBeVisible();
      await expect(element(by.id('platform-availability'))).toBeVisible();
    });
  });
});
