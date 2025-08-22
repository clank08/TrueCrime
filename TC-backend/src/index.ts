#!/usr/bin/env node

import { config } from 'dotenv';
import { start } from './server';

// Load environment variables from .env file
config();

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

const requiredEnvVars = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET',
] as const;

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => {
    console.error(`  - ${envVar}`);
  });
  console.error('\nPlease check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// ============================================================================
// OPTIONAL ENVIRONMENT WARNINGS
// ============================================================================

const optionalEnvVars = [
  'REDIS_URL',
  'UPSTASH_URL',
  'SENTRY_DSN',
  'FRONTEND_URL',
  'WEB_APP_URL',
] as const;

const missingOptionalVars = optionalEnvVars.filter(envVar => !process.env[envVar]);

if (missingOptionalVars.length > 0 && process.env.NODE_ENV !== 'development') {
  console.warn('⚠️ Optional environment variables not set (some features may be disabled):');
  missingOptionalVars.forEach(envVar => {
    console.warn(`  - ${envVar}`);
  });
}

// ============================================================================
// STARTUP CONFIGURATION
// ============================================================================

console.log('🎬 True Crime Backend Server');
console.log('================================');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Node.js: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`PID: ${process.pid}`);

if (process.env.REDIS_URL || process.env.UPSTASH_URL) {
  console.log('✅ Redis caching enabled');
} else {
  console.log('⚠️ Redis not configured - using in-memory cache');
}

if (process.env.SENTRY_DSN) {
  console.log('✅ Sentry error monitoring enabled');
} else {
  console.log('⚠️ Sentry not configured - error monitoring disabled');
}

// ============================================================================
// DEVELOPMENT MODE HELPERS
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  console.log('\n🔧 Development Mode Features:');
  console.log('  - Hot reload enabled');
  console.log('  - Detailed logging');
  console.log('  - CORS allows localhost origins');
  console.log('  - Pretty-printed logs');
  
  // Enable detailed error stack traces in development
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception in Development:');
    console.error(error.stack);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection in Development:');
    console.error('Promise:', promise);
    console.error('Reason:', reason);
    process.exit(1);
  });
}

// ============================================================================
// PRODUCTION MODE CONFIGURATION
// ============================================================================

if (process.env.NODE_ENV === 'production') {
  console.log('\n🚀 Production Mode Features:');
  console.log('  - Optimized logging');
  console.log('  - Security headers enabled');
  console.log('  - Rate limiting active');
  console.log('  - Error monitoring active');
  
  // More graceful error handling in production
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    // In production, you might want to send to monitoring service
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
    // In production, you might want to send to monitoring service
    process.exit(1);
  });
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

// Track startup performance
const startupTime = Date.now();

// Memory usage monitoring
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    
    // Log warning if memory usage is high
    if (memUsedMB > 500) {
      console.warn(`⚠️ High memory usage: ${memUsedMB}MB / ${memTotalMB}MB`);
    }
  }, 30000); // Check every 30 seconds
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function bootstrap() {
  try {
    console.log('\n🚀 Starting server...');
    
    await start();
    
    const startupDuration = Date.now() - startupTime;
    console.log(`✅ Server started successfully in ${startupDuration}ms`);
    
    // In production, you might want to notify monitoring services
    if (process.env.NODE_ENV === 'production') {
      console.log('📊 Server health monitoring active');
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();