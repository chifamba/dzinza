#!/bin/bash

echo "Starting Node.js artifact cleanup..."

# Function to safely remove a file if it exists
remove_file_if_exists() {
  if [ -f "$1" ]; then
    echo "Removing file: $1"
    rm -f "$1"
  else
    echo "File not found (already removed or never existed): $1"
  fi
}

# Function to safely remove a directory if it exists
remove_dir_if_exists() {
  if [ -d "$1" ]; then
    echo "Removing directory: $1"
    rm -rf "$1"
  else
    echo "Directory not found (already removed or never existed): $1"
  fi
}

# --- Auth Service Cleanup ---
echo "--- Cleaning auth-service ---"
remove_file_if_exists "auth-service/.env.development"
remove_file_if_exists "auth-service/.env.example"
remove_file_if_exists "auth-service/package.json"
remove_file_if_exists "auth-service/package-lock.json"
remove_file_if_exists "auth-service/tsconfig.json"
remove_file_if_exists "auth-service/jest.config.js" # If it existed
remove_dir_if_exists "auth-service/src"
# Assuming Python tests are top-level in auth-service/tests/ like test_*.py
# If there were specific Node.js test subdirs, add them here.

# --- Genealogy Service Cleanup ---
echo "--- Cleaning genealogy-service ---"
remove_file_if_exists "genealogy-service/.env.example"
remove_file_if_exists "genealogy-service/package.json"
remove_file_if_exists "genealogy-service/package-lock.json"
remove_file_if_exists "genealogy-service/tsconfig.json"
remove_file_if_exists "genealogy-service/jest.config.js"
remove_dir_if_exists "genealogy-service/src"
remove_dir_if_exists "genealogy-service/tests/routes" # Node.js tests
remove_dir_if_exists "genealogy-service/tests/unit"   # Node.js tests

# --- Search Service Cleanup ---
echo "--- Cleaning search-service ---"
remove_file_if_exists "search-service/.env.example"
remove_file_if_exists "search-service/package.json"
remove_file_if_exists "search-service/package-lock.json"
remove_file_if_exists "search-service/tsconfig.json"
remove_file_if_exists "search-service/jest.config.js" # If it existed
remove_dir_if_exists "search-service/src"
# Assuming Python tests are top-level in search-service/tests/
# If there were specific Node.js test subdirs, add them here.

# --- Backend Service (API Gateway) Cleanup ---
echo "--- Cleaning backend-service ---"
remove_file_if_exists "backend-service/.env.example"
remove_file_if_exists "backend-service/package.json"
remove_file_if_exists "backend-service/package-lock.json"
remove_file_if_exists "backend-service/tsconfig.json"
remove_file_if_exists "backend-service/tsconfig.base.json"
remove_file_if_exists "backend-service/jest.config.json"
remove_dir_if_exists "backend-service/src"      # Main Node.js source
remove_dir_if_exists "backend-service/services" # Nested Node.js project observed
remove_dir_if_exists "backend-service/tests/routes" # Node.js tests
remove_file_if_exists "backend-service/tests/setup.ts" # Node.js test setup

echo "Node.js artifact cleanup script finished."
echo "Please review the output above. You may need to manually remove other files or empty directories if not covered."
echo "Remember to make this script executable (chmod +x cleanup_node_artifacts.sh) before running."
