import Constants from 'expo-constants';

interface AppConfig {
  // API Configuration
  apiUrl: string;
  apiTimeout: number;
  
  // Authentication
  authTokenKey: string;
  refreshTokenKey: string;
  sessionKey: string;
  tokenRefreshThreshold: number; // milliseconds before expiry to refresh
  
  // App Settings
  appName: string;
  appVersion: string;
  buildNumber: string;
  
  // Feature Flags
  enableSocialLogin: boolean;
  enablePushNotifications: boolean;
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
  
  // UI Configuration
  defaultTheme: 'light' | 'dark';
  animationDuration: {
    short: number;
    medium: number;
    long: number;
  };
  
  // Content Settings
  maxRecommendations: number;
  cacheExpirationTime: number;
  maxRetryAttempts: number;
  
  // Development
  isDevelopment: boolean;
  isProduction: boolean;
  debugMode: boolean;
}

const isDevelopment = __DEV__;
const isProduction = !__DEV__;

export const config: AppConfig = {
  // API Configuration
  apiUrl: isDevelopment 
    ? process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/trpc'
    : process.env.EXPO_PUBLIC_API_URL || 'https://api.truecrime.app/trpc',
  apiTimeout: 30000, // 30 seconds
  
  // Authentication
  authTokenKey: 'access_token',
  refreshTokenKey: 'refresh_token',
  sessionKey: 'session_id',
  tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes
  
  // App Settings
  appName: 'True Crime Tracker',
  appVersion: Constants.expoConfig?.version || '1.0.0',
  buildNumber: Constants.expoConfig?.ios?.buildNumber || 
               Constants.expoConfig?.android?.versionCode?.toString() || '1',
  
  // Feature Flags
  enableSocialLogin: true,
  enablePushNotifications: true,
  enableAnalytics: isProduction,
  enableErrorReporting: isProduction,
  
  // UI Configuration
  defaultTheme: 'dark',
  animationDuration: {
    short: 250,
    medium: 400,
    long: 600,
  },
  
  // Content Settings
  maxRecommendations: 50,
  cacheExpirationTime: 5 * 60 * 1000, // 5 minutes
  maxRetryAttempts: 3,
  
  // Development
  isDevelopment,
  isProduction,
  debugMode: isDevelopment,
};

// Environment-specific configurations
export const environments = {
  development: {
    apiUrl: 'http://localhost:3000/api/trpc',
    debugMode: true,
    enableAnalytics: false,
    enableErrorReporting: false,
  },
  staging: {
    apiUrl: 'https://staging-api.truecrime.app/trpc',
    debugMode: false,
    enableAnalytics: true,
    enableErrorReporting: true,
  },
  production: {
    apiUrl: 'https://api.truecrime.app/trpc',
    debugMode: false,
    enableAnalytics: true,
    enableErrorReporting: true,
  },
};

// Platform-specific configurations
export const platformConfig = {
  ios: {
    statusBarStyle: 'light-content' as const,
    tabBarStyle: {
      position: 'absolute' as const,
      backgroundColor: 'rgba(26, 26, 28, 0.8)',
    },
    hapticFeedback: true,
    blurEffects: true,
  },
  android: {
    statusBarStyle: 'light-content' as const,
    tabBarStyle: {
      backgroundColor: '#2C2C30',
      borderTopColor: '#4A4A52',
      borderTopWidth: 1,
    },
    hapticFeedback: true,
    blurEffects: false,
  },
  web: {
    statusBarStyle: 'dark-content' as const,
    tabBarStyle: {
      backgroundColor: '#2C2C30',
      borderTopColor: '#4A4A52',
      borderTopWidth: 1,
    },
    hapticFeedback: false,
    blurEffects: false,
  },
};

// Content warning settings
export const contentWarningConfig = {
  enabled: true,
  defaultLevel: 'moderate' as 'mild' | 'moderate' | 'severe',
  showByDefault: true,
  allowUserOverride: true,
  categories: {
    mild: {
      color: '#FF8F00',
      label: 'Mild Content',
      description: 'Mature themes and mild violence',
    },
    moderate: {
      color: '#F57C00',
      label: 'Content Warning',
      description: 'Graphic discussions and violence',
    },
    severe: {
      color: '#D32F2F',
      label: 'Strong Warning',
      description: 'Explicit violence and disturbing content',
    },
  },
};

// Authentication settings
export const authConfig = {
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  refreshTokenTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  passwordMinLength: 8,
  passwordRequirements: {
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: false,
  },
  socialProviders: {
    google: {
      enabled: true,
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
    },
    apple: {
      enabled: true,
      // Apple Sign In is configured in app.json
    },
  },
};

// Storage keys
export const storageKeys = {
  authToken: '@truecrime/auth_token',
  refreshToken: '@truecrime/refresh_token',
  userPreferences: '@truecrime/user_preferences',
  onboardingComplete: '@truecrime/onboarding_complete',
  themeSetting: '@truecrime/theme',
  lastAppVersion: '@truecrime/last_version',
  analyticsId: '@truecrime/analytics_id',
} as const;

// Export utility functions
export function getApiUrl(): string {
  return config.apiUrl;
}

export function getStorageKey(key: keyof typeof storageKeys): string {
  return storageKeys[key];
}

export function isFeatureEnabled(feature: keyof AppConfig): boolean {
  return Boolean(config[feature]);
}

export function getAnimationDuration(type: keyof AppConfig['animationDuration']): number {
  return config.animationDuration[type];
}

// Debug logging
export function debugLog(message: string, data?: any): void {
  if (config.debugMode) {
    console.log(`[TrueCrime] ${message}`, data || '');
  }
}

export function debugError(message: string, error?: any): void {
  if (config.debugMode) {
    console.error(`[TrueCrime] ${message}`, error || '');
  }
}