package models

import "time"

// TrustScore represents a user's trust level and the factors contributing to it
type TrustScore struct {
	UserID               string    `json:"user_id"`
	Score                float64   `json:"score"`
	AcceptedContributions int       `json:"accepted_contributions"`
	RejectionRate        float64   `json:"rejection_rate"`
	AccountLongevityDays int       `json:"account_longevity_days"`
	LastActivityAt       time.Time `json:"last_activity_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

// AccessRequest represents a request for access to private tree data
type AccessRequest struct {
	ID           string    `json:"id"`
	RequesterID  string    `json:"requester_id"`
	TreeID       string    `json:"tree_id"`
	Status       string    `json:"status"` // PENDING, APPROVED, REJECTED
	RequestedAt  time.Time `json:"requested_at"`
	DecidedAt    *time.Time `json:"decided_at,omitempty"`
}
