import { fastify } from 'fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import sensible from '@fastify/sensible';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { appRouter } from '@/routers';
import { createContext } from '@/lib/trpc';
import { prisma } from '@/lib/prisma';
import { cache } from '@/lib/cache';
import { applyRateLimiting } from '@/middleware/rateLimiting';
import { setupFastifyMonitoring, createMetricsEndpoint } from '@/lib/monitoring';

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// JWT secrets (used by Fastify JWT plugin for additional security)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

// ============================================================================
// SERVER SETUP
// ============================================================================

async function createServer() {
  const server = fastify({
    logger: NODE_ENV === 'development' ? {
      level: 'info' as const,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    } : {
      level: 'warn' as const,
    },
    trustProxy: true, // Trust proxy headers for rate limiting and IP detection
  });

  // ============================================================================
  // REGISTER PLUGINS
  // ============================================================================

  // Security plugins
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some modern browsers
  });

  // CORS configuration
  await server.register(cors, {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',  // React dev server
        'http://localhost:19006', // Expo web dev server
        'http://localhost:8081',  // Expo dev tools
        process.env.FRONTEND_URL, // Production frontend URL
        process.env.WEB_APP_URL,  // Production web app URL
      ].filter(Boolean) as string[];

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, allow all localhost origins
      if (NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cookie',
    ],
  });

  // Apply custom rate limiting middleware
  applyRateLimiting(server);

  // Setup monitoring hooks
  setupFastifyMonitoring(server);

  // Create metrics endpoints
  createMetricsEndpoint(server);

  // Cookie support
  await server.register(cookie, {
    secret: JWT_SECRET!, // Sign cookies for security
    parseOptions: {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
    },
  });

  // JWT support (for additional validation if needed)
  await server.register(jwt, {
    secret: JWT_SECRET!,
    cookie: {
      cookieName: 'session',
      signed: true,
    },
  });

  // Multipart form support
  await server.register(multipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 100,
      fileSize: 10 * 1024 * 1024, // 10MB max file size
      files: 5, // Max 5 files per request
    },
  });

  // HTTP error helpers
  await server.register(sensible);

  // WebSocket support (for future real-time features)
  await server.register(websocket);

  // ============================================================================
  // TRPC INTEGRATION
  // ============================================================================

  await server.register(fastifyTRPCPlugin, {
    prefix: '/api/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError(opts: any) {
        const { error, type, path, input, ctx, req } = opts;
        
        console.error(`❌ tRPC Error on ${type} ${path}:`, {
          error: error.message,
          code: error.code,
          cause: error.cause,
          input,
          userId: ctx?.user?.id,
          ip: req?.ip,
          userAgent: req?.headers['user-agent'],
        });

        // In production, you might want to send errors to a logging service
        if (NODE_ENV === 'production' && error.code === 'INTERNAL_SERVER_ERROR') {
          // TODO: Send to error tracking service (e.g., Sentry)
        }
      },
      batching: {
        enabled: true,
      },
    },
  });

  // ============================================================================
  // HEALTH CHECK ENDPOINTS
  // ============================================================================

  // Note: Health endpoints are now handled by createMetricsEndpoint middleware

  // ============================================================================
  // API DOCUMENTATION
  // ============================================================================

  server.get('/api/docs', async (request, reply) => {
    reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>True Crime API Documentation</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .endpoint { margin: 20px 0; padding: 15px; border-left: 4px solid #007acc; background: #f5f5f5; }
            .method { font-weight: bold; color: #007acc; }
            code { background: #e9e9e9; padding: 2px 4px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1>True Crime API Documentation</h1>
          <p>This API provides authentication and user management for the True Crime tracking application.</p>
          
          <h2>Base URL</h2>
          <code>${request.protocol}://${request.hostname}:${PORT}/api/trpc</code>
          
          <h2>Authentication Endpoints</h2>
          
          <div class="endpoint">
            <div class="method">POST</div>
            <h3>/auth.register</h3>
            <p>Register a new user account</p>
            <p><strong>Input:</strong> { email, password, firstName?, lastName?, displayName? }</p>
          </div>
          
          <div class="endpoint">
            <div class="method">POST</div>
            <h3>/auth.login</h3>
            <p>Login with email and password</p>
            <p><strong>Input:</strong> { email, password, rememberMe? }</p>
          </div>
          
          <div class="endpoint">
            <div class="method">POST</div>
            <h3>/auth.logout</h3>
            <p>Logout current user (requires authentication)</p>
          </div>
          
          <div class="endpoint">
            <div class="method">GET</div>
            <h3>/auth.me</h3>
            <p>Get current user profile (requires authentication)</p>
          </div>
          
          <div class="endpoint">
            <div class="method">POST</div>
            <h3>/auth.requestPasswordReset</h3>
            <p>Request password reset email</p>
            <p><strong>Input:</strong> { email }</p>
          </div>
          
          <div class="endpoint">
            <div class="method">POST</div>
            <h3>/auth.confirmPasswordReset</h3>
            <p>Confirm password reset with token</p>
            <p><strong>Input:</strong> { token, newPassword }</p>
          </div>
          
          <div class="endpoint">
            <div class="method">POST</div>
            <h3>/auth.verifyEmail</h3>
            <p>Verify email address with token</p>
            <p><strong>Input:</strong> { token }</p>
          </div>
          
          <div class="endpoint">
            <div class="method">POST</div>
            <h3>/auth.refresh</h3>
            <p>Refresh access token</p>
            <p><strong>Input:</strong> { refreshToken }</p>
          </div>
          
          <h2>Usage</h2>
          <p>All requests should be sent as POST requests to the tRPC endpoint with a JSON body containing the procedure name and input data.</p>
          
          <h3>Example Request:</h3>
          <pre><code>
POST ${request.protocol}://${request.hostname}:${PORT}/api/trpc/auth.login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
          </code></pre>
          
          <h2>Authentication</h2>
          <p>Protected endpoints require an Authorization header with a Bearer token or a session cookie.</p>
          <pre><code>Authorization: Bearer &lt;your-access-token&gt;</code></pre>
          
          <h2>Error Handling</h2>
          <p>All endpoints return standardized error responses with appropriate HTTP status codes and error messages.</p>
          
        </body>
      </html>
    `);
  });

  // ============================================================================
  // GRACEFUL SHUTDOWN
  // ============================================================================

  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    
    try {
      // Close server
      await server.close();
      console.log('✅ Server closed successfully');
      
      // Close database connections
      try {
        await prisma.safeDisconnect();
        console.log('✅ Database connections closed');
      } catch (error) {
        console.warn('⚠️ Database connection cleanup failed:', error);
      }
      
      // Close cache connections
      try {
        await cache.quit();
        console.log('✅ Cache connections closed');
      } catch (error) {
        console.warn('⚠️ Cache connection cleanup failed:', error);
      }
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  return server;
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function start() {
  try {
    console.log('🚀 Starting True Crime API Server...');
    
    // Check database connection
    console.log('🔍 Checking database connection...');
    const dbHealthy = await prisma.healthCheck();
    if (!dbHealthy) {
      if (process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Database connection failed - running in development mode without database');
      } else {
        console.error('❌ Database connection failed');
        process.exit(1);
      }
    } else {
      console.log('✅ Database connection healthy');
    }
    
    // Create and start server
    const server = await createServer();
    
    await server.listen({
      port: PORT,
      host: HOST,
    });
    
    console.log(`✅ Server listening on http://${HOST}:${PORT}`);
    console.log(`📚 API Documentation: http://${HOST}:${PORT}/api/docs`);
    console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
    console.log(`🔧 Environment: ${NODE_ENV}`);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

export { createServer, start };