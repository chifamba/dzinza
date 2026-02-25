package models

import "time"

// DuplicatePair represents a potential duplicate between two persons.
type DuplicatePair struct {
	Person1ID       string    `json:"person1_id"`
	Person2ID       string    `json:"person2_id"`
	ConfidenceScore float64   `json:"confidence_score"`
	NameSimilarity  float64   `json:"name_similarity"`
	DateSimilarity  float64   `json:"date_similarity"`
	PlaceSimilarity float64   `json:"place_similarity"`
	TopologySimilarity float64 `json:"topology_similarity"`
	Status          string    `json:"status"` // PENDING, IGNORED, MERGED
	DetectedAt      time.Time `json:"detected_at"`
}

// MergeRequest represents a request to merge two persons.
type MergeRequest struct {
	SurvivingID string `json:"surviving_id"`
	MergedID    string `json:"merged_id"`
	ProposerID  string `json:"proposer_id"`
}

// PersonCandidate holds the data needed for duplicate comparison.
type PersonCandidate struct {
	ID         string `json:"id"`
	GivenName  string `json:"given_name"`
	Surname    string `json:"surname"`
	BirthDate  string `json:"birth_date"`
	BirthPlace string `json:"birth_place"`
	DeathDate  string `json:"death_date"`
	Gender     string `json:"gender"`
}
