# Dzinza Backend API Gateway - Multi-stage Dockerfile
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including devDependencies for build)
RUN npm install && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build
# Optional: Prune dev dependencies if node_modules are copied directly
# RUN npm prune --production && npm cache clean --force


# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user and group
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Install dumb-init for signal handling and curl for healthcheck
RUN apk add --no-cache dumb-init curl

# Copy built application, node_modules, and package files from build stage
COPY --chown=appuser:appgroup --from=build /app/dist ./dist
COPY --chown=appuser:appgroup --from=build /app/node_modules ./node_modules
COPY --chown=appuser:appgroup --from=build /app/package.json ./package.json
# Also copy package-lock.json if it's used by npm start or for consistency
COPY --chown=appuser:appgroup --from=build /app/package-lock.json ./package-lock.json


# Create uploads directory and set ownership
RUN mkdir -p uploads && chown appuser:appgroup uploads

# Ensure /app directory itself is owned by appuser
RUN chown appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
