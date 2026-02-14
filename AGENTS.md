# AI Agent Context for Dzinza Project

This document provides essential context for AI coding assistants (GitHub Copilot, Gemini, Claude, etc.) working with the Dzinza project.

## Project Overview

Dzinza is a decentralized, community-driven genealogy platform enabling users to collaboratively build and verify family trees. The platform emphasizes data privacy, integrity, and trustworthiness through a microservices architecture.

**Core Technology:** Graph database (Neo4j) modeling family trees, relationships, and user trust levels.

## Architecture

### Microservices Structure

#### Frontend

- **Technology:** React with TypeScript
- **Build Tool:** Vite
- **Testing:** Vitest, Playwright (E2E)
- **Location:** `frontend/`
- **Dev Commands:**
  ```bash
  npm run dev      # Development server
  npm run build    # Production build
  npm run test     # Run unit tests
  npm run test:e2e # Run E2E tests
  npm run lint     # Run ESLint
  npm run format   # Run Prettier
  ```

#### Backend Services

- **Language:** Go 1.26+
- **HTTP Framework:** Gin
- **Location:** `services/<service_name>/`
- **Project Layout:**
  ```
  services/<service_name>/
  ├── cmd/
  │   └── main.go           # Entry point
  ├── internal/
  │   ├── handlers/         # HTTP route handlers
  │   ├── models/           # Data models (GORM structs, DTOs)
  │   ├── repository/       # Database access layer
  │   ├── service/          # Business logic
  │   └── middleware/       # Auth, logging, CORS middleware
  ├── tests/                # Integration and unit tests
  │   ├── unit/
  │   └── integration/
  ├── Dockerfile
  ├── .golangci.yml         # Linter configuration
  ├── go.mod
  └── go.sum
  ```
- **Shared Code:** `services/pkg/` — Common logging, health checks, auth middleware, config, response helpers
- **Primary Services:**
  - `auth_service` — Authentication and authorization (PostgreSQL, Redis)
  - `genealogy_service` — Family tree management (Neo4j)
  - `media_storage_service` — File/media storage (Garage S3)
  - `search_discovery_service` — Search functionality (Elasticsearch)
  - `notification_service` — User notifications (PostgreSQL, Redis)
  - See `docs/Full_Requirements_Spec.md` for the complete service inventory (15 services)

#### Data Layer

- **Neo4j:** Primary genealogy data (graph structure)
- **PostgreSQL:** Relational data, user accounts
- **MongoDB:** Document storage (support tickets)
- **Redis:** Caching, session management, Pub/Sub event bus
- **Elasticsearch:** Full-text search indexing

#### Infrastructure

- **Docker Compose:** Local orchestration
- **Prometheus & Grafana:** Monitoring and metrics
- **Garage:** S3-compatible object storage (3-node cluster)
- **MailHog:** Local SMTP capture for email testing

## Development Workflow

### Quick Start

```bash
# Start infrastructure services (databases, cache, storage)
docker compose up -d

# Start frontend dev server
cd frontend && npm install && npm run dev

# Run a Go service locally (example: auth)
cd services/auth_service && go run cmd/main.go
```

### Key Libraries (Go)

| Purpose | Library |
|---------|---------|
| HTTP Framework | `github.com/gin-gonic/gin` |
| PostgreSQL ORM | `gorm.io/gorm` + `gorm.io/driver/postgres` (pgx) |
| Neo4j Driver | `github.com/neo4j/neo4j-go-driver/v5` |
| MongoDB Driver | `go.mongodb.org/mongo-driver` |
| JWT | `github.com/golang-jwt/jwt/v5` |
| Redis | `github.com/redis/go-redis/v9` |
| Validation | `github.com/go-playground/validator/v10` |
| Config | `github.com/spf13/viper` or `github.com/caarlos0/env` |
| Logging | `log/slog` (stdlib) or `github.com/rs/zerolog` |
| OpenAPI | `github.com/swaggo/swag` |
| S3 Client | `github.com/aws/aws-sdk-go-v2` |
| Testing | `github.com/stretchr/testify` |
| Mocking | `github.com/stretchr/testify/mock` or `github.com/golang/mock` |
| Test Containers | `github.com/testcontainers/testcontainers-go` |

