// scripts/cleanDuplicateTests.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

// Get current file and directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the __tests__ directory
const testsDir = path.resolve(__dirname, "../__tests__");

// Function to recursively remove a directory and its contents
function removeDirectoryRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursive call
        removeDirectoryRecursive(curPath);
      } else {
        // Delete file
        fs.unlinkSync(curPath);
        console.log(`Removed file: ${curPath}`);
      }
    });
    fs.rmdirSync(dirPath);
    console.log(`Removed directory: ${dirPath}`);
  }
}

// Check if the __tests__ directory exists before attempting to remove it
if (fs.existsSync(testsDir)) {
  console.log("Cleaning up duplicate tests in __tests__ directory...");
  removeDirectoryRecursive(testsDir);
  console.log("Cleanup complete!");
} else {
  console.log("__tests__ directory does not exist. No cleanup needed.");
}
