#!/usr/bin/env node

/**
 * Fix specific test issues that weren't caught by the general migration
 *
 * Usage: node scripts/fix-specific-tests.cjs
 */

const fs = require("fs");
const path = require("path");

// Files with specific issues to fix
const specificFixes = [
  // Fix EditPersonForm.test.tsx
  {
    filePath: path.resolve(
      __dirname,
      "../src/components/family-tree/EditPersonForm.test.tsx"
    ),
    fixes: [
      {
        from: /vi\.mock\("\.\.\/ui", \(\) => \({/g,
        to: 'vi.mock("../ui", () => ({ default: {}, ',
      },
    ],
  },
  // Fix PersonEventsList.test.tsx
  {
    filePath: path.resolve(
      __dirname,
      "../src/components/events/PersonEventsList.test.tsx"
    ),
    fixes: [
      {
        from: /const mockFetch = vi\.fn\(\);/g,
        to: "const mockFetch = vi.fn() as unknown as typeof fetch;",
      },
    ],
  },
  // Fix AdminRouteGuard.test.tsx
  {
    filePath: path.resolve(
      __dirname,
      "../src/components/auth/AdminRouteGuard.test.tsx"
    ),
    fixes: [
      {
        // Fix the unexpected closing bracket syntax error
        from: /expect\(screen\.queryByTestId\('admin-page'\)\)\.not\.toBeInTheDocument\(\);\s*}\);/g,
        to: "expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();\n  });",
      },
    ],
  },
];

// Function to process a file with specific fixes
function processSpecificFile(fileConfig) {
  const { filePath, fixes } = fileConfig;

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  console.log(`Processing specific fixes for ${filePath}...`);

  // Read the file
  let content = fs.readFileSync(filePath, "utf8");
  let originalContent = content;

  // Apply fixes
  fixes.forEach(({ from, to }) => {
    content = content.replace(from, to);
  });

  // Check if the file was changed
  const hasChanges = content !== originalContent;

  if (hasChanges) {
    console.log(`  Specific changes applied to ${filePath}`);
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`  ✅ Updated ${filePath}`);
  } else {
    console.log(`  No specific changes needed for ${filePath}`);
  }

  return hasChanges;
}

// Main function
function main() {
  console.log("Applying specific test fixes...");

  let changedFiles = 0;

  specificFixes.forEach((fileConfig) => {
    const hasChanges = processSpecificFile(fileConfig);
    if (hasChanges) changedFiles++;
  });

  console.log(`\nSpecific fixes complete!`);
  console.log(`${changedFiles} files changed.`);
}

main();
