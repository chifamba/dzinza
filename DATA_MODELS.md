# Data Model Definitions

This document summarizes all data models used across the project.

---

## Auth Service

### Token

```json
{
  "access_token": "string",
  "token_type": "string",
  "expires_in": 3600,
  "scope": ["string"],
  "user_id": "string",
  "refresh_token": "string"
}
```

### AuthTokens

```json
{
  "accessToken": "string",
  "refreshToken": "string",
  "expiresIn": 3600
}
```

### TokenPayload

```json
{
  "sub": "string",
  "exp": 1720000000,
  "iss": "issuer",
  "aud": "audience",
  "user_id": "user-id",
  "email": "user@example.com",
  "role": "USER",
  "jti": "jwt-id",
  "type": "access"
}
```

### RefreshTokenPayload

```json
{
  "sub": "string",
  "exp": 1720000000,
  "iss": "issuer",
  "aud": "audience",
  "user_id": "user-id",
  "email": "user@example.com",
  "role": "USER",
  "jti": "jwt-id",
  "type": "refresh"
}
```

### UserBase

```json
{
  "email": "user@example.com",
  "username": "username",
  "first_name": "John",
  "last_name": "Doe",
  "preferred_language": "en",
  "timezone": "UTC"
}
```

### UserCreate

```json
{
  "email": "user@example.com",
  "username": "username",
  "first_name": "John",
  "last_name": "Doe",
  "preferred_language": "en",
  "timezone": "UTC",
  "password": "StrongP@ssw0rd"
}
```

### UserUpdate

```json
{
  "email": "user@example.com",
  "username": "username",
  "first_name": "John",
  "last_name": "Doe",
  "preferred_language": "en",
  "timezone": "UTC",
  "is_active": true,
  "role": "USER"
}
```

### UserResponse

```json
{
  "id": "c1a1e2f4-1234-5678-9abc-def012345678",
  "email": "user@example.com",
  "username": "username",
  "first_name": "John",
  "last_name": "Doe",
  "preferred_language": "en",
  "timezone": "UTC",
  "isActive": true,
  "isSuperuser": false,
  "roles": ["USER"],
  "emailVerified": true,
  "mfaEnabled": false,
  "lastLoginAt": "2025-07-26T19:39:00Z",
  "createdAt": "2025-07-26T19:39:00Z",
  "updatedAt": "2025-07-26T19:39:00Z",
  "preferences": {
    "notifications": {
      "email": false,
      "push": false,
      "newsletter": false
    },
    "privacy": {
      "profileVisibility": "private",
      "allowMessages": false,
      "showOnlineStatus": false
    },
    "theme": "light",
    "timezone": "UTC"
  }
}
```

### LoginResponse

```json
{
  "message": "Login successful",
  "user": {
    /* UserResponse JSON */
  },
  "tokens": {
    /* AuthTokens JSON */
  },
  "requireMfa": false
}
```

### UserPublicResponse

```json
{
  "id": "c1a1e2f4-1234-5678-9abc-def012345678",
  "username": "username",
  "first_name": "John",
  "last_name": "Doe"
}
```

### LoginRequest

```json
{
  "email": "user@example.com",
  "password": "StrongP@ssw0rd",
  "mfaCode": "123456"
}
```

