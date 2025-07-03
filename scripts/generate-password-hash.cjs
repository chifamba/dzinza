#!/usr/bin/env node

/**
 * Password Hash Generator for Dzinza Database
 *
 * This script generates bcrypt password hashes compatible with the backend authentication system.
 * Use this when creating or updating user passwords for database initialization scripts.
 *
 * Usage:
 *   node scripts/generate-password-hash.js "YourPassword123!"
 *   node scripts/generate-password-hash.js
 */

const bcrypt = require("bcryptjs");

// Get password from command line argument or prompt for it
const password = process.argv[2];

if (!password) {
  console.log(
    'Usage: node scripts/generate-password-hash.js "YourPassword123!"'
  );
  console.log("");
  console.log(
    "This script generates bcrypt password hashes for database initialization."
  );
  console.log(
    "The hash can be used in SQL INSERT statements for the users table."
  );
  process.exit(1);
}

// Generate hash with cost factor 12 (same as backend)
const hash = bcrypt.hashSync(password, 12);

console.log("Password:", password);
console.log("Bcrypt Hash:", hash);
console.log("");
console.log("SQL Example:");
console.log(
  `INSERT INTO users (email, username, password_hash, first_name, last_name, email_verified, is_admin)`
);
console.log(`VALUES (`);
console.log(`    'user@example.com',`);
console.log(`    'username',`);
console.log(`    '${hash}',`);
console.log(`    'First',`);
console.log(`    'Last',`);
console.log(`    true,`);
console.log(`    false`);
console.log(`);`);
