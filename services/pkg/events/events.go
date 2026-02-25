package events

import (
	"time"
)

// EventType represents the type of event
type EventType string

const (
	// Person events
	PersonCreated EventType = "person.created"
	PersonUpdated EventType = "person.updated"
	PersonMerged  EventType = "person.merged"

	// Relationship events
	RelationshipCreated  EventType = "relationship.created"
	RelationshipVerified EventType = "relationship.verified"

	// User events
	UserBanned EventType = "user.banned"

	// Media events
	MediaUploaded EventType = "media.uploaded"

	// Trust events
	TrustUpdated EventType = "trust.updated"
)

// BaseEvent contains common fields for all events
type BaseEvent struct {
	Type      EventType `json:"type"`
	Timestamp time.Time `json:"timestamp"`
}

// PersonCreatedPayload is the payload for person.created
type PersonCreatedPayload struct {
	PersonID  string `json:"person_id"`
	TreeID    string `json:"tree_id"`
	Name      string `json:"name"`
	Timestamp int64  `json:"timestamp"`
}

// PersonUpdatedPayload is the payload for person.updated
type PersonUpdatedPayload struct {
	PersonID      string                 `json:"person_id"`
	ChangedFields map[string]interface{} `json:"changed_fields"`
	Timestamp     int64                  `json:"timestamp"`
}

// PersonMergedPayload is the payload for person.merged
type PersonMergedPayload struct {
	SurvivingID string `json:"surviving_id"`
	MergedID    string `json:"merged_id"`
	Timestamp   int64  `json:"timestamp"`
}

// RelationshipCreatedPayload is the payload for relationship.created
type RelationshipCreatedPayload struct {
	RelationshipID string `json:"relationship_id"`
	Type           string `json:"type"`
	Person1ID      string `json:"person1_id"`
	Person2ID      string `json:"person2_id"`
}

// RelationshipVerifiedPayload is the payload for relationship.verified
type RelationshipVerifiedPayload struct {
	RelationshipID string `json:"relationship_id"`
	SuggestionID   string `json:"suggestion_id"`
	Payload        string `json:"payload"`
	VerifiedBy     string `json:"verified_by"`
	Status         string `json:"status"`
}

// UserBannedPayload is the payload for user.banned
type UserBannedPayload struct {
	UserID   string `json:"user_id"`
	BannedBy string `json:"banned_by"`
	Reason   string `json:"reason"`
}

// MediaUploadedPayload is the payload for media.uploaded
type MediaUploadedPayload struct {
	MediaID  string `json:"media_id"`
	UserID   string `json:"user_id"`
	PersonID string `json:"person_id"`
	Filename string `json:"filename"`
}

// TrustUpdatedPayload is the payload for trust.updated
type TrustUpdatedPayload struct {
	UserID   string  `json:"user_id"`
	OldScore float64 `json:"old_score"`
	NewScore float64 `json:"new_score"`
}
