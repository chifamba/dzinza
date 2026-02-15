package models

import "time"

// ModerationRequest represents a content moderation request.
type ModerationRequest struct {
	Content     string `json:"content" binding:"required"`
	ContentType string `json:"content_type"` // TEXT, IMAGE_CAPTION, COMMENT
}

// ModerationResponse represents the detailed AI moderation analysis result.
type ModerationResponse struct {
	IsFlagged  bool             `json:"is_flagged"`
	Score      float64          `json:"score"` // 0.0–1.0 overall severity
	Categories []string         `json:"categories"`
	Details    []CategoryDetail `json:"details"`
	Reason     string           `json:"reason"`
	ProcessedAt time.Time       `json:"processed_at"`
}

// CategoryDetail provides the scoring detail for each detected moderation category.
type CategoryDetail struct {
	Category string  `json:"category"`
	Score    float64 `json:"score"` // 0.0–1.0 per-category severity
	Matches  []string `json:"matches,omitempty"`
}
