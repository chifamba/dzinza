console.log('jest.setup.js executed');
import { TextEncoder, TextDecoder } from 'util';
import '@testing-library/jest-dom';

// Mock window.scrollTo for framer-motion/JSDOM compatibility
global.scrollTo = jest.fn();

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const viteEnvVars = {
  DEV: 'true', // process.env values are typically strings
  VITE_JWT_STORAGE_KEY: 'test-jwt-storage-key',
  VITE_REFRESH_TOKEN_KEY: 'test-refresh-token-key',
  VITE_API_BASE_URL: 'http://localhost:3001/api',
  VITE_APP_NAME: 'Dzinza Test', // Added from previous setup
  VITE_DEFAULT_LANGUAGE: 'en', // Added from previous setup
  VITE_SUPPORTED_LANGUAGES: 'en,sn,nd', // Added from previous setup
  VITE_SENTRY_DSN: '', // Example, ensure all used vars are here
  VITE_ENVIRONMENT: 'test', // Example
  // Add any other VITE_ variables used by the frontend code
};

if (typeof global.import === 'undefined') {
  global.import = { meta: {} };
} else if (typeof global.import.meta === 'undefined') {
  global.import.meta = {};
}

// Mock for import.meta.env (direct access)
global.import.meta.env = viteEnvVars;

// Populate process.env for babel-plugin-transform-vite-meta-env
// This plugin typically replaces import.meta.env.VITE_X with process.env.VITE_X
for (const key in viteEnvVars) {
  process.env[key] = viteEnvVars[key];
}

console.log('Mocked import.meta.env:', global.import.meta.env);
console.log('Populated process.env with VITE_ vars for tests.');
