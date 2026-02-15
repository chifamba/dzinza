# Dzinza Frontend - Development Dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the frontend source
COPY . .

EXPOSE 5173

# --host 0.0.0.0 is required so Vite listens on all interfaces,
# allowing Docker to forward traffic into the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
