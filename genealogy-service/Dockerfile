# Multi-stage build for optimal image size
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY genealogy-service/package.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy shared utilities
COPY backend-service/shared ./shared

# Copy source code
COPY genealogy-service/src ./src

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Copy package files and install production dependencies only
COPY genealogy-service/package.json ./
RUN npm install --production

# Copy built application and shared utilities
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/shared ./shared/

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js || exit 1

# Start the application
CMD ["npm", "start"]
