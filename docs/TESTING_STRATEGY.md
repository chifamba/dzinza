# Testing Strategy

## Overview

Dzinza follows a comprehensive testing strategy with multiple layers to ensure code quality, reliability, and user experience. We implement the testing pyramid approach with unit tests forming the foundation, integration tests in the middle, and E2E tests at the top.

## Testing Pyramid

```
    /\
   /  \     E2E Tests (Few, Slow, High Confidence)
  /    \    
 /______\   Integration Tests (Some, Medium Speed)
/________\  Unit Tests (Many, Fast, Low-level)
```

## Test Types

### 1. Unit Tests

**Purpose:** Test individual components, functions, and modules in isolation.

**Framework:** Jest + React Testing Library

**Coverage Target:** 90%+

**Examples:**
```typescript
// Component testing
describe('PersonCard', () => {
  it('displays person information correctly', () => {
    const person = { name: 'John Doe', age: 30 };
    render(<PersonCard person={person} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});

// Hook testing
describe('usePersonData', () => {
  it('fetches person data on mount', async () => {
    const { result, waitFor } = renderHook(() => usePersonData('123'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.person).toBeDefined();
  });
});

// Utility function testing
describe('calculateAge', () => {
  it('calculates age correctly', () => {
    const birthDate = new Date('1990-01-01');
    const age = calculateAge(birthDate);
    expect(age).toBe(34); // Assuming current year is 2024
  });
});
```

**Commands:**
```bash
npm run test:unit          # Run unit tests
npm run test:unit:watch    # Run tests in watch mode
npm run test:unit:coverage # Run with coverage report
```

### 2. Integration Tests

**Purpose:** Test interaction between multiple components, API endpoints, and database operations.

**Framework:** Jest + Supertest + Test Containers

**Examples:**
```typescript
// API integration testing
describe('Family Tree API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it('creates a new family tree', async () => {
    const response = await request(app)
      .post('/api/families')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Smith Family' });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Smith Family');
  });
});

// Component integration testing
describe('FamilyTreePage', () => {
  it('loads and displays family tree data', async () => {
    mockApiResponse('/api/families/123', mockFamilyData);
    
    render(<FamilyTreePage familyId="123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Smith Family')).toBeInTheDocument();
    });
  });
});
```

**Commands:**
```bash
npm run test:integration    # Run integration tests
npm run test:db            # Run database tests
```

### 3. End-to-End (E2E) Tests

**Purpose:** Test complete user workflows from frontend to backend.

**Framework:** Playwright

**Examples:**
```typescript
// User workflow testing
test('user can create and edit family tree', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[data-testid=email]', 'test@example.com');
  await page.fill('[data-testid=password]', 'password123');
  await page.click('[data-testid=login-button]');

  // Create family tree
  await page.goto('/dashboard');
  await page.click('text=Create New Tree');
  await page.fill('[data-testid=tree-name]', 'Test Family');
  await page.click('[data-testid=create-button]');

  // Verify creation
  await expect(page.locator('text=Test Family')).toBeVisible();

  // Add person
  await page.click('[data-testid=add-person-button]');
  await page.fill('[data-testid=person-name]', 'John Doe');
  await page.click('[data-testid=save-person]');

  // Verify person added
  await expect(page.locator('text=John Doe')).toBeVisible();
});
```

**Commands:**
```bash
npm run test:e2e           # Run E2E tests
npm run test:e2e:headed    # Run with browser UI
npm run test:e2e:debug     # Run in debug mode
```

### 4. Visual Regression Tests

**Purpose:** Catch unintended visual changes in UI components.

**Framework:** Playwright + Percy

**Examples:**
```typescript
test('family tree visual regression', async ({ page }) => {
  await page.goto('/family-tree/123');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot for visual comparison
  await expect(page).toHaveScreenshot('family-tree-full.png');
  
  // Test responsive design
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page).toHaveScreenshot('family-tree-tablet.png');
});
```

### 5. Performance Tests

**Purpose:** Ensure application performance meets requirements.

**Framework:** Lighthouse + K6

