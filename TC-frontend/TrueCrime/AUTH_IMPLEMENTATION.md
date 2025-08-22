# True Crime Frontend Authentication Implementation

This document provides an overview of the authentication system implemented for the True Crime tracking app frontend.

## Overview

The authentication system provides a complete user onboarding and authentication flow with the following features:
- Secure email/password authentication
- Social login UI (Google/Apple) ready for implementation
- 4-step onboarding process
- Dark theme design matching the True Crime app aesthetic
- Comprehensive form validation and error handling
- Persistent authentication state with automatic token refresh

## Architecture

### Tech Stack
- **Framework**: React Native with Expo SDK 53+
- **Routing**: Expo Router (file-based routing)
- **State Management**: Zustand for auth state + Tanstack Query for API caching
- **API**: tRPC client for type-safe backend communication
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Forms**: React Hook Form with Zod validation
- **Storage**: AsyncStorage for token persistence

### Key Components

#### Authentication Screens
1. **Welcome Screen** (`/auth/welcome`)
   - Value proposition and app introduction
   - Call-to-action buttons for signup/login
   - Platform showcase and social proof

2. **Register Screen** (`/auth/register`)
   - 3-step registration process
   - Email/password with validation
   - Personal details (optional)
   - Social login options

3. **Login Screen** (`/auth/login`)
   - Email/password login form
   - Social login options
   - Password reset functionality

4. **Platform Connection** (`/auth/platforms`)
   - Streaming service selection
   - OAuth connection simulation
   - Platform categorization and search

5. **Interest Selection** (`/auth/interests`)
   - Content preference selection
   - Quick preset options
   - Live preview of selections

#### Core Infrastructure

**Authentication Store** (`lib/stores/authStore.ts`)
- Manages user authentication state
- Handles token storage and refresh
- Tracks onboarding progress
- Provides authentication actions

**tRPC Client** (`lib/trpc.ts`)
- Type-safe API communication
- Automatic authentication headers
- Error handling and retry logic

**Authentication Providers**
- `AuthProvider`: Route protection and navigation logic
- `TRPCProvider`: API client configuration
- `ProtectedRoute`: Component-level route protection

**UI Components**
- `Button`: Consistent button styling with haptic feedback
- `Input`: Form inputs with validation states
- `Card`: Content containers
- `ErrorBoundary`: Error handling and recovery
- `LoadingSpinner`: Loading state management

## Authentication Flow

### Registration Flow
1. User lands on welcome screen
2. Taps "Get Started" → Register screen (step 1)
3. Enters email/password → Validation occurs in real-time
4. Continues to details screen (step 2) → Optional personal information
5. Proceeds to social login options (step 3)
6. Account created → Redirects to platform connection
7. Selects streaming platforms → Interest selection
8. Completes onboarding → Main app access

### Login Flow
1. User enters email/password
2. Real-time validation feedback
3. Authentication request to backend
4. Success → Check onboarding status
   - Complete: Redirect to main app
   - Incomplete: Continue onboarding flow
5. Error → Display error message with recovery options

### Route Protection
- Unauthenticated users → Redirected to welcome screen
- Authenticated but incomplete onboarding → Appropriate onboarding step
- Complete users → Access to main app

## Security Features

### Token Management
- JWT access tokens (short-lived)
- Refresh tokens (longer-lived)
- Automatic token refresh before expiry
- Secure storage using AsyncStorage
- Token invalidation on logout

### Form Security
- Real-time input validation
- Password strength checking
- XSS protection through proper input handling
- Rate limiting ready (backend dependent)

### Privacy
- Privacy-first defaults
- Clear data usage explanations
- User control over social features
- Secure OAuth implementation ready

## Design System Integration

### Colors
- Primary: `#8B4B7F` (Deep plum)
- Dark theme backgrounds: `#1A1A1C`, `#2C2C30`
- Error states: `#D32F2F`
- Success states: `#388E3C`

### Typography
- Font: Inter (with fallbacks to system fonts)
- Consistent sizing scale
- Proper contrast ratios for accessibility

### Spacing
- 4px base unit system
- Consistent margin/padding patterns
- Touch-friendly minimum sizes (44px)

## Accessibility Features

