# Multi-stage build for optimal image size
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY auth-service/package*.json ./
COPY auth-service/tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy shared utilities
COPY backend-service/shared ./shared

# Copy source code
COPY auth-service/src ./src

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS production

# Create non-root user and group
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Copy package files and install production dependencies only
# Ensure files copied are owned by the non-root user
COPY --chown=appuser:appgroup auth-service/package*.json ./
RUN npm ci --production && npm cache clean --force

# Copy built application and shared utilities from builder stage
# Ensure these are also owned by the non-root user
COPY --chown=appuser:appgroup --from=builder /app/dist ./dist/
COPY --chown=appuser:appgroup --from=builder /app/shared ./shared/

# Ensure the /app directory itself is owned by appuser.
# WORKDIR creates /app as root, COPY --chown handles contents.
RUN chown appuser:appgroup /app
USER appuser

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js || exit 1

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
