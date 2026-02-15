package models

import "time"

// FlaggedContent represents content that has been flagged for moderation
type FlaggedContent struct {
	ID          string    `json:"id"`
	ContentType string    `json:"content_type"` // PERSON, MEDIA, COMMENT
	ContentID   string    `json:"content_id"`
	Reason      string    `json:"reason"`
	ReporterID  string    `json:"reporter_id"`
	Status      string    `json:"status"` // PENDING, REVIEWED, REMOVED
	CreatedAt   time.Time `json:"created_at"`
}

// UserBan represents a user who has been banned from the platform
type UserBan struct {
	UserID    string    `json:"user_id"`
	BannedBy  string    `json:"banned_by"`
	Reason    string    `json:"reason"`
	BannedAt  time.Time `json:"banned_at"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}