### Project Structure

```
dzinza/
├── frontend/              # React TypeScript SPA
├── services/              # Go microservices
│   ├── pkg/               # Shared Go packages (logging, auth, config)
│   ├── auth_service/      # Authentication service
│   ├── genealogy_service/ # Family tree logic
│   └── .../               # Other services
├── docs/                  # Requirements spec, OpenAPI specs
│   ├── Full_Requirements_Spec.md
│   └── openapi/           # Per-service OpenAPI YAML files
├── database/              # DB init scripts
├── scripts/               # Development and deployment scripts
├── k8s/                   # Kubernetes manifests
├── secrets/               # Docker secrets (git-ignored)
└── docker-compose.yml     # Local development orchestration
```

---

## Engineering Standards & Best Practices

### Code Quality Standards

#### Go Services - Mandatory Requirements

##### 1. Code Organization & Structure

**ALWAYS follow this project structure:**
```
services/<service_name>/
├── cmd/
│   └── main.go              # Minimal entry point (5-30 lines)
├── internal/
│   ├── handlers/            # HTTP handlers (thin, delegate to service)
│   │   ├── handler.go       # Main handler struct
│   │   ├── routes.go        # Route registration
│   │   └── *_handler.go     # Individual endpoint handlers
│   ├── models/              # Data models
│   │   ├── domain.go        # Core domain models
│   │   ├── dto.go           # Data Transfer Objects (API requests/responses)
│   │   └── errors.go        # Custom error types
│   ├── repository/          # Data access layer
│   │   ├── repository.go    # Repository interface
│   │   └── *_repository.go  # Implementations (postgres, neo4j, etc.)
│   ├── service/             # Business logic
│   │   ├── service.go       # Service interface
│   │   └── *_service.go     # Service implementations
│   └── middleware/          # Custom middleware
├── tests/
│   ├── unit/                # Unit tests
│   └── integration/         # Integration tests
├── Dockerfile
├── .golangci.yml            # Linter config
├── go.mod
└── go.sum
```

**Key Principles:**
- **Dependency Injection:** Use constructor functions, interfaces for testability
- **Interface Segregation:** Small, focused interfaces (repository, service layers)
- **Layered Architecture:** Handler → Service → Repository
- **No Business Logic in Handlers:** Handlers validate input, call service, return response
- **Single Responsibility:** Each file/package has one clear purpose

##### 2. Error Handling

**MANDATORY error handling patterns:**

```go
// ✅ CORRECT: Wrap errors with context
if err != nil {
    return fmt.Errorf("failed to create user: %w", err)
}

// ✅ CORRECT: Custom error types for domain errors
var (
    ErrUserNotFound = errors.New("user not found")
    ErrInvalidInput = errors.New("invalid input")
)

// ✅ CORRECT: Structured logging with context
logger.Error("database operation failed",
    slog.String("operation", "insert"),
    slog.String("table", "users"),
    slog.Any("error", err),
)

// ❌ WRONG: Silent error ignoring
result, _ := doSomething()

// ❌ WRONG: Generic error messages
return errors.New("error")

// ❌ WRONG: Panic in production code (except init/unrecoverable)
panic("something went wrong")
```

**Error Response Standards:**
```go
// Use consistent error response structure
type ErrorResponse struct {
    Error   string `json:"error"`
    Message string `json:"message"`
    Code    string `json:"code,omitempty"`
    Details any    `json:"details,omitempty"`
}

// HTTP status code mapping
// 400 - Validation errors, bad input
// 401 - Unauthenticated
// 403 - Unauthorized (authenticated but forbidden)
// 404 - Resource not found
// 409 - Conflict (duplicate, constraint violation)
// 422 - Unprocessable entity (semantic errors)
// 500 - Internal server error
```

##### 3. Input Validation

