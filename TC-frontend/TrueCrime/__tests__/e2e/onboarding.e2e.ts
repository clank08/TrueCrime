import { device, element, by, expect as detoxExpect, waitFor } from 'detox';

describe('Onboarding Flow E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('First Launch Experience', () => {
    it('should show welcome screen on first launch', async () => {
      await detoxExpect(element(by.id('welcome-screen'))).toBeVisible();
      await detoxExpect(element(by.text('Welcome to True Crime Tracker'))).toBeVisible();
      await detoxExpect(element(by.id('get-started-button'))).toBeVisible();
    });

    it('should navigate through onboarding steps', async () => {
      // Step 1: Welcome
      await element(by.id('get-started-button')).tap();
      
      // Step 2: Account Creation
      await detoxExpect(element(by.id('account-creation-screen'))).toBeVisible();
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('SecurePassword123!');
      await element(by.id('continue-button')).tap();
      
      // Step 3: Content Preferences
      await waitFor(element(by.id('content-preferences-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Select content warnings preference
      await element(by.id('content-warning-high')).tap();
      
      // Select content types
      await element(by.id('content-type-documentaries')).tap();
      await element(by.id('content-type-series')).tap();
      await element(by.id('continue-button')).tap();
      
      // Step 4: Streaming Services
      await waitFor(element(by.id('streaming-services-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Select streaming services
      await element(by.id('service-netflix')).tap();
      await element(by.id('service-hulu')).tap();
      await element(by.id('service-amazon-prime')).tap();
      await element(by.id('continue-button')).tap();
      
      // Step 5: Interests
      await waitFor(element(by.id('interests-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Select interests
      await element(by.id('interest-serial-killers')).tap();
      await element(by.id('interest-cold-cases')).tap();
      await element(by.id('interest-true-crime-documentaries')).tap();
      await element(by.id('continue-button')).tap();
      
      // Step 6: Notifications
      await waitFor(element(by.id('notifications-screen')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('enable-notifications-button')).tap();
      
      // Should arrive at home screen
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Skip Options', () => {
    it('should allow skipping optional steps', async () => {
      await element(by.id('get-started-button')).tap();
      
      // Fill required info
      await element(by.id('email-input')).typeText('skip@example.com');
      await element(by.id('password-input')).typeText('Password123!');
      await element(by.id('continue-button')).tap();
      
      // Skip content preferences
      await waitFor(element(by.id('skip-button')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('skip-button')).tap();
      
      // Skip streaming services
      await waitFor(element(by.id('skip-button')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('skip-button')).tap();
      
      // Skip interests
      await waitFor(element(by.id('skip-button')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('skip-button')).tap();
      
      // Skip notifications
      await waitFor(element(by.id('skip-later-button')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('skip-later-button')).tap();
      
      // Should still arrive at home screen
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Social Login', () => {
    it('should support Google login', async () => {
      await element(by.id('get-started-button')).tap();
      
      await waitFor(element(by.id('google-login-button')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('google-login-button')).tap();
      
      // Mock Google OAuth flow
      // In real E2E, this would open web view
      await waitFor(element(by.text('Continue with Google')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should support Apple login on iOS', async () => {
      if (device.getPlatform() === 'ios') {
        await element(by.id('get-started-button')).tap();
        
        await waitFor(element(by.id('apple-login-button')))
          .toBeVisible()
          .withTimeout(5000);
        
        await element(by.id('apple-login-button')).tap();
        
        // Mock Apple Sign In
        await waitFor(element(by.text('Sign in with Apple ID')))
          .toBeVisible()
          .withTimeout(10000);
      }
    });
  });

  describe('Content Warning Preferences', () => {
    it('should respect content warning settings', async () => {
      // Complete onboarding with high sensitivity
      await element(by.id('get-started-button')).tap();
      await element(by.id('email-input')).typeText('sensitive@example.com');
      await element(by.id('password-input')).typeText('Password123!');
      await element(by.id('continue-button')).tap();
      
      await waitFor(element(by.id('content-warning-high')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('content-warning-high')).tap();
      await element(by.id('continue-button')).tap();
      
      // Skip remaining steps
      for (let i = 0; i < 3; i++) {
        await waitFor(element(by.id('skip-button')))
          .toBeVisible()
          .withTimeout(5000);
        await element(by.id('skip-button')).tap();
      }
      
      // On home screen, verify warnings are shown
      await waitFor(element(by.id('home-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Content with warnings should show warning badges
      await detoxExpect(element(by.id('content-warning-badge')).atIndex(0))
        .toBeVisible();
    });
  });

  describe('Error Handling', () => {
    it('should show error for invalid email', async () => {
      await element(by.id('get-started-button')).tap();
      
      await element(by.id('email-input')).typeText('invalid-email');
      await element(by.id('password-input')).typeText('Password123!');
      await element(by.id('continue-button')).tap();
      
      await detoxExpect(element(by.text('Please enter a valid email address')))
        .toBeVisible();
    });

    it('should show error for weak password', async () => {
      await element(by.id('get-started-button')).tap();
      
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('weak');
      await element(by.id('continue-button')).tap();
      
      await detoxExpect(element(by.text('Password must be at least 8 characters')))
        .toBeVisible();
    });

    it('should handle network errors gracefully', async () => {
      // Simulate offline mode
      await device.setURLBlacklist(['.*']);
      
      await element(by.id('get-started-button')).tap();
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('Password123!');
      await element(by.id('continue-button')).tap();
      
      await detoxExpect(element(by.text('Network error. Please check your connection.')))
        .toBeVisible();
      
      // Restore network
      await device.clearURLBlacklist();
    });
  });

  describe('Progress Persistence', () => {
    it('should save progress when app is backgrounded', async () => {
      await element(by.id('get-started-button')).tap();
      
      // Fill some info
      await element(by.id('email-input')).typeText('persist@example.com');
      await element(by.id('password-input')).typeText('Password123!');
      
      // Background the app
      await device.sendToHome();
      await device.launchApp({ newInstance: false });
      
      // Should restore to same screen with data
      await detoxExpect(element(by.id('account-creation-screen'))).toBeVisible();
      await detoxExpect(element(by.id('email-input'))).toHaveText('persist@example.com');
    });
  });

  describe('Accessibility', () => {
    it('should be navigable with screen reader', async () => {
      // Enable screen reader (platform specific)
      if (device.getPlatform() === 'ios') {
        // iOS VoiceOver simulation
        await element(by.traits(['button']).and(by.label('Get Started'))).tap();
      } else {
        // Android TalkBack simulation
        await element(by.label('Get Started')).tap();
      }
      
      // Verify all elements have accessibility labels
      await detoxExpect(element(by.label('Email address input field'))).toBeVisible();
      await detoxExpect(element(by.label('Password input field'))).toBeVisible();
      await detoxExpect(element(by.label('Continue to next step'))).toBeVisible();
    });

    it('should support large text sizes', async () => {
      // Set large text size
      await device.launchApp({
        languageAndLocale: {
          language: 'en',
          locale: 'en_US'
        },
        // Platform specific accessibility settings
        launchArgs: {
          accessibilityTextSize: 'xxxLarge'
        }
      });
      
      // Verify text is still visible and layout not broken
      await detoxExpect(element(by.id('welcome-screen'))).toBeVisible();
      await detoxExpect(element(by.text('Welcome to True Crime Tracker'))).toBeVisible();
    });
  });
});