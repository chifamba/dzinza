// MongoDB initialization script for Dzinza Genealogy Platform
// This script sets up the initial databases and collections

// Switch to admin database for user creation
db = db.getSiblingDB('admin');

// Create application databases
print('Creating Dzinza databases...');

// Auth Database
db = db.getSiblingDB('dzinza_auth');
db.createCollection('users');
db.createCollection('refresh_tokens');
db.createCollection('audit_logs');

// Create indexes for auth database
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ emailVerificationToken: 1 });
db.users.createIndex({ passwordResetToken: 1 });
db.users.createIndex({ createdAt: 1 });
db.refresh_tokens.createIndex({ token: 1 }, { unique: true });
db.refresh_tokens.createIndex({ userId: 1 });
db.refresh_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.audit_logs.createIndex({ userId: 1 });
db.audit_logs.createIndex({ action: 1 });
db.audit_logs.createIndex({ timestamp: 1 });

print('Auth database and indexes created');

// Genealogy Database
db = db.getSiblingDB('dzinza_genealogy');
db.createCollection('family_trees');
db.createCollection('persons');
db.createCollection('relationships');
db.createCollection('collaborations');

// Create indexes for genealogy database
db.family_trees.createIndex({ ownerId: 1 });
db.family_trees.createIndex({ name: 1 });
db.family_trees.createIndex({ createdAt: 1 });
db.persons.createIndex({ familyTreeId: 1 });
db.persons.createIndex({ firstName: 1, lastName: 1 });
db.persons.createIndex({ birthDate: 1 });
db.relationships.createIndex({ personId: 1 });
db.relationships.createIndex({ relatedPersonId: 1 });
db.collaborations.createIndex({ familyTreeId: 1 });
db.collaborations.createIndex({ userId: 1 });

print('Genealogy database and indexes created');

// Storage Database
db = db.getSiblingDB('dzinza_storage');
db.createCollection('files');
db.createCollection('galleries');

// Create indexes for storage database
db.files.createIndex({ userId: 1 });
db.files.createIndex({ s3Key: 1 }, { unique: true });
db.files.createIndex({ category: 1 });
db.files.createIndex({ uploadedAt: 1 });
db.files.createIndex({ familyTreeId: 1 });
db.galleries.createIndex({ userId: 1 });
db.galleries.createIndex({ name: 1 });

print('Storage database and indexes created');

// Search Database
db = db.getSiblingDB('dzinza_search');
db.createCollection('search_logs');
db.createCollection('search_analytics');

// Create indexes for search database
db.search_logs.createIndex({ userId: 1 });
db.search_logs.createIndex({ query: 1 });
db.search_logs.createIndex({ timestamp: 1 });
db.search_analytics.createIndex({ date: 1 });
db.search_analytics.createIndex({ userId: 1 });

print('Search database and indexes created');

print('All Dzinza databases initialized successfully!');
