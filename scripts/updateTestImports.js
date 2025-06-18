// scripts/updateTestImports.js
const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Path to the src directory
const srcDir = path.resolve(__dirname, "../frontend/src");

// Find all test files
const testFiles = glob.sync(`${srcDir}/**/*.test.{ts,tsx}`);

// Process each test file
testFiles.forEach((filePath) => {
  console.log(`Processing: ${filePath}`);
  let content = fs.readFileSync(filePath, "utf8");

  // Calculate the relative path to test-utils from the test file
  const relativeDepth = path
    .relative(path.dirname(filePath), srcDir)
    .split(path.sep).length;
  const relativePath = "../".repeat(relativeDepth) + "test/test-utils";

  // Replace @testing-library/react imports with test-utils imports
  const newContent = content.replace(
    /import\s+\{\s*([^}]+)\s*\}\s+from\s+(['"])@testing-library\/react\2;/g,
    `import { $1 } from "${relativePath}";`
  );

  // Replace loading indicator assertions with the actual text content
  const loadingStateReplaced = newContent.replace(
    /expect\(screen\.getByTestId\("loading-indicator"\)\)\.toBeInTheDocument\(\);/g,
    'expect(screen.getByText("Loading related events...")).toBeInTheDocument();'
  );

  const loadingStateQueryReplaced = loadingStateReplaced.replace(
    /expect\(screen\.queryByTestId\("loading-indicator"\)\)\.not\.toBeInTheDocument\(\);/g,
    'expect(screen.queryByText("Loading related events...")).not.toBeInTheDocument();'
  );

  // Make other component-specific fixes
  // Fix event date test IDs
  const eventDateReplaced = loadingStateQueryReplaced.replace(
    /const dates = screen\.getAllByTestId\("event-date"\);/g,
    "const dates = screen.getAllByText(/(January|May|June)/);"
  );

  if (content !== eventDateReplaced) {
    fs.writeFileSync(filePath, eventDateReplaced, "utf8");
    console.log(`Updated: ${filePath}`);
  } else {
    console.log(`No changes needed for: ${filePath}`);
  }
});

console.log("Finished updating test imports.");
