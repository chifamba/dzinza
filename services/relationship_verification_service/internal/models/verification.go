package models

import "time"

type SuggestionStatus string

const (
	StatusPending   SuggestionStatus = "PENDING"
	StatusConfirmed SuggestionStatus = "CONFIRMED"
	StatusRejected  SuggestionStatus = "REJECTED"
)

// Suggestion represents a proposed change to a person or relationship
type Suggestion struct {
	ID          string           `json:"id"`
	Type        string           `json:"type"` // PERSON_UPDATE, RELATIONSHIP_CREATE, etc.
	TargetID    string           `json:"target_id"`
	Payload     string           `json:"payload"` // JSON string of the proposed change
	ProposerID  string           `json:"proposer_id"`
	Status      SuggestionStatus `json:"status"`
	AuditTrail  []AuditEntry     `json:"audit_trail"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

// AuditEntry records a verification action
type AuditEntry struct {
	UserID    string    `json:"user_id"`
	Action    string    `json:"action"` // CONFIRM, REJECT
	Comment   string    `json:"comment"`
	Timestamp time.Time `json:"timestamp"`
}
