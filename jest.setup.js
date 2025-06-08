import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock for import.meta.env. This is read by jest.config.js globals section.
const mockImportMetaEnv = {
  VITE_API_BASE_URL: 'http://localhost:3000/api/v1',
  VITE_APP_NAME: 'Dzinza',
  VITE_DEFAULT_LANGUAGE: 'en',
  VITE_SUPPORTED_LANGUAGES: 'en,sn,nd',
  VITE_ENABLE_FEATURE_X: 'true',
  DEV: true,
  PROD: false,
  // Add any other VITE_ variables your application might access
};

// This makes the mock available to the `globals` configuration in jest.config.js
// The `babel-plugin-transform-import-meta` in babel.config.cjs will handle
// transforming `import.meta.env` in the source code itself.
if (typeof global.import === 'undefined') {
  global.import = {} as any;
}
if (typeof global.import.meta === 'undefined') {
  (global.import.meta as any) = {};
}
(global.import.meta as any).env = mockImportMetaEnv;

// For direct use in tests if needed, though Babel plugin should make it transparent in source.
global.mockedImportMetaEnv = mockImportMetaEnv;
