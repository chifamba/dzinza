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
  testEnvironment: 'jsdom', // Changed to 'jsdom' for frontend component tests
  transform: {
    '^.+\\.(t|j)sx?$': 'babel-jest',
    '^.+\\.mjs$': 'babel-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  transformIgnorePatterns: [
    // Simpler pattern to transform @tiptap and prosemirror packages
    "/node_modules/(?!(@tiptap\\/.*|prosemirror-.*))"
  ],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/backend/shared/$1',
    // Map problematic TipTap extensions to manual mocks
    '^@tiptap/extension-link$': '<rootDir>/src/__mocks__/@tiptap/extension-link.js',
    '^@tiptap/extension-image$': '<rootDir>/src/__mocks__/@tiptap/extension-image.js',
    '^@tiptap/extension-placeholder$': '<rootDir>/src/__mocks__/@tiptap/extension-placeholder.js',
    '^@tiptap/extension-underline$': '<rootDir>/src/__mocks__/@tiptap/extension-underline.js',
    '^@tiptap/starter-kit$': '<rootDir>/src/__mocks__/@tiptap/starter-kit.js',
    '^@tiptap/core$': '<rootDir>/src/__mocks__/@tiptap/core.js',
    '^@tiptap/react$': '<rootDir>/src/__mocks__/@tiptap/react.js',
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
