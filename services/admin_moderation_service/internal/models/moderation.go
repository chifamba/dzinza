package models

import "time"

// FlaggedContent represents content that has been flagged for moderation.
type FlaggedContent struct {
	ID              string     `gorm:"primaryKey" json:"id"`
	ContentType     string     `json:"content_type"` // PERSON, MEDIA, COMMENT
	ContentID       string     `json:"content_id"`
	Content         string     `json:"content"`
	Reason          string     `json:"reason"`
	ReporterID      string     `json:"reporter_id"`
	Status          string     `json:"status"` // PENDING, AUTO_FLAGGED, REVIEWED, REMOVED, DISMISSED
	AIScore         float64    `json:"ai_score"`
	AICategories    string     `json:"ai_categories"` // Comma-separated categories from AI moderation
	ReviewedBy      string     `json:"reviewed_by"`
	ReviewNote      string     `json:"review_note"`
	ReviewedAt      *time.Time `json:"reviewed_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// UserBan represents a user who has been banned from the platform.
type UserBan struct {
	ID        string     `gorm:"primaryKey" json:"id"`
	UserID    string     `json:"user_id"`
	BannedBy  string     `json:"banned_by"`
	Reason    string     `json:"reason"`
	BannedAt  time.Time  `json:"banned_at"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// ReviewRequest represents a moderator's review decision.
type ReviewRequest struct {
	ReviewerID string `json:"reviewer_id" binding:"required"`
	Action     string `json:"action" binding:"required"` // APPROVE, REMOVE, DISMISS
	Note       string `json:"note"`
}
