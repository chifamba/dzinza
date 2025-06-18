#!/usr/bin/env node

/**
 * Create test reference files to forward from __tests__ to src
 * This avoids duplicate test execution while preserving file references
 *
 * Usage: node scripts/create-test-references.cjs [--dry-run]
 */

const fs = require("fs");
const path = require("path");

// Configuration
const TEST_DIR = path.resolve(__dirname, "../__tests__");
const SRC_DIR = path.resolve(__dirname, "../src");
const DRY_RUN = process.argv.includes("--dry-run");

// Function to check if a test file in __tests__ has a counterpart in src
function findMatchingSourceTest(testFile) {
  // Extract the component path from the test file
  // e.g. __tests__/components/ui/Button.test.tsx -> components/ui/Button.test.tsx
  const relativePath = path.relative(TEST_DIR, testFile);
  const srcTestPath = path.join(SRC_DIR, relativePath);

  return fs.existsSync(srcTestPath) ? srcTestPath : null;
}

// Function to create a reference test file
function createReferenceFile(testFile, srcTestPath) {
  console.log(`Creating reference from ${testFile} to ${srcTestPath}...`);

  // Get the relative path from the test file to the src test file
  const relativeSrcPath = path.relative(path.dirname(testFile), srcTestPath);

  const content = `// Reference to the actual test file in src
import * as actualTest from "${relativeSrcPath}";

// This file exists to prevent duplicate test execution while preserving file references
// The actual test is in: ${relativeSrcPath}
`;

  if (!DRY_RUN) {
    fs.writeFileSync(testFile, content, "utf8");
    console.log(`  ✅ Created reference file at ${testFile}`);
  } else {
    console.log(`  DRY RUN: Would create reference file at ${testFile}`);
  }

  return true;
}

// Function to find test files recursively
function findTestFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir);
  let testFiles = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      testFiles = testFiles.concat(findTestFiles(filePath));
    } else if (file.match(/\.test\.(ts|tsx|js|jsx)$/)) {
      testFiles.push(filePath);
    }
  }

  return testFiles;
}

// Main function
function main() {
  console.log("Creating test references from __tests__ to src...");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);

  // Find all test files in __tests__
  const testFiles = findTestFiles(TEST_DIR);

  console.log(`Found ${testFiles.length} test files in __tests__ directory`);

  // Process each file
  let referencedFiles = 0;

  testFiles.forEach((testFile) => {
    const srcTestPath = findMatchingSourceTest(testFile);

    if (srcTestPath) {
      console.log(`Match found: ${testFile} -> ${srcTestPath}`);
      const created = createReferenceFile(testFile, srcTestPath);
      if (created) referencedFiles++;
    } else {
      console.log(`No src match found for: ${testFile}`);
    }
  });

  console.log(`\nReference creation complete!`);
  console.log(
    `${referencedFiles} reference files created out of ${testFiles.length} test files.`
  );

  if (DRY_RUN) {
    console.log(
      "\nThis was a dry run. Run without --dry-run to apply changes."
    );
  }
}

main();
