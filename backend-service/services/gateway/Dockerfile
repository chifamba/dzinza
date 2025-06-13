# API Gateway Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY services/gateway/package*.json ./services/gateway/
RUN npm ci --only=production

# Copy shared utilities
COPY shared/ ./shared/

# Copy gateway source code
COPY services/gateway/src/ ./services/gateway/src/
COPY services/gateway/tsconfig.json ./services/gateway/

# Build the application
WORKDIR /app/services/gateway
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]
