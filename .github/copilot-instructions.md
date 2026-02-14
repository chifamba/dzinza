# GitHub Copilot Guide — Dzinza Genealogy Platform

## Priorities

1. **Security First**: Always validate inputs, hash passwords, and avoid exposing sensitive data.
2. **User Experience**: Prioritize accessibility, performance, and maintainability.
3. **Compliance**: Follow legal/privacy requirements and internal architectural standards.

## Project Stack

**Frontend**: React 18+, TypeScript, Tailwind CSS, React Query, Zustand, i18next
**Backend**: Go 1.24+, Gin (HTTP), GORM (PostgreSQL), Neo4j Go Driver, Redis, Elasticsearch
**Databases**: PostgreSQL, Neo4j, MongoDB, Redis, Elasticsearch
**Infrastructure**: Docker Compose (local), Kubernetes (production), Prometheus, Grafana, Garage S3

## Coding Guidelines

### Go Services — Security

- ✅ Validate inputs with struct tags (`binding:"required,email"`) and service-layer checks
- ✅ Hash passwords with `bcrypt` (min cost 12)
- ✅ Use JWT with `golang-jwt/jwt/v5`
- ✅ Secrets from `/run/secrets/` or env vars (never hardcoded)
- ✅ Rate limiting with `golang.org/x/time/rate`
- ❌ Never log passwords, tokens, or PII

### Go Services — Error Handling

- ✅ Wrap errors with context: `fmt.Errorf("failed to create user: %w", err)`
- ✅ Use custom error types for domain errors (`ErrUserNotFound`, `ErrInvalidInput`)
- ✅ Structured logging with `log/slog`
- ❌ Never silently ignore errors (`result, _ := doSomething()`)
- ❌ Never use `panic()` in production code

### Go Services — Architecture

- ✅ Layered: Handler → Service → Repository
- ✅ Dependency injection via constructors and interfaces
- ✅ Keep handlers thin — validate input, call service, return response
- ✅ Use `context.Context` for cancellation and timeouts
- ✅ Use parameterized queries (GORM handles this)
- ❌ No business logic in handlers

### API Design

- ✅ RESTful routes with Gin middleware
- ✅ Consistent error response struct (`ErrorResponse`)
- ✅ Standard HTTP status codes (400, 401, 403, 404, 409, 422, 500)

### React Components

- ✅ Use TypeScript interfaces (never `any`, prefer `unknown`)
- ✅ React Query for data fetching
- ✅ Error boundaries + loading states
- ✅ Tailwind over inline styles

## Performance & Testing

### Go
- ✅ Connection pooling with GORM (`SetMaxIdleConns`, `SetMaxOpenConns`)
- ✅ Table-driven tests with `testify`
- ✅ Integration tests with `testcontainers-go`
- ✅ Race detector: `go test ./... -race`
- ✅ Coverage: `go test ./... -cover`
- ✅ Min coverage: 80% overall, 85% services, 70% handlers

### Frontend
- ✅ Lazy load large components
- ✅ Use `React.memo` for static renders
- ✅ Paginate large queries
- ✅ Write Vitest/Playwright tests

## Accessibility

- ✅ Use ARIA labels, semantic HTML
- ✅ Label inputs, support keyboard navigation

## Quick Decision Flow

- **Security-related?** Validate, auth, sanitize inputs
- **User-facing?** Use accessible, performant patterns
- **Style/structure?** Follow project conventions

## Need Help?

- Security → escalate immediately
- Architecture → `docs/Full_Requirements_Spec.md`
- Code Standards → `AGENTS.md`

---

✅ Default to secure, maintainable, accessible code
❌ Never expose secrets, skip validation, or break conventions

- After each task, ensure that the build passes and all tests are green. Fix any issues before proceeding to the next task.
