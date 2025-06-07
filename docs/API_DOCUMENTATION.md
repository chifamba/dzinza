# Dzinza Genealogy Platform - API Documentation

## API Overview

The Dzinza API is a RESTful service built with Node.js/Express.js that provides comprehensive genealogy research capabilities. All endpoints use JSON for request/response bodies and include proper HTTP status codes and error handling.

**Base URL:** `https://api.dzinza.com/v1`

**Authentication:** Bearer token (JWT) required for most endpoints

## Authentication

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Smith",
  "dateOfBirth": "1990-05-15",
  "agreeToTerms": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "emailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  }
}
```

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "rememberMe": true
}
```

### Refresh Token
```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer {accessToken}
```

## User Management

### Get User Profile
```http
GET /users/profile
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "displayName": "John Smith",
    "dateOfBirth": "1990-05-15",
    "profilePhotoUrl": "https://cdn.dzinza.com/photos/profile.jpg",
    "subscriptionTier": "premium",
    "privacySettings": {
      "profileVisibility": "family",
      "treeVisibility": "private"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLogin": "2024-01-15T10:30:00Z"
  }
}
```

### Update User Profile
```http
PUT /users/profile
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "displayName": "Johnny Smith",
  "bio": "Genealogy enthusiast researching Smith family history",
  "privacySettings": {
    "profileVisibility": "public",
    "treeVisibility": "family"
  }
}
```

