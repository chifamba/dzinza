/**
 * CONSOLIDATED ESLINT CONFIGURATION FOR DZINZA PROJECT
 *
 * This file consolidates all ESLint rules across the project to reduce duplication
 * and ensure consistency. Use this as a reference for simplification.
 *
 * CURRENT ISSUES IDENTIFIED:
 * - Significant duplication across 6 different config files
 * - Inconsistent test file configurations
 * - Some services have different file patterns
 * - Frontend has React-specific rules that others don't need
 */

import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

// ============================================================================
// BASE CONFIGURATION (shared across all services)
// ============================================================================

const baseTypeScriptConfig = {
  languageOptions: {
    parser: typescriptParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      project: "./tsconfig.json",
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
    // TypeScript recommended rules as base
    ...typescript.configs.recommended.rules,

    // SHARED OVERRIDES (consistent across all services)
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "no-console": "off",
    "prefer-const": "off", // NOTE: Inconsistent - some services have this as "error"
    "no-var": "off", // NOTE: Inconsistent - some services have this as "error"
  },
};

const baseTestConfig = {
  languageOptions: {
    parser: typescriptParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      // NOTE: Some configs exclude project for tests, others include it
    },
    globals: {
      ...globals.jest,
      ...globals.node,
      ...globals.es2022,
    },
  },
  plugins: {
    "@typescript-eslint": typescript,
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off", // NOTE: Some configs have this as "error" with pattern
    "no-console": "off",
  },
};

const commonIgnores = [
  "dist/**",
  "node_modules/**",
  "coverage/**",
  "*.js",
  "*.d.ts",
];

// ============================================================================
// SERVICE-SPECIFIC CONFIGURATIONS
// ============================================================================

export const backendServicesConfig = [
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    ...baseTypeScriptConfig,
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    ...baseTestConfig,
  },
  {
    ignores: commonIgnores,
  },
];

export const frontendConfig = [
  {
    ignores: [
      ...commonIgnores,
      "vite.config.ts",
      "jest.config.*",
      "babel.config.*",
      "tailwind.config.*",
      "postcss.config.*",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ...baseTypeScriptConfig.languageOptions,
      ecmaVersion: 2020,
      globals: globals.browser, // Different from backend (uses node globals)
    },
    plugins: {
      ...baseTypeScriptConfig.plugins,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...baseTypeScriptConfig.rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    rules: {
      ...baseTestConfig.rules,
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

// ============================================================================
// CONSOLIDATED SIMPLIFIED CONFIGURATION PROPOSAL
// ============================================================================

export default [
  // Global ignores
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "*.js",
      "*.d.ts",
      // Frontend specific
      "vite.config.ts",
      "jest.config.*",
      "babel.config.*",
      "tailwind.config.*",
      "postcss.config.*",
    ],
  },

  // Base JS config
  js.configs.recommended,

  // Backend services (auth, backend, genealogy, search, storage)
  {
    files: [
      "auth-service/**/*.{ts,tsx}",
      "backend-service/**/*.{ts,tsx}",
      "genealogy-service/**/*.{ts,tsx}",
      "search-service/**/*.{ts,tsx}",
      "storage-service/**/*.{ts,tsx}",
    ],
    ...baseTypeScriptConfig,
    rules: {
      ...baseTypeScriptConfig.rules,
      // Backend-specific rule adjustments
      "no-redeclare": "off",
      "@typescript-eslint/no-redeclare": "error",
      "@typescript-eslint/no-unsafe-declaration-merging": "off",
    },
  },

  // Frontend service
  {
    files: ["frontend/**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: globals.browser,
    },
    plugins: {
      "@typescript-eslint": typescript,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
      "prefer-const": "off",
      "no-var": "off",
    },
  },

  // Test files (all services)
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.ts", "**/__tests__/**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        ...globals.jest,
        ...globals.node,
        ...globals.es2022,
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off",
    },
  },
];

// ============================================================================
// RECOMMENDATIONS FOR SIMPLIFICATION
// ============================================================================

/**
 * IDENTIFIED INCONSISTENCIES TO RESOLVE:
 *
 * 1. prefer-const rule:
 *    - Most services: "off"
 *    - backend-service tests: "error"
 *    - genealogy-service tests: "error"
 *    RECOMMENDATION: Decide on "warn" or "error" consistently
 *
 * 2. no-var rule:
 *    - Most services: "off"
 *    - backend-service tests: "error"
 *    - genealogy-service tests: "error"
 *    RECOMMENDATION: Should be "error" everywhere (var is deprecated)
 *
 * 3. Test file @typescript-eslint/no-unused-vars:
 *    - Some: "off"
 *    - Others: ["error", { argsIgnorePattern: "^_" }]
 *    RECOMMENDATION: Use pattern to allow _unused parameters
 *
 * 4. File patterns:
 *    - Most services: ["**\/*.ts", "**\/*.tsx"]
 *    - backend-service: ["src/**\/*.ts", "services/**\/*.ts", ...]
 *    - genealogy-service: ["src/**\/*.ts", "src/**\/*.tsx"]
 *    RECOMMENDATION: Standardize on either **\/*.ts or src/**\/*.ts
 *
 * 5. TypeScript project configuration for tests:
 *    - Some exclude project config for tests
 *    - Others include it
 *    RECOMMENDATION: Exclude for faster linting, include for type checking
 *
 * NEXT STEPS:
 * 1. Review these recommendations
 * 2. Create single root eslint.config.js to replace all 6 configs
 * 3. Update package.json scripts to use root config
 * 4. Remove individual service configs
 */
