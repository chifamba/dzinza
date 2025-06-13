module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],

  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/backend/shared/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tiptap/extension-link$': '<rootDir>/src/__mocks__/@tiptap/extension-link.js',
    '^@tiptap/extension-image$': '<rootDir>/src/__mocks__/@tiptap/extension-image.js',
    '^@tiptap/extension-placeholder$': '<rootDir>/src/__mocks__/@tiptap/extension-placeholder.js',
    '^@tiptap/extension-underline$': '<rootDir>/src/__mocks__/@tiptap/extension-underline.js',
    '^@tiptap/starter-kit$': '<rootDir>/src/__mocks__/@tiptap/starter-kit.js',
    '^@tiptap/core$': '<rootDir>/src/__mocks__/@tiptap/core.js',
    '^@tiptap/react$': '<rootDir>/src/__mocks__/@tiptap/react.js',
    '../../utils/logger': '<rootDir>/src/__mocks__/utils/logger.ts',
  },

  transform: {
    '^.+\\.(js|jsx|mjs)$': ['babel-jest', { configFile: './babel.config.cjs' }], // babel-jest for JS files
    '^.+\\.(ts|tsx)$': '<rootDir>/scripts/jest-preprocess-import-meta.cjs', // Custom transformer for TS/TSX
  },

  transformIgnorePatterns: [
     '/node_modules/(?!(@tiptap/.*|prosemirror-.*|d3.*|uuid|react-d3-tree|bson|mongodb|mongoose))'
  ],

  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.[jt]s?(x)'],

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
  testTimeout: 30000,
  rootDir: '.',
  globals: {},
};