### Upload Profile Photo
```http
POST /users/profile/photo
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Form Data:**
- `photo`: Image file (JPEG, PNG, max 5MB)

## Family Trees

### Get User's Trees
```http
GET /trees
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)
- `sort`: Sort by (name, created_at, updated_at)
- `order`: Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "trees": [
      {
        "id": "tree-uuid-1",
        "name": "Smith Family Tree",
        "description": "Tracing the Smith lineage back to Ireland",
        "privacyLevel": "family",
        "personCount": 247,
        "generationCount": 8,
        "collaboratorCount": 5,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T14:22:00Z",
        "homePerson": {
          "id": "person-uuid-1",
          "firstName": "John",
          "lastName": "Smith",
          "profilePhotoUrl": "https://cdn.dzinza.com/photos/person1.jpg"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

### Create Family Tree
```http
POST /trees
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "name": "Johnson Family Tree",
  "description": "Researching Johnson ancestors from Scotland",
  "privacyLevel": "private",
  "defaultSurname": "Johnson"
}
```

### Get Specific Tree
```http
GET /trees/{treeId}
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tree-uuid-1",
    "name": "Smith Family Tree",
    "description": "Tracing the Smith lineage back to Ireland",
    "owner": {
      "id": "user-uuid-1",
      "firstName": "John",
      "lastName": "Smith"
    },
    "privacyLevel": "family",
    "collaborationEnabled": true,
    "personCount": 247,
    "generationCount": 8,
    "homePerson": {
      "id": "person-uuid-1",
      "firstName": "John",
      "lastName": "Smith"
    },
    "collaborators": [
      {
        "id": "user-uuid-2",
        "firstName": "Mary",
        "lastName": "Johnson",
        "role": "editor",
        "joinedAt": "2024-01-05T00:00:00Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T14:22:00Z"
  }
}
```

### Update Tree
```http
PUT /trees/{treeId}
Authorization: Bearer {accessToken}
```

### Delete Tree
```http
DELETE /trees/{treeId}
Authorization: Bearer {accessToken}
```

## People Management

### Get People in Tree
```http
GET /trees/{treeId}/people
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `search`: Search by name
- `generation`: Filter by generation
- `gender`: Filter by gender
- `living`: Filter by living status (true/false)

**Response:**
```json
{
  "success": true,
  "data": {
    "people": [
      {
        "id": "person-uuid-1",
        "firstName": "John",
        "middleName": "William",
        "lastName": "Smith",
        "maidenName": null,
        "gender": "male",
        "birthDate": "1965-03-15",
        "birthPlace": "Boston, Massachusetts, USA",
        "deathDate": null,
        "occupation": "Engineer",
        "profilePhotoUrl": "https://cdn.dzinza.com/photos/person1.jpg",
        "livingStatus": "living",
        "privacyLevel": "family",
        "generationFromHome": 0,
        "relationshipToHome": "self",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-10T15:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 247,
      "totalPages": 13
    }
  }
}
```

### Add Person to Tree
```http
POST /trees/{treeId}/people
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "firstName": "Mary",
  "middleName": "Elizabeth",
  "lastName": "Johnson",
  "maidenName": "Brown",
  "gender": "female",
  "birthDate": "1967-08-22",
  "birthPlace": "New York, New York, USA",
  "occupation": "Teacher",
  "biography": "Elementary school teacher for 25 years",
  "livingStatus": "living",
  "privacyLevel": "family"
}
```

### Get Person Details
```http
GET /people/{personId}
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "person-uuid-1",
    "treeId": "tree-uuid-1",
    "firstName": "John",
    "middleName": "William",
    "lastName": "Smith",
    "fullName": "John William Smith",
    "gender": "male",
    "birthDate": "1965-03-15",
    "birthPlace": "Boston, Massachusetts, USA",
    "deathDate": null,
    "occupation": "Software Engineer",
    "education": "MIT - Computer Science",
    "biography": "Born in Boston, moved to California for tech career...",
    "profilePhotoUrl": "https://cdn.dzinza.com/photos/person1.jpg",
    "livingStatus": "living",
    "privacyLevel": "family",
    "alternativeNames": [
      {
        "nameType": "nickname",
        "firstName": "Johnny",
        "lastName": "Smith"
      }
    ],
    "relationships": [
      {
        "id": "rel-uuid-1",
        "relatedPerson": {
          "id": "person-uuid-2",
          "firstName": "Mary",
          "lastName": "Smith"
        },
        "relationshipType": "spouse",
        "startDate": "1992-06-15"
      }
    ],
    "lifeEvents": [
      {
        "id": "event-uuid-1",
        "eventType": "birth",
        "eventDate": "1965-03-15",
        "eventPlace": "Boston, Massachusetts, USA",
        "description": "Born at Boston General Hospital"
      }
    ],
    "photos": [
      {
        "id": "media-uuid-1",
        "url": "https://cdn.dzinza.com/photos/photo1.jpg",
        "thumbnailUrl": "https://cdn.dzinza.com/photos/thumb1.jpg",
        "caption": "High school graduation",
        "isPrimary": false
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-10T15:30:00Z"
  }
}
```

### Update Person
```http
PUT /people/{personId}
Authorization: Bearer {accessToken}
```

### Delete Person
```http
DELETE /people/{personId}
Authorization: Bearer {accessToken}
```

## Relationships

### Get Person's Relationships
```http
GET /people/{personId}/relationships
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "relationships": [
      {
        "id": "rel-uuid-1",
        "relationshipType": "spouse",
        "relatedPerson": {
          "id": "person-uuid-2",
          "firstName": "Mary",
          "lastName": "Smith",
          "profilePhotoUrl": "https://cdn.dzinza.com/photos/person2.jpg"
        },
        "startDate": "1992-06-15",
        "marriagePlace": "Boston, Massachusetts, USA",
        "confidenceLevel": 10,
        "sources": ["source-uuid-1"]
      },
      {
        "id": "rel-uuid-2",
        "relationshipType": "child",
        "relatedPerson": {
          "id": "person-uuid-3",
          "firstName": "Sarah",
          "lastName": "Smith"
        },
        "startDate": "1995-02-10",
        "biological": true,
        "confidenceLevel": 10
      }
    ]
  }
}
```

### Create Relationship
```http
POST /relationships
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "person1Id": "person-uuid-1",
  "person2Id": "person-uuid-2",
  "relationshipType": "spouse",
  "startDate": "1992-06-15",
  "marriagePlace": "Boston, Massachusetts, USA",
  "confidenceLevel": 10,
  "notes": "Married at St. Mary's Church"
}
```

### Update Relationship
```http
PUT /relationships/{relationshipId}
Authorization: Bearer {accessToken}
```

### Delete Relationship
```http
DELETE /relationships/{relationshipId}
Authorization: Bearer {accessToken}
```

## DNA Management

### Get DNA Profile
```http
GET /dna/profile
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "dna-profile-uuid-1",
    "kitNumber": "A123456789",
    "testingCompany": "Dzinza DNA",
    "testType": "autosomal",
    "collectionDate": "2024-01-01",
    "resultsDate": "2024-01-15",
    "ethnicityBreakdown": {
      "northwestern_europe": 45.2,
      "eastern_europe": 25.8,
      "scandinavian": 15.1,
      "irish_scottish": 10.4,
      "southern_europe": 3.5
    },
    "paternalHaplogroup": "R-M269",
    "maternalHaplogroup": "H1a1",
    "processingStatus": "completed",
    "qualityScore": 98.5,
    "uploadDate": "2024-01-01T00:00:00Z",
    "sharingEnabled": true
  }
}
```

### Upload DNA Data
```http
POST /dna/upload
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Form Data:**
- `dnaFile`: Raw DNA data file
- `testingCompany`: Company name
- `kitNumber`: Kit identifier
- `testType`: Type of test

