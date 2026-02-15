package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// SuggestionStatus represents the state of a verification suggestion.
type SuggestionStatus string

const (
	StatusPending   SuggestionStatus = "PENDING"
	StatusConfirmed SuggestionStatus = "CONFIRMED"
	StatusRejected  SuggestionStatus = "REJECTED"
)

// Suggestion represents a proposed change to a person or relationship.
type Suggestion struct {
	ID                    string           `gorm:"primaryKey" json:"id"`
	Type                  string           `json:"type"` // PERSON_UPDATE, RELATIONSHIP_CREATE, etc.
	TargetID              string           `json:"target_id"`
	Payload               string           `json:"payload"` // JSON string of the proposed change
	ProposerID            string           `json:"proposer_id"`
	Status                SuggestionStatus `json:"status"`
	ConfirmationCount     int              `json:"confirmation_count"`
	RequiredConfirmations int              `json:"required_confirmations"`
	AuditTrail            AuditTrailJSON   `gorm:"type:jsonb" json:"audit_trail"`
	CreatedAt             time.Time        `json:"created_at"`
	UpdatedAt             time.Time        `json:"updated_at"`
}

// AuditEntry records a verification action.
type AuditEntry struct {
	UserID     string  `json:"user_id"`
	Action     string  `json:"action"` // CONFIRM, REJECT
	Comment    string  `json:"comment"`
	TrustScore float64 `json:"trust_score"`
	Timestamp  time.Time `json:"timestamp"`
}

// AuditTrailJSON is a custom type for GORM JSONB storage of audit entries.
type AuditTrailJSON []AuditEntry

// Value implements the driver.Valuer interface for GORM JSONB serialization.
func (a AuditTrailJSON) Value() (driver.Value, error) {
	if a == nil {
		return "[]", nil
	}
	data, err := json.Marshal(a)
	if err != nil {
		return nil, err
	}
	return string(data), nil
}

// Scan implements the sql.Scanner interface for GORM JSONB deserialization.
func (a *AuditTrailJSON) Scan(value interface{}) error {
	if value == nil {
		*a = AuditTrailJSON{}
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return json.Unmarshal([]byte("[]"), a)
	}

	return json.Unmarshal(bytes, a)
}
