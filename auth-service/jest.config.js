/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'], // For global mocks, etc.
  // globalSetup: '<rootDir>/tests/setup.ts', // If setup/teardown were global
  // globalTeardown: '<rootDir>/tests/setup.ts',
  testTimeout: 30000, // Increase timeout for DB operations if needed
  moduleNameMapper: {
    // Define any path aliases if used in src, e.g., '^@/(.*)$': '<rootDir>/src/$1'
    // For now, assuming relative paths or direct imports.
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/src/config/', // Usually, config files don't need coverage
    '/src/server.ts', // Entry point, often less about logic
    '/src/utils/logger.ts', // Logging utility
    // Add other files/patterns to ignore for coverage if necessary
  ],
};
