import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: [
      "src/**/*.ts",
      "services/**/*.ts",
      "src/**/*.tsx",
      "services/**/*.tsx",
    ],
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
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "no-console": "off",
      "prefer-const": "off",
      "no-var": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    languageOptions: {
      parser: typescriptParser, // Explicitly set parser for test files
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        // project: undefined, // Ensure project is not inherited, or set to a test-specific tsconfig if needed
      },
      globals: {
        ...globals.jest,
        ...globals.node, // Add Node.js globals
      },
    },
    plugins: {
      "@typescript-eslint": typescript, // Explicitly add plugin for test files
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        // Copied from main config, adjust if needed for tests
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off", // Keep test-specific overrides
      "@typescript-eslint/explicit-module-boundary-types": "off", // Keep test-specific overrides
      "@typescript-eslint/no-explicit-any": "off", // Keep test-specific overrides
      "@typescript-eslint/no-non-null-assertion": "warn", // Copied from main config
      "no-console": "off", // Keep test-specific overrides
      "prefer-const": "error", // Copied from main config
      "no-var": "error", // Copied from main config
    },
  },
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "*.js", "*.d.ts"],
  },
];
