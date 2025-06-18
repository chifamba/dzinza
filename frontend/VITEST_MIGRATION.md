# Migration to Vitest

This document describes the steps taken to migrate the test suite from Jest to Vitest.

## Completed Steps

1. **Initial Setup**

   - Added Vitest configuration in `vitest.config.ts`
   - Created test utilities in `src/test/test-utils.tsx` for consistent rendering with providers
   - Updated `setupTests.ts` to include mocks for browser APIs and third-party libraries

2. **Test File Fixes**

   - Fixed import paths for test utilities
   - Updated tests to use the custom render function with providers
   - Fixed assertions to match the actual component behavior
   - Fixed React Router integration in tests
   - Fixed Redux store integration in tests

3. **Script Creation**
   - Created scripts to automate the migration process:
     - `cleanDuplicateTests.js`: Removes duplicate tests in `__tests__` directory
     - `updateTestImports.js`: Updates import statements to use our custom test utilities
     - `fixRouterInTests.js`: Fixes router-related issues in tests

## Remaining Issues

The following test files still have issues that need to be addressed:

1. **Next.js Related Tests**

   - `src/app/(routes)/stories/create/CreateEventPage.test.tsx`
   - `src/app/(routes)/stories/edit/[id]/EditEventPage.test.tsx`
   - `src/pages/family-trees/[treeId]/collaborators.test.tsx`

   These tests reference Next.js-specific modules like `next/router` or try to import
   App Router components that need to be mocked.

2. **Syntax Errors**
   - `src/components/auth/AdminRouteGuard.test.tsx` has a syntax error with an unexpected closing brace.

## How to Run Tests

```bash
# Run all tests
npm test

# Run a specific test file
npx vitest run path/to/test.tsx

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Benefits of Vitest

- Faster test execution
- Better integration with Vite
- HMR support in watch mode
- ESM support out of the box
- Compatible with most Jest APIs
- Better error reporting

## Next Steps

1. Fix the remaining test files
2. Add more comprehensive mocks for Next.js components
3. Improve test coverage
4. Add custom test reporters if needed
