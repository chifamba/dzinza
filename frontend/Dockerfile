# Dzinza Genealogy Platform - Multi-stage Dockerfile
# Production-optimized container for React frontend

# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Install dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built assets
# Install curl for healthcheck
RUN apk add --no-cache curl

# Create a non-root user and group for Nginx worker processes
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Ensure appuser has access to necessary directories
RUN mkdir -p /var/cache/nginx /var/run/nginx && \
    chown -R appuser:appgroup /var/cache/nginx /var/run/nginx && \
    # Create log directory with proper permissions
    mkdir -p /var/log/nginx && \
    chown -R appuser:appgroup /var/log/nginx

# Change ownership of static content to appuser
COPY --chown=appuser:appgroup --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

USER appuser

EXPOSE 8080

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
