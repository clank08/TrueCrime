# NativeWind Integration - Design Tokens

---
title: NativeWind/Tailwind CSS Integration Guide
description: Custom Tailwind configuration and utility classes for True Crime app design system
last-updated: 2025-08-15
version: 1.0
related-files:
  - ../style-guide.md
  - ../components/README.md
  - colors.md
  - typography.md
dependencies:
  - NativeWind v4+ 
  - Tailwind CSS v3+
  - React Native 0.79+
  - Expo SDK 53+
status: approved
---

# NativeWind Integration Guide

This document provides the complete Tailwind CSS configuration and custom utility classes needed to implement the True Crime app design system using NativeWind. The configuration balances the sophisticated visual requirements of True Crime content with accessibility and cross-platform consistency.

## Tailwind Configuration

### Complete tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary palette - sophisticated purple for True Crime brand
        primary: {
          DEFAULT: '#8B4B7F',
          50: '#F3E8F1',
          100: '#E8D1E3',
          200: '#D1A3C7',
          300: '#BA75AB',
          400: '#A3478F',
          500: '#8B4B7F', // Main brand color
          600: '#6B3760',
          700: '#5A2E50',
          800: '#4A2540',
          900: '#391C30',
          light: '#A66B9E',
          dark: '#6B3760',
        },
        
        // Secondary palette - charcoal grey for supporting elements
        secondary: {
          DEFAULT: '#4A4A5A',
          50: '#F8F8F9',
          100: '#F1F1F3',
          200: '#E3E3E7',
          300: '#D5D5DB',
          400: '#C7C7CF',
          500: '#4A4A5A',
          600: '#3A3A48',
          700: '#2A2A36',
          800: '#1A1A24',
          900: '#0A0A12',
          light: '#6B6B7A',
          pale: '#E8E8EA',
        },
        
        // Dark theme palette (primary experience)
        dark: {
          50: '#1A1A1C',   // Primary background
          100: '#2C2C30',  // Card backgrounds
          200: '#3A3A40',  // Elevated surfaces
          300: '#4A4A52',  // Borders and dividers
          400: '#6A6A74',  // Secondary text
          500: '#8A8A94',  // Primary text
          600: '#AAAAB4',  // Emphasized text
          700: '#CACAD4',  // High contrast text
          800: '#EAEAF4',  // Maximum contrast text
          900: '#FFFFFF',  // Pure white for alerts
        },
        
        // Semantic colors for status and feedback
        success: {
          DEFAULT: '#388E3C',
          50: '#E8F5E8',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#388E3C',
          600: '#2E7D32',
          700: '#256C2A',
          800: '#1B5E20',
          900: '#0F4C14',
        },
        
        warning: {
          DEFAULT: '#F57C00',
          mild: '#FF8F00',      // Mild content warnings
          moderate: '#F57C00',  // Moderate content warnings  
          severe: '#D32F2F',    // Severe content warnings
          50: '#FFF3E0',
          100: '#FFE0B2',
          200: '#FFCC80',
          300: '#FFB74D',
          400: '#FFA726',
          500: '#F57C00',
          600: '#FB8C00',
          700: '#F57C00',
          800: '#EF6C00',
          900: '#E65100',
        },
        
        error: {
          DEFAULT: '#D32F2F',
          50: '#FFEBEE',
          100: '#FFCDD2',
          200: '#EF9A9A',
          300: '#E57373',
          400: '#EF5350',
          500: '#D32F2F',
          600: '#C62828',
          700: '#B71C1C',
          800: '#B71C1C',
          900: '#B71C1C',
        },
        
        info: {
          DEFAULT: '#1976D2',
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#1976D2',
          600: '#1565C0',
          700: '#0D47A1',
          800: '#0D47A1',
          900: '#0D47A1',
        },
        
        // Content-specific colors
        content: {
          documentary: '#388E3C',    // Green for factual content
          series: '#1976D2',         // Blue for series content
          dramatization: '#8B4B7F',  // Purple for dramatic content
          podcast: '#F57C00',        // Orange for audio content
          factual: '#388E3C',        // Green for verified facts
          disputed: '#F57C00',       // Orange for disputed information
          sensitive: '#D32F2F',      // Red for sensitive content
        },
        
        // Platform indicator colors
        platform: {
          netflix: '#E50914',
          hulu: '#1CE783',
          prime: '#00A8E1',
          disney: '#113CCF',
          hbo: '#8A2BE2',
          discovery: '#0077B6',
          peacock: '#FA7800',
          paramount: '#006FFF',
          apple: '#1D1D1F',
          default: '#6A6A74',
        }
      },
      
      fontFamily: {
        // Primary font stack
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
        // Typography variants
        inter: ['Inter'],
        'inter-light': ['Inter-Light'],
        'inter-medium': ['Inter-Medium'],
        'inter-semibold': ['Inter-SemiBold'],
        'inter-bold': ['Inter-Bold'],
      },
      
      fontSize: {
        // Mobile-first typography scale
        'h1': ['28px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'h2': ['24px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '24px', letterSpacing: '0em', fontWeight: '500' }],
        'h4': ['18px', { lineHeight: '22px', letterSpacing: '0em', fontWeight: '500' }],
        'h5': ['16px', { lineHeight: '20px', letterSpacing: '0em', fontWeight: '500' }],
        'body-large': ['18px', { lineHeight: '26px', fontWeight: '400' }],
        'body': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-small': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label': ['14px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '500' }],
        'button': ['16px', { lineHeight: '20px', fontWeight: '600' }],
        
        // Desktop scale (responsive prefixes)
        'desktop-h1': ['36px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'desktop-h2': ['30px', { lineHeight: '34px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'desktop-h3': ['24px', { lineHeight: '28px', letterSpacing: '0em', fontWeight: '500' }],
        'desktop-body-large': ['20px', { lineHeight: '28px', fontWeight: '400' }],
        'desktop-body': ['18px', { lineHeight: '26px', fontWeight: '400' }],
      },
      
      spacing: {
        // 4px base unit spacing system
        'xs': '4px',
        'sm': '8px', 
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
        
        // Content-specific spacing
        'card-padding': '16px',
        'section-gap': '32px',
        'element-gap': '16px',
        'tight-gap': '8px',
        'loose-gap': '24px',
        
        // Safe areas and margins
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
        'screen-margin': '16px',
        'wide-margin': '48px',
      },
      
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        'card': '12px',
        'button': '8px',
        'input': '8px',
        'modal': '16px',
      },
      
      boxShadow: {
        // Elevation system for cards and modals
        'card': '0px 2px 8px rgba(0, 0, 0, 0.1)',
        'card-hover': '0px 4px 12px rgba(0, 0, 0, 0.15)',
        'card-dark': '0px 2px 8px rgba(0, 0, 0, 0.3)',
        'card-dark-hover': '0px 4px 12px rgba(0, 0, 0, 0.4)',
        'button': '0px 2px 4px rgba(139, 75, 127, 0.2)',
        'button-hover': '0px 4px 8px rgba(139, 75, 127, 0.3)',
        'modal': '0px 8px 24px rgba(0, 0, 0, 0.3)',
        'focus': '0 0 0 2px rgba(139, 75, 127, 0.5)',
      },
      
      animation: {
        // Custom animations for True Crime app
        'fade-in': 'fadeIn 250ms ease-out',
        'slide-up': 'slideUp 400ms ease-out',
        'scale-in': 'scaleIn 250ms ease-out',
        'pulse-loading': 'pulseLoading 1500ms ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
        
        // Content-specific animations
        'warning-pulse': 'warningPulse 2s ease-in-out infinite',
        'progress-fill': 'progressFill 400ms ease-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseLoading: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        warningPulse: {
          '0%, 100%': { backgroundColor: 'rgba(211, 47, 47, 0.1)' },
          '50%': { backgroundColor: 'rgba(211, 47, 47, 0.2)' },
        },
        progressFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width)' },
        },
      },
      
      // Custom utilities for aspect ratios
      aspectRatio: {
        'content-card': '3 / 4',      // Standard content poster ratio
        'content-banner': '16 / 9',   // Widescreen content ratio
        'profile': '1 / 1',           // Square profile images
      },
      
      // Screen breakpoints for responsive design
      screens: {
        'xs': '320px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        // Custom breakpoints for True Crime app
        'mobile': { 'max': '767px' },
        'tablet': { 'min': '768px', 'max': '1023px' },
        'desktop': { 'min': '1024px' },
        'wide': { 'min': '1440px' },
      },
      
      // Z-index scale for layering
      zIndex: {
        'dropdown': '100',
        'modal': '200',
        'toast': '300',
        'tooltip': '400',
        'overlay': '500',
      },
    },
  },
  plugins: [
    // Custom plugin for True Crime specific utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Content warning utilities
        '.content-warning-mild': {
          backgroundColor: theme('colors.warning.mild'),
          color: theme('colors.white'),
        },
        '.content-warning-moderate': {
          backgroundColor: theme('colors.warning.moderate'), 
          color: theme('colors.white'),
        },
        '.content-warning-severe': {
          backgroundColor: theme('colors.warning.severe'),
          color: theme('colors.white'),
        },
        
        // Platform badge utilities
        '.platform-badge': {
          display: 'inline-flex',
          alignItems: 'center',
          padding: `${theme('spacing.1')} ${theme('spacing.2')}`,
          borderRadius: theme('borderRadius.sm'),
          fontSize: theme('fontSize.caption'),
          fontWeight: theme('fontWeight.medium'),
        },
        
        // Focus utilities for accessibility
        '.focus-ring': {
          '&:focus': {
            outline: 'none',
            boxShadow: `0 0 0 2px ${theme('colors.primary.light')}`,
          },
        },
        
        // Safe area utilities
        '.safe-area-top': {
          paddingTop: 'env(safe-area-inset-top)',
        },
        '.safe-area-bottom': {
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
        '.safe-area-x': {
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        },
      };
      
      addUtilities(newUtilities);
    },
  ],
  
  // Dark mode configuration
  darkMode: 'class', // Use class-based dark mode for better control
};
```

## Custom Utility Classes

### Content-Specific Utilities

```css
/* Custom CSS additions for True Crime app */
@layer utilities {
  /* Content type indicators */
  .content-documentary {
    @apply bg-content-documentary text-white;
  }
  
  .content-series {
    @apply bg-content-series text-white;
  }
  
  .content-dramatization {
    @apply bg-content-dramatization text-white;
  }
  
  .content-podcast {
    @apply bg-content-podcast text-white;
  }
  
  /* Progress indicators */
  .progress-complete {
    @apply bg-success text-white;
  }
  
  .progress-current {
    @apply bg-primary text-white;
  }
  
  .progress-unwatched {
    @apply bg-dark-300 text-dark-500;
  }
  
  /* Platform-specific styling */
  .platform-netflix {
    @apply bg-platform-netflix text-white;
  }
  
  .platform-hulu {
    @apply bg-platform-hulu text-black;
  }
  
  .platform-prime {
    @apply bg-platform-prime text-white;
  }
  
  /* Accessibility utilities */
  .sr-only-focusable {
    @apply sr-only;
  }
  
  .sr-only-focusable:focus {
    @apply not-sr-only absolute top-0 left-0 z-[9999] p-2 bg-white text-black;
  }
  
  /* Animation utilities */
  .animate-content-appear {
    animation: fadeIn 250ms ease-out;
  }
  
  .animate-slide-up {
    animation: slideUp 400ms ease-out;
  }
  
  .animate-warning-pulse {
    animation: warningPulse 2s ease-in-out infinite;
  }
}
```

### Component-Specific Classes

```typescript
// Component utility classes for common patterns
export const componentClasses = {
  // Button variants
  button: {
    base: "rounded-button font-button items-center justify-center focus-ring disabled:opacity-50",
    primary: "bg-primary text-white shadow-button hover:bg-primary-dark active:bg-primary-800",
    secondary: "bg-dark-200 text-dark-700 hover:bg-dark-300 active:bg-dark-400",
    tertiary: "bg-transparent text-primary hover:bg-primary/10 active:bg-primary/20",
    ghost: "bg-transparent text-dark-500 hover:text-dark-700 active:text-dark-800",
    danger: "bg-error text-white hover:bg-error-600 active:bg-error-700",
  },
  
  // Size variants
  size: {
    sm: "px-4 py-2 h-10 text-body-small",
    md: "px-6 py-3 h-12 text-button",
    lg: "px-8 py-4 h-14 text-button",
  },
  
  // Card components
  card: {
    base: "bg-dark-100 rounded-card shadow-card dark:shadow-card-dark",
    hover: "hover:shadow-card-hover dark:hover:shadow-card-dark-hover transition-shadow duration-250",
    content: "aspect-content-card overflow-hidden",
    padding: "p-card-padding",
  },
  
  // Form elements
  input: {
    base: "bg-dark-200 border border-dark-300 rounded-input px-md py-sm text-body focus-ring",
    error: "border-error bg-error/5",
    success: "border-success bg-success/5",
  },
  
  // Typography
  text: {
    h1: "text-h1 font-inter-semibold text-dark-700",
    h2: "text-h2 font-inter-semibold text-dark-700", 
    h3: "text-h3 font-inter-medium text-dark-600",
    h4: "text-h4 font-inter-medium text-dark-600",
    h5: "text-h5 font-inter-medium text-dark-600",
    bodyLarge: "text-body-large font-inter text-dark-500",
    body: "text-body font-inter text-dark-500",
    bodySmall: "text-body-small font-inter text-dark-400",
    caption: "text-caption font-inter text-dark-400",
    label: "text-label font-inter-medium text-dark-600 uppercase tracking-wider",
  },
};
```

## React Native Implementation Examples

### Component with NativeWind Classes

```typescript
import { View, Text, Pressable } from 'react-native';
import { styled } from 'nativewind';