### Screen Reader Support
- Semantic HTML structure
- ARIA labels for all interactive elements
- Status announcements for state changes
- Proper heading hierarchy

### Keyboard Navigation
- Tab order follows logical flow
- Focus indicators clearly visible
- Skip links for efficient navigation

### Visual Accessibility
- High contrast color combinations
- Minimum 4.5:1 contrast ratio
- Scalable text support
- Motion preference respect

### Inclusive Design
- Clear, simple language
- Error messages with recovery actions
- Progressive disclosure
- Multiple input methods supported

## Error Handling

### Client-Side Validation
- Real-time form validation with Zod schemas
- Password strength indication
- Email format verification
- Custom error messages

### API Error Handling
- Network error recovery
- Authentication failures
- Server error handling
- User-friendly error messages

### Error Recovery
- Clear recovery paths
- Retry mechanisms
- Fallback options
- Error boundary implementation

## Performance Optimizations

### Loading States
- Skeleton screens for content
- Progressive loading
- Optimistic updates where appropriate
- Proper loading indicators

### Caching
- tRPC query caching
- Authentication state persistence
- Form data retention
- Image and asset caching

### Bundle Optimization
- Code splitting ready
- Lazy loading implementation
- Tree shaking enabled
- Asset optimization

## Testing Strategy

### Unit Tests
- Form validation logic
- Authentication store actions
- Utility functions
- Component rendering

### Integration Tests
- Authentication flow end-to-end
- Form submission handling
- Navigation between screens
- Error state handling

### Accessibility Tests
- Screen reader compatibility
- Keyboard navigation
- Color contrast validation
- Focus management

## Configuration

### Environment Variables
```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api/trpc
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_DEBUG_MODE=true
```

### Feature Flags
- Social login providers
- Analytics integration
- Error reporting
- Debug mode

## Backend Integration

### Required Endpoints
The frontend expects these tRPC endpoints:
- `auth.register` - User registration
- `auth.login` - User authentication
- `auth.logout` - Session termination
- `auth.refresh` - Token refresh
- `auth.me` - User profile
- `auth.requestPasswordReset` - Password reset
- `auth.verifyEmail` - Email verification

### Authentication Headers
```typescript
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Deployment Considerations

### Production Settings
- Enable analytics and error reporting
- Use production API URLs
- Implement proper cert pinning
- Enable crash reporting

### Security Checklist
- [ ] HTTPS enforced
- [ ] Certificate pinning implemented
- [ ] Secure token storage
- [ ] Input sanitization
- [ ] Rate limiting enabled
- [ ] Error messages sanitized

## Future Enhancements

### Planned Features
- Biometric authentication
- Multi-factor authentication
- Social login implementation
- Email verification flow
- Account recovery options

### Performance Improvements
- Improved caching strategies
- Offline mode support
- Background sync
- Push notification integration

## Troubleshooting

### Common Issues
1. **Navigation errors**: Ensure all route screens are properly registered
2. **Token persistence**: Check AsyncStorage implementation
3. **Form validation**: Verify Zod schema compatibility
4. **Styling issues**: Ensure NativeWind configuration is correct

### Debug Tools
- React Native Debugger
- Flipper integration ready
- Console logging for development
- Error boundary implementation

## Files Structure

```
app/
├── auth/
│   ├── welcome.tsx      # Landing screen
│   ├── register.tsx     # Registration flow
│   ├── login.tsx        # Login screen
│   ├── platforms.tsx    # Platform selection
│   └── interests.tsx    # Interest selection
├── (tabs)/
│   └── _layout.tsx      # Protected main app
└── _layout.tsx          # Root with providers

components/
├── auth/
│   └── ProtectedRoute.tsx
├── providers/
│   ├── AuthProvider.tsx
│   └── TRPCProvider.tsx
└── ui/
    ├── Button.tsx
    ├── Input.tsx
    ├── Card.tsx
    └── ErrorBoundary.tsx

lib/
├── stores/
│   └── authStore.ts     # Zustand auth store
├── trpc.ts              # tRPC client config
├── validation.ts        # Form validation utilities
└── config.ts            # App configuration

types/
└── api.ts               # API type definitions
```

This authentication system provides a solid foundation for the True Crime tracking app with room for future enhancements and full backend integration.