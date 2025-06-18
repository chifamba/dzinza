import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"], // Only include files from src/
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
      ...typescript.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "no-console": "warn",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    languageOptions: {
      parser: typescriptParser, // Explicitly set parser for test files
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        // No project specific tsconfig for tests to avoid typed linting on them by default
      },
      globals: {
        ...globals.jest,
        ...globals.node, // Add Node.js globals for test environment
        ...globals.es2022,
      },
    },
    plugins: {
      "@typescript-eslint": typescript, // Explicitly add plugin for test files
    },
    rules: {
      // Start with a base set of recommended rules, then override
      ...typescript.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off", // Test-specific: allow 'any'
      "@typescript-eslint/no-non-null-assertion": "off", // Test-specific: allow '!' assertions
      "no-console": "off", // Test-specific: allow console logs
      "prefer-const": "error",
      "no-var": "error",
      // Add any other specific rule overrides for tests if needed
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "*.js", "*.d.ts"],
  },
];