// Create styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

// Button component using NativeWind
const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  disabled,
  ...props 
}) => {
  const baseClasses = componentClasses.button.base;
  const variantClasses = componentClasses.button[variant];
  const sizeClasses = componentClasses.size[size];
  
  return (
    <StyledPressable
      className={`${baseClasses} ${variantClasses} ${sizeClasses}`}
      disabled={disabled}
      {...props}
    >
      <StyledText className="font-button">
        {children}
      </StyledText>
    </StyledPressable>
  );
};

// Content card using NativeWind
const ContentCard: React.FC<ContentCardProps> = ({ content, onPress }) => {
  return (
    <StyledPressable
      className={`${componentClasses.card.base} ${componentClasses.card.hover} ${componentClasses.card.padding}`}
      onPress={onPress}
    >
      <StyledView className={componentClasses.card.content}>
        <Image 
          source={{ uri: content.posterUrl }}
          className="w-full h-full rounded-lg"
          resizeMode="cover"
        />
        
        {/* Content Warning Badge */}
        {content.contentWarning && (
          <StyledView className={`absolute top-2 right-2 content-warning-${content.contentWarning} px-2 py-1 rounded-sm`}>
            <StyledText className="text-caption text-white font-medium">
              {content.contentWarning.toUpperCase()}
            </StyledText>
          </StyledView>
        )}
        
        {/* Platform Badges */}
        <StyledView className="absolute bottom-2 left-2 flex-row space-x-1">
          {content.platforms.slice(0, 3).map((platform) => (
            <StyledView
              key={platform}
              className={`platform-badge platform-${platform.toLowerCase()}`}
            >
              <StyledText className="text-caption font-medium">
                {platform}
              </StyledText>
            </StyledView>
          ))}
        </StyledView>
      </StyledView>
      
      {/* Content Info */}
      <StyledView className="mt-sm">
        <StyledText className={componentClasses.text.h4} numberOfLines={2}>
          {content.title}
        </StyledText>
        <StyledText className={componentClasses.text.caption}>
          {content.year} • {content.type}
        </StyledText>
        
        {/* User Rating */}
        {content.userRating && (
          <StyledView className="flex-row items-center mt-xs">
            <StarRating rating={content.userRating} size="small" />
            <StyledText className={`${componentClasses.text.caption} ml-xs`}>
              {content.userRating}/5
            </StyledText>
          </StyledView>
        )}
      </StyledView>
    </StyledPressable>
  );
};
```

### Theme Integration

```typescript
// Theme provider with NativeWind integration
import { useColorScheme } from 'nativewind';
import { Colors } from '../constants/Colors';

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colorScheme, setColorScheme } = useColorScheme();
  
  // True Crime app defaults to dark theme
  useEffect(() => {
    if (!colorScheme) {
      setColorScheme('dark');
    }
  }, [colorScheme, setColorScheme]);
  
  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'dark' : ''}`}>
      {children}
    </View>
  );
};

// Custom hook for theme-aware styling
const useThemeClasses = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  return {
    background: isDark ? 'bg-dark-50' : 'bg-white',
    surface: isDark ? 'bg-dark-100' : 'bg-gray-50',
    text: {
      primary: isDark ? 'text-dark-700' : 'text-gray-900',
      secondary: isDark ? 'text-dark-500' : 'text-gray-600',
      tertiary: isDark ? 'text-dark-400' : 'text-gray-400',
    },
    border: isDark ? 'border-dark-300' : 'border-gray-200',
  };
};
```

