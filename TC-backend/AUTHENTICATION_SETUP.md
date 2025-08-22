# Authentication Setup Guide

This guide covers the complete setup of the authentication system for the True Crime backend.

## Overview

The authentication system uses a hybrid approach combining:
- **Supabase Auth** for OAuth providers and email/password authentication
- **Custom JWT tokens** for session management
- **Prisma + PostgreSQL** for user data and sessions
- **bcrypt** for password hashing
- **tRPC** for type-safe API endpoints

## Quick Setup

### 1. Environment Configuration

Copy `.env.example` to `.env` and configure the following required variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/truecrime

# Supabase (get these from your Supabase project dashboard)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# JWT (generate secure random strings)
JWT_SECRET=your-very-secure-jwt-secret-minimum-256-bits
JWT_REFRESH_SECRET=your-refresh-jwt-secret-different-from-above
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URLs for redirects
FRONTEND_URL=http://localhost:19006  # React Native dev server
WEB_APP_URL=http://localhost:3000   # Web app URL
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate:dev

# (Optional) Seed database with test data
npm run db:seed
```

### 3. Start the Server

```bash
# Development mode with hot reload
npm run dev

# The server will start on http://localhost:3000
# API documentation: http://localhost:3000/api/docs
# Health check: http://localhost:3000/health
```

## Detailed Configuration

### Supabase Setup

1. **Create a Supabase project** at https://supabase.com

2. **Configure Authentication:**
   - Go to Authentication > Settings
   - Enable email confirmations if desired
   - Configure OAuth providers (Google, Apple)
   - Set up email templates

3. **Database Configuration:**
   - The Supabase database will be used via the `DATABASE_URL`
   - Our Prisma schema will create the necessary tables
   - Row Level Security (RLS) policies should be configured for security

4. **Get API Keys:**
   - Project Settings > API
   - Copy the URL, anon key, and service role key

### JWT Configuration

Generate secure secrets for JWT tokens:

```bash
# Generate 256-bit (32 byte) secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use different secrets for access and refresh tokens for enhanced security.

### Database Schema

The authentication system creates these main tables:

- **`users`** - Core user information
- **`user_preferences`** - User settings and preferences
- **`user_sessions`** - Active user sessions
- **`auth_providers`** - OAuth provider connections
- **`password_resets`** - Password reset tokens
- **`email_verifications`** - Email verification tokens

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Register User
```http
POST /api/trpc/auth.register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "displayName": "John Doe"
}
```

#### Login
```http
POST /api/trpc/auth.login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "rememberMe": true
}
```

#### Request Password Reset
```http
POST /api/trpc/auth.requestPasswordReset
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Confirm Password Reset
```http
POST /api/trpc/auth.confirmPasswordReset
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

#### Refresh Token
```http
POST /api/trpc/auth.refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Verify Email
```http
POST /api/trpc/auth.verifyEmail
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

### Protected Endpoints (Authentication Required)

Include the access token in the Authorization header:
```http
Authorization: Bearer your-access-token
```

Or use the session cookie (automatically set on login).

#### Get Current User
```http
GET /api/trpc/auth.me
```

#### Logout
```http
POST /api/trpc/auth.logout
```

#### Resend Email Verification
```http
POST /api/trpc/auth.resendVerification
```

#### Get User Sessions
```http
GET /api/trpc/auth.sessions
```

#### Revoke Session
```http
DELETE /api/trpc/auth.revokeSession
Content-Type: application/json

{
  "sessionId": "session-id-to-revoke"
}
```

## Security Features

### Password Security
- Minimum 8 characters
- Must contain uppercase, lowercase, and numbers
- Hashed using bcrypt with 12 rounds
- Passwords are never stored in plain text

### Session Management
- JWT access tokens (short-lived, 15 minutes)
- Refresh tokens (longer-lived, 7 days)
- Session tracking with device information
- Automatic token refresh
- Secure HTTP-only cookies

### Rate Limiting
- 100 requests per minute per IP/user
- Failed authentication attempts are throttled
- Configurable limits per endpoint

### Input Validation
- All inputs validated with Zod schemas
- Email format validation
- Password strength requirements
- SQL injection protection via Prisma

### Account Security
- Email verification required
- Password reset via secure tokens
- Account suspension capabilities
- Audit trail of login attempts

## Testing

Run the authentication tests:

```bash
# Run all tests
npm test

# Run only authentication tests
npm test auth

# Run with coverage
npm run test:coverage
```

### Manual Testing

Use tools like Postman, Insomnia, or curl to test the endpoints:

```bash
# Test registration
curl -X POST http://localhost:3000/api/trpc/auth.register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Test login
curl -X POST http://localhost:3000/api/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'

# Test authenticated endpoint
curl -X GET http://localhost:3000/api/trpc/auth.me \
  -H "Authorization: Bearer your-access-token"
```

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Verify `DATABASE_URL` is correct
   - Ensure database is running and accessible
   - Check Supabase project is active

2. **JWT verification failed**
   - Verify `JWT_SECRET` is set and matches
   - Check token hasn't expired
   - Ensure token format is correct

3. **Supabase errors**
   - Verify API keys are correct
   - Check Supabase project is active
   - Ensure authentication is enabled

4. **Password validation errors**
   - Check password meets requirements
   - Verify bcrypt is working correctly

### Debugging

Enable debug logging:

```bash
export LOG_LEVEL=debug
npm run dev
```

Check database queries:

```bash
# View Prisma query logs
export DEBUG="prisma:query"
npm run dev
```

### Reset Everything

If you need to start fresh:

```bash
# Reset database
npm run db:reset

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npm run db:generate
```

## Production Deployment

### Security Checklist

- [ ] Strong JWT secrets (minimum 256 bits)
- [ ] HTTPS enforced in production
- [ ] Secure cookie settings
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Database connection encrypted
- [ ] Supabase RLS policies active
- [ ] Error logging configured
- [ ] Monitoring and alerting setup

### Environment Variables

```bash
# Production settings
NODE_ENV=production
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
DATABASE_URL=your-production-database-url
SUPABASE_URL=your-production-supabase-url
FRONTEND_URL=https://your-production-frontend.com
```

### Docker Deployment

```bash
# Build production image
docker build -t truecrime-backend:prod .

# Run with production env
docker run -d \
  --name truecrime-backend \
  -p 3000:3000 \
  --env-file .env.production \
  truecrime-backend:prod
```

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Prisma Documentation](https://www.prisma.io/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [OWASP Authentication Guidelines](https://owasp.org/www-project-authentication-cheat-sheet/)

## Support

For issues or questions about the authentication system:

1. Check this guide first
2. Review the error logs
3. Test with the provided examples
4. Contact the development team with specific error details