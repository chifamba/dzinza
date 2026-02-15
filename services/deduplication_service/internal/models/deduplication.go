package models

import "time"

// DuplicatePair represents a potential duplicate between two persons
type DuplicatePair struct {
	Person1ID       string    `json:"person1_id"`
	Person2ID       string    `json:"person2_id"`
	ConfidenceScore float64   `json:"confidence_score"`
	Status          string    `json:"status"` // PENDING, IGNORED, MERGED
	DetectedAt      time.Time `json:"detected_at"`
}

// MergeRequest represents a request to merge two persons
type MergeRequest struct {
	SurvivingID string `json:"surviving_id"`
	MergedID    string `json:"merged_id"`
	ProposerID  string `json:"proposer_id"`
}
