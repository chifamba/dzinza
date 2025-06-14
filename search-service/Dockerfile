# Multi-stage build for optimal image size
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies (including dev dependencies for build)
COPY package.json ./
COPY package-lock.json ./
RUN npm ci && npm cache clean --force

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS production

# Create non-root user and group
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

WORKDIR /app

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Copy package files and install production dependencies only
COPY --chown=appuser:appgroup package.json ./
COPY --chown=appuser:appgroup package-lock.json ./
RUN npm ci --production && npm cache clean --force

# Copy built application
COPY --chown=appuser:appgroup --from=builder /app/dist ./dist/

# Ensure the /app directory itself is owned by appuser
RUN chown appuser:appgroup /app
USER appuser

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