### Responsive Design with NativeWind

```typescript
// Responsive content grid
const ContentGrid: React.FC<{ content: Content[] }> = ({ content }) => {
  return (
    <StyledView className="px-screen-margin">
      <StyledView className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-element-gap">
        {content.map((item) => (
          <ContentCard key={item.id} content={item} />
        ))}
      </StyledView>
    </StyledView>
  );
};

// Responsive typography
const PageHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  return (
    <StyledView className="mb-section-gap">
      <StyledText className="text-h1 md:text-desktop-h1 font-inter-semibold text-dark-700 mb-sm">
        {title}
      </StyledText>
      {subtitle && (
        <StyledText className="text-body md:text-desktop-body font-inter text-dark-500">
          {subtitle}
        </StyledText>
      )}
    </StyledView>
  );
};
```

## Performance Optimization

### Efficient Class Application

```typescript
// Utility for conditional classes
const classNames = (...classes: (string | undefined | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Usage in components
const Button: React.FC<ButtonProps> = ({ variant, size, disabled, loading, ...props }) => {
  const className = classNames(
    componentClasses.button.base,
    componentClasses.button[variant],
    componentClasses.size[size],
    disabled && 'opacity-50 cursor-not-allowed',
    loading && 'opacity-75'
  );
  
  return (
    <StyledPressable className={className} {...props} />
  );
};

// Memoized class generation for performance
const useMemoizedClasses = (variant: string, size: string, disabled: boolean) => {
  return useMemo(() => classNames(
    componentClasses.button.base,
    componentClasses.button[variant],
    componentClasses.size[size],
    disabled && 'opacity-50'
  ), [variant, size, disabled]);
};
```

