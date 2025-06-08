// Dzinza MongoDB Initialization Script

// Switch to dzinza_genealogy database
db = db.getSiblingDB('dzinza_genealogy');

// Create collections with validation
db.createCollection('family_trees', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['userId', 'name', 'createdAt'],
            properties: {
                userId: { bsonType: 'string' },
                name: { bsonType: 'string' },
                description: { bsonType: 'string' },
                privacy: { enum: ['public', 'private', 'family'] },
                members: {
                    bsonType: 'array',
                    items: {
                        bsonType: 'object',
                        required: ['id', 'name'],
                        properties: {
                            id: { bsonType: 'string' },
                            name: { bsonType: 'string' },
                            birthDate: { bsonType: 'date' },
                            deathDate: { bsonType: 'date' },
                            relationships: { bsonType: 'array' }
                        }
                    }
                },
                createdAt: { bsonType: 'date' },
                updatedAt: { bsonType: 'date' }
            }
        }
    }
});

db.createCollection('dna_profiles', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['userId', 'profileId', 'uploadDate'],
            properties: {
                userId: { bsonType: 'string' },
                profileId: { bsonType: 'string' },
                ethnicity: { bsonType: 'object' },
                matches: { bsonType: 'array' },
                uploadDate: { bsonType: 'date' }
            }
        }
    }
});

// Create indexes
db.family_trees.createIndex({ userId: 1 });
db.family_trees.createIndex({ privacy: 1 });
db.dna_profiles.createIndex({ userId: 1 });
db.dna_profiles.createIndex({ profileId: 1 }, { unique: true });

// Insert sample data
db.family_trees.insertOne({
    userId: 'sample-user-id',
    name: 'Sample Family Tree',
    description: 'A sample family tree for testing',
    privacy: 'private',
    members: [],
    createdAt: new Date(),
    updatedAt: new Date()
});

print('MongoDB initialization completed successfully');