### Get DNA Matches
```http
GET /dna/matches
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `minSharedCM`: Minimum shared DNA
- `relationship`: Filter by relationship type
- `status`: Filter by match status
- `sort`: Sort by (shared_dna, confidence, discovered_at)

**Response:**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": "match-uuid-1",
        "matchedProfile": {
          "id": "profile-uuid-2",
          "user": {
            "firstName": "Sarah",
            "lastName": "Thompson",
            "profilePhotoUrl": "https://cdn.dzinza.com/photos/user2.jpg"
          },
          "testingCompany": "Dzinza DNA"
        },
        "sharedDnaCm": 127.5,
        "sharedSegments": 8,
        "largestSegmentCm": 23.4,
        "estimatedRelationship": "3rd cousin",
        "relationshipConfidence": 85.2,
        "estimatedGenerations": 4.2,
        "xDnaSharedCm": 15.2,
        "matchStatus": "new",
        "starred": false,
        "contactAttempted": false,
        "discoveredAt": "2024-01-15T10:00:00Z",
        "notes": "",
        "tags": ["paternal_side", "smith_line"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1432,
      "totalPages": 72
    },
    "summary": {
      "totalMatches": 1432,
      "closeMatches": 23,
      "newMatches": 8,
      "sharedAncestors": 156
    }
  }
}
```

### Update Match Status
```http
PUT /dna/matches/{matchId}
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "status": "reviewed",
  "starred": true,
  "notes": "Potential connection through Smith grandparents",
  "tags": ["smith_line", "paternal_side"]
}
```

### Get Ethnicity Breakdown
```http
GET /dna/ethnicity
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "breakdown": [
      {
        "region": "Northwestern Europe",
        "percentage": 45.2,
        "confidence": "high",
        "subRegions": [
          {
            "region": "England & Northwestern Europe",
            "percentage": 35.1
          },
          {
            "region": "Scotland",
            "percentage": 10.1
          }
        ]
      }
    ],
    "migrationPaths": [
      {
        "period": "1800-1850",
        "from": "Ireland",
        "to": "United States",
        "confidence": "likely"
      }
    ],
    "analysisDate": "2024-01-15T00:00:00Z",
    "analysisVersion": "v2.1"
  }
}
```

## Historical Records

### Search Records
```http
GET /records/search
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `q`: General search query
- `firstName`: First name
- `lastName`: Last name
- `birthYear`: Birth year (exact or range: 1900-1950)
- `deathYear`: Death year
- `location`: Location (city, state, country)
- `recordType`: Type of record (birth, death, marriage, census, etc.)
- `dateRange`: Date range for record
- `page`: Page number
- `limit`: Items per page
- `sort`: Sort by (relevance, date, location)

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "record-uuid-1",
        "title": "Birth Certificate - John Smith",
        "recordType": "birth",
        "date": "1892-03-15",
        "location": "Boston, Massachusetts, USA",
        "description": "Birth certificate for John Smith, son of Robert Smith and Mary Johnson",
        "people": [
          {
            "role": "primary",
            "firstName": "John",
            "lastName": "Smith",
            "age": 0,
            "gender": "male"
          },
          {
            "role": "parent",
            "firstName": "Robert",
            "lastName": "Smith",
            "relationship": "father"
          }
        ],
        "source": {
          "name": "Massachusetts Vital Records",
          "type": "government",
          "repository": "Massachusetts State Archives"
        },
        "images": [
          {
            "url": "https://cdn.dzinza.com/records/record1.jpg",
            "thumbnailUrl": "https://cdn.dzinza.com/records/thumb1.jpg"
          }
        ],
        "relevanceScore": 95.2,
        "quality": {
          "legibility": 4,
          "completeness": 5,
          "accuracy": 5
        },
        "transcription": {
          "fullText": "Certificate of Birth...",
          "confidence": 98.5
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1247,
      "totalPages": 63
    },
    "facets": {
      "recordTypes": [
        { "type": "birth", "count": 156 },
        { "type": "death", "count": 89 },
        { "type": "marriage", "count": 67 }
      ],
      "locations": [
        { "location": "Massachusetts", "count": 234 },
        { "location": "New York", "count": 189 }
      ],
      "decades": [
        { "decade": "1890s", "count": 45 },
        { "decade": "1900s", "count": 78 }
      ]
    }
  }
}
```

