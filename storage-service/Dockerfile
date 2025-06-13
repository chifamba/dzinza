# Multi-stage build for optimal image size
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY storage-service/package*.json ./
COPY storage-service/tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY storage-service/src/ ./src/
COPY backend-service/shared/ ./shared/

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S storage && \
    adduser -S storage -u 1001

# Set working directory
WORKDIR /app

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Copy package files and install production dependencies
COPY storage-service/package*.json ./
RUN npm ci --production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist/
COPY --from=builder /app/shared ./shared/

# Create necessary directories
RUN mkdir -p /app/uploads /app/temp && \
    chown -R storage:storage /app

# Switch to non-root user
USER storage

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
  const options = { host: 'localhost', port: 3005, path: '/health', timeout: 2000 }; \
  const req = http.request(options, (res) => { \
    console.log('STATUS: ' + res.statusCode); \
    process.exit(res.statusCode === 200 ? 0 : 1); \
  }); \
  req.on('error', (err) => { \
    console.log('ERROR: ' + err.message); \
    process.exit(1); \
  }); \
  req.end();"

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
