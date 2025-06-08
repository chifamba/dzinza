export default {
  clearMocks: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/'
  ],
  collectCoverage: true,
  coverageReporters: [
    'json',
    'text',
    'lcov',
    'clover'
  ],
  testEnvironment: 'node', // Changed to 'node' for backend Mongoose tests
  transform: {
    '^.+\\.(t|j)sx?$': 'babel-jest',
    '^.+\\.mjs$': 'babel-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  transformIgnorePatterns: [
    // Added 'file-type' to the list of modules to be transformed if they are ESM
    '/node_modules/(?!(bson|mongodb|mongoose|@noble/hashes|@paralleldrive/cuid2|file-type)/)',
  ],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/backend/shared/$1',
    // Example for frontend alias, if src/@/* is used:
    // '^@/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    // The global 'import.meta.env' will be populated by jest.setup.js
    // Jest doesn't directly support setting import.meta.env here,
    // but jest.setup.js will set a global variable that can be referenced.
  },
  testTimeout: 30000, // Increased default timeout
};
