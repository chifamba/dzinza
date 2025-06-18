#!/usr/bin/env node

/**
 * Fix paths in __tests__ directory to point to correct src components
 * 
 * Usage: node scripts/fix-test-paths.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const TEST_DIR = path.resolve(__dirname, '../__tests__');
const DRY_RUN = process.argv.includes('--dry-run');

// Path mapping from __tests__ to src
const pathMappings = [
  {
    from: /from\s+["']\.\.\/\.\.\/src\/components\/(.*)["']/g,
    to: 'from "../../../src/components/$1"'
  },
  {
    from: /require\(["']\.\.\/\.\.\/src\/components\/(.*)["']\)/g,
    to: 'require("../../../src/components/$1")'
  },
  {
    from: /import\s+{\s*[^}]+\s*}\s+from\s+["']\.\.\/\.\.\/src\/(.*)["']/g,
    to: (match) => {
      // Extract the import pattern and the path
      const importPattern = match.match(/import\s+({[^}]+})\s+from\s+["'](.*)["']/);
      if (importPattern) {
        const [_, imports, originalPath] = importPattern;
        // Construct the correct path
        const newPath = originalPath.replace(/^\.\.\/\.\.\/src\//, '../../../src/');
        return `import ${imports} from "${newPath}"`;
      }
      return match;
    }
  },
  // Handle vi.mock paths
  {
    from: /vi\.mock\(["']\.\.\/\.\.\/src\/components\/(.*)["']/g,
    to: 'vi.mock("../../../src/components/$1"'
  }
];

// Function to process a file
function processFile(filePath) {
  console.log(`Processing ${filePath}...`);
  
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Apply path mappings
  pathMappings.forEach(({ from, to }) => {
    if (typeof to === 'function') {
      content = content.replace(from, to);
    } else {
      content = content.replace(from, to);
    }
  });
  
  // Check if the file was changed
  const hasChanges = content !== originalContent;
  
  if (hasChanges) {
    console.log(`  Path changes detected in ${filePath}`);
    
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✅ Updated ${filePath}`);
    } else {
      console.log(`  DRY RUN: Would update ${filePath}`);
    }
  } else {
    console.log(`  No path changes needed for ${filePath}`);
  }
  
  return hasChanges;
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
  console.log('Fixing test paths in __tests__ directory...');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  
  // Find all test files
  const testFiles = findTestFiles(TEST_DIR);
  
  console.log(`Found ${testFiles.length} test files in __tests__ directory`);
  
  // Process each file
  let changedFiles = 0;
  
  testFiles.forEach(file => {
    const hasChanges = processFile(file);
    if (hasChanges) changedFiles++;
  });
  
  console.log(`\nPath fixing complete!`);
  console.log(`${changedFiles} files would be changed out of ${testFiles.length} test files.`);
  
  if (DRY_RUN) {
    console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
  }
}

main();