**ALWAYS validate at multiple layers:**

```go
// ✅ Layer 1: Struct tags (automatic validation)
type CreateUserRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=8,max=72"`
    Name     string `json:"name" binding:"required,min=2,max=100"`
}

// ✅ Layer 2: Custom validation in service layer
func (s *UserService) CreateUser(ctx context.Context, req CreateUserRequest) error {
    // Business rule validation
    if s.repo.EmailExists(ctx, req.Email) {
        return ErrEmailAlreadyExists
    }
    // Additional domain validation
    if containsProfanity(req.Name) {
        return ErrInvalidName
    }
    // ...
}

// ✅ Layer 3: Database constraints (last line of defense)
// Schema: UNIQUE, NOT NULL, CHECK constraints
```

**Input Sanitization:**
```go
import "html"

// Sanitize user input to prevent XSS
sanitized := html.EscapeString(userInput)

// Use parameterized queries (GORM/pgx handles this)
db.Where("email = ?", email).First(&user)

// Never use string concatenation for queries
// ❌ WRONG: db.Raw("SELECT * FROM users WHERE email = '" + email + "'")
```

##### 4. Database Operations

**Transaction Management:**
```go
// ✅ CORRECT: Use transactions for multi-step operations
func (r *UserRepository) CreateUserWithProfile(ctx context.Context, user User, profile Profile) error {
    return r.db.Transaction(func(tx *gorm.DB) error {
        if err := tx.Create(&user).Error; err != nil {
            return err
        }
        profile.UserID = user.ID
        if err := tx.Create(&profile).Error; err != nil {
            return err
        }
        return nil
    })
}

// ✅ CORRECT: Context timeout for queries
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
result := db.WithContext(ctx).Find(&users)
```

**Query Optimization:**
```go
// ✅ Use eager loading to prevent N+1 queries
db.Preload("Profile").Preload("Roles").Find(&users)

// ✅ Select only needed columns
db.Select("id", "email", "name").Find(&users)

// ✅ Use pagination for large datasets
db.Limit(limit).Offset(offset).Find(&users)

// ❌ WRONG: Loading entire table into memory
db.Find(&users) // on a 1M row table
```

##### 5. Testing Requirements

**Coverage Requirements:**
- **Business Logic (services/):** Minimum 85% coverage
- **Handlers:** Minimum 70% coverage
- **Repositories:** Minimum 75% coverage (use testcontainers for DB tests)
- **Overall Project:** Minimum 80% coverage

**Test Structure:**
```go
// ✅ CORRECT: Table-driven tests
func TestUserService_CreateUser(t *testing.T) {
    tests := []struct {
        name    string
        input   CreateUserRequest
        setup   func(*mocks.MockRepository)
        wantErr error
    }{
        {
            name: "valid user creation",
            input: CreateUserRequest{
                Email: "test@example.com",
                Password: "SecurePass123",
            },
            setup: func(m *mocks.MockRepository) {
                m.On("Create", mock.Anything, mock.Anything).Return(nil)
            },
            wantErr: nil,
        },
        {
            name: "duplicate email",
            input: CreateUserRequest{
                Email: "duplicate@example.com",
                Password: "SecurePass123",
            },
            setup: func(m *mocks.MockRepository) {
                m.On("EmailExists", mock.Anything, "duplicate@example.com").Return(true)
            },
            wantErr: ErrEmailAlreadyExists,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            mockRepo := new(mocks.MockRepository)
            tt.setup(mockRepo)
            
            svc := NewUserService(mockRepo)
            err := svc.CreateUser(context.Background(), tt.input)
            
            if tt.wantErr != nil {
                assert.ErrorIs(t, err, tt.wantErr)
            } else {
                assert.NoError(t, err)
            }
            mockRepo.AssertExpectations(t)
        })
    }
}
```

**Integration Tests with Testcontainers:**
```go
func TestUserRepository_Integration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping integration test")
    }

    // Setup PostgreSQL testcontainer
    ctx := context.Background()
    postgresContainer, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:16-alpine"),
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("testuser"),
        postgres.WithPassword("testpass"),
    )
    require.NoError(t, err)
    defer postgresContainer.Terminate(ctx)

    // Get connection string and setup DB
    connStr, err := postgresContainer.ConnectionString(ctx)
    require.NoError(t, err)
    
    db, err := gorm.Open(postgres.Open(connStr), &gorm.Config{})
    require.NoError(t, err)
    
    // Run migrations
    err = db.AutoMigrate(&User{})
    require.NoError(t, err)

    // Run actual tests
    repo := NewUserRepository(db)
    // ... test repository methods
}
```

**Test Commands:**
```bash
# Run all tests
go test ./...

