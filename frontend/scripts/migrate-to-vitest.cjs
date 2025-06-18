#!/usr/bin/env node

/**
 * Migration script to convert Jest tests to Vitest
 * 
 * Usage: node scripts/migrate-to-vitest.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TEST_DIRS = [
  path.resolve(__dirname, '../src'),
  path.resolve(__dirname, '../__tests__')
];

const DRY_RUN = process.argv.includes('--dry-run');

// Replacements to make in test files
const replacements = [
  // Replace jest with vi
  { from: /jest\.fn\(\)/g, to: 'vi.fn()' },
  { from: /jest\.mock\(/g, to: 'vi.mock(' },
  { from: /jest\.spyOn\(/g, to: 'vi.spyOn(' },
  { from: /jest\.resetAllMocks\(\)/g, to: 'vi.resetAllMocks()' },
  { from: /jest\.clearAllMocks\(\)/g, to: 'vi.clearAllMocks()' },
  { from: /jest\.useFakeTimers\(\)/g, to: 'vi.useFakeTimers()' },
  { from: /jest\.useRealTimers\(\)/g, to: 'vi.useRealTimers()' },
  { from: /jest\.runAllTimers\(\)/g, to: 'vi.runAllTimers()' },
  { from: /jest\.advanceTimersByTime\(/g, to: 'vi.advanceTimersByTime(' },
  
  // Add imports for vitest if missing
  { 
    from: /import.*@testing-library\/react[^;]*;(?!\s*import.*vitest)/g, 
    to: (match) => `${match}\nimport { describe, it, expect, vi, beforeEach, afterEach } from "vitest";` 
  },
  
  // Remove Jest DOM import if Vitest already imported
  { 
    from: /import.*@testing-library\/jest-dom[^;]*;\s*import.*vitest/g, 
    to: (match) => match.replace(/import.*@testing-library\/jest-dom[^;]*;\s*/, '') 
  },
  
  // Add Vi type if using TypeScript
  { 
    from: /global\.fetch = jest\.fn\(\)/g, 
    to: 'global.fetch = vi.fn() as unknown as typeof fetch' 
  },
];

// Function to process a file
function processFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Apply replacements
  replacements.forEach(({ from, to }) => {
    if (typeof to === 'function') {
      content = content.replace(from, to);
    } else {
      content = content.replace(from, to);
    }
  });
  
  // Check if the file was changed
  const hasChanges = content !== originalContent;
  
  if (hasChanges) {
    console.log(`  Changes detected in ${filePath}`);
    
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Updated ${filePath}`);
    } else {
      console.log(`  DRY RUN: Would update ${filePath}`);
    }
  } else {
    console.log(`  No changes needed for ${filePath}`);
  }
  
  return hasChanges;
}

// Function to find test files recursively
function findTestFiles(dir) {
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
  console.log('Migrating Jest tests to Vitest...');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  
  let allTestFiles = [];
  
  // Find all test files
  TEST_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      const testFiles = findTestFiles(dir);
      allTestFiles = allTestFiles.concat(testFiles);
    }
  });
  
  console.log(`Found ${allTestFiles.length} test files`);
  
  // Process each file
  let changedFiles = 0;
  
  allTestFiles.forEach(file => {
    const hasChanges = processFile(file);
    if (hasChanges) changedFiles++;
  });
  
  console.log(`\nMigration complete!`);
  console.log(`${changedFiles} files would be changed out of ${allTestFiles.length} test files.`);
  
  if (DRY_RUN) {
    console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
  }
}

main();
