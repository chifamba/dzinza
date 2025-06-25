# Test Migration Guide: Jest to Vitest

This document outlines the process for migrating tests from Jest to Vitest in the Dzinza genealogy platform.

## Why Migrate to Vitest?

1. **Better Vite Integration**: Vitest is designed to work seamlessly with Vite, providing faster test execution.
2. **API Compatibility**: Vitest maintains compatibility with Jest APIs, making migration easier.
3. **Performance**: Vitest offers better performance with Vite's HMR and esbuild integration.
4. **ESM Support**: Native ESM support, which aligns with our project structure.

## Migration Steps

### 1. Setup and Configuration

- Added Vitest and related dependencies
- Created `vitest.config.ts` with configuration that matches our project structure
- Set up test utility files for consistent testing

### 2. Test File Updates

The migration script handles these common updates:

- Replaced Jest globals with Vitest equivalents (jest.fn() → vi.fn())
- Updated import statements to use our custom test utilities
- Fixed React Router integration in tests
- Applied component-specific fixes

### 3. Running the Migration

To complete the migration process:

```bash
# Clean up duplicate tests
npm run test:cleanup

# Fix imports to use custom test utilities
npm run test:fix-imports

# Run tests to verify everything works
npm test
```

## Available Test Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run a specific test file
npx vitest run path/to/test.tsx

# Debug tests
npm run test:debug
```

## Known Issues and Solutions

### React Router in Tests

Tests that use React Router need to be wrapped with our custom test utility which provides a MemoryRouter.

```tsx
// Before
import { render } from "@testing-library/react";

// After
import { render } from "../test/test-utils";
```

### Component-Specific Fixes

Some components required specific fixes:

1. **PersonEventsList.test.tsx**:

   - Updated event container selections
   - Fixed date assertions
   - Modified API endpoint assertions

2. **EditPersonForm.test.tsx**:
   - Updated button test IDs
   - Modified assertions to use expect.objectContaining

## Troubleshooting

If you encounter issues with specific tests:

1. Ensure imports are updated to use test-utils
2. Check that test selectors match the actual component implementation
3. Verify mock implementations are compatible with Vitest
4. Run the specific test file with `npx vitest run path/to/test.tsx`

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Migration Guide from Jest to Vitest](https://vitest.dev/guide/migration.html)