### RegisterRequest

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "password": "StrongP@ssw0rd",
  "username": "username",
  "preferredLanguage": "en"
}
```

### PasswordChangeRequest

```json
{
  "current_password": "OldP@ssw0rd",
  "new_password": "NewP@ssw0rd"
}
```

### PasswordResetRequest

```json
{
  "email": "user@example.com"
}
```

### PasswordResetConfirmRequest

```json
{
  "token": "reset-token",
  "new_password": "NewP@ssw0rd"
}
```

### PasswordResetTokenRequest

```json
{
  "token": "reset-token"
}
```

### EmailVerificationRequest

```json
{
  "email": "user@example.com"
}
```

### EmailVerificationConfirmRequest

```json
{
  "token": "verification-token"
}
```

### MFAEnableRequest

```json
{}
```

### MFAEnableResponse

```json
{
  "otp_secret": "OTPSECRET",
  "otp_auth_url": "otpauth://totp/Example"
}
```

### MFAVerifyRequest

```json
{
  "mfa_code": "123456"
}
```

### MFASetupCompleteResponse

```json
{
  "message": "MFA setup complete",
  "backup_codes": ["code1", "code2"]
}
```

### MFADisableRequest

```json
{
  "password": "StrongP@ssw0rd",
  "mfa_code": "123456"
}
```

### MFARecoveryCodesResponse

```json
{
  "recovery_codes": ["code1", "code2"],
  "message": "Recovery codes generated"
}
```

### RefreshTokenCreate

```json
{
  "user_id": "c1a1e2f4-1234-5678-9abc-def012345678",
  "token_jti": "jwt-id",
  "expires_at": "2025-07-26T19:39:00Z",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0"
}
```

### RefreshTokenRequest

```json
{
  "refreshToken": "refresh-token"
}
```

### LogoutRequest

```json
{
  "refreshToken": "refresh-token"
}
```

### AuditLogBase

```json
{
  "action": "LOGIN",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0",
  "details": "User logged in"
}
```

### AuditLogCreate

```json
{
  "action": "LOGIN",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0",
  "details": "User logged in",
  "user_id": "c1a1e2f4-1234-5678-9abc-def012345678"
}
```

### AuditLogResponse

```json
{
  "id": "c1a1e2f4-1234-5678-9abc-def012345678",
  "action": "LOGIN",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0",
  "details": "User logged in",
  "user_id": "c1a1e2f4-1234-5678-9abc-def012345678",
  "user_email": "user@example.com",
  "timestamp": "2025-07-26T19:39:00Z"
}
```

### MessageResponse

```json
{
  "message": "Operation successful"
}
```

### SocialLoginRequest

```json
{
  "provider": "google",
  "token": "oauth-token"
}
```

### AdminUserUpdateRequest

```json
{
  "email": "user@example.com",
  "username": "username",
  "first_name": "John",
  "last_name": "Doe",
  "preferred_language": "en",
  "timezone": "UTC",
  "is_active": true,
  "email_verified": true,
  "mfa_enabled": false,
  "role": "ADMIN",
  "locked_until": "2025-07-26T19:39:00Z"
}
```

### AdminUserCreateRequest

```json
{
  "email": "user@example.com",
  "username": "username",
  "first_name": "John",
  "last_name": "Doe",
  "preferred_language": "en",
  "timezone": "UTC",
  "password": "StrongP@ssw0rd",
  "email_verified": true,
  "is_active": true,
  "role": "ADMIN",
  "send_welcome_email": true
}
```

---

## Genealogy Service

### Enums

- `Gender`, `PrivacySetting`, `RelationshipType`, `EventType`, `CollaboratorRole`, `PersonPrivacyOptions`, `MergeSuggestionStatus`, `PersonHistoryChangeType`, `IdentifierType`, `VerificationStatus`, `SpousalStatus`, `ParentalRole`

### DBModelMixin

```json
{
  "id": "c1a1e2f4-1234-5678-9abc-def012345678",
  "created_at": "2025-07-26T19:39:00Z",
  "updated_at": "2025-07-26T19:39:00Z"
}
```

### FamilyTree

```json
{
  "id": "tree-uuid-123",
  "name": "The Doe Family Lineage",
  "description": "Tracing the Doe family back to the 1800s.",
  "owner_id": "user-123xyz",
  "root_person_id": "person-uuid-root",
  "collaborators": [
    {
      "user_id": "user-abc",
      "role": "ADMIN",
      "added_at": "2025-07-26T19:39:00Z",
      "accepted_at": "2025-07-26T19:40:00Z"
    }
  ],
  "privacy": "PRIVATE",
  "settings": {
    "allow_collaboration": true,
    "show_living_persons": true,
    "default_person_privacy": "FAMILY_TREE_ONLY",
    "theme": "modern"
  },
  "statistics": {
    "total_persons": 150,
    "total_generations": 5,
    "completeness_score": 95.5
  },
  "last_gedcom_import": "2025-07-26T19:41:00Z",
  "last_gedcom_export": "2025-07-26T19:42:00Z"
}
```

### Collaborator

```json
{
  "user_id": "user-abc",
  "role": "ADMIN",
  "added_at": "2025-07-26T19:39:00Z",
  "accepted_at": "2025-07-26T19:40:00Z"
}
```

### FamilyTreeSettings

```json
{
  "allow_collaboration": true,
  "show_living_persons": true,
  "default_person_privacy": "FAMILY_TREE_ONLY",
  "theme": "modern"
}
```

### FamilyTreeStatistics

```json
{
  "total_persons": 150,
  "total_generations": 5,
  "completeness_score": 95.5
}
```

### PersonName

```json
{
  "given_name": "John",
  "surname": "Doe",
  "prefix": "Dr.",
  "suffix": "Jr.",
  "nickname": "Johnny"
}
```

### Fact

```json
{
  "type": "Occupation",
  "value": "Engineer",
  "date_string": "2000-01-01",
  "place": "New York",
  "description": "Worked at ACME Corp."
}
```

### Identifier

```json
{
  "type": "Passport",
  "value": "A1234567",
  "verification_status": "Verified",
  "notes": "Verified by government"
}
```

### PersonPrivacySettings

```json
{
  "show_profile": "FAMILY_TREE_ONLY",
  "show_birth_date": "FAMILY_TREE_ONLY",
  "show_death_date": "FAMILY_TREE_ONLY"
}
```

### Person

```json
{
  "id": "person-uuid-123",
  "tree_ids": ["tree-uuid-123"],
  "primary_name": {
    "given_name": "John",
    "surname": "Doe"
  },
  "alternate_names": [
    {
      "given_name": "Jonathan",
      "surname": "Doe"
    }
  ],
  "gender": "MALE",
  "birth_date_string": "1950-03-15",
  "birth_date_exact": "1950-03-15",
  "birth_place": "New York, USA",
  "is_birth_date_estimated": false,
  "death_date_string": "2020-10-05",
  "death_date_exact": "2020-10-05",
  "death_place": "Florida, USA",
  "is_death_date_estimated": false,
  "cause_of_death": "Natural causes",
  "is_living": false,
  "identifiers": [
    {
      "type": "Passport",
      "value": "A1234567",
      "verification_status": "Verified",
      "notes": "Verified by government"
    }
  ],
  "biography": "John Doe was an engineer.",
  "notes": "No additional notes.",
  "profile_image_url": "https://example.com/image.jpg",
  "profile_image_id": "img-uuid-123",
  "clan": "Doe Clan",
  "tribe": "Doe Tribe",
  "traditional_titles": ["Chief"],
  "privacy_settings": {
    "show_profile": "FAMILY_TREE_ONLY",
    "show_birth_date": "FAMILY_TREE_ONLY",
    "show_death_date": "FAMILY_TREE_ONLY"
  },
  "facts": [
    {
      "type": "Occupation",
      "value": "Engineer"
    }
  ],
  "potential_duplicates": [],
  "merged_into_id": null,
  "merged_from_ids": []
}
```

### RelationshipEvent

```json
{
  "event_type": "Marriage",
  "date_string": "1970-06-01",
  "date_exact": "1970-06-01",
  "place": "Las Vegas, NV",
  "description": "Married in Las Vegas"
}
```

### Relationship

```json
{
  "id": "rel-uuid-123",
  "tree_id": "tree-uuid-123",
  "person1_id": "person-uuid-john",
  "person2_id": "person-uuid-jane",
  "relationship_type": "SPOUSE",
  "parental_role_person1": null,
  "parental_role_person2": null,
  "spousal_status": "MARRIED",
  "start_date_string": "1970-06-01",
  "start_date_exact": "1970-06-01",
  "end_date_string": null,
  "end_date_exact": null,
  "place": "Las Vegas, NV",
  "notes": "Married in Las Vegas",
  "events": [
    {
      "event_type": "Marriage",
      "date_string": "1970-06-01"
    }
  ]
}
```

### Event

```json
{
  "id": "event-uuid-123",
  "tree_id": "tree-uuid-123",
  "primary_person_id": "person-uuid-john",
  "secondary_person_id": "person-uuid-jane",
  "relationship_id": "rel-uuid-123",
  "event_type": "BIRTH",
  "custom_event_type_name": null,
  "date_string": "1950-03-15",
  "date_exact": "1950-03-15",
  "place_name": "New York, USA",
  "description": "Birth of John Doe",
  "notes": "No additional notes."
}
```

### Notification

```json
{
  "id": "notif-uuid-123",
  "user_id": "user-abc-123",
  "type": "merge_suggestion",
  "message": "You have a new merge suggestion for John Doe.",
  "data": {
    "suggestion_id": "suggestion-uuid-456",
    "person_name": "John Doe"
  },
  "read": false
}
```

### MergeSuggestion

```json
{
  "id": "merge-uuid-123",
  "new_person_id": "person-uuid-new",
  "existing_person_id": "person-uuid-existing",
  "confidence": 0.85,
  "status": "PENDING",
  "created_by_user_id": "user-xyz",
  "created_by_system": true
}
```

### PersonHistory

```json
{
  "id": "history-uuid-123",
  "person_id": "person-uuid-123",
  "version": 2,
  "data_snapshot": {
    "primary_name": {
      "surname": "Doe Updated"
    }
  },
  "changed_by_user_id": "user-xyz-789",
  "change_type": "UPDATE",
  "change_description": "Updated surname"
}
```

### PersonCreate

```json
{
  "tree_ids": ["tree-uuid-123"],
  "primary_name": {
    "given_name": "John",
    "surname": "Doe"
  },
  "gender": "MALE",
  "birth_date_string": "1950-03-15",
  "birth_date_exact": "1950-03-15",
  "birth_place": "New York, USA",
  "is_birth_date_estimated": false,
  "death_date_string": "2020-10-05",
  "death_date_exact": "2020-10-05",
  "death_place": "Florida, USA",
  "is_death_date_estimated": false,
  "cause_of_death": "Natural causes",
  "is_living": false,
  "biography": "John Doe was an engineer.",
  "notes": "No additional notes.",
  "profile_image_id": "img-uuid-123",
  "clan": "Doe Clan",
  "tribe": "Doe Tribe",
  "traditional_titles": ["Chief"],
  "privacy_settings": {
    "show_profile": "FAMILY_TREE_ONLY",
    "show_birth_date": "FAMILY_TREE_ONLY",
    "show_death_date": "FAMILY_TREE_ONLY"
  },
  "facts": [
    {
      "type": "Occupation",
      "value": "Engineer"
    }
  ],
  "identifiers": [
    {
      "type": "Passport",
      "value": "A1234567",
      "verification_status": "Verified",
      "notes": "Verified by government"
    }
  ]
}
```

### PersonRead

```json
{
  /* Same as Person JSON */
}
```

### FamilyTreeCreate

```json
{
  "name": "The Doe Family Lineage",
  "description": "Tracing the Doe family back to the 1800s.",
  "privacy": "PRIVATE",
  "settings": {
    "allow_collaboration": true,
    "show_living_persons": true,
    "default_person_privacy": "FAMILY_TREE_ONLY",
    "theme": "modern"
  },
  "root_person_id": "person-uuid-root"
}
```

### FamilyTreeRead

```json
{
  /* Same as FamilyTree JSON */
}
```

---

## Storage Service

### Thumbnail

```json
{
  "size_name": "thumb_100x100",
  "width": 100,
  "height": 100,
  "s3_key": "images/thumb_100x100.jpg",
  "url": "https://example.com/images/thumb_100x100.jpg"
}
```

### FileMetadata

```json
{
  "title": "Family Photo",
  "description": "Photo from 1980 reunion",
  "author": "Jane Doe",
  "creation_date": "1980-06-15T00:00:00Z",
  "location_taken": "Springfield",
  "image_width": 1920,
  "image_height": 1080,
  "camera_make": "Canon",
  "camera_model": "EOS 80D",
  "gps_latitude": 39.7817,
  "gps_longitude": -89.6501,
  "page_count": null,
  "word_count": null,
  "s3_version_id": "v1",
  "s3_etag": "etag123",
  "extra_field": "extra value"
}
```

### FileRecord

```json
{
  "id": "file-uuid-123",
  "user_id": "user-abc",
  "family_tree_id": "tree-uuid-123",
  "original_name": "photo.jpg",
  "filename": "photo_2025.jpg",
  "s3_key": "images/photo_2025.jpg",
  "url": "https://example.com/images/photo_2025.jpg",
  "size_bytes": 204800,
  "mime_type": "image/jpeg",
  "category": "photo",
  "privacy": "private",
  "description": "Family reunion photo",
  "tags": ["family", "reunion"],
  "metadata": {
    "title": "Family Photo",
    "description": "Photo from 1980 reunion"
  },
  "thumbnails": [
    {
      "size_name": "thumb_100x100",
      "width": 100,
      "height": 100,
      "s3_key": "images/thumb_100x100.jpg",
      "url": "https://example.com/images/thumb_100x100.jpg"
    }
  ],
  "related_persons": ["person-uuid-123"],
  "related_events": ["event-uuid-123"],
  "is_deleted": false,
  "deleted_at": null,
  "uploaded_at": "2025-07-26T19:39:00Z",
  "updated_at": "2025-07-26T19:39:00Z"
}
```

### FileUploadResponse

```json
{
  "id": "file-uuid-123",
  "original_name": "photo.jpg",
  "url": "https://example.com/images/photo_2025.jpg",
  "size_bytes": 204800,
  "mime_type": "image/jpeg",
  "category": "photo",
  "uploaded_at": "2025-07-26T19:39:00Z",
  "thumbnails": [
    {
      "size_name": "thumb_100x100",
      "width": 100,
      "height": 100,
      "s3_key": "images/thumb_100x100.jpg",
      "url": "https://example.com/images/thumb_100x100.jpg"
    }
  ]
}
```

### FileUploadListResponse

```json
{
  "data": [
    {
      "id": "file-uuid-123",
      "original_name": "photo.jpg",
      "url": "https://example.com/images/photo_2025.jpg",
      "size_bytes": 204800,
      "mime_type": "image/jpeg",
      "category": "photo",
      "uploaded_at": "2025-07-26T19:39:00Z",
      "thumbnails": []
    }
  ],
  "total_success": 1,
  "total_failed": 0
}
```

### FileListResponse

```json
{
  "data": [
    {
      "id": "file-uuid-123",
      "user_id": "user-abc",
      "family_tree_id": "tree-uuid-123",
      "original_name": "photo.jpg",
      "filename": "photo_2025.jpg",
      "s3_key": "images/photo_2025.jpg",
      "url": "https://example.com/images/photo_2025.jpg",
      "size_bytes": 204800,
      "mime_type": "image/jpeg",
      "category": "photo",
      "privacy": "private",
      "description": "Family reunion photo",
      "tags": ["family", "reunion"],
      "metadata": {},
      "thumbnails": [],
      "related_persons": [],
      "related_events": [],
      "is_deleted": false,
      "deleted_at": null,
      "uploaded_at": "2025-07-26T19:39:00Z",
      "updated_at": "2025-07-26T19:39:00Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total_records": 1,
  "total_pages": 1
}
```

### FileUpdateSchema

```json
{
  "description": "Updated description",
  "tags": ["family", "reunion"],
  "privacy": "private",
  "family_tree_id": "tree-uuid-123",
  "related_persons": ["person-uuid-123"],
  "related_events": ["event-uuid-123"]
}
```

### FileDownloadLinkResponse

```json
{
  "download_url": "https://example.com/download/photo_2025.jpg",
  "expires_at": "2025-07-26T20:00:00Z",
  "filename": "photo.jpg"
}
```

### MessageResponse

```json
{
  "message": "Operation successful"
}
```