### Bundle Size Optimization

```javascript
// Tailwind purge configuration for production
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  // Enable purging unused styles in production
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      "./app/**/*.{js,jsx,ts,tsx}",
      "./components/**/*.{js,jsx,ts,tsx}",
    ],
    // Safelist classes that might be generated dynamically
    safelist: [
      'content-warning-mild',
      'content-warning-moderate', 
      'content-warning-severe',
      /platform-.*/,
      /content-.*/,
    ],
  },
};
```

## Development Workflow

### Class Organization

```typescript
// Organized class definitions for maintainability
export const uiClasses = {
  layout: {
    container: "flex-1 bg-dark-50 safe-area-top safe-area-bottom",
    section: "px-screen-margin py-section-gap",
    grid: "grid gap-element-gap",
    flex: "flex items-center justify-center",
  },
  
  interactive: {
    button: componentClasses.button,
    input: componentClasses.input,
    card: componentClasses.card,
  },
  
  content: {
    warning: {
      mild: "content-warning-mild",
      moderate: "content-warning-moderate",
      severe: "content-warning-severe",
    },
    type: {
      documentary: "content-documentary",
      series: "content-series", 
      dramatization: "content-dramatization",
      podcast: "content-podcast",
    },
  },
  
  animation: {
    fadeIn: "animate-fade-in",
    slideUp: "animate-slide-up",
    scaleIn: "animate-scale-in",
    pulse: "animate-pulse-loading",
  },
};
```

### TypeScript Integration

```typescript
// Type-safe class application
type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type ContentWarning = 'mild' | 'moderate' | 'severe';

interface StyledComponentProps {
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  contentWarning?: ContentWarning;
}

// Utility type for class generation
type ClassBuilder<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends Record<string, any> 
    ? ClassBuilder<T[K]> 
    : string;
};

const typedClasses: ClassBuilder<typeof uiClasses> = uiClasses;
```

This NativeWind configuration provides a comprehensive foundation for implementing the True Crime app design system with efficient, maintainable, and accessible styling patterns. The configuration balances sophisticated visual design with practical development needs while maintaining consistency across all platforms.