### Get Record Details
```http
GET /records/{recordId}
Authorization: Bearer {accessToken}
```

### Save Record
```http
POST /records/{recordId}/save
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "personId": "person-uuid-1",
  "notes": "This appears to be John's birth certificate",
  "tags": ["birth", "verified"],
  "confidenceLevel": 9
}
```

### Get Saved Records
```http
GET /records/saved
Authorization: Bearer {accessToken}
```

### Create Record Hint
```http
POST /records/hints
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "recordId": "record-uuid-1",
  "personId": "person-uuid-1",
  "hintType": "potential_match",
  "confidence": 85,
  "reasoning": "Name and birth year match closely"
}
```

## Media Management

### Upload Media
```http
POST /media/upload
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Form Data:**
- `file`: Media file
- `title`: Media title
- `description`: Description
- `dateTaken`: Date taken (ISO format)
- `location`: Location where taken
- `privacyLevel`: Privacy level (private, family, public)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "media-uuid-1",
    "filename": "family_photo_1920.jpg",
    "fileType": "image",
    "mimeType": "image/jpeg",
    "fileSize": 2457600,
    "url": "https://cdn.dzinza.com/media/photo1.jpg",
    "thumbnailUrl": "https://cdn.dzinza.com/media/thumb1.jpg",
    "title": "Family Portrait 1920",
    "description": "Smith family gathering for Christmas",
    "width": 1920,
    "height": 1080,
    "dateTaken": "1920-12-25T00:00:00Z",
    "location": "Boston, Massachusetts",
    "privacyLevel": "family",
    "uploadDate": "2024-01-15T10:30:00Z"
  }
}
```

### Get Media
```http
GET /media/{mediaId}
Authorization: Bearer {accessToken}
```

### Update Media
```http
PUT /media/{mediaId}
Authorization: Bearer {accessToken}
```

### Delete Media
```http
DELETE /media/{mediaId}
Authorization: Bearer {accessToken}
```

### Link Media to Person
```http
POST /people/{personId}/media
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "mediaId": "media-uuid-1",
  "mediaRole": "profile_photo",
  "isPrimary": true,
  "caption": "John's graduation photo"
}
```

## Photo Enhancement

### Start Enhancement
```http
POST /photos/enhance
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "mediaId": "media-uuid-1",
  "enhancementType": "colorization",
  "settings": {
    "aggressiveness": 7,
    "preserveOriginal": true,
    "outputQuality": "4k"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enhancementId": "enhancement-uuid-1",
    "status": "queued",
    "estimatedTime": 300,
    "queuePosition": 3
  }
}
```

### Get Enhancement Status
```http
GET /photos/enhance/{enhancementId}
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "enhancement-uuid-1",
    "mediaId": "media-uuid-1",
    "enhancementType": "colorization",
    "status": "processing",
    "progress": 75,
    "startedAt": "2024-01-15T10:00:00Z",
    "estimatedCompletion": "2024-01-15T10:05:00Z",
    "steps": [
      {
        "name": "Image Analysis",
        "status": "completed",
        "progress": 100
      },
      {
        "name": "Color Restoration",
        "status": "processing",
        "progress": 75
      }
    ]
  }
}
```

### Get Enhancement History
```http
GET /photos/enhancements
Authorization: Bearer {accessToken}
```

## Smart Hints

