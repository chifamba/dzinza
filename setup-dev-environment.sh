#!/bin/bash

# Dzinza Genealogy Platform - Development Environment Setup
# This script sets up the complete development environment for the Dzinza platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on macOS
# check_os() {
#     if [[ "$OSTYPE" != "darwin"* ]]; then
#         log_error "This script is designed for macOS. Please adapt for your OS."
#         exit 1
#     fi
#     log_info "Running on macOS ✓"
# }

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        log_info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    else
        log_success "Homebrew is already installed ✓"
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_info "Installing Docker Desktop..."
        brew install --cask docker
        log_warning "Please start Docker Desktop manually and return to continue"
        read -p "Press enter to continue once Docker is running..."
    else
        log_success "Docker is already installed ✓"
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_info "Installing Docker Compose..."
        brew install docker-compose
    else
        log_success "Docker Compose is already installed ✓"
    fi

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_info "Installing Node.js via nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        source ~/.bashrc
        nvm install 20
        nvm use 20
    else
        log_success "Node.js is already installed ✓"
        node --version
    fi
    
    # Check if Kubernetes CLI is installed
    if ! command -v kubectl &> /dev/null; then
        log_info "Installing kubectl..."
        brew install kubectl
    else
        log_success "kubectl is already installed ✓"
    fi
    
    # Check if Helm is installed
    if ! command -v helm &> /dev/null; then
        log_info "Installing Helm..."
        brew install helm
    else
        log_success "Helm is already installed ✓"
    fi
}

# Setup project directories
setup_directories() {
    log_info "Setting up project directories..."
    
    mkdir -p {logs,storage,monitoring/prometheus,monitoring/grafana/{dashboards,datasources}}
    mkdir -p database/{init,mongo-init}
    mkdir -p backend/services/{auth,genealogy,search,storage}/src
    
    log_success "Project directories created ✓"
}

# Generate environment variables
generate_env_files() {
    log_info "Generating environment files..."
    
    # Generate random passwords and secrets
    DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9')
    MONGO_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9')
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9')
    JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9')
    API_KEY=$(openssl rand -hex 32) # hex output is already safe
    GRAFANA_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9')
    
    # Create .env file
    cat > .env << EOF
# Database Configuration
DB_PASSWORD=${DB_PASSWORD}
MONGO_PASSWORD=${MONGO_PASSWORD}
REDIS_PASSWORD=${REDIS_PASSWORD}

# Authentication & Security
JWT_SECRET=${JWT_SECRET}
API_KEY=${API_KEY}
BCRYPT_ROUNDS=12

# AWS Configuration (update with your values)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET=dzinza-storage-bucket

# Monitoring
GRAFANA_PASSWORD=${GRAFANA_PASSWORD}

# Application Configuration
NODE_ENV=development
LOG_LEVEL=debug
API_RATE_LIMIT=100
MAX_FILE_SIZE=10MB

# Development settings
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
ALLOWED_HOSTS=localhost,*.localhost
EOF
    
    log_success "Environment file created with secure passwords ✓"
    log_warning "Please update AWS credentials in .env file"
}

# Install dependencies
install_dependencies() {
    log_info "Installing frontend dependencies..."
    npm install
    
    log_info "Installing backend dependencies..."
    cd backend
    npm install --legacy-peer-deps
    cd ..
    
    # Install global tools
    log_info "Installing global development tools..."
    sudo npm install -g @lhci/cli artillery axe-core @axe-core/cli pa11y
    
    log_success "Dependencies installed ✓"
}