# Run with coverage
go test ./... -cover -coverprofile=coverage.out

# View coverage in browser
go tool cover -html=coverage.out

# Run only unit tests (exclude integration)
go test ./... -short

# Run with race detector
go test ./... -race

# Verbose output
go test ./... -v
```

##### 6. Linting & Code Quality

**golangci-lint Configuration (.golangci.yml):**
```yaml
linters:
  enable:
    - errcheck        # Check error returns
    - gosimple        # Simplify code
    - govet           # Go vet
    - ineffassign     # Detect ineffectual assignments
    - staticcheck     # Advanced static analysis
    - unused          # Detect unused code
    - gofmt           # Check formatting
    - goimports       # Check imports
    - misspell        # Fix common misspellings
    - gocritic        # Comprehensive checks
    - revive          # Replacement for golint
    - gosec           # Security checks
    - bodyclose       # HTTP response body closure
    - nolintlint      # Ill-formed nolint directives
    - stylecheck      # Style checks
    - cyclop          # Cyclomatic complexity
    - dupl            # Code duplication
    - funlen          # Function length
    - gocognit        # Cognitive complexity
    - nestif          # Nested if statements
    - gocyclo         # Cyclomatic complexity

linters-settings:
  funlen:
    lines: 100        # Max function length
    statements: 50
  gocyclo:
    min-complexity: 15
  gocognit:
    min-complexity: 20
  cyclop:
    max-complexity: 15
  nestif:
    min-complexity: 5
  revive:
    rules:
      - name: exported
        severity: warning
      - name: var-naming
      - name: indent-error-flow
      - name: error-return
      - name: error-strings
      - name: receiver-naming

issues:
  exclude-rules:
    - path: _test\.go
      linters:
        - funlen
        - dupl
  max-issues-per-linter: 0
  max-same-issues: 0

run:
  timeout: 5m
  tests: true
```

**Pre-commit Quality Checks:**
```bash
# Format code
gofmt -w .
goimports -w .

# Lint
golangci-lint run ./...

# Vet
go vet ./...

# Security scan
gosec ./...

# Test
go test ./... -race -cover

# Build (verify compilation)
go build ./...
```

##### 7. Logging Standards

**Structured Logging with slog:**
```go
import "log/slog"

// ✅ CORRECT: Structured logs with context
logger.Info("user created successfully",
    slog.String("user_id", user.ID),
    slog.String("email", user.Email),
    slog.Duration("duration", time.Since(start)),
)

logger.Error("database connection failed",
    slog.String("service", "auth"),
    slog.String("database", "postgres"),
    slog.Any("error", err),
)

// Log levels:
// Debug - Detailed diagnostic info (disabled in production)
// Info - General informational messages
// Warn - Warning messages (recoverable issues)
// Error - Error messages (something failed)

// ❌ WRONG: Unstructured logs
log.Println("User created:", user.ID)

// ❌ WRONG: Logging sensitive data
logger.Info("user login", slog.String("password", password)) // Never!
```

**Request Logging Middleware:**
```go
func RequestLogger() gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        
        c.Next()
        
        logger.Info("http request",
            slog.String("method", c.Request.Method),
            slog.String("path", path),
            slog.Int("status", c.Writer.Status()),
            slog.Duration("latency", time.Since(start)),
            slog.String("client_ip", c.ClientIP()),
            slog.String("user_agent", c.Request.UserAgent()),
        )
    }
}
```

##### 8. Security Best Practices

**Authentication & Authorization:**
```go
// ✅ Password hashing (bcrypt, min cost 12)
import "golang.org/x/crypto/bcrypt"

hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 12)

// ✅ JWT token validation
func ValidateToken(tokenString string) (*jwt.Token, error) {
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method")
        }
        return []byte(jwtSecret), nil
    })
    
    if err != nil {
        return nil, err
    }
    
    if !token.Valid {
        return nil, errors.New("invalid token")
    }
    
    return token, nil
}

// ✅ Rate limiting middleware
import "golang.org/x/time/rate"

func RateLimitMiddleware(r rate.Limit, b int) gin.HandlerFunc {
    limiter := rate.NewLimiter(r, b)
    return func(c *gin.Context) {
        if !limiter.Allow() {
            c.JSON(http.StatusTooManyRequests, gin.H{
                "error": "rate limit exceeded",
            })
            c.Abort()
            return
        }
        c.Next()
    }
}

// ✅ CORS configuration (use pkg/middleware)
// ✅ Input sanitization (already covered)
// ✅ SQL injection prevention (parameterized queries)
// ✅ Secrets from environment or /run/secrets/ (never hardcoded)
```

##### 9. Performance Best Practices

```go
// ✅ Connection pooling (GORM/pgx default)
db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
sqlDB, _ := db.DB()
sqlDB.SetMaxIdleConns(10)
sqlDB.SetMaxOpenConns(100)
sqlDB.SetConnMaxLifetime(time.Hour)

// ✅ Context timeouts
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

// ✅ Use goroutines for concurrent operations
errGroup, ctx := errgroup.WithContext(ctx)
errGroup.Go(func() error {
    return fetchUserData(ctx, userID)
})
errGroup.Go(func() error {
    return fetchUserPermissions(ctx, userID)
})
if err := errGroup.Wait(); err != nil {
    return err
}

// ✅ Redis caching for expensive operations
cached, err := rdb.Get(ctx, cacheKey).Result()
if err == redis.Nil {
    // Cache miss - fetch from DB
    data := fetchFromDB()
    rdb.Set(ctx, cacheKey, data, 5*time.Minute)
} else if err != nil {
    return err
}
```

##### 10. Code Documentation

```go
// ✅ Package documentation
// Package service implements the business logic for user management.
// It provides methods for creating, updating, and deleting users
// while enforcing business rules and authorization.
package service

// ✅ Exported function documentation (godoc format)
// CreateUser creates a new user account with the provided details.
// It validates the input, checks for duplicate emails, hashes the password,
// and stores the user in the database.
//
// Parameters:
//   - ctx: Context for cancellation and timeout control
//   - req: User creation request containing email, password, and name
//
// Returns:
//   - User: The created user object with generated ID
//   - error: ErrEmailAlreadyExists if email is taken, or other errors
func (s *UserService) CreateUser(ctx context.Context, req CreateUserRequest) (*User, error) {
    // implementation
}

// ✅ Exported type documentation
// UserService handles business logic for user operations.
// It coordinates between the repository layer and HTTP handlers.
type UserService struct {
    repo   UserRepository
    logger *slog.Logger
}

// ✅ Complex logic gets inline comments
// Calculate trust score based on verification level and activity
// Formula: base_score * verification_multiplier * activity_factor
trustScore := calculateTrustScore(user)
```

#### Frontend (React/TypeScript) - Mandatory Requirements

##### 1. TypeScript Standards

```typescript
// ✅ CORRECT: Strict type definitions
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
}

// ✅ CORRECT: Type-safe API calls
async function createUser(data: CreateUserRequest): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

// ❌ WRONG: Using 'any'
function processData(data: any) { } // Avoid 'any'

