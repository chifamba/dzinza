# Installation Guide

This guide provides detailed instructions for setting up the Dzinza genealogy platform in different environments.

## Development Environment

### Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later (or yarn 1.22+)
- **Git** 2.30 or later
- **Docker** (optional, for containerized development)
- **VS Code** (recommended IDE)

### Step-by-Step Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/dzinza/dzinza.git
cd dzinza
```

#### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

#### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Application
VITE_APP_NAME=Dzinza
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=development

# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_API_TIMEOUT=30000

# Authentication
VITE_JWT_SECRET=your-jwt-secret-here
VITE_JWT_EXPIRES_IN=7d

# Database (for backend)
DATABASE_URL=postgresql://username:password@localhost:5432/dzinza_dev
REDIS_URL=redis://localhost:6379

# External Services
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_SENTRY_DSN=your-sentry-dsn
```

#### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Production Environment

### Using Docker

#### 1. Build Docker Image

```bash
docker build -t dzinza-app .
```

#### 2. Run Container

```bash
docker run -p 3000:3000 -e NODE_ENV=production dzinza-app
```

### Using Docker Compose

#### 1. Create docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: dzinza
      POSTGRES_USER: dzinza_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

#### 2. Start Services

```bash
docker-compose up -d
```

## Database Setup

### PostgreSQL

#### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### 2. Create Database

```bash
createdb dzinza_dev
```

#### 3. Run Migrations

```bash
npm run db:migrate
```

### Redis

#### 1. Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

## IDE Setup

### VS Code Extensions

Recommended extensions for development:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json",
    "ms-playwright.playwright",
    "ms-vscode.vscode-jest"
  ]
}
```

### Configuration

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process using port 5173
lsof -ti:5173 | xargs kill -9
```

#### Permission Errors
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

#### Node Version Issues
Use Node Version Manager (nvm):
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 18
nvm install 18
nvm use 18
```

### Getting Help

- Check the [FAQ](./FAQ.md)
- Search [GitHub Issues](https://github.com/dzinza/dzinza/issues)
- Join our [Discord Community](https://discord.gg/dzinza)
- Email support: support@dzinza.com
