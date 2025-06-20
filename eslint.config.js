import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import globals from "globals";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  // Global ignores
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "*.js",
      "*.d.ts",
      // Build/config files
      "**/vite.config.ts",
      "**/jest.config.*",
      "**/babel.config.*",
      "**/tailwind.config.*",
      "**/postcss.config.*",
      // Scripts and mocks (Node.js environment files)
      "**/scripts/**",
      "**/__mocks__/**",
      // Other generated files
      "**/test-results/**",
    ],
  },

  // Base JavaScript configuration
  js.configs.recommended,

  // Backend services configuration (Node.js environment)
  {
    files: [
      "auth-service/**/*.{ts,tsx}",
      "backend-service/**/*.{ts,tsx}",
      "genealogy-service/**/*.{ts,tsx}",
      "search-service/**/*.{ts,tsx}",
      "storage-service/**/*.{ts,tsx}",
      "src/**/*.{ts,tsx}", // Root src files
    ],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        // Use individual tsconfig.json files per service
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,

      // TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",

      // JavaScript rules
      "no-console": "off",
      "prefer-const": "error", // Standardized to error
      "no-var": "error", // Standardized to error (var is deprecated)
      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": "error",
    },
  },

  // Frontend configuration (Browser environment with React)
  {
    files: ["frontend/src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
        // React globals
        React: "readonly",
        ReactDOM: "readonly",
        JSX: "readonly",
        // Hook functions
        useState: "readonly",
        useEffect: "readonly",
        useCallback: "readonly",
        useMemo: "readonly",
        useRef: "readonly",
        useContext: "readonly",
        useReducer: "readonly",
        useLayoutEffect: "readonly",
        useImperativeHandle: "readonly",
        useDebugValue: "readonly",
        // Additional DOM types that are commonly used
        HTMLInputElement: "readonly",
        HTMLSelectElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLImageElement: "readonly",
        HTMLElement: "readonly",
        MouseEvent: "readonly",
        KeyboardEvent: "readonly",
        ProgressEvent: "readonly",
        FileList: "readonly",
        Node: "readonly",
        // Common undefined errors
        error: "readonly",
        authApi: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...typescript.configs.recommended.rules,

      // React specific rules
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // JavaScript rules
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
      "no-undef": "error",
    },
  },

  // Test files configuration (All services)
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
      "**/tests/**/*.{ts,tsx}",
      "**/e2e/**/*.{ts,tsx}",
    ],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        // No project config for faster test linting
      },
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.es2022,
        // Vitest globals
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        test: "readonly",
        // Browser globals for frontend tests
        window: "readonly",
        document: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
    },
    rules: {
      // Relaxed rules for tests
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-redeclare": "off",
      "no-console": "off",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];