# Setup database initialization scripts
setup_database_scripts() {
    log_info "Setting up database initialization scripts..."
    
    # PostgreSQL initialization
    cat > database/init/01-init-database.sql << 'EOF'
-- Dzinza Database Initialization Script

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    preferred_language VARCHAR(2) DEFAULT 'en',
    email_verified BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create refresh tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Insert default admin user (password: AdminPassword123!)
INSERT INTO users (email, password_hash, first_name, last_name, email_verified) 
VALUES (
    'admin@dzinza.com',
    crypt('AdminPassword123!', gen_salt('bf', 12)),
    'Admin',
    'User',
    true
);
EOF
    
    # MongoDB initialization
    cat > database/mongo-init/init-mongo.js << 'EOF'
// Dzinza MongoDB Initialization Script

// Switch to dzinza_genealogy database
db = db.getSiblingDB('dzinza_genealogy');

// Create collections with validation
db.createCollection('family_trees', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['userId', 'name', 'createdAt'],
            properties: {
                userId: { bsonType: 'string' },
                name: { bsonType: 'string' },
                description: { bsonType: 'string' },
                privacy: { enum: ['public', 'private', 'family'] },
                members: {
                    bsonType: 'array',
                    items: {
                        bsonType: 'object',
                        required: ['id', 'name'],
                        properties: {
                            id: { bsonType: 'string' },
                            name: { bsonType: 'string' },
                            birthDate: { bsonType: 'date' },
                            deathDate: { bsonType: 'date' },
                            relationships: { bsonType: 'array' }
                        }
                    }
                },
                createdAt: { bsonType: 'date' },
                updatedAt: { bsonType: 'date' }
            }
        }
    }
});

db.createCollection('dna_profiles', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['userId', 'profileId', 'uploadDate'],
            properties: {
                userId: { bsonType: 'string' },
                profileId: { bsonType: 'string' },
                ethnicity: { bsonType: 'object' },
                matches: { bsonType: 'array' },
                uploadDate: { bsonType: 'date' }
            }
        }
    }
});

// Create indexes
db.family_trees.createIndex({ userId: 1 });
db.family_trees.createIndex({ privacy: 1 });
db.dna_profiles.createIndex({ userId: 1 });
db.dna_profiles.createIndex({ profileId: 1 }, { unique: true });

// Insert sample data
db.family_trees.insertOne({
    userId: 'sample-user-id',
    name: 'Sample Family Tree',
    description: 'A sample family tree for testing',
    privacy: 'private',
    members: [],
    createdAt: new Date(),
    updatedAt: new Date()
});

print('MongoDB initialization completed successfully');
EOF
    
    log_success "Database initialization scripts created ✓"
}

# Setup monitoring configuration
setup_monitoring() {
    log_info "Setting up monitoring configuration..."
    
    # Prometheus configuration
    cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  # - "first_rules.yml"
  # - "second_rules.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'dzinza-frontend'
    static_configs:
      - targets: ['frontend:80']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'dzinza-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'dzinza-auth-service'
    static_configs:
      - targets: ['auth-service:3002']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'dzinza-genealogy-service'
    static_configs:
      - targets: ['genealogy-service:3003']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
    metrics_path: '/metrics'
    scrape_interval: 30s
EOF
    
    # Grafana datasource
    cat > monitoring/grafana/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF
    
    log_success "Monitoring configuration created ✓"
}

# Start development environment
start_dev_environment() {
    log_info "Starting development environment..."
    
    # Pull required Docker images
    log_info "Pulling Docker images..."
    sudo /home/linuxbrew/.linuxbrew/bin/docker-compose pull
    
    # Start the development stack
    log_info "Starting Docker containers..."
    sudo /home/linuxbrew/.linuxbrew/bin/docker-compose up -d postgres redis mongodb elasticsearch
    
    # Wait for databases to be ready
    log_info "Waiting for databases to be ready..."
    sleep 30
    
    # Check if databases are accessible
    if sudo /home/linuxbrew/.linuxbrew/bin/docker-compose exec postgres pg_isready -U dzinza_user -d dzinza_db; then
        log_success "PostgreSQL is ready ✓"
    else
        log_error "PostgreSQL failed to start"
        exit 1
    fi
    
    if sudo /home/linuxbrew/.linuxbrew/bin/docker-compose exec redis redis-cli ping; then
        log_success "Redis is ready ✓"
    else
        log_error "Redis failed to start"
        exit 1
    fi
    
    log_success "Development environment started ✓"
}

