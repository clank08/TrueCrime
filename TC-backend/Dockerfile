# Production-ready Dockerfile for True Crime Backend
# Multi-stage build for optimal image size and security

# ============================================================================
# Stage 1: Dependencies Installation
# ============================================================================
FROM node:20-alpine AS dependencies

# Set working directory
WORKDIR /app

# Install dependencies required for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies with production optimizations
RUN npm ci --only=production --no-audit --no-fund \
    && npm cache clean --force

# ============================================================================
# Stage 2: Build Stage
# ============================================================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci --no-audit --no-fund

# Copy source code
COPY . .

# Build TypeScript application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# ============================================================================
# Stage 3: Production Runtime
# ============================================================================
FROM node:20-alpine AS production

# Install security updates and necessary packages
RUN apk update && apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S truecrime -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=truecrime:nodejs /app/dist ./dist
COPY --from=builder --chown=truecrime:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=truecrime:nodejs /app/package*.json ./

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/temp \
    && chown -R truecrime:nodejs /app

# Set environment variables for production
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV PORT=3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Switch to non-root user
USER truecrime

# Expose application port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]

# ============================================================================
# Build Arguments and Labels
# ============================================================================
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL maintainer="True Crime App Team" \
      org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.name="truecrime-backend" \
      org.label-schema.description="True Crime tracking app backend service" \
      org.label-schema.url="https://github.com/truecrime/app" \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.vcs-url="https://github.com/truecrime/app" \
      org.label-schema.vendor="True Crime App" \
      org.label-schema.version=$VERSION \
      org.label-schema.schema-version="1.0"

# ============================================================================
# Development Stage (Optional - for development use)
# ============================================================================
FROM node:20-alpine AS development

# Install development tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including dev dependencies
RUN npm ci

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S truecrime -u 1001 \
    && chown -R truecrime:nodejs /app

USER truecrime

EXPOSE 3000

# Development command with hot reload
CMD ["npm", "run", "dev"]