### Get User Hints
```http
GET /hints
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `type`: Hint type (record_match, dna_connection, missing_info)
- `confidence`: Minimum confidence level
- `status`: Filter by status (new, reviewed, accepted, dismissed)
- `personId`: Filter by person

**Response:**
```json
{
  "success": true,
  "data": {
    "hints": [
      {
        "id": "hint-uuid-1",
        "type": "record_match",
        "confidence": 87.5,
        "person": {
          "id": "person-uuid-1",
          "firstName": "John",
          "lastName": "Smith"
        },
        "record": {
          "id": "record-uuid-1",
          "title": "1920 US Federal Census",
          "date": "1920-01-01",
          "location": "Boston, Massachusetts"
        },
        "suggestion": "This census record may contain information about John Smith",
        "evidence": [
          {
            "type": "name_match",
            "score": 95,
            "details": "Exact name match"
          },
          {
            "type": "age_match",
            "score": 80,
            "details": "Age matches within 2 years"
          }
        ],
        "status": "new",
        "created": "2024-01-15T08:00:00Z"
      }
    ],
    "summary": {
      "total": 45,
      "new": 12,
      "highConfidence": 8
    }
  }
}
```

### Update Hint Status
```http
PUT /hints/{hintId}
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "status": "accepted",
  "notes": "Confirmed this is the correct John Smith"
}
```

## Collaboration

### Invite Collaborator
```http
POST /trees/{treeId}/collaborators/invite
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "email": "collaborator@example.com",
  "role": "editor",
  "message": "Would you like to help research our family tree?"
}
```

### Get Tree Collaborators
```http
GET /trees/{treeId}/collaborators
Authorization: Bearer {accessToken}
```

### Update Collaborator Role
```http
PUT /trees/{treeId}/collaborators/{userId}
Authorization: Bearer {accessToken}
```

### Remove Collaborator
```http
DELETE /trees/{treeId}/collaborators/{userId}
Authorization: Bearer {accessToken}
```

## Notifications

### Get Notifications
```http
GET /notifications
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `unread`: Filter unread notifications (true/false)
- `type`: Filter by notification type
- `page`: Page number
- `limit`: Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification-uuid-1",
        "type": "dna_match",
        "title": "New DNA Match Found",
        "message": "You have a new DNA match with Sarah Thompson (127 cM shared)",
        "actionUrl": "/dna/matches/match-uuid-1",
        "data": {
          "matchId": "match-uuid-1",
          "sharedCM": 127.5
        },
        "priority": "normal",
        "readAt": null,
        "createdAt": "2024-01-15T09:00:00Z"
      }
    ],
    "unreadCount": 5
  }
}
```

### Mark Notification as Read
```http
PUT /notifications/{notificationId}/read
Authorization: Bearer {accessToken}
```

### Mark All as Read
```http
PUT /notifications/read-all
Authorization: Bearer {accessToken}
```

## Analytics and Statistics

### Get User Statistics
```http
GET /analytics/user-stats
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "familyTrees": {
      "total": 3,
      "totalPeople": 247,
      "totalGenerations": 8,
      "completeness": 67.5
    },
    "dna": {
      "totalMatches": 1432,
      "closeMatches": 23,
      "newMatches": 8,
      "ethnicityRegions": 5
    },
    "research": {
      "recordsSaved": 89,
      "sourcesAdded": 45,
      "photosUploaded": 156,
      "hintsReceived": 234
    },
    "activity": {
      "loginStreak": 15,
      "lastActive": "2024-01-15T14:30:00Z",
      "totalSessions": 89,
      "averageSessionTime": 1847
    }
  }
}
```

### Get Tree Statistics
```http
GET /analytics/tree-stats/{treeId}
Authorization: Bearer {accessToken}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req-uuid-123"
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED` (401): Valid authentication token required
- `AUTHORIZATION_DENIED` (403): Insufficient permissions
- `RESOURCE_NOT_FOUND` (404): Requested resource not found
- `VALIDATION_ERROR` (400): Invalid input data
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_SERVER_ERROR` (500): Server error
- `SERVICE_UNAVAILABLE` (503): Service temporarily unavailable

## Rate Limiting

API requests are rate limited per user:

- **Free tier**: 1000 requests/hour
- **Basic tier**: 5000 requests/hour  
- **Premium tier**: 20000 requests/hour
- **Family tier**: 50000 requests/hour

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## Webhooks

Configure webhooks to receive real-time notifications:

### Configure Webhook
```http
POST /webhooks
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/dzinza",
  "events": ["dna.match.new", "tree.person.added", "hint.created"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

- `dna.match.new`: New DNA match discovered
- `dna.match.updated`: DNA match status changed
- `tree.person.added`: Person added to tree
- `tree.person.updated`: Person information updated
- `hint.created`: New research hint generated
- `collaboration.invite`: Collaboration invitation sent
- `photo.enhancement.completed`: Photo enhancement finished

### Webhook Payload Example

```json
{
  "event": "dna.match.new",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "matchId": "match-uuid-1",
    "userId": "user-uuid-1",
    "sharedCM": 127.5,
    "estimatedRelationship": "3rd cousin"
  },
  "signature": "sha256=..."
}
```

This comprehensive API documentation provides developers with all the information needed to integrate with the Dzinza genealogy platform, supporting everything from basic family tree management to advanced DNA analysis and AI-powered research hints.