// ✅ Use 'unknown' when type is truly unknown
function processData(data: unknown) {
  if (typeof data === 'string') {
    // TypeScript knows data is string here
  }
}
```

**tsconfig.json Strict Settings:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

##### 2. Component Standards

```typescript
// ✅ CORRECT: Functional components with TypeScript
import { FC, useState, useEffect } from 'react';

interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export const UserProfile: FC<UserProfileProps> = ({ userId, onUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!user) return null;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};

// ✅ Component file structure
// UserProfile/
// ├── UserProfile.tsx          # Main component
// ├── UserProfile.test.tsx     # Tests
// ├── UserProfile.module.css   # Styles
// └── index.ts                 # Re-export
```

##### 3. State Management

```typescript
// ✅ CORRECT: Context + custom hooks for global state
import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const user = await authService.login(email, password);
    setUser(user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

##### 4. Testing Requirements

**Coverage:** Minimum 75% for components, 85% for utility functions

```typescript
// ✅ CORRECT: Vitest component tests
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('renders user data when loaded', async () => {
    const mockUser = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    };

    vi.spyOn(api, 'fetchUser').mockResolvedValue(mockUser);

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    vi.spyOn(api, 'fetchUser').mockRejectedValue(new Error('Failed'));

    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

**E2E Tests (Playwright):**
```typescript
import { test, expect } from '@playwright/test';

test('user login flow', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

##### 5. Linting & Formatting

**ESLint Configuration (.eslintrc.json):**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

**Prettier Configuration (.prettierrc):**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### API Design Standards

#### RESTful Conventions

**URL Structure:**
```
✅ CORRECT:
GET    /api/v1/users              # List users
GET    /api/v1/users/:id          # Get user
POST   /api/v1/users              # Create user
PUT    /api/v1/users/:id          # Update user (full)
PATCH  /api/v1/users/:id          # Update user (partial)
DELETE /api/v1/users/:id          # Delete user

# Nested resources
GET    /api/v1/users/:id/posts    # Get user's posts
POST   /api/v1/users/:id/posts    # Create post for user

# Actions (when REST doesn't fit)
POST   /api/v1/users/:id/verify   # Verify user
POST   /api/v1/users/:id/reset-password

❌ WRONG:
GET /api/getUsers
POST /api/user_create
GET /api/users/get/:id
```

**Response Format:**
```json
// ✅ Success response
{
  "data": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "meta": {
    "timestamp": "2025-02-13T10:30:00Z"
  }
}

// ✅ List response (with pagination)
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}

// ✅ Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

**HTTP Status Codes:**
- **200 OK** - Successful GET, PUT, PATCH
- **201 Created** - Successful POST (resource created)
- **204 No Content** - Successful DELETE
- **400 Bad Request** - Invalid input
- **401 Unauthorized** - Not authenticated
- **403 Forbidden** - Authenticated but not authorized
- **404 Not Found** - Resource doesn't exist
- **409 Conflict** - Duplicate/constraint violation
- **422 Unprocessable Entity** - Semantic validation error
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - Server error
- **503 Service Unavailable** - Service down

#### OpenAPI Documentation

**MANDATORY: Every endpoint must be documented:**

```go
// @Summary Create a new user
// @Description Creates a new user account with email and password
// @Tags users
// @Accept json
// @Produce json
// @Param request body CreateUserRequest true "User creation request"
// @Success 201 {object} User
// @Failure 400 {object} ErrorResponse "Invalid input"
// @Failure 409 {object} ErrorResponse "Email already exists"
// @Failure 500 {object} ErrorResponse "Internal server error"
// @Router /users [post]
// @Security BearerAuth
func (h *Handler) CreateUser(c *gin.Context) {
    // implementation
}
```

**Generate OpenAPI spec:**
```bash
cd services/<service_name>
swag init -g cmd/main.go -o docs/
```

### Git & Version Control

#### Commit Standards

**Use Conventional Commits:**
```
feat: add user profile endpoint
fix: resolve database connection timeout
docs: update API documentation for auth service
test: add unit tests for genealogy service
refactor: simplify error handling in handlers
chore: update dependencies
style: format code with gofmt
perf: optimize database query in search service
ci: add GitHub Actions workflow
```

#### Branch Strategy

```
main                    # Production-ready code
├── develop             # Integration branch
    ├── feature/user-auth
    ├── feature/family-tree-view
    ├── bugfix/login-error
    └── hotfix/critical-security-patch
```

#### Pull Request Requirements

**Every PR must include:**
1. ✅ All tests passing (`go test ./...` or `npm test`)
2. ✅ Linting passes (`golangci-lint run` or `npm run lint`)
3. ✅ Code coverage maintained or improved
4. ✅ OpenAPI spec updated (if API changes)
5. ✅ Documentation updated (if behavior changes)
6. ✅ Conventional commit messages
7. ✅ No merge conflicts
8. ✅ Reviewed by at least one team member

**PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] All tests passing
- [ ] Linting passes
- [ ] Documentation updated
- [ ] OpenAPI spec updated (if applicable)
```

### CI/CD Requirements

#### Pre-commit Hooks

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Go services
for service in services/*/; do
    if [ -f "$service/go.mod" ]; then
        cd "$service"
        echo "Checking $service..."
        
        # Format
        gofmt -w .
        goimports -w .
        
        # Lint
        golangci-lint run ./... || exit 1
        
        # Test
        go test ./... || exit 1
        
        cd ../..
    fi
done

# Frontend
cd frontend
npm run lint || exit 1
npm run test || exit 1
cd ..

echo "✅ All checks passed!"
```

#### GitHub Actions Workflow

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  go-services:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [auth_service, genealogy_service, media_storage_service]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.26'
      
      - name: Install dependencies
        working-directory: services/${{ matrix.service }}
        run: go mod download
      
      - name: Lint
        working-directory: services/${{ matrix.service }}
        run: golangci-lint run ./...
      
      - name: Test
        working-directory: services/${{ matrix.service }}
        run: go test ./... -race -cover -coverprofile=coverage.out
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: services/${{ matrix.service }}/coverage.out

  frontend:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: frontend
        run: npm ci
      
      - name: Lint
        working-directory: frontend
        run: npm run lint
      
      - name: Test
        working-directory: frontend
        run: npm run test -- --coverage
      
      - name: Build
        working-directory: frontend
        run: npm run build
```

---

## Development Guidelines

### Code Style

- **Go:** Follow standard Go conventions (`gofmt`, `goimports`, `golangci-lint`)
- **Frontend:** ESLint + Prettier (automatic formatting)
- **API Design:** RESTful conventions, OpenAPI 3.0 specifications

### Testing

- **Go:** `go test ./...` with `testify` for assertions, `testcontainers-go` for integration tests
- **Frontend:** Component tests (Vitest), E2E tests (Playwright)
- **Coverage:** Aim for >80% coverage on business logic

### API Documentation

OpenAPI specifications are in `docs/openapi/`. Each service maintains its own spec, generated via `swaggo/swag` annotations or maintained manually.

### Authentication Flow

- JWT-based authentication (access + refresh tokens)
- Session management via Redis
- Middleware in `services/pkg/auth/` for token validation

## Key Documentation Files

- `docs/Full_Requirements_Spec.md` — Complete requirements specification (source of truth)
- `docs/openapi/` — Per-service OpenAPI specs
- `DATA_MODELS.md` — Database schemas and models
- `docker-compose.yml` — Infrastructure services configuration

## Environment Configuration

- Environment variables and Docker secrets (files in `/secrets/`)
- Services read config from env vars and `/run/secrets/` files
- See `docs/Full_Requirements_Spec.md` Section 6.5 for secret inventory

## Working with This Codebase

### Before Making Changes

1. ✅ Check `docs/Full_Requirements_Spec.md` for requirements context
2. ✅ Review existing tests for patterns
3. ✅ Ensure Docker infrastructure is running (`docker compose up -d`)
4. ✅ Run linters and tests locally before committing
5. ✅ Check for Go build errors (`go build ./...`)

### When Adding a New Service

1. ✅ Create directory: `services/<service_name>/cmd/main.go`, `internal/`, `Dockerfile`, `go.mod`
2. ✅ Import shared packages from `services/pkg/`
3. ✅ Add service to `docker-compose.yml`
4. ✅ Create `.golangci.yml` with linter config
5. ✅ Add/update OpenAPI spec in `docs/openapi/`
6. ✅ Write comprehensive tests (unit + integration)
7. ✅ Add CI/CD workflow
8. ✅ Document in README

### When Modifying Existing Code

1. ✅ **Read existing tests first** - understand expected behavior
2. ✅ **Run tests before changes** - ensure you start from green state
3. ✅ **Make changes incrementally** - commit often
4. ✅ **Update tests** - reflect new behavior
5. ✅ **Run full test suite** - ensure no regressions
6. ✅ **Update documentation** - keep it current
7. ✅ **Check coverage** - maintain or improve

### Common Pitfalls to Avoid

- ❌ Don't bypass authentication/authorization checks
- ❌ Don't ignore linting errors ("I'll fix it later")
- ❌ Don't commit without running tests
- ❌ Don't use `any` in TypeScript
- ❌ Don't use `panic()` in production Go code
- ❌ Don't ignore errors (`result, _ := ...`)
- ❌ Don't log sensitive data (passwords, tokens, PII)
- ❌ Don't hardcode secrets or credentials
- ❌ Don't skip input validation
- ❌ Don't write untested code
- ❌ Don't merge without code review
- ❌ Don't break backward compatibility without versioning
- ❌ Don't commit commented-out code
- ❌ Don't use SQL string concatenation
- ❌ Don't skip migration scripts for schema changes

---

## Quick Reference Commands

### Go Services

```bash
# Development
go run cmd/main.go
go build ./...
go test ./...
go test ./... -cover -coverprofile=coverage.out
go test ./... -race
go test ./... -short  # Skip integration tests

# Code Quality
gofmt -w .
goimports -w .
golangci-lint run ./...
gosec ./...
go vet ./...

# Dependencies
go mod tidy
go mod download
go mod verify
```

### Frontend

```bash
# Development
npm install
npm run dev
npm run build
npm run preview

# Testing
npm run test
npm run test:watch
npm run test:coverage
npm run test:e2e

# Code Quality
npm run lint
npm run lint:fix
npm run format
npm run type-check
```

### Docker

```bash
# Infrastructure
docker compose up -d
docker compose down
docker compose logs -f <service>
docker compose ps

# Service-specific
docker compose up -d postgres redis neo4j
docker compose restart auth_service
docker compose exec postgres psql -U dzinza
```

---

## Final Checklist for AI Agents

Before generating or modifying code, **ALWAYS verify:**

- [ ] ✅ Project structure follows standard layout
- [ ] ✅ Error handling with proper wrapping (`%w`)
- [ ] ✅ Input validation at all layers (struct tags, service logic, DB constraints)
- [ ] ✅ Tests written (table-driven, >80% coverage)
- [ ] ✅ Integration tests use testcontainers (when applicable)
- [ ] ✅ Linting configuration present (`.golangci.yml` or ESLint)
- [ ] ✅ All errors are logged with context
- [ ] ✅ No sensitive data in logs
- [ ] ✅ Database queries use parameterization
- [ ] ✅ Transactions for multi-step operations
- [ ] ✅ Context timeouts for external calls
- [ ] ✅ TypeScript strict mode enabled (frontend)
- [ ] ✅ No `any` types in TypeScript
- [ ] ✅ OpenAPI documentation for endpoints
- [ ] ✅ Conventional commit message format
- [ ] ✅ No hardcoded secrets
- [ ] ✅ Proper HTTP status codes
- [ ] ✅ Rate limiting on public endpoints
- [ ] ✅ CORS configured properly
- [ ] ✅ Code formatted (`gofmt`/Prettier)
- [ ] ✅ All tests passing

**Remember:** Quality over speed. It's faster to write correct code once than to debug broken code multiple times.