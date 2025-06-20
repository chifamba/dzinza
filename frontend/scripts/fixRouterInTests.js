// scripts/fixRouterInTests.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import glob from "glob";

// Get current file and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the src directory
const srcDir = path.resolve(__dirname, "../src");

// Find all test files (using glob promise API)
const testFiles = await glob.glob(`${srcDir}/**/*.test.{ts,tsx}`);

// Import statement to add for test-utils
const testUtilsImportRegex =
  /import\s+\{\s*render\s*,\s*screen\s*(?:,\s*[^}]+)?\s*\}\s+from\s+['"]@testing-library\/react['"];/;

// Process each test file
for (const filePath of testFiles) {
  let content = fs.readFileSync(filePath, "utf8");

  // Calculate the relative path to test-utils from the test file
  const relativePath = path.relative(
    path.dirname(filePath),
    path.join(srcDir, "test")
  );
  const importPath = relativePath
    ? relativePath + "/test-utils"
    : "./test-utils";
  const customTestUtilsImport = `import { render, screen, fireEvent, waitFor } from '${importPath}';`;

  // Check if the file already imports from test-utils
  if (
    !content.includes("from '../test/test-utils'") &&
    !content.includes(`from '${importPath}'`) &&
    testUtilsImportRegex.test(content)
  ) {
    // Replace @testing-library/react import with our custom test-utils
    content = content.replace(testUtilsImportRegex, customTestUtilsImport);

    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Updated imports in: ${filePath}`);
  }
}

console.log("Router fix applied to test files.");