**Examples:**
```javascript
// Load testing with K6
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function() {
  let response = http.get('https://api.dzinza.com/families');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## Test Environment Setup

### Local Development
```bash
# Setup test database
docker run -d --name dzinza-test-db \
  -e POSTGRES_DB=dzinza_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5433:5432 postgres:15

# Setup test Redis
docker run -d --name dzinza-test-redis \
  -p 6380:6379 redis:7-alpine

# Run all tests
npm run test:all
```

### CI/CD Pipeline
```yaml
# GitHub Actions test configuration
- name: Setup test environment
  run: |
    docker-compose -f docker-compose.test.yml up -d
    sleep 10  # Wait for services to start

- name: Run database migrations
  run: npm run db:migrate:test

- name: Run test suite
  run: |
    npm run test:unit
    npm run test:integration
    npm run test:e2e
```

## Test Data Management

### Test Fixtures
```typescript
// Test data factories
export const createMockPerson = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  birthDate: faker.date.past({ years: 80 }),
  gender: faker.person.sex(),
  ...overrides
});

export const createMockFamily = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name() + ' Family',
  members: Array.from({ length: 5 }, () => createMockPerson()),
  ...overrides
});
```

### Database Seeding
```typescript
// Test database seeding
export const seedTestDatabase = async () => {
  await db.user.createMany({
    data: [
      { email: 'test1@example.com', name: 'Test User 1' },
      { email: 'test2@example.com', name: 'Test User 2' },
    ]
  });

  await db.family.createMany({
    data: [
      { name: 'Test Family 1', ownerId: 'user1' },
      { name: 'Test Family 2', ownerId: 'user2' },
    ]
  });
};
```

## Mocking Strategy

### API Mocking
```typescript
// MSW (Mock Service Worker) setup
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/families/:id', (req, res, ctx) => {
    return res(ctx.json(mockFamilyData));
  }),
  
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(ctx.json({ token: 'mock-jwt-token' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### External Service Mocking
```typescript
// Mock external services
jest.mock('../services/photoEnhancement', () => ({
  enhancePhoto: jest.fn().mockResolvedValue({
    enhancedUrl: 'https://example.com/enhanced.jpg',
    confidence: 0.95
  })
}));

jest.mock('../services/dnaAnalysis', () => ({
  analyzeDNA: jest.fn().mockResolvedValue({
    matches: mockDNAMatches,
    ethnicity: mockEthnicityData
  })
}));
```

## Test Coverage

### Coverage Requirements
- **Unit Tests:** 90%+ line coverage
- **Integration Tests:** 80%+ feature coverage
- **E2E Tests:** 100% critical path coverage

### Coverage Reporting
```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Coverage Configuration
```javascript
// Jest coverage configuration
module.exports = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ]
};
```

## Testing Best Practices

### Writing Good Tests
1. **AAA Pattern:** Arrange, Act, Assert
2. **Descriptive Names:** Test names should describe the behavior
3. **Single Responsibility:** One assertion per test when possible
4. **Independent Tests:** Tests should not depend on each other
5. **Fast Execution:** Tests should run quickly

### Test Organization
```
tests/
├── unit/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── services/
├── integration/
│   ├── api/
│   ├── database/
│   └── components/
├── e2e/
│   ├── user-workflows/
│   ├── admin-workflows/
│   └── guest-workflows/
├── performance/
│   ├── load-tests/
│   └── lighthouse/
└── fixtures/
    ├── users.json
    ├── families.json
    └── dna-data.json
```

### Continuous Testing
- **Pre-commit Hooks:** Run tests before commits
- **Pull Request Checks:** All tests must pass
- **Branch Protection:** Prevent merging without tests
- **Scheduled Tests:** Run full test suite nightly

## Test Automation

### GitHub Actions Integration
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:all
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Quality Gates
- **Code Coverage:** Must maintain 90%+ coverage
- **Test Performance:** Tests must complete in <5 minutes
- **Flaky Tests:** Automatic retry with failure analysis
- **Security Tests:** Automated vulnerability scanning
