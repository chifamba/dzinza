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
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf # Typically owned by root, Nginx master reads it

# Install curl for healthcheck
RUN apk add --no-cache curl

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Create a non-root user and group for Nginx worker processes
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Nginx typically needs write access to certain directories.
# The official nginx image's entrypoint script often handles this.
# For a basic alpine/nginx, we might need to ensure these are writable by appuser if nginx runs as appuser.
# However, the master process usually starts as root and forks workers as the configured user.
# If nginx.conf specifies 'user appuser;', that user needs access.
# /var/cache/nginx, /var/log/nginx (if used), /run/nginx (for pid)
# For simplicity, we'll assume nginx.conf is correctly set up to use 'appuser'
# and that the base nginx:alpine image handles basic directory permissions
# for its default 'nginx' user, or that nginx.conf directs logs to stdout/stderr.
# What we must do is ensure the USER directive is set.

# Change ownership of static content if needed, though Nginx usually just needs to read it.
# COPY --chown=appuser:appgroup --from=build /app/dist /usr/share/nginx/html
# For now, default ownership (root) for /usr/share/nginx/html is fine as nginx workers (even as appuser) can read it.

USER appuser # This will make CMD run as appuser. Nginx master process might complain if it needs root for certain ops (like binding to port 80).
             # Ideally, Nginx starts as root, reads config, then forks workers as 'appuser'.
             # The 'user' directive in nginx.conf is key.

EXPOSE 80

# This will attempt to start Nginx as 'appuser'.
# If nginx.conf listens on port 80, 'appuser' won't have permission.
# Nginx typically needs to be started as root to bind to privileged ports, then drops privileges for worker processes.
# The constraint of not changing nginx.conf makes this tricky.
# A common workaround is to use authbind or set capabilities, or run on a non-privileged port.
# For this subtask, I will set USER appuser as requested and note the port 80 challenge.
CMD ["nginx", "-g", "daemon off;"]
