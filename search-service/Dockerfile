# Multi-stage build for optimal image size
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies (including dev dependencies for build)
COPY package.json ./
RUN npm install

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dzinza -u 1001

WORKDIR /app

# Install dumb-init for signal handling
RUN apk add --no-cache dumb-init

# Copy package files and install production dependencies only
COPY package.json ./
RUN npm install --production

# Copy built application
COPY --from=builder /app/dist ./dist/

# Change ownership of the app directory
RUN chown -R dzinza:nodejs /app
USER dzinza

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the application
CMD ["npm", "start"]
