# API Gateway Dockerfile
FROM node:18-alpine

# Create non-root user and group
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Install dumb-init and curl
RUN apk add --no-cache dumb-init curl

# Copy package files (assuming monorepo structure, paths relative to backend-service root)
COPY --chown=appuser:appgroup package*.json ./
COPY --chown=appuser:appgroup services/gateway/package*.json ./services/gateway/

# Install dependencies (including devDependencies for build)
# This installs dependencies for the root package.json and the gateway's package.json if distinct.
# If gateway uses workspace, npm ci in root should handle it. Assuming separate for now.
RUN npm ci && npm cache clean --force
# If services/gateway has its own node_modules, might need:
# RUN cd services/gateway && npm ci && npm cache clean --force && cd /app

# Copy shared utilities
COPY --chown=appuser:appgroup shared/ ./shared/

# Copy gateway source code
COPY --chown=appuser:appgroup services/gateway/src/ ./services/gateway/src/
COPY --chown=appuser:appgroup services/gateway/tsconfig.json ./services/gateway/

# Set user before build and run, if possible, or ensure all files created are owned by appuser.
# For simplicity with npm build potentially creating files as current user:
# Change ownership of everything copied so far to appuser
RUN chown -R appuser:appgroup /app

USER appuser
WORKDIR /app/services/gateway

# Build the application
RUN npm run build

# Prune devDependencies after build
RUN npm prune --production && npm cache clean --force

# Switch back to /app if npm start is expected from root of WORKDIR /app for gateway
# This depends on how CMD ["npm", "start"] is configured in its package.json
WORKDIR /app
# If start script is in services/gateway/package.json and uses relative paths, then:
# WORKDIR /app/services/gateway

# Expose port
EXPOSE 3000

# Health check - ensure path to healthcheck script is correct if one is used by CMD
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
# The CMD depends on where package.json's start script for gateway is meant to be run from.
# If gateway's package.json is at services/gateway/package.json, and it has "start": "node dist/server.js"
# And CWD should be services/gateway:
# CMD ["npm", "start", "--prefix", "services/gateway"]
# Or if WORKDIR is already /app/services/gateway:
CMD ["npm", "start"]
