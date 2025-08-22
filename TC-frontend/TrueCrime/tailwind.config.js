/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        primary: {
          DEFAULT: '#8B4B7F',
          dark: '#6B3760',
          light: '#A66B9E',
        },
        
        // Secondary Colors
        secondary: {
          DEFAULT: '#4A4A5A',
          light: '#6B6B7A',
          pale: '#E8E8EA',
        },
        
        // Accent Colors
        accent: {
          primary: '#D32F2F',
          secondary: '#FF8F00',
          'gradient-start': '#8B4B7F',
          'gradient-end': '#4A4A5A',
        },
        
        // Semantic Colors
        success: '#388E3C',
        warning: '#F57C00',
        error: '#D32F2F',
        info: '#1976D2',
        
        // Neutral Palette (Light Theme)
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#EEEEEE',
          300: '#E0E0E0',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
        },
        
        // Dark Theme Palette (Primary Experience)
        dark: {
          50: '#1A1A1C',   // Primary background
          100: '#2C2C30',  // Card backgrounds
          200: '#3A3A40',  // Elevated surfaces
          300: '#4A4A52',  // Borders and dividers
          400: '#6A6A74',  // Secondary text
          500: '#8A8A94',  // Primary text
          600: '#AAAAB4',  // Emphasized text
          700: '#CACAD4',  // High contrast text
          800: '#EAEAF4',  // Maximum contrast
          900: '#FFFFFF',  // Pure white
        },
        
        // Content Warning Colors
        'warning-mild': '#FF8F00',
        'warning-moderate': '#F57C00', 
        'warning-severe': '#D32F2F',
      },
      
      fontFamily: {
        'inter': ['Inter', 'system-ui', 'sans-serif'],
        'inter-light': ['Inter-Light', 'Inter', 'system-ui', 'sans-serif'],
        'inter-medium': ['Inter-Medium', 'Inter', 'system-ui', 'sans-serif'],
        'inter-semibold': ['Inter-SemiBold', 'Inter', 'system-ui', 'sans-serif'],
        'inter-bold': ['Inter-Bold', 'Inter', 'system-ui', 'sans-serif'],
      },
      
      fontSize: {
        // Mobile-first type scale
        'display': ['28px', { lineHeight: '32px', fontWeight: '600', letterSpacing: '-0.02em' }],
        'h1': ['28px', { lineHeight: '32px', fontWeight: '600', letterSpacing: '-0.02em' }],
        'h2': ['24px', { lineHeight: '28px', fontWeight: '600', letterSpacing: '-0.01em' }],
        'h3': ['20px', { lineHeight: '24px', fontWeight: '500' }],
        'h4': ['18px', { lineHeight: '22px', fontWeight: '500' }],
        'h5': ['16px', { lineHeight: '20px', fontWeight: '500' }],
        'body-large': ['18px', { lineHeight: '26px', fontWeight: '400' }],
        'body': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-small': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'label': ['14px', { lineHeight: '16px', fontWeight: '500', letterSpacing: '0.02em' }],
        'button': ['16px', { lineHeight: '20px', fontWeight: '600' }],
        'code': ['14px', { lineHeight: '20px', fontWeight: '400' }],
      },
      
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      
      borderRadius: {
        'button': '8px',
        'card': '12px',
        'modal': '16px',
      },
      
      boxShadow: {
        'button': '0px 2px 4px rgba(139, 75, 127, 0.2)',
        'button-hover': '0px 4px 8px rgba(139, 75, 127, 0.3)',
        'card': '0px 2px 8px rgba(0, 0, 0, 0.1)',
        'card-dark': '0px 2px 8px rgba(0, 0, 0, 0.3)',
        'card-hover': '0px 4px 12px rgba(0, 0, 0, 0.15)',
      },
      
      animation: {
        'fade-in': 'fadeIn 400ms ease-out',
        'slide-up': 'slideUp 400ms ease-out',
        'scale-in': 'scaleIn 250ms ease-out',
        'pulse-loading': 'pulseLoading 1500ms ease-in-out infinite',
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
      },
      
      transitionDuration: {
        'micro': '150ms',
        'short': '250ms',
        'medium': '400ms',
        'long': '600ms',
      },
      
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.6, 1)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
    },
  },
  plugins: [
    // Custom plugin for True Crime specific utilities
    function({ addUtilities }) {
      const newUtilities = {
        // Focus ring utility for accessibility
        '.focus-ring': {
          '&:focus': {
            outline: '2px solid #8B4B7F',
            outlineOffset: '2px',
          },
        },
        
        // Content warning badge utilities
        '.content-warning-mild': {
          backgroundColor: '#FF8F00',
        },
        '.content-warning-moderate': {
          backgroundColor: '#F57C00',
        },
        '.content-warning-severe': {
          backgroundColor: '#D32F2F',
        },
        
        // Platform badge utilities
        '.platform-badge': {
          fontSize: '12px',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
        },
        
        // Progress indicator utilities
        '.progress-bar': {
          backgroundColor: '#8B4B7F',
          height: '4px',
          borderRadius: '2px',
        },
        
        // Card component utilities
        '.card-padding': {
          padding: '16px',
        },
        
        '.aspect-content-card': {
          aspectRatio: '3/4',
        },
        
        // Typography utilities
        '.font-display': {
          fontSize: '28px',
          lineHeight: '32px',
          fontWeight: '600',
          letterSpacing: '-0.02em',
        },
        
        '.font-button': {
          fontSize: '16px',
          lineHeight: '20px',
          fontWeight: '600',
        },
        
        '.text-shadow-dark': {
          textShadow: '0px 2px 4px rgba(0, 0, 0, 0.5)',
        },
        
        // Safe area utilities
        '.safe-area-top': {
          paddingTop: 'env(safe-area-inset-top)',
        },
        '.safe-area-bottom': {
          paddingBottom: 'env(safe-area-inset-bottom)',
        },
        '.safe-area-left': {
          paddingLeft: 'env(safe-area-inset-left)',
        },
        '.safe-area-right': {
          paddingRight: 'env(safe-area-inset-right)',
        },
        '.safe-area': {
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        },
      }

      addUtilities(newUtilities)
    }
  ],
}