# Create development scripts
create_dev_scripts() {
    log_info "Creating development scripts..."
    mkdir -p scripts
    
    # Start script
    cat > scripts/start-dev.sh << 'EOF'
#!/bin/bash
# Start development environment

echo "Starting Dzinza development environment..."

# Start backend services
docker-compose up -d postgres redis mongodb elasticsearch

# Wait for services
sleep 15

# Start backend in development mode
cd backend && npm run dev &

# Start frontend in development mode
npm run dev

echo "Development environment is running!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:3001"
echo "API Docs: http://localhost:3001/api/docs"
EOF
    
    # Stop script
    cat > scripts/stop-dev.sh << 'EOF'
#!/bin/bash
# Stop development environment

echo "Stopping Dzinza development environment..."

# Stop all containers
docker-compose down

# Kill any running Node processes
pkill -f "npm run dev" || true
pkill -f "nodemon" || true

echo "Development environment stopped."
EOF
    
    # Test script
    cat > scripts/run-tests.sh << 'EOF'
#!/bin/bash
# Run all tests

echo "Running Dzinza test suite..."

# Frontend tests
echo "Running frontend tests..."
npm run test:coverage

# Backend tests
echo "Running backend tests..."
cd backend && npm run test:coverage && cd ..

# E2E tests
echo "Running E2E tests..."
npm run test:e2e

# Accessibility tests
echo "Running accessibility tests..."
npm run test:accessibility

echo "All tests completed!"
EOF
    
    # Make scripts executable
    chmod +x scripts/*.sh
    
    log_success "Development scripts created ✓"
}

# Setup VS Code workspace
setup_vscode() {
    log_info "Setting up VS Code workspace..."
    
    mkdir -p .vscode
    
    # VS Code settings
    cat > .vscode/settings.json << 'EOF'
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true,
    "**/.DS_Store": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  },
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
EOF
    
    # VS Code launch configuration
    cat > .vscode/launch.json << 'EOF'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/vite",
      "args": ["dev"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/server.ts",
      "cwd": "${workspaceFolder}/backend",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal",
      "runtimeArgs": ["--loader", "ts-node/esm"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
EOF
    
    # VS Code tasks
    cat > .vscode/tasks.json << 'EOF'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Development Environment",
      "type": "shell",
      "command": "./scripts/start-dev.sh",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Stop Development Environment",
      "type": "shell",
      "command": "./scripts/stop-dev.sh",
      "group": "build"
    },
    {
      "label": "Run All Tests",
      "type": "shell",
      "command": "./scripts/run-tests.sh",
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Build Frontend",
      "type": "shell",
      "command": "npm run build",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "silent"
      }
    },
    {
      "label": "Build Backend",
      "type": "shell",
      "command": "npm run build",
      "options": {
        "cwd": "${workspaceFolder}/backend"
      },
      "group": "build"
    }
  ]
}
EOF
    
    # Recommended extensions
    cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode-remote.remote-containers",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "gruntfuggly.todo-tree",
    "streetsidesoftware.code-spell-checker"
  ]
}
EOF
    
    log_success "VS Code workspace configured ✓"
}

# Print next steps
print_next_steps() {
    log_success "Development environment setup completed! 🎉"
    echo
    log_info "Next steps:"
    echo "1. Update AWS credentials in .env file"
    echo "2. Run './scripts/start-dev.sh' to start the development environment"
    echo "3. Open VS Code and install recommended extensions"
    echo "4. Visit http://localhost:3000 for the frontend"
    echo "5. Visit http://localhost:3001/api/docs for API documentation"
    echo
    log_info "Available scripts:"
    echo "• ./scripts/start-dev.sh  - Start development environment"
    echo "• ./scripts/stop-dev.sh   - Stop development environment"
    echo "• ./scripts/run-tests.sh  - Run all tests"
    echo
    log_info "Monitoring:"
    echo "• Grafana: http://localhost:3000 (admin / ${GRAFANA_PASSWORD})"
    echo "• Prometheus: http://localhost:9090"
    echo
    log_warning "Remember to start Docker Desktop before running the development environment!"
}

# Main execution
main() {
    echo "🚀 Dzinza Genealogy Platform - Development Environment Setup"
    echo "=========================================================="
    echo
    
    # check_os
    check_prerequisites
    setup_directories
    generate_env_files
    install_dependencies
    setup_database_scripts
    setup_monitoring
    create_dev_scripts
    setup_vscode
    start_dev_environment
    print_next_steps
}

# Run main function
main "